import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateTunnelDto } from './dto/tunnel.dto';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TunnelsService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async onModuleInit() {
    // When the backend restarts, all in-memory WebSocket connections are lost.
    // Close any tunnels that were left ACTIVE.
    try {
      await this.prisma.tunnel.updateMany({
        where: { status: 'ACTIVE' },
        data: { status: 'CLOSED', closedAt: new Date() },
      });
    } catch (e) {
      console.error('Failed to clean up stale tunnels on startup', e);
    }
  }

  private generateSubdomain(): string {
    // e.g. "red-fox-x7k2"
    const adjectives = ['red','blue','fast','bold','cool','dark','bright','swift'];
    const nouns = ['fox','wolf','hawk','bear','lion','crow','lynx','kite'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const suffix = randomBytes(3).toString('hex');
    return `${adj}-${noun}-${suffix}`;
  }

  async create(
    actorId: string | null,
    workspaceId: string,
    dto: CreateTunnelDto,
    ownerId?: string,
  ) {
    // For API key auth, actorId is null — resolve ownerId from workspace owner
    let effectiveOwnerId: string = ownerId ?? actorId ?? '';

    if (actorId) {
      await this.workspacesService.assertRole(actorId, workspaceId, [
        'OWNER', 'ADMIN', 'MEMBER',
      ]);
    } else {
      // API key context: use workspace owner as the tunnel owner
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { ownerId: true },
      });
      if (!workspace) throw new Error('Workspace not found');
      effectiveOwnerId = workspace.ownerId;
    }

    const workspaceOwner = await this.prisma.user.findUnique({
      where: { id: effectiveOwnerId },
      select: { email: true },
    });

    if (workspaceOwner?.email?.endsWith('@proxync.local')) {
      const activeTunnelsCount = await this.prisma.tunnel.count({
        where: { workspaceId, status: 'ACTIVE' },
      });
      if (activeTunnelsCount >= 1) {
        throw new ForbiddenException('Guest workspaces are limited to 1 active tunnel at a time.');
      }
    }

    const subdomain = this.generateSubdomain();
    const relayHost = process.env.RELAY_SUBDOMAIN_BASE ?? 'localtest.me';
    const isDev = process.env.NODE_ENV !== 'production';
    const protocol = isDev ? 'http' : 'https';
    const portSuffix = isDev ? `:${process.env.PORT || 3939}` : '';
    
    let publicUrl = `${protocol}://${subdomain}.${relayHost}${portSuffix}`;

    if (dto.customDomain) {
      const verifiedDomain = await this.prisma.domain.findFirst({
        where: { name: dto.customDomain, userId: effectiveOwnerId, verified: true },
      });
      if (!verifiedDomain) {
        throw new ForbiddenException(`Custom domain ${dto.customDomain} is not registered or verified under your account.`);
      }

      // Close any active tunnels currently bound to this custom domain
      await this.prisma.tunnel.updateMany({
        where: { customDomain: dto.customDomain, status: 'ACTIVE' },
        data: { status: 'CLOSED', closedAt: new Date() },
      });

      publicUrl = `${protocol}://${dto.customDomain}${portSuffix}`;
    }

    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const tunnel = await this.prisma.tunnel.create({
      data: {
        workspaceId,
        ownerId: effectiveOwnerId,
        localPort: dto.localPort,
        protocol: dto.protocol ?? 'http',
        publicUrl,
        subdomain,
        region: dto.region ?? 'auto',
        status: 'ACTIVE',
        passwordHash,
        customDomain: dto.customDomain || null,
      },
    });

    return tunnel;
  }

  async findAll(actorId: string | null, workspaceId: string) {
    if (actorId) {
      await this.workspacesService.findOne(actorId, workspaceId);
    }

    return this.prisma.tunnel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(actorId: string | null, workspaceId: string, tunnelId: string) {
    if (actorId) {
      await this.workspacesService.findOne(actorId, workspaceId);
    }

    const tunnel = await this.prisma.tunnel.findFirst({
      where: { id: tunnelId, workspaceId },
    });
    if (!tunnel) throw new NotFoundException('Tunnel not found');
    return tunnel;
  }

  async close(actorId: string | null, workspaceId: string, tunnelId: string) {
    const tunnel = await this.findOne(actorId, workspaceId, tunnelId);

    if (actorId && tunnel.ownerId !== actorId) {
      await this.workspacesService.assertRole(actorId, workspaceId, ['OWNER', 'ADMIN']);
    }

    return this.prisma.tunnel.update({
      where: { id: tunnelId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });
  }

  async markActive(tunnelId: string) {
    return this.prisma.tunnel.update({
      where: { id: tunnelId },
      data: { status: 'ACTIVE', closedAt: null },
    });
  }

  async getBandwidth(actorId: string | null, workspaceId: string, tunnelId: string) {
    await this.findOne(actorId, workspaceId, tunnelId);

    const usages = await this.prisma.bandwidthUsage.findMany({
      where: { tunnelId },
      orderBy: { recordedAt: 'desc' },
      take: 100,
    });

    const totalBytesIn = usages.reduce((sum, u) => sum + Number(u.bytesIn), 0);
    const totalBytesOut = usages.reduce((sum, u) => sum + Number(u.bytesOut), 0);

    return {
      tunnelId,
      totalBytesIn,
      totalBytesOut,
      totalBytes: totalBytesIn + totalBytesOut,
      records: usages.length,
    };
  }

  async recordBandwidth(tunnelId: string, workspaceId: string, bytesIn: number, bytesOut: number) {
    return this.prisma.bandwidthUsage.create({
      data: { tunnelId, workspaceId, bytesIn, bytesOut },
    });
  }

  async autoCloseStaleTunnels() {
    const result = await this.prisma.tunnel.updateMany({
      where: {
        status: 'ACTIVE',
        updatedAt: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) }, // 4h idle
      },
      data: { status: 'EXPIRED', closedAt: new Date() },
    });
    return result.count;
  }
}
