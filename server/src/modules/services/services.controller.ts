import { Controller, Get, Post, Param, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ServiceStatus } from '@prisma/client';

@Controller('api/v1/services')
@UseGuards(TenantGuard, RbacGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN, UserRole.OPERATIONS)
  async createTicket(
    @Req() req: any,
    @Body() body: {
      customerId: string;
      title: string;
      description: string;
      slaHours: number;
      dynamicValues?: Record<string, any>;
    },
  ) {
    if (!body.customerId || !body.title || !body.description || !body.slaHours) {
      throw new BadRequestException('customerId, title, description, and slaHours are required body parameters.');
    }
    const tenantId = req.tenant.id;
    return this.servicesService.createService(tenantId, {
      customerId: body.customerId,
      title: body.title,
      description: body.description,
      slaHours: body.slaHours,
      dynamicValues: body.dynamicValues || {},
    });
  }

  @Get()
  async getTickets(@Req() req: any) {
    const tenantId = req.tenant.id;
    return this.servicesService.findAllByTenant(tenantId);
  }

  @Get(':id')
  async getTicketDetails(
    @Req() req: any,
    @Param('id') ticketId: string,
  ) {
    const tenantId = req.tenant.id;
    return this.servicesService.getServiceWithSlaCheck(tenantId, ticketId);
  }

  @Post(':id/activity')
  @Roles(UserRole.TENANT_ADMIN, UserRole.OPERATIONS)
  async recordActivity(
    @Req() req: any,
    @Param('id') ticketId: string,
    @Body() body: {
      action: string;
      comment: string;
      user: string;
      newStatus?: ServiceStatus;
    },
  ) {
    if (!body.action || !body.comment || !body.user) {
      throw new BadRequestException('action, comment, and user are required body parameters.');
    }
    const tenantId = req.tenant.id;
    return this.servicesService.addActivity(
      tenantId,
      ticketId,
      body.action,
      body.comment,
      body.user,
      body.newStatus,
    );
  }
}
