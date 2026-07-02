import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, channelId: string, limit = 50, before?: string) {
    // Verify user is a member of the channel's workspace
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: { include: { memberships: { where: { userId } } } } },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.workspace.memberships.length === 0) throw new ForbiddenException('Not a member');

    return this.prisma.message.findMany({
      where: {
        channelId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async create(userId: string, channelId: string, dto: CreateMessageDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: { workspace: { include: { memberships: { where: { userId } } } } },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.workspace.memberships.length === 0) throw new ForbiddenException('Not a member');

    return this.prisma.message.create({
      data: {
        channelId,
        userId,
        text: dto.text ?? '',   // default to '' when only a screenshot is sent
        kind: dto.kind ?? 'CHAT',
        screenshotUrl: dto.screenshotUrl,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }

  async update(userId: string, messageId: string, dto: UpdateMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.userId !== userId && dto.text !== undefined) {
      throw new ForbiddenException('Cannot edit another user\'s message');
    }
    return this.prisma.message.update({
      where: { id: messageId },
      data: {
        ...(dto.resolved !== undefined ? { resolved: dto.resolved } : {}),
        ...(dto.text !== undefined ? { text: dto.text } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
  }
}
