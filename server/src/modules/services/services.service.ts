import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceStatus, EntityType } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async createService(
    tenantId: string,
    data: {
      customerId: string;
      title: string;
      description: string;
      slaHours: number;
      dynamicValues: Record<string, any>;
    },
  ) {
    // 1. Resolve Customer Context
    const customer = await this.prisma.customer.findFirst({
      where: { id: data.customerId, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found inside active tenant.');
    }

    // 2. Compute SLA Deadline
    const now = new Date();
    const slaDeadline = new Date(now.getTime() + data.slaHours * 60 * 60 * 1000);

    // 3. Resolve Custom Field Metadata Snapshots
    const activeFields = await this.prisma.customField.findMany({
      where: { tenantId, entityType: EntityType.SERVICE, isActive: true },
    });

    const metadataSchema = activeFields.map((f) => ({
      name: f.name,
      label: f.label,
      type: f.type,
      isRequired: f.isRequired,
    }));

    // 4. Initial Activity Log
    const initialActivity = [
      {
        timestamp: now.toISOString(),
        action: 'CREATED',
        comment: `Ticket opened with a ${data.slaHours}h response SLA window.`,
        user: 'System Agent',
      },
    ];

    return this.prisma.service.create({
      data: {
        tenantId,
        customerId: data.customerId,
        title: data.title,
        description: data.description,
        status: ServiceStatus.OPEN,
        slaDeadline,
        activities: initialActivity,
        dynamicValues: data.dynamicValues,
        metadataSchema,
      },
    });
  }

  async getServiceWithSlaCheck(tenantId: string, id: string) {
    const service = await this.prisma.service.findFirst({
      where: { id, tenantId },
    });
    if (!service) {
      throw new NotFoundException('Service ticket not found.');
    }

    // Dynamic SLA Breach Evaluator
    const now = new Date();
    if (
      service.status !== ServiceStatus.COMPLETED &&
      service.status !== ServiceStatus.BREACHED &&
      now > new Date(service.slaDeadline)
    ) {
      // Dynamic inline breach transition and save
      const updatedActivities = [
        ...(service.activities as any[]),
        {
          timestamp: now.toISOString(),
          action: 'STATUS_CHANGE',
          comment: 'SLA Deadline exceeded. Ticket flagged as BREACHED.',
          user: 'SLA Watchdog',
        },
      ];

      return this.prisma.service.update({
        where: { id },
        data: {
          status: ServiceStatus.BREACHED,
          activities: updatedActivities,
        },
      });
    }

    return service;
  }

  async findAllByTenant(tenantId: string) {
    const services = await this.prisma.service.findMany({
      where: { tenantId },
    });

    // Run dynamic SLA evaluation check across retrieve operations
    const evaluated = [];
    for (const service of services) {
      evaluated.push(await this.getServiceWithSlaCheck(tenantId, service.id));
    }
    return evaluated;
  }

  async addActivity(
    tenantId: string,
    id: string,
    action: string,
    comment: string,
    user: string,
    newStatus?: ServiceStatus,
  ) {
    const service = await this.getServiceWithSlaCheck(tenantId, id);

    const now = new Date();
    const updatedActivities = [
      ...(service.activities as any[]),
      {
        timestamp: now.toISOString(),
        action,
        comment,
        user,
      },
    ];

    const updateData: any = { activities: updatedActivities };
    if (newStatus) {
      updateData.status = newStatus;
    }

    return this.prisma.service.update({
      where: { id },
      data: updateData,
    });
  }
}
