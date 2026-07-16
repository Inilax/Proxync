import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DomainsService } from './domains.service';
import { CreateDomainDto } from './dto/domain.dto';
import { BearerGuard } from '../auth/guards/bearer.guard';

@ApiTags('Domains')
@ApiBearerAuth('bearer')
@UseGuards(BearerGuard)
@Controller('domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Post()
  @ApiOperation({ summary: 'Register a new custom domain' })
  create(
    @Request() req: any,
    @Body() dto: CreateDomainDto,
  ) {
    return this.domainsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List custom domains' })
  findAll(@Request() req: any) {
    return this.domainsService.findAll(req.user.id);
  }

  @Get(':domainId')
  @ApiOperation({ summary: 'Get details of a custom domain' })
  findOne(
    @Request() req: any,
    @Param('domainId') domainId: string,
  ) {
    return this.domainsService.findOne(req.user.id, domainId);
  }

  @Post(':domainId/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger DNS verification check' })
  verify(
    @Request() req: any,
    @Param('domainId') domainId: string,
  ) {
    return this.domainsService.verify(req.user.id, domainId);
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Delete a registered domain' })
  remove(
    @Request() req: any,
    @Param('domainId') domainId: string,
  ) {
    return this.domainsService.remove(req.user.id, domainId);
  }
}
