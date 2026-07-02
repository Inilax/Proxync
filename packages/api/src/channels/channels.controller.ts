import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/channel.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('channels')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller('workspaces/:workspaceId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get()
  findAll(@Request() req: any, @Param('workspaceId') workspaceId: string) {
    return this.channelsService.findAll(req.user.sub, workspaceId);
  }

  @Post()
  create(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(req.user.sub, workspaceId, dto);
  }
}
