import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/invoices')
@UseGuards(TenantGuard, RbacGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.FINANCE)
  async create(
    @Req() req: any,
    @Body() body: any,
  ) {
    const tenantId = req.tenant.id;
    const creatorId = req.user.id;
    return this.invoicesService.createInvoice(tenantId, creatorId, body);
  }

  @Post('convert/:quoteId')
  @Roles(UserRole.TENANT_ADMIN, UserRole.FINANCE, UserRole.SALES)
  async convert(
    @Req() req: any,
    @Param('quoteId') quoteId: string,
  ) {
    const tenantId = req.tenant.id;
    const creatorId = req.user.id;
    return this.invoicesService.convertQuotation(tenantId, creatorId, quoteId);
  }

  @Post(':id/payments')
  @Roles(UserRole.TENANT_ADMIN, UserRole.FINANCE)
  async recordPayment(
    @Req() req: any,
    @Param('id') invoiceId: string,
    @Body('amount') amount: number,
  ) {
    const tenantId = req.tenant.id;
    return this.invoicesService.recordPayment(tenantId, invoiceId, amount);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.invoicesService.listInvoices(tenantId);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') invoiceId: string,
  ) {
    const tenantId = req.tenant.id;
    return this.invoicesService.getInvoiceById(tenantId, invoiceId);
  }
}
