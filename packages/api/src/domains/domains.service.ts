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

    // Auto-verify localtest.me domains for easy local testing
    if (domain.name.endsWith('localtest.me')) {
      return this.prisma.domain.update({
        where: { id: domainId },
        data: { verified: true },
      });
    }

    const expectedRecord = `proxync-verification=${domain.verificationToken}`;
    const txtHost = `_proxync.${domain.name}`;

    const resolver = new dns.promises.Resolver();
    resolver.setServers(['1.1.1.1', '8.8.8.8']);

    // 1. Verify Ownership TXT Record
    let txtRecords: string[][] = [];
    try {
      txtRecords = await resolver.resolveTxt(txtHost);
    } catch (err: any) {
      console.error(`DNS query failed for ${txtHost}:`, err.message);
      throw new ForbiddenException(`TXT verification record for ${txtHost} not found. Ensure you add a TXT record with value: ${expectedRecord}`);
    }

    const flatRecords = txtRecords.flat();
    const txtVerified = flatRecords.some(rec => rec.trim() === expectedRecord);

    if (!txtVerified) {
      throw new ForbiddenException(`TXT verification record found but does not match expected value: ${expectedRecord}`);
    }

    // 2. Verify Traffic Routing Record (CNAME or A pointing to relay server base domain)
    const relayBase = process.env.RELAY_SUBDOMAIN_BASE || 'localtest.me';
    let isConfigured = false;

    try {
      // Check A records for both domain and relayBase
      const [domainIps, relayIps] = await Promise.all([
        resolver.resolve4(domain.name).catch(() => [] as string[]),
        resolver.resolve4(relayBase).catch(() => [] as string[]),
      ]);

      if (domainIps.length > 0 && relayIps.length > 0) {
        isConfigured = domainIps.some(ip => relayIps.includes(ip));
      }

      // Check CNAME record as fallback
      if (!isConfigured) {
        const cnames = await resolver.resolveCname(domain.name).catch(() => [] as string[]);
        isConfigured = cnames.some(cname => cname.endsWith(relayBase) || cname === relayBase);
      }
    } catch (err) {
      // Ignore resolution errors and let the failure throw
    }

    if (!isConfigured) {
      throw new ForbiddenException(`Ownership TXT record verified, but the domain does not point to your relay host (${relayBase}). Please configure an A record pointing to ${relayBase} or a CNAME record.`);
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
