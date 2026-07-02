import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TunnelsService } from './tunnels.service';
import { CreateTunnelDto } from './dto/tunnel.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';

@ApiTags('Tunnels')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller('workspaces/:workspaceId/tunnels')
export class TunnelsController {
  constructor(private readonly tunnelsService: TunnelsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a tunnel for a local port' })
  create(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateTunnelDto,
  ) {
    const isApiKey = req.user.type === 'api_key';
    return this.tunnelsService.create(
      isApiKey ? null : req.user.id,
      workspaceId,
      dto,
      isApiKey ? undefined : req.user.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List tunnels in a workspace' })
  findAll(@Request() req: any, @Param('workspaceId') workspaceId: string) {
    return this.tunnelsService.findAll(
      req.user.type === 'api_key' ? null : req.user.id,
      workspaceId,
    );
  }

  @Get(':tunnelId')
  @ApiOperation({ summary: 'Get tunnel detail' })
  findOne(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('tunnelId') tunnelId: string,
  ) {
    return this.tunnelsService.findOne(
      req.user.type === 'api_key' ? null : req.user.id,
      workspaceId,
      tunnelId,
    );
  }

  @Delete(':tunnelId')
  @ApiOperation({ summary: 'Close a tunnel' })
  close(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('tunnelId') tunnelId: string,
  ) {
    return this.tunnelsService.close(
      req.user.type === 'api_key' ? null : req.user.id,
      workspaceId,
      tunnelId,
    );
  }

  @Get(':tunnelId/bandwidth')
  @ApiOperation({ summary: 'Get bandwidth usage for a tunnel' })
  getBandwidth(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('tunnelId') tunnelId: string,
  ) {
    return this.tunnelsService.getBandwidth(
      req.user.type === 'api_key' ? null : req.user.id,
      workspaceId,
      tunnelId,
    );
  }
}
