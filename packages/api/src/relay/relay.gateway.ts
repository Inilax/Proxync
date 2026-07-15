import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { TunnelsService } from '../tunnels/tunnels.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from '../messages/messages.service';
import Redis from 'ioredis';

interface TunnelAgent {
  socket: WebSocket;
  tunnelId: string;
  workspaceId: string;
  subdomain: string;
}

interface WorkspaceMember {
  socket: WebSocket;
  userId: string;
  userName: string;
  workspaceId: string;
}

@WebSocketGateway({
  path: '/relay',
})
export class RelayGateway implements OnGatewayConnection, OnGatewayDisconnect {

  private readonly logger = new Logger(RelayGateway.name);
  private agents = new Map<string, TunnelAgent>();
  private pendingRequests = new Map<string, (data: any) => void>();
  private workspaceMembers = new Map<string, WorkspaceMember>();
  private redis: Redis;

  constructor(
    private readonly tunnelsService: TunnelsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly messagesService: MessagesService,
  ) {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);

    // Force close active connections when a workspace is purged
    const { globalEvents } = require('../common/events');
    globalEvents.on('workspace:deleted', (workspaceId: string) => {
      try {
        this.closeWorkspaceAgents(workspaceId);
      } catch (err: any) {
        this.logger.error(`Error closing workspace agents on event: ${err.message}`);
      }
    });
  }

  handleConnection(socket: WebSocket) {
    (socket as any).id = uuidv4();
    this.logger.log(`Client connected: ${(socket as any).id}`);
  }

  async handleDisconnect(socket: WebSocket) {
    const socketId = (socket as any).id;
    this.logger.log(`Client disconnected: ${socketId}`);

    for (const [subdomain, agent] of this.agents.entries()) {
      if ((agent.socket as any).id === socketId) {
        this.agents.delete(subdomain);
        this.logger.log(`Tunnel auto-closed for subdomain: ${subdomain}`);
        try {
          await this.tunnelsService.close(null, agent.workspaceId, agent.tunnelId);
        } catch (e) {
          this.logger.error(`Failed to close tunnel on disconnect: ${e.message}`);
        }
        break;
      }
    }

    const member = this.workspaceMembers.get(socketId);
    if (member) {
      this.workspaceMembers.delete(socketId);
      await this.redis.del(`presence:${member.workspaceId}:${member.userId}`);
      this.broadcastPresence(member.workspaceId);
    }
  }

  closeWorkspaceAgents(workspaceId: string) {
    this.logger.log(`Force closing all connections for workspace ${workspaceId}`);
    for (const [subdomain, agent] of this.agents.entries()) {
      if (agent.workspaceId === workspaceId) {
        try {
          agent.socket.close();
        } catch {}
        this.agents.delete(subdomain);
        this.logger.log(`Purged agent socket for subdomain: ${subdomain}`);
      }
    }
    for (const [socketId, member] of this.workspaceMembers.entries()) {
      if (member.workspaceId === workspaceId) {
        try {
          member.socket.close();
        } catch {}
        this.workspaceMembers.delete(socketId);
        this.logger.log(`Purged member socket for workspace: ${workspaceId}`);
      }
    }
  }

  @SubscribeMessage('tunnel:register')
  async handleRegister(
    @ConnectedSocket() socket: WebSocket,
    @MessageBody() data: any,
  ) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    try {
      const payload = await this.jwt.verifyAsync(data.token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const tunnel = await this.tunnelsService.findOne(
        payload.sub,
        data.workspaceId,
        data.tunnelId,
      );
      const agent: TunnelAgent = {
        socket,
        tunnelId: tunnel.id,
        workspaceId: tunnel.workspaceId,
        subdomain: tunnel.subdomain,
      };

      if (tunnel.status !== 'ACTIVE') {
        await this.tunnelsService.markActive(tunnel.id);
      }

      this.agents.set(tunnel.subdomain, agent);
      this.logger.log(`Tunnel registered: ${tunnel.subdomain}`);
      socket.send(JSON.stringify({
        event: 'tunnel:registered',
        data: { tunnelId: tunnel.id, subdomain: tunnel.subdomain, publicUrl: tunnel.publicUrl },
      }));
    } catch (err) {
      this.logger.warn(`Tunnel registration failed: ${err.message}`);
      socket.send(JSON.stringify({ event: 'tunnel:error', data: { message: 'Registration failed: ' + err.message } }));
      socket.close();
    }
  }

  @SubscribeMessage('http:response')
  handleHttpResponse(@MessageBody() data: any) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    const resolve = this.pendingRequests.get(data.requestId);
    if (resolve) {
      this.pendingRequests.delete(data.requestId);
      resolve(data);
    }
  }

  @SubscribeMessage('workspace:join')
  async handleWorkspaceJoin(
    @ConnectedSocket() socket: WebSocket,
    @MessageBody() data: any,
  ) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    try {
      const payload = await this.jwt.verifyAsync(data.token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const member: WorkspaceMember = {
        socket,
        userId: payload.sub,
        userName: payload.name || 'Unknown',
        workspaceId: data.workspaceId,
      };
      this.workspaceMembers.set((socket as any).id, member);
      // 90s TTL — client must ping every 30s
      await this.redis.setex(
        `presence:${data.workspaceId}:${payload.sub}`,
        90,
        JSON.stringify({ userId: payload.sub, name: payload.name || 'Unknown' }),
      );
      this.broadcastPresence(data.workspaceId);
    } catch (err) {
      this.logger.warn(`workspace:join failed: ${err.message}`);
    }
  }

  @SubscribeMessage('presence:ping')
  async handlePresencePing(@ConnectedSocket() socket: WebSocket) {
    const member = this.workspaceMembers.get((socket as any).id);
    if (member) {
      await this.redis.expire(`presence:${member.workspaceId}:${member.userId}`, 90);
    }
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(
    @ConnectedSocket() socket: WebSocket,
    @MessageBody() data: any,
  ) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    const member = this.workspaceMembers.get((socket as any).id);
    if (!member) return;
    try {
      const message = await this.messagesService.create(member.userId, data.channelId, {
        text: data.text,
        kind: data.kind ?? 'CHAT',
        screenshotUrl: data.screenshotUrl,
      });
      this.broadcastToWorkspace(member.workspaceId, { event: 'chat:message', data: message });
    } catch (err) {
      this.logger.warn(`chat:send failed: ${err.message}`);
    }
  }

  @SubscribeMessage('message:resolve')
  async handleMessageResolve(
    @ConnectedSocket() socket: WebSocket,
    @MessageBody() data: any,
  ) {
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch {}
    }
    const member = this.workspaceMembers.get((socket as any).id);
    if (!member) return;
    try {
      const updated = await this.messagesService.update(member.userId, data.messageId, {
        resolved: data.resolved,
      });
      this.broadcastToWorkspace(member.workspaceId, { event: 'message:updated', data: updated });
    } catch (err) {
      this.logger.warn(`message:resolve failed: ${err.message}`);
    }
  }

  private broadcastToWorkspace(workspaceId: string, payload: { event: string; data: any }) {
    const msg = JSON.stringify(payload);
    for (const m of this.workspaceMembers.values()) {
      if (m.workspaceId === workspaceId && m.socket.readyState === 1) {
        m.socket.send(msg);
      }
    }
  }

  private broadcastPresence(workspaceId: string) {
    // Derive presence from in-memory map — no Redis KEYS scan needed
    const members = Array.from(this.workspaceMembers.values())
      .filter(m => m.workspaceId === workspaceId)
      .map(m => ({ userId: m.userId, name: m.userName }));
    this.broadcastToWorkspace(workspaceId, { event: 'presence:update', data: { members } });
  }

  async forwardRequest(
    subdomain: string,
    requestId: string,
    method: string,
    path: string,
    headers: Record<string, string>,
    body: string,
    timeoutMs = 30_000,
  ): Promise<{ status: number; headers: Record<string, string>; body: string } | null> {
    const agent = this.agents.get(subdomain);
    if (!agent) return null;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        resolve({ status: 504, headers: {}, body: 'Gateway Timeout' });
      }, timeoutMs);
      this.pendingRequests.set(requestId, (data) => {
        clearTimeout(timer);
        resolve(data);
      });
      agent.socket.send(JSON.stringify({
        event: 'http:request',
        data: { requestId, method, path, headers, body },
      }));
    });
  }

  getAgent(subdomain: string): TunnelAgent | undefined {
    return this.agents.get(subdomain);
  }
}
