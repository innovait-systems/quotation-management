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
    const { name, slug, currency, plan, brandingConfig, features, email, address, gstNumber, authorizedPersons, bankDetails, rolePermissions, numberingFormats, numberingSequences } = body;

    // Build database update payload with only valid Prisma Tenant columns
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (currency !== undefined) data.currency = currency;
    if (plan !== undefined) data.plan = plan;
    if (numberingFormats !== undefined) data.numberingFormats = numberingFormats;

    // Pack brandingConfig with extended metadata into the JSON column
    // The brandingConfig JSON stores: core branding + extended tenant metadata
    // that doesn't have dedicated Prisma columns (features, email, address, etc.)
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      throw new BadRequestException(`Tenant with ID "${tenantId}" not found.`);
    }

    const existingBranding = (existingTenant.brandingConfig as any) || {};

    // Merge branding visual config
    const mergedBranding: any = {
      primaryColor: brandingConfig?.primary || brandingConfig?.primaryColor || existingBranding.primaryColor || '#6366f1',
      secondaryColor: brandingConfig?.secondary || brandingConfig?.secondaryColor || existingBranding.secondaryColor || '#0f172a',
      fontFamily: brandingConfig?.fontFamily || existingBranding.fontFamily || 'Outfit',
      watermarkText: brandingConfig?.watermarkText || existingBranding.watermarkText || 'ORIGINAL',
      customCss: brandingConfig?.customCss || existingBranding.customCss || '',
    };

    // Pack extended metadata into brandingConfig JSON 
    if (features !== undefined) mergedBranding.features = features;
    else if (existingBranding.features) mergedBranding.features = existingBranding.features;

    if (email !== undefined) mergedBranding.email = email;
    else if (existingBranding.email) mergedBranding.email = existingBranding.email;

    if (address !== undefined) mergedBranding.address = address;
    else if (existingBranding.address) mergedBranding.address = existingBranding.address;

    if (gstNumber !== undefined) mergedBranding.gstNumber = gstNumber;
    else if (existingBranding.gstNumber) mergedBranding.gstNumber = existingBranding.gstNumber;

    if (authorizedPersons !== undefined) mergedBranding.authorizedPersons = authorizedPersons;
    else if (existingBranding.authorizedPersons) mergedBranding.authorizedPersons = existingBranding.authorizedPersons;

    if (bankDetails !== undefined) mergedBranding.bankDetails = bankDetails;
    else if (existingBranding.bankDetails) mergedBranding.bankDetails = existingBranding.bankDetails;

    if (rolePermissions !== undefined) mergedBranding.rolePermissions = rolePermissions;
    else if (existingBranding.rolePermissions) mergedBranding.rolePermissions = existingBranding.rolePermissions;

    if (numberingSequences !== undefined) mergedBranding.numberingSequences = numberingSequences;
    else if (existingBranding.numberingSequences) mergedBranding.numberingSequences = existingBranding.numberingSequences;

    data.brandingConfig = mergedBranding;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async listUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateUser(userId: string, body: any) {
    const { firstName, lastName, email, role, isActive, password } = body;
    const data: any = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName !== undefined) data.lastName = lastName;
    if (email !== undefined) data.email = email;
    if (role !== undefined) {
      const mappedRole = UserRole[role.toUpperCase() as keyof typeof UserRole];
      if (mappedRole) data.role = mappedRole;
    }
    if (isActive !== undefined) data.isActive = isActive;
    if (password !== undefined && password !== '') {
      const salt = await bcrypt.genSalt(10);
      data.passwordHash = await bcrypt.hash(password, salt);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async deleteUser(userId: string) {
    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}
