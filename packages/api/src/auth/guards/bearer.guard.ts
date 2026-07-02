import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';

/**
 * Unified Bearer guard — handles both JWT session tokens and API keys.
 * JWT tokens are verified with the JWT secret.
 * API keys start with the configured prefix (e.g. "opk_") and are
 * validated by hashing and comparing against stored hashes.
 */
@Injectable()
export class BearerGuard implements CanActivate {
  private readonly apiKeyPrefix: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKeyPrefix = this.config.get<string>('API_KEY_PREFIX') ?? 'opk_';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearer(req);

    if (!token) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    // Route by prefix: API key vs JWT
    if (token.startsWith(this.apiKeyPrefix)) {
      return this.validateApiKey(token, req);
    }
    return this.validateJwt(token, req);
  }

  private extractBearer(req: Request): string | null {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.slice(7);
  }

  private async validateJwt(token: string, req: Request): Promise<boolean> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(
        token,
        { secret: this.config.get<string>('JWT_SECRET') as string },
      );
      (req as any).user = { id: payload.sub, email: payload.email, type: 'user' };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async validateApiKey(token: string, req: Request): Promise<boolean> {
    // The key prefix stored in DB is e.g. "opk_abc123" (first 16 chars)
    const prefix = token.slice(0, 16);

    const apiKey = await this.prisma.apiKey.findFirst({
      where: { keyPrefix: prefix, revokedAt: null },
      include: { workspace: true },
    });

    if (!apiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    const valid = await bcrypt.compare(token, apiKey.hashedSecret);
    if (!valid) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Track last used
    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    (req as any).user = {
      id: null,
      type: 'api_key',
      apiKeyId: apiKey.id,
      workspaceId: apiKey.workspaceId,
      scopes: apiKey.scopes,
    };
    return true;
  }
}
