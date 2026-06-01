import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createAuditEntry(params: {
    tenantId: string;
    userId?: string;
    action: string;
    entityType: EntityType;
    entityId: string;
    oldState?: any;
    newState?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    this.logger.log(`Recording tamper-proof SOC2 audit entry: "${params.action}" for tenant ${params.tenantId}`);

    // 1. Retrieve the latest audit entry to construct our signature hash chain!
    const lastAudit = await this.prisma.auditLog.findFirst({
      where: { tenantId: params.tenantId },
      orderBy: { createdAt: 'desc' },
    });

    const previousSignature = lastAudit ? lastAudit.signature : 'GENESIS_SIGNATURE_CHAIN_SEED';

    // 2. Compute cryptographically secure SHA-256 state signature!
    const hash = crypto.createHash('sha256');
    const signaturePayload = [
      previousSignature,
      params.action,
      params.tenantId,
      params.entityId,
      JSON.stringify(params.oldState || {}),
      JSON.stringify(params.newState || {}),
    ].join('|');

    hash.update(signaturePayload);
    const signature = hash.digest('hex');

    // 3. Persist the signed audit record
    return this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldState: params.oldState || null,
        newState: params.newState || null,
        signature,
        ipAddress: params.ipAddress || '127.0.0.1',
        userAgent: params.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  async fetchAuditLogs(tenantId: string, options: {
    query?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    const where: any = { tenantId };

    if (options.query) {
      const isPg = process.env.DATABASE_URL?.startsWith('postgres') || process.env.DATABASE_URL?.startsWith('postgresql');
      const containsFilter = (val: string) => {
        return isPg
          ? { contains: val, mode: 'insensitive' as const }
          : { contains: val };
      };

      where.OR = [
        { action: containsFilter(options.query) },
        { entityId: containsFilter(options.query) },
        { user: { firstName: containsFilter(options.query) } },
        { user: { lastName: containsFilter(options.query) } },
        { user: { email: containsFilter(options.query) } },
      ];
    }

    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      total,
      limit,
      offset,
    };
  }

  // Debug function to verify chain integrity
  async verifyChainIntegrity(tenantId: string): Promise<{ isValid: boolean; breachedIndex?: number }> {
    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' }, // Verify chronologically
    });

    let previousSignature = 'GENESIS_SIGNATURE_CHAIN_SEED';

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const hash = crypto.createHash('sha256');
      const signaturePayload = [
        previousSignature,
        log.action,
        log.tenantId,
        log.entityId,
        JSON.stringify(log.oldState || {}),
        JSON.stringify(log.newState || {}),
      ].join('|');

      hash.update(signaturePayload);
      const computedSignature = hash.digest('hex');

      if (log.signature !== computedSignature) {
        this.logger.error(`Cryptographic chain integrity breach detected at record index ${i} (ID: ${log.id})!`);
        return { isValid: false, breachedIndex: i };
      }

      previousSignature = log.signature;
    }

    return { isValid: true };
  }
}
