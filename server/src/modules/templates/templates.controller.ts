import { Controller, Post, Get, Delete, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/templates')
@UseGuards(TenantGuard, RbacGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  async create(@Req() req: any, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.templatesService.createTemplate(tenantId, body);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.templatesService.listTemplates(tenantId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenant.id;
    return this.templatesService.getTemplateById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.templatesService.updateTemplate(tenantId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  async remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenant.id;
    return this.templatesService.deleteTemplate(tenantId, id);
  }
}
