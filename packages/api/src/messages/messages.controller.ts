import {
  Controller, Get, Post, Patch, Body, Param, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto, UpdateMessageDto } from './dto/message.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('messages')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('channels/:channelId/messages')
  findAll(
    @Request() req: any,
    @Param('channelId') channelId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('before') before?: string,
  ) {
    return this.messagesService.findAll(req.user.sub, channelId, limit, before);
  }

  @Post('channels/:channelId/messages')
  create(
    @Request() req: any,
    @Param('channelId') channelId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(req.user.sub, channelId, dto);
  }

  @Patch('messages/:messageId')
  update(
    @Request() req: any,
    @Param('messageId') messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.messagesService.update(req.user.sub, messageId, dto);
  }
}
