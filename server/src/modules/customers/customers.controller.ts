import { Controller, Post, Get, Delete, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/customers')
@UseGuards(TenantGuard, RbacGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async create(@Req() req: any, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.customersService.createCustomer(tenantId, body);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.customersService.listCustomers(tenantId);
  }

  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenant.id;
    return this.customersService.getCustomerById(tenantId, id);
  }

  @Put(':id')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES)
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const tenantId = req.tenant.id;
    return this.customersService.updateCustomer(tenantId, id, body);
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  async remove(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.tenant.id;
    return this.customersService.deleteCustomer(tenantId, id);
  }
}
