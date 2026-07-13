import { Controller, Get, Param, UseGuards, Post, forwardRef, Inject, Body } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { BearerGuard } from '../auth/guards/bearer.guard';
import { TunnelsService } from '../tunnels/tunnels.service';
import { RelayGateway } from '../relay/relay.gateway';
import { v4 as uuidv4 } from 'uuid';

@UseGuards(BearerGuard)
@Controller('workspaces/:workspaceId/tunnels/:tunnelId/requests')
export class RequestsController {
  constructor(
    private readonly requestsService: RequestsService,
    private readonly tunnelsService: TunnelsService,
    @Inject(forwardRef(() => RelayGateway))
    private readonly relayGateway: RelayGateway,
  ) {}

  @Get()
  async getRequests(@Param('workspaceId') workspaceId: string, @Param('tunnelId') tunnelId: string) {
    // Basic verification that tunnel belongs to workspace
    await this.tunnelsService.findOne(null, workspaceId, tunnelId);
    return this.requestsService.getRequests(tunnelId);
  }

  @Get(':reqId')
  async getRequest(@Param('workspaceId') workspaceId: string, @Param('tunnelId') tunnelId: string, @Param('reqId') reqId: string) {
    await this.tunnelsService.findOne(null, workspaceId, tunnelId);
    return this.requestsService.getRequestById(tunnelId, reqId);
  }

  @Post(':reqId/replay')
  async replayRequest(
    @Param('workspaceId') workspaceId: string, 
    @Param('tunnelId') tunnelId: string, 
    @Param('reqId') reqId: string
  ) {
    const tunnel = await this.tunnelsService.findOne(null, workspaceId, tunnelId);
    const request = await this.requestsService.getRequestById(tunnelId, reqId);
    
    if (!request) {
      throw new Error('Request not found');
    }

    // Re-trigger it through the gateway
    // We generate a new request ID so it shows up as a new event in the live feed
    const newReqId = uuidv4();
    
    // Fire and forget, or wait for response. We just forward it.
    // The middleware uses forwardRequest. We can do it asynchronously here.
    // The Desktop UI will see the 'request:log' event when the proxy happens.
    
    // We need to inject this into RelayHttpMiddleware or directly via gateway.
    // Using RelayGateway directly simulates what the middleware does:
    this.relayGateway.forwardRequest(
      tunnel.subdomain,
      newReqId,
      request.method,
      request.path,
      request.headers,
      request.bodyPreview,
      30000
    ).catch(() => {});
    
    // We should also manually log the NEW request to Redis just like the middleware would,
    // so it shows up in the DB. Or we can just let the Relay Gateway do it... wait, the RelayGateway doesn't log, the Middleware does.
    // Let's manually log the replayed request before forwarding:
    
    await this.requestsService.logRequest({
      id: newReqId,
      tunnelId,
      method: request.method,
      path: request.path,
      headers: request.headers,
      bodyPreview: request.bodyPreview,
      capturedAt: new Date().toISOString()
    });
    
    return { success: true, newRequestId: newReqId };
  }

  @Post('execute')
  async executeRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('tunnelId') tunnelId: string,
    @Body() dto: { method: string; path: string; headers?: Record<string, string>; body?: string }
  ) {
    const tunnel = await this.tunnelsService.findOne(null, workspaceId, tunnelId);
    const newReqId = uuidv4();
    const startTime = Date.now();

    await this.requestsService.logRequest({
      id: newReqId,
      tunnelId,
      method: dto.method,
      path: dto.path,
      headers: dto.headers || {},
      bodyPreview: dto.body || '',
      capturedAt: new Date().toISOString()
    });

    const responsePayload = await this.relayGateway.forwardRequest(
      tunnel.subdomain,
      newReqId,
      dto.method,
      dto.path,
      dto.headers || {},
      dto.body || '',
      30000
    );

    if (!responsePayload) {
      await this.requestsService.updateResponse(tunnelId, newReqId, 504, Date.now() - startTime);
      return { status: 504, headers: {}, body: '' };
    }

    await this.requestsService.updateResponse(
      tunnelId,
      newReqId,
      responsePayload.status,
      Date.now() - startTime,
      responsePayload.headers
    );

    return {
      status: responsePayload.status,
      headers: responsePayload.headers,
      body: responsePayload.body,
    };
  }
}
