import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        name: dto.name,
        ownerId: userId,
        memberships: {
          create: { userId, role: 'OWNER' },
        },
        // Bug 6 fix: seed a default #general channel so chat is available immediately
        channels: {
          create: { name: 'general', type: 'TEXT' },
        },
      },
      include: { memberships: true },
    });
  }

  async findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        deletedAt: null,
        memberships: { some: { userId } },
      },
      include: {
        memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { tunnels: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, workspaceId: string) {
    const ws = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        deletedAt: null,
        memberships: { some: { userId } },
      },
      include: {
        memberships: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { tunnels: true, apiKeys: true } },
      },
    });
    if (!ws) throw new NotFoundException('Workspace not found');
    return ws;
  }

  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    return this.prisma.workspace.update({
      where: { id: workspaceId },
      data: dto,
    });
  }

  async remove(userId: string, workspaceId: string) {
    await this.assertRole(userId, workspaceId, ['OWNER']);
    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });
    return { message: 'Workspace deleted' };
  }

  async assertRole(
    userId: string,
    workspaceId: string,
    allowed: string[],
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
    if (!allowed.includes(membership.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return membership;
  }
}
