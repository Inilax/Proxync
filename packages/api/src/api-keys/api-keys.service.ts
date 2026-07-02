import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateApiKeyDto, VALID_SCOPES } from './dto/api-key.dto';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

@Injectable()
export class ApiKeysService {
  private readonly prefix = process.env.API_KEY_PREFIX ?? 'opk_';

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateApiKeyDto) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN', 'MEMBER']);

    // Validate scopes
    const scopes = dto.scopes ?? [...VALID_SCOPES];
    const invalid = scopes.filter((s) => !(VALID_SCOPES as readonly string[]).includes(s));
    if (invalid.length > 0) {
      throw new BadRequestException(`Invalid scopes: ${invalid.join(', ')}`);
    }

    // Generate key: prefix (12 chars) + 32 random bytes
    const rawSuffix = randomBytes(24).toString('hex'); // 48 chars
    const fullKey = `${this.prefix}${rawSuffix}`;
    const keyPrefix = fullKey.slice(0, 16); // "opk_" + 12 chars

    const hashedSecret = await bcrypt.hash(fullKey, 10);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        workspaceId,
        name: dto.name,
        keyPrefix,
        hashedSecret,
        scopes,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        createdAt: true,
      },
    });

    // Return full key ONCE — never stored in plaintext
    return {
      ...apiKey,
      key: fullKey,
      warning: 'Store this key securely — it will never be shown again.',
    };
  }

  async findAll(userId: string, workspaceId: string) {
    await this.workspacesService.findOne(userId, workspaceId);

    return this.prisma.apiKey.findMany({
      where: { workspaceId, revokedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(userId: string, workspaceId: string, keyId: string) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    const key = await this.prisma.apiKey.findFirst({
      where: { id: keyId, workspaceId, revokedAt: null },
    });
    if (!key) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { revokedAt: new Date() },
    });

    return { message: 'API key revoked' };
  }
}
