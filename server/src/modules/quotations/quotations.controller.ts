import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/quotations')
@UseGuards(TenantGuard, RbacGuard)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async create(
    @Req() req: any,
    @Body() body: any,
  ) {
    const tenantId = req.tenant.id;
    const creatorId = req.user.id;
    return this.quotationsService.createQuotation(tenantId, creatorId, body);
  }

  @Post(':id/revisions')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async createRevision(
    @Req() req: any,
    @Param('id') quoteId: string,
  ) {
    const tenantId = req.tenant.id;
    const creatorId = req.user.id;
    return this.quotationsService.createRevision(tenantId, creatorId, quoteId);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.quotationsService.listQuotations(tenantId);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') quoteId: string,
  ) {
    const tenantId = req.tenant.id;
    return this.quotationsService.getQuotationById(tenantId, quoteId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(
    @Req() req: any,
    @Param('id') quoteId: string,
  ) {
    const tenantId = req.tenant.id;
    return this.quotationsService.deleteQuotation(tenantId, quoteId);
  }
}
