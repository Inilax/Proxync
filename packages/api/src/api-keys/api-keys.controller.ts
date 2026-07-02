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
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';

@ApiTags('API Keys')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller('workspaces/:workspaceId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create an API key (shown only once)' })
  create(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(req.user.id, workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List API keys (masked prefix only)' })
  findAll(@Request() req: any, @Param('workspaceId') workspaceId: string) {
    return this.apiKeysService.findAll(req.user.id, workspaceId);
  }

  @Delete(':keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  revoke(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeysService.revoke(req.user.id, workspaceId, keyId);
  }
}
