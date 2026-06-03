import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from './prisma.service';
import { tenantContextStorage } from './tenant-context';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantHeader = req.headers['x-tenant-id'] as string;

    if (!tenantHeader) {
      // Local Developer Sandbox Fallback - grab the first bootstrapped tenant in DB
      try {
        const fallbackTenant = await this.prisma.tenant.findFirst();
        if (fallbackTenant) {
          tenantContextStorage.run(
            {
              tenantId: fallbackTenant.id,
              slug: fallbackTenant.slug,
              plan: fallbackTenant.plan,
            },
            () => next(),
          );
          return;
        }
      } catch (err: any) {
        this.logger.error(`Error querying fallback tenant: ${err.message || err}`);
      }
      next();
      return;
    }

    try {
      let tenant = null;
      if (tenantHeader.length === 36 || tenantHeader.startsWith('tenant-')) {
        tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantHeader },
        });
      } else {
        tenant = await this.prisma.tenant.findUnique({
          where: { slug: tenantHeader },
        });
      }
      
      if (!tenant) {
        // Graceful Sandbox Fallback: If requested tenant is not registered in SQLite (e.g. local-first workspaces),
        // fallback to the first bootstrapped tenant to preserve the local-first execution context.
        tenant = await this.prisma.tenant.findFirst();
      }

      if (tenant) {
        tenantContextStorage.run(
          {
            tenantId: tenant.id,
            slug: tenant.slug,
            plan: tenant.plan,
          },
          () => next(),
        );
        return;
      }
    } catch (err: any) {
      this.logger.error(`Failed to resolve tenant context: ${err.message || err}`);
    }

    next();
  }
}
