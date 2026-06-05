import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionPlan, TenantStatus, UserRole, EntityType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class GovernanceService {
  private readonly logger = new Logger(GovernanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registers a new tenant and automatically provisions default document templates and quota allocations
   */
  async createTenant(body: { name: string; slug: string; currency?: string; timezone?: string }) {
    const { name, slug, currency, timezone } = body;

    // 1. Verify slug uniqueness
    const existing = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (existing) {
      throw new BadRequestException(`Tenant with slug "${slug}" already exists.`);
    }

    // 2. Transact tenant and template creations
    return this.prisma.$transaction(async (tx) => {
      // Create Tenant record
      const tenant = await tx.tenant.create({
        data: {
          name,
          slug,
          currency: currency || 'USD',
          timezone: timezone || 'UTC',
          plan: SubscriptionPlan.BUSINESS,
          status: TenantStatus.ACTIVE,
          brandingConfig: {
            primaryColor: '#6366f1',
            secondaryColor: '#0f172a',
            fontFamily: 'Outfit',
            watermarkText: 'ORIGINAL',
            customCss: '',
          },
          taxConfig: {
            taxBrackets: [
              { name: 'Standard GST', percentage: 18.0 },
              { name: 'Reduced VAT', percentage: 5.0 },
              { name: 'Zero Rated', percentage: 0.0 }
            ]
          },
          numberingFormats: {
            QUOTATION: 'QT-{YYYY}-{NNNN}',
            INVOICE: 'INV-{YYYY}-{NNNN}',
            PURCHASE_ORDER: 'PO-{YYYY}-{NNNN}'
          },
        },
      });

      // Create TenantQuota allocation
      await tx.tenantQuota.create({
        data: {
          tenantId: tenant.id,
          maxCustomFields: 25,
          maxMonthlyExports: 2000,
          maxAiTokens: 1000000,
          maxStorageBytes: 10737418240, // 10GB
          maxWorkflowRuns: 500,
          quotaResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
        },
      });

      // 3. Clone default templates from master 'antigravity' tenant if available
      const masterTenant = await tx.tenant.findUnique({
        where: { slug: 'antigravity' },
      });

      if (masterTenant) {
        const masterTemplates = await tx.template.findMany({
          where: { tenantId: masterTenant.id, isActive: true },
        });

        for (const tpl of masterTemplates) {
          await tx.template.create({
            data: {
              tenantId: tenant.id,
              name: tpl.name,
              entityType: tpl.entityType,
              dataSchema: tpl.dataSchema || {},
              layoutConfig: tpl.layoutConfig || {},
              themeConfig: tpl.themeConfig || {},
              htmlMarkup: tpl.htmlMarkup,
              version: tpl.version,
              isActive: true,
            },
          });
        }
        this.logger.log(`Cloned ${masterTemplates.length} baseline templates for new tenant: ${slug}`);
      }

      this.logger.log(`Tenant successfully registered: ${name} (${slug})`);
      return tenant;
    });
  }

  /**
   * Provisions a new user under a specific tenant slug or tenant ID with hashed credentials
   */
  async createUser(body: {
    tenantSlugOrId: string;
    email: string;
    passwordRaw: string;
    firstName: string;
    lastName: string;
    role: string;
  }) {
    const { tenantSlugOrId, email, passwordRaw, firstName, lastName, role } = body;

    // 1. Resolve tenant context
    let tenant = null;
    if (tenantSlugOrId.length === 36 || tenantSlugOrId.startsWith('tenant-')) {
      tenant = await this.prisma.tenant.findUnique({ where: { id: tenantSlugOrId } });
    } else {
      tenant = await this.prisma.tenant.findUnique({ where: { slug: tenantSlugOrId } });
    }

    if (!tenant) {
      throw new BadRequestException(`Tenant identified by "${tenantSlugOrId}" could not be resolved.`);
    }

    // 2. Check for email collision globally
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new BadRequestException(`User email "${email}" is already registered in the system.`);
    }

    // 3. Cryptographically hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordRaw, salt);

    // 4. Validate and map UserRole enum
    const mappedRole = UserRole[role.toUpperCase() as keyof typeof UserRole];
    if (!mappedRole) {
      throw new BadRequestException(
        `Invalid security access role: "${role}". Must be one of: SUPER_ADMIN, TENANT_ADMIN, FINANCE, SALES, OPERATIONS, VIEWER`,
      );
    }

    if (mappedRole === UserRole.SUPER_ADMIN && email.toLowerCase() !== 'it@innovait-systems.com') {
      throw new BadRequestException(
        'Access denied: The SUPER_ADMIN role can only be held by the SaaS Owner account (it@innovait-systems.com).',
      );
    }

    // 5. Create user record
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash,
        firstName,
        lastName,
        role: mappedRole,
        isActive: true,
      },
    });

    this.logger.log(`User profile created: ${email} under tenant slug ${tenant.slug}`);

    // Return sanitized profile object
    return {
      id: user.id,
      tenantId: user.tenantId,
      tenantSlug: tenant.slug,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateTenant(tenantId: string, body: any) {
    const { name, slug, currency, plan, brandingConfig, features } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (currency !== undefined) data.currency = currency;
    if (plan !== undefined) data.plan = plan;
    if (brandingConfig !== undefined) {
      data.brandingConfig = {
        primaryColor: brandingConfig.primary || brandingConfig.primaryColor || '#6366f1',
        secondaryColor: brandingConfig.secondary || brandingConfig.secondaryColor || '#0f172a',
        fontFamily: brandingConfig.fontFamily || 'Outfit',
        watermarkText: brandingConfig.watermarkText || 'ORIGINAL',
        customCss: brandingConfig.customCss || '',
      };
    }
    if (features !== undefined) data.features = features;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }
}
