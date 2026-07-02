import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RequestLogData {
  id: string;
  tunnelId: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  bodyPreview: string;
  status?: number;
  durationMs?: number;
  responseHeaders?: Record<string, string>;
  capturedAt: string; // ISO date string
}

@Injectable()
export class RequestsService {
  private redis: Redis;
  private readonly logger = new Logger(RequestsService.name);

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
    
    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error', err);
    });
  }

  async logRequest(req: RequestLogData) {
    try {
      const key = `tunnel:${req.tunnelId}:req:${req.id}`;
      // Store full request details in a string (JSON)
      await this.redis.setex(key, 86400, JSON.stringify(req));
      
      // Add to list of requests for this tunnel
      const listKey = `tunnel:${req.tunnelId}:reqs`;
      await this.redis.lpush(listKey, req.id);
      // Trim to last 100 requests
      await this.redis.ltrim(listKey, 0, 99);
      // Bug 4 fix: the list key also needs a TTL, otherwise it persists in Redis forever
      await this.redis.expire(listKey, 86400);
    } catch (err) {
      this.logger.error(`Failed to log request ${req.id} to Redis`, err);
    }
  }

  async updateResponse(tunnelId: string, reqId: string, status: number, durationMs: number, responseHeaders?: Record<string, string>) {
    try {
      const key = `tunnel:${tunnelId}:req:${reqId}`;
      const dataStr = await this.redis.get(key);
      if (dataStr) {
        const data: RequestLogData = JSON.parse(dataStr);
        data.status = status;
        data.durationMs = durationMs;
        if (responseHeaders) {
          data.responseHeaders = responseHeaders;
        }
        await this.redis.setex(key, 86400, JSON.stringify(data));
      }
    } catch (err) {
      this.logger.error(`Failed to update response for ${reqId} in Redis`, err);
    }
  }

  async getRequests(tunnelId: string, limit = 100): Promise<RequestLogData[]> {
    try {
      const listKey = `tunnel:${tunnelId}:reqs`;
      const reqIds = await this.redis.lrange(listKey, 0, limit - 1);
      
      if (reqIds.length === 0) return [];
      
      const keys = reqIds.map(id => `tunnel:${tunnelId}:req:${id}`);
      const dataStrs = await this.redis.mget(keys);
      
      return dataStrs.filter(Boolean).map(str => JSON.parse(str as string));
    } catch (err) {
      this.logger.error(`Failed to get requests for tunnel ${tunnelId}`, err);
      return [];
    }
  }

  async getRequestById(tunnelId: string, reqId: string): Promise<RequestLogData | null> {
    try {
      const key = `tunnel:${tunnelId}:req:${reqId}`;
      const dataStr = await this.redis.get(key);
      if (dataStr) {
        return JSON.parse(dataStr);
      }
      return null;
    } catch (err) {
      this.logger.error(`Failed to get request ${reqId}`, err);
      return null;
    }
  }
}
