import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/compliance')
@UseGuards(TenantGuard, RbacGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('audit-logs')
  @Roles(UserRole.TENANT_ADMIN)
  async getAuditLogs(
    @Req() req: any,
    @Query('query') query?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const tenantId = req.tenant.id;
    return this.complianceService.fetchAuditLogs(tenantId, {
      query,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get('verify')
  @Roles(UserRole.TENANT_ADMIN)
  async verifyIntegrity(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.complianceService.verifyChainIntegrity(tenantId);
  }
}
