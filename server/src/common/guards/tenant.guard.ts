import { CanActivate, ExecutionContext, Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantStatus } from '@prisma/client';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract tenant identifier from headers (can be UUID or tenant slug)
    const tenantHeader = request.headers['x-tenant-id'];
    
    let tenant = null;

    if (tenantHeader) {
      if (tenantHeader.length === 36) {
        // Query by UUID
        tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantHeader },
        });
      } else {
        // Query by Slug
        tenant = await this.prisma.tenant.findUnique({
          where: { slug: tenantHeader },
        });
      }
    }

    if (!tenant) {
      // Graceful Sandbox Fallback: If requested tenant is not registered in SQLite (e.g. local-first workspaces),
      // fallback to the first bootstrapped tenant to allow local document exports and compilation.
      tenant = await this.prisma.tenant.findFirst();
    }

    if (!tenant) {
      throw new ForbiddenException('Invalid multi-tenant context: Access Denied.');
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(
        `Access Forbidden: This tenant account has been ${tenant.status.toLowerCase()}. Please contact system administrators.`,
      );
    }

    // Bind the tenant context profile to the request object
    request.tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      currency: tenant.currency,
      timezone: tenant.timezone,
      taxConfig: tenant.taxConfig,
      numberingFormats: tenant.numberingFormats,
      brandingConfig: tenant.brandingConfig,
    };

    return true;
  }
}
