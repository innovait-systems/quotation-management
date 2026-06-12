import { Controller, Post, Get, Delete, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/agreements')
@UseGuards(TenantGuard, RbacGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async create(@Req() req: any, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.agreementsService.createAgreement(tenantId, body);
  }

  @Post(':id/versions')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async addVersion(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.agreementsService.addVersion(tenantId, id, body);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.agreementsService.listAgreements(tenantId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenant.id;
    return this.agreementsService.getAgreementById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.agreementsService.updateAgreement(tenantId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  async remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenant.id;
    return this.agreementsService.deleteAgreement(tenantId, id);
  }
}
