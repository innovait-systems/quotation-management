import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionPlan } from '@prisma/client';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTenantQuota(tenantId: string) {
    let quota = await this.prisma.tenantQuota.findUnique({
      where: { tenantId },
    });

    // If quota configuration doesn't exist, initialize defaults
    if (!quota) {
      this.logger.log(`Initializing default FREE subscription quota for tenant ${tenantId}`);
      quota = await this.prisma.tenantQuota.create({
        data: {
          tenantId,
          maxCustomFields: 5,
          maxMonthlyExports: 10,
          maxAiTokens: 50000,
          maxStorageBytes: BigInt(500 * 1024 * 1024), // 500MB
          maxWorkflowRuns: 100,
          quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });
    }

    // Convert BigInt values to standard numbers or string structures for JSON-safety!
    return {
      ...quota,
      maxStorageBytes: Number(quota.maxStorageBytes),
      usedStorageBytes: Number(quota.usedStorageBytes),
    };
  }

  async upgradeSubscriptionPlan(tenantId: string, newPlan: SubscriptionPlan) {
    this.logger.log(`Upgrading subscription tier of tenant ${tenantId} to plan ${newPlan}`);

    // Define quota tiers mapping
    let limits = {
      maxCustomFields: 5,
      maxMonthlyExports: 10,
      maxAiTokens: 50000,
      maxStorageBytes: BigInt(500 * 1024 * 1024), // 500MB
      maxWorkflowRuns: 100,
    };

    if (newPlan === SubscriptionPlan.STARTUP) {
      limits = {
        maxCustomFields: 15,
        maxMonthlyExports: 50,
        maxAiTokens: 200000,
        maxStorageBytes: BigInt(2 * 1024 * 1024 * 1024), // 2GB
        maxWorkflowRuns: 500,
      };
    } else if (newPlan === SubscriptionPlan.BUSINESS) {
      limits = {
        maxCustomFields: 50,
        maxMonthlyExports: 250,
        maxAiTokens: 1000000,
        maxStorageBytes: BigInt(10 * 1024 * 1024 * 1024), // 10GB
        maxWorkflowRuns: 2500,
      };
    } else if (newPlan === SubscriptionPlan.ENTERPRISE) {
      limits = {
        maxCustomFields: 999, // Practically unlimited
        maxMonthlyExports: 9999,
        maxAiTokens: 100000000,
        maxStorageBytes: BigInt(500 * 1024 * 1024 * 1024), // 500GB
        maxWorkflowRuns: 99999,
      };
    }

    // Execute atomic transacted updates on Tenant plan and Quota limits!
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update Tenant profile
      await tx.tenant.update({
        where: { id: tenantId },
        data: { plan: newPlan },
      });

      // 2. Upsert TenantQuota limits
      const updatedQuota = await tx.tenantQuota.upsert({
        where: { tenantId },
        update: {
          ...limits,
          quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
          tenantId,
          ...limits,
          quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      // 3. Log the administrative audit trail
      await tx.auditLog.create({
        data: {
          tenantId,
          action: 'TENANT_PLAN_UPGRADED',
          entityType: 'QUOTATION', // General compliance category fallback
          entityId: tenantId,
          newState: { plan: newPlan, limits: { ...limits, maxStorageBytes: limits.maxStorageBytes.toString() } },
          signature: `UPGRADE-${tenantId}-${newPlan}`,
          ipAddress: '127.0.0.1',
          userAgent: 'System Compiler',
        },
      });

      return updatedQuota;
    });

    return {
      ...result,
      maxStorageBytes: Number(result.maxStorageBytes),
      usedStorageBytes: Number(result.usedStorageBytes),
    };
  }

  async checkQuotaAllowance(tenantId: string, metric: 'fields' | 'exports' | 'aiTokens' | 'workflowRuns', requestAmount = 1) {
    const quota = await this.getTenantQuota(tenantId);

    if (metric === 'fields' && quota.usedCustomFields + requestAmount > quota.maxCustomFields) {
      throw new BadRequestException(`Subscription limit exceeded: Active custom field properties (${quota.usedCustomFields}) reached maximum threshold allowed under ${quota.maxCustomFields} rules.`);
    }

    if (metric === 'exports' && quota.usedMonthlyExports + requestAmount > quota.maxMonthlyExports) {
      throw new BadRequestException(`Subscription limit exceeded: Document export requests exceeded allowed threshold (${quota.maxMonthlyExports}) for this billing cycle.`);
    }

    if (metric === 'aiTokens' && quota.usedAiTokens + requestAmount > quota.maxAiTokens) {
      throw new BadRequestException(`Subscription limit exceeded: AI Prompt generation token limit exhausted. Max monthly allowance: ${quota.maxAiTokens}.`);
    }

    if (metric === 'workflowRuns' && quota.usedWorkflowRuns + requestAmount > quota.maxWorkflowRuns) {
      throw new BadRequestException(`Subscription limit exceeded: No-code automation execution count reached active quota block (${quota.maxWorkflowRuns}).`);
    }

    // Increment values atomically in database
    await this.prisma.tenantQuota.update({
      where: { tenantId },
      data: {
        usedCustomFields: metric === 'fields' ? { increment: requestAmount } : undefined,
        usedMonthlyExports: metric === 'exports' ? { increment: requestAmount } : undefined,
        usedAiTokens: metric === 'aiTokens' ? { increment: requestAmount } : undefined,
        usedWorkflowRuns: metric === 'workflowRuns' ? { increment: requestAmount } : undefined,
      },
    });

    return true;
  }
}
