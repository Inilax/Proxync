import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/member.dto';
import { Role } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async createInvite(userId: string, workspaceId: string, dto: InviteMemberDto) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const invite = await this.prisma.inviteToken.create({
      data: {
        workspaceId,
        email: dto.email,
        role: dto.role ?? Role.MEMBER,
        expiresAt,
      },
    });

    return {
      inviteToken: invite.token,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      // In production, email this link; for now return it directly
      inviteUrl: `${process.env.APP_URL ?? 'http://localhost:5173'}/invite/${invite.token}`,
    };
  }

  async acceptInvite(userId: string, token: string) {
    const invite = await this.prisma.inviteToken.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.usedAt) throw new BadRequestException('Invite already used');
    if (invite.expiresAt < new Date()) throw new BadRequestException('Invite expired');

    // Check if already a member
    const existing = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId } },
    });
    if (existing) throw new BadRequestException('Already a member of this workspace');

    const [membership] = await this.prisma.$transaction([
      this.prisma.membership.create({
        data: { workspaceId: invite.workspaceId, userId, role: invite.role },
      }),
      this.prisma.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return membership;
  }

  async findAll(userId: string, workspaceId: string) {
    // Must be a member to list
    await this.workspacesService.findOne(userId, workspaceId);

    return this.prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async updateRole(
    userId: string,
    workspaceId: string,
    targetUserId: string,
    dto: UpdateMemberRoleDto,
  ) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    if (dto.role === Role.OWNER) {
      throw new ForbiddenException('Cannot transfer ownership via this endpoint');
    }

    const target = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');

    return this.prisma.membership.update({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
      data: { role: dto.role },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async remove(userId: string, workspaceId: string, targetUserId: string) {
    await this.workspacesService.assertRole(userId, workspaceId, ['OWNER', 'ADMIN']);

    const target = await this.prisma.membership.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === Role.OWNER) throw new ForbiddenException('Cannot remove the owner');

    await this.prisma.membership.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });

    return { message: 'Member removed' };
  }
}
