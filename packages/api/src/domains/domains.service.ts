import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateDomainDto } from './dto/domain.dto';
import { randomBytes } from 'crypto';
import * as dns from 'dns';

@Injectable()
export class DomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateDomainDto) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    const existing = await this.prisma.domain.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Domain name is already registered');
    }

    const verificationToken = randomBytes(16).toString('hex');

    return this.prisma.domain.create({
      data: {
        workspaceId,
        name: dto.name,
        verificationToken,
      },
    });
  }

  async findAll(userId: string, workspaceId: string) {
    await this.workspacesService.findOne(userId, workspaceId);
    return this.prisma.domain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, workspaceId: string, domainId: string) {
    await this.workspacesService.findOne(userId, workspaceId);
    const domain = await this.prisma.domain.findFirst({
      where: { id: domainId, workspaceId },
    });
    if (!domain) throw new NotFoundException('Domain not found');
    return domain;
  }

  async verify(userId: string, workspaceId: string, domainId: string) {
    const domain = await this.findOne(userId, workspaceId, domainId);
    if (domain.verified) {
      return domain;
    }

    // Auto-verify localtest.me domains in development mode for easy local testing
    if (process.env.NODE_ENV === 'development' || domain.name.endsWith('localtest.me')) {
      return this.prisma.domain.update({
        where: { id: domainId },
        data: { verified: true },
      });
    }

    const expectedRecord = `proxync-verification=${domain.verificationToken}`;
    const txtHost = `_proxync.${domain.name}`;

    let txtRecords: string[][] = [];
    try {
      txtRecords = await dns.promises.resolveTxt(txtHost);
    } catch (err: any) {
      console.error(`DNS query failed for ${txtHost}:`, err.message);
      throw new ForbiddenException(`TXT record for ${txtHost} not found or could not be resolved.`);
    }

    const flatRecords = txtRecords.flat();
    const verified = flatRecords.some(rec => rec.trim() === expectedRecord);

    if (!verified) {
      throw new ForbiddenException(`TXT verification record found but does not match expected value: ${expectedRecord}`);
    }

    return this.prisma.domain.update({
      where: { id: domainId },
      data: { verified: true },
    });
  }

  async remove(userId: string, workspaceId: string, domainId: string) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    const domain = await this.findOne(userId, workspaceId, domainId);

    await this.prisma.domain.delete({
      where: { id: domain.id },
    });

    return { message: 'Domain deleted successfully' };
  }
}
