import { Controller, Get, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, SubscriptionPlan } from '@prisma/client';

@Controller('api/v1/billing')
@UseGuards(TenantGuard, RbacGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('quota')
  async getQuota(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.billingService.getTenantQuota(tenantId);
  }

  @Post('upgrade')
  @Roles(UserRole.TENANT_ADMIN)
  async upgradePlan(
    @Req() req: any,
    @Body('plan') plan: SubscriptionPlan,
  ) {
    if (!plan || !Object.values(SubscriptionPlan).includes(plan)) {
      throw new BadRequestException('A valid subscription tier plan (e.g. STARTUP, BUSINESS, ENTERPRISE) must be provided in the request body.');
    }
    const tenantId = req.tenant.id;
    return this.billingService.upgradeSubscriptionPlan(tenantId, plan);
  }
}
