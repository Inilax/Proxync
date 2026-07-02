import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { RelayGateway } from './relay.gateway';
import { RequestsService } from '../requests/requests.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RelayMiddleware implements NestMiddleware {
  constructor(
    private readonly config: ConfigService,
    private readonly gateway: RelayGateway,
    private readonly requestsService: RequestsService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host || '';
    const baseDomain = this.config.get<string>('RELAY_SUBDOMAIN_BASE') || 'localtest.me';

    const domainWithoutPort = host.split(':')[0];
    
    // Check if the request is destined for a tunnel subdomain
    if (
      domainWithoutPort.endsWith(`.${baseDomain}`) &&
      domainWithoutPort !== baseDomain &&
      !domainWithoutPort.startsWith('api.')
    ) {
      const subdomain = domainWithoutPort.replace(`.${baseDomain}`, '');
      
      const agent = this.gateway.getAgent(subdomain);
      if (!agent) {
        res.status(502).send('Bad Gateway: Tunnel not found or offline');
        return;
      }

      const requestId = uuidv4();
      
      let bodyStr = '';
      if (req.body && Object.keys(req.body).length > 0) {
        bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
      
      const startTime = Date.now();

      await this.requestsService.logRequest({
        id: requestId,
        tunnelId: agent.tunnelId,
        method: req.method,
        path: req.originalUrl || req.url,
        headers: req.headers as Record<string, string>,
        bodyPreview: bodyStr.substring(0, 1024 * 1024), // Cap at 1MB
        capturedAt: new Date().toISOString(),
      });

      const responsePayload = await this.gateway.forwardRequest(
        subdomain,
        requestId,
        req.method,
        req.originalUrl || req.url, // keep full path
        req.headers as Record<string, string>,
        bodyStr,
        30000,
      );

      if (!responsePayload) {
        res.status(504).send('Gateway Timeout');
        await this.requestsService.updateResponse(agent.tunnelId, requestId, 504, Date.now() - startTime);
        return;
      }

      await this.requestsService.updateResponse(
        agent.tunnelId, 
        requestId, 
        responsePayload.status, 
        Date.now() - startTime,
        responsePayload.headers
      );

      res.status(responsePayload.status);
      for (const [k, v] of Object.entries(responsePayload.headers)) {
        if (k.toLowerCase() === 'transfer-encoding') continue;
        if (k.toLowerCase() === 'content-encoding') continue;
        if (k.toLowerCase() === 'content-length') continue;
        res.setHeader(k, v);
      }
      if (responsePayload.body) {
        const bodyBuffer = Buffer.from(responsePayload.body, 'base64');
        res.send(bodyBuffer);
      } else {
        res.send();
      }
      return;
    }

    next();
  }
}
