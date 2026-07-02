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
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspace.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';

@ApiTags('Workspaces')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workspace' })
  create(@Request() req: any, @Body() dto: CreateWorkspaceDto) {
    return this.workspacesService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "List user's workspaces" })
  findAll(@Request() req: any) {
    return this.workspacesService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workspace detail' })
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.workspacesService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update workspace (Owner/Admin only)' })
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete workspace (Owner only)' })
  remove(@Request() req: any, @Param('id') id: string) {
    return this.workspacesService.remove(req.user.id, id);
  }
}
