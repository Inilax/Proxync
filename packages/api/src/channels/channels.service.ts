import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { CreateChannelDto } from './dto/channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async findAll(userId: string, workspaceId: string) {
    await this.workspacesService.findOne(userId, workspaceId);
    return this.prisma.channel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, workspaceId: string, dto: CreateChannelDto) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);
    return this.prisma.channel.create({
      data: {
        workspaceId,
        name: dto.name.toLowerCase().replace(/\s+/g, '-'),
        type: dto.type ?? 'TEXT',
      },
    });
  }
}
