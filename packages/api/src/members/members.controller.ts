import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MembersService } from './members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/member.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';

@ApiTags('Members')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller('workspaces/:workspaceId')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post('invites')
  @ApiOperation({ summary: 'Create an invite link for a workspace' })
  createInvite(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.membersService.createInvite(req.user.id, workspaceId, dto);
  }

  @Post('invites/:token/accept')
  @ApiOperation({ summary: 'Accept an invite token' })
  acceptInvite(@Request() req: any, @Param('token') token: string) {
    return this.membersService.acceptInvite(req.user.id, token);
  }

  @Get('members')
  @ApiOperation({ summary: 'List all workspace members' })
  findAll(@Request() req: any, @Param('workspaceId') workspaceId: string) {
    return this.membersService.findAll(req.user.id, workspaceId);
  }

  @Patch('members/:userId')
  @ApiOperation({ summary: 'Update a member role (Owner/Admin only)' })
  updateRole(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.membersService.updateRole(req.user.id, workspaceId, targetUserId, dto);
  }

  @Delete('members/:userId')
  @ApiOperation({ summary: 'Remove a member (Owner/Admin only)' })
  remove(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('userId') targetUserId: string,
  ) {
    return this.membersService.remove(req.user.id, workspaceId, targetUserId);
  }
}
