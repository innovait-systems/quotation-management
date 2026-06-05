import { Controller, Post, Get, Delete, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/purchase-orders')
@UseGuards(TenantGuard, RbacGuard)
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.OPERATIONS)
  async create(
    @Req() req: any,
    @Body() body: any,
  ) {
    const tenantId = req.tenant.id;
    return this.purchaseOrdersService.createPurchaseOrder(tenantId, body);
  }

  @Post('convert/:quoteId')
  @Roles(UserRole.TENANT_ADMIN, UserRole.OPERATIONS, UserRole.SALES)
  async convert(
    @Req() req: any,
    @Param('quoteId') quoteId: string,
    @Body('supplierId') supplierId: string,
  ) {
    if (!supplierId) {
      throw new BadRequestException('supplierId must be provided in the request body to execute quotation-to-PO conversion.');
    }
    const tenantId = req.tenant.id;
    return this.purchaseOrdersService.convertQuotation(tenantId, supplierId, quoteId);
  }

  @Post(':id/receive')
  @Roles(UserRole.TENANT_ADMIN, UserRole.OPERATIONS)
  async receive(
    @Req() req: any,
    @Param('id') poId: string,
    @Body('items') items: Array<{ lineId: string; quantity: number }>,
  ) {
    const tenantId = req.tenant.id;
    return this.purchaseOrdersService.receivePOItems(tenantId, poId, items);
  }

  @Get()
  async findAll(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.purchaseOrdersService.listPurchaseOrders(tenantId);
  }

  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') poId: string,
  ) {
    const tenantId = req.tenant.id;
    return this.purchaseOrdersService.getPOById(tenantId, poId);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(
    @Req() req: any,
    @Param('id') poId: string,
  ) {
    const tenantId = req.tenant.id;
    return this.purchaseOrdersService.deletePurchaseOrder(tenantId, poId);
  }
}
