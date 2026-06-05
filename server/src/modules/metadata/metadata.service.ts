import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FormulaEngine } from '../../common/formula/formula.engine';
import { EntityType, FieldType, CustomField } from '@prisma/client';
import { z } from 'zod';

@Injectable()
export class MetadataService {
  private readonly logger = new Logger(MetadataService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly formulaEngine: FormulaEngine,
  ) {}

  async createCustomField(tenantId: string, data: {
    entityType: EntityType;
    name: string;
    label: string;
    type: FieldType;
    isRequired?: boolean;
    defaultValue?: string;
    options?: any;
    validationRules?: any;
    formula?: string;
    visibilityRule?: any;
    sortOrder?: number;
  }) {
    // 1. Enforce strict subscription quota restrictions
    const quota = await this.prisma.tenantQuota.findUnique({
      where: { tenantId },
    });

    if (quota && quota.usedCustomFields >= quota.maxCustomFields) {
      throw new BadRequestException(
        `Quota threshold exceeded: Your subscription tier permits a maximum of ${quota.maxCustomFields} dynamic properties.`,
      );
    }

    // Validate technical key identifier format
    const nameRegex = /^[a-z0-9_]+$/;
    if (!nameRegex.test(data.name)) {
      throw new BadRequestException('Dynamic property system names must be lowercase alphanumeric string characters with underscores only.');
    }

    const field = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customField.create({
        data: {
          tenantId,
          entityType: data.entityType,
          name: data.name,
          label: data.label,
          type: data.type,
          isRequired: data.isRequired || false,
          defaultValue: data.defaultValue,
          options: data.options,
          validationRules: data.validationRules,
          formula: data.formula,
          visibilityRule: data.visibilityRule,
          sortOrder: data.sortOrder || 0,
        },
      });

      if (quota) {
        await tx.tenantQuota.update({
          where: { tenantId },
          data: { usedCustomFields: { increment: 1 } },
        });
      }

      return created;
    });

    return field;
  }

  async getCustomFields(tenantId: string, entityType: EntityType) {
    return this.prisma.customField.findMany({
      where: { tenantId, entityType, isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async deleteCustomField(tenantId: string, fieldId: string) {
    return this.prisma.$transaction(async (tx) => {
      const field = await tx.customField.findFirst({
        where: { id: fieldId, tenantId },
      });
      
      if (!field) {
        throw new BadRequestException('Dynamic property configuration details not found.');
      }

      await tx.customField.delete({
        where: { id: fieldId },
      });

      await tx.tenantQuota.update({
        where: { tenantId },
        data: { usedCustomFields: { decrement: 1 } },
      });

      return { success: true };
    });
  }

  /**
   * Compiles dynamic database custom field definitions into a live validation runtime Zod model
   */
  compileZodSchema(customFields: CustomField[]): z.ZodObject<any> {
    const shape: Record<string, any> = {};

    customFields.forEach((field) => {
      // Formula fields are calculated internally by the calculation engine, not supplied by client inputs directly.
      if (field.type === FieldType.FORMULA) {
        shape[field.name] = z.any().optional();
        return;
      }

      let validator: any = z.any();

      switch (field.type) {
        case FieldType.TEXT:
        case FieldType.RICH_TEXT:
          validator = z.string();
          const rules = field.validationRules as Record<string, any> | null;
          if (rules?.regex) {
            validator = validator.regex(new RegExp(rules.regex), rules.message || 'Pattern verification fail.');
          }
          break;
        case FieldType.NUMBER:
        case FieldType.CURRENCY:
          validator = z.number();
          const numRules = field.validationRules as Record<string, any> | null;
          if (numRules?.min !== undefined) validator = validator.min(numRules.min);
          if (numRules?.max !== undefined) validator = validator.max(numRules.max);
          break;
        case FieldType.DATE:
          validator = z.preprocess((arg) => {
            if (typeof arg === 'string' || arg instanceof Date) return new Date(arg);
          }, z.date());
          break;
        case FieldType.CHECKBOX:
          validator = z.preprocess((val) => val === 'true' || val === true, z.boolean());
          break;
        case FieldType.DROPDOWN:
          const options = field.options as string[] | null;
          if (options && options.length > 0) {
            validator = z.string().refine((val) => options.includes(val), `Value must be one of: ${options.join(', ')}`);
          } else {
            validator = z.string();
          }
          break;
        case FieldType.MULTI_SELECT:
          const multiOptions = field.options as string[] | null;
          if (multiOptions && multiOptions.length > 0) {
            validator = z.array(z.string()).refine((vals) => vals.every((v) => multiOptions.includes(v)));
          } else {
            validator = z.array(z.string());
          }
          break;
        default:
          validator = z.any();
      }

      if (!field.isRequired) {
        validator = validator.optional().nullable();
      }

      shape[field.name] = validator;
    });

    return z.object(shape);
  }

  /**
   * Compiles layout schema definitions and executes model parsing.
   * Throws BadRequestException detailing parameter compilation errors.
   */
  async validatePayload(tenantId: string, entityType: EntityType, payload: Record<string, any>): Promise<Record<string, any>> {
    const fields = await this.getCustomFields(tenantId, entityType);
    const zodSchema = this.compileZodSchema(fields);

    try {
      return zodSchema.parse(payload);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.issues.map((err: any) => `"${err.path.join('.')}" validation failure: ${err.message}`).join(', ');
        throw new BadRequestException(`Metadata constraints validation error: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * Safely calculates values of formulas and sets final values inside the custom document properties
   * @param tenantId Target tenant owner ID context
   * @param entityType Document context type (e.g. QUOTATION)
   * @param payload Dynamic values object key-map supplied by user
   * @param context Numerical baseline parameters used for mathematical calculations (e.g. { subTotal, taxTotal, grandTotal })
   */
  async evaluateFormulaFields(
    tenantId: string,
    entityType: EntityType,
    payload: Record<string, any>,
    context: Record<string, number>,
  ): Promise<Record<string, any>> {
    const fields = await this.getCustomFields(tenantId, entityType);
    const formulaFields = fields.filter((f) => f.type === FieldType.FORMULA && f.formula);

    const calculatedPayload = { ...payload };

    formulaFields.forEach((field) => {
      try {
        const expression = field.formula!;
        // The sandbox takes a unified context consisting of raw numbers from subTotals plus other inputs
        const combinedContext = { ...context, ...payload };
        
        const computed = this.formulaEngine.evaluate(expression, combinedContext);
        calculatedPayload[field.name] = computed;
      } catch (err) {
        this.logger.warn(`Dynamic field formula error for "${field.name}" using expression "${field.formula}": ${err.message}`);
        calculatedPayload[field.name] = 0; // Default zero assignment prevents broken accounting math
      }
    });

    return calculatedPayload;
  }

  async generateNextNumber(tenantId: string, entityType: EntityType): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, numberingFormats: true }
      });
      if (!tenant) {
        throw new BadRequestException('Tenant not found.');
      }

      const numberingConfig = (tenant.numberingFormats || {}) as any;

      const formats = {
        QUOTATION: numberingConfig.QUOTATION || 'QT-{YYYY}-{NNN}',
        PURCHASE_ORDER: numberingConfig.PURCHASE_ORDER || 'PO-{YYYY}-{NNN}',
        INVOICE: numberingConfig.INVOICE || 'INV-{YYYY}-{NNN}',
        SERVICE: numberingConfig.SERVICE || 'SVC-{YYYY}-{NNN}'
      };
      
      const sequences = numberingConfig.sequences || {
        QUOTATION: 1,
        PURCHASE_ORDER: 1,
        INVOICE: 1,
        SERVICE: 1
      };

      const pattern = formats[entityType] || `${entityType.substring(0, 3)}-{YYYY}-{NNN}`;
      const currentSeq = sequences[entityType] || 1;

      const now = new Date();
      const year = now.getFullYear().toString();
      let formatted = pattern.replace(/{YYYY}/g, year);

      const nMatch = pattern.match(/{N+}/);
      if (nMatch) {
        const fullMatch = nMatch[0];
        const nLength = fullMatch.length - 2;
        const padded = currentSeq.toString().padStart(nLength, '0');
        formatted = formatted.replace(fullMatch, padded);
      } else {
        // Fallback for standard {NNN} formatting patterns if no {N+} matches directly
        const nnnMatch = pattern.match(/{NNN+}/);
        if (nnnMatch) {
          const fullMatch = nnnMatch[0];
          const nLength = fullMatch.length - 2;
          const padded = currentSeq.toString().padStart(nLength, '0');
          formatted = formatted.replace(fullMatch, padded);
        }
      }

      const updatedSequences = {
        ...sequences,
        [entityType]: currentSeq + 1
      };

      const updatedNumberingFormats = {
        ...numberingConfig,
        sequences: updatedSequences
      };

      await tx.tenant.update({
        where: { id: tenantId },
        data: { numberingFormats: updatedNumberingFormats }
      });

      return formatted;
    });
  }

  async updateNumberingFormats(tenantId: string, formats: Record<string, string>): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, numberingFormats: true }
      });
      if (!tenant) {
        throw new BadRequestException('Tenant not found.');
      }

      const numberingConfig = (tenant.numberingFormats || {}) as any;
      const currentSequences = numberingConfig.sequences || {
        QUOTATION: 1,
        PURCHASE_ORDER: 1,
        INVOICE: 1,
        SERVICE: 1
      };

      const updatedNumberingFormats = {
        ...numberingConfig,
        ...formats,
        sequences: currentSequences
      };

      await tx.tenant.update({
        where: { id: tenantId },
        data: { numberingFormats: updatedNumberingFormats }
      });

      return updatedNumberingFormats;
    });
  }

  async resetSequence(tenantId: string, entityType: EntityType): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, numberingFormats: true }
      });
      if (!tenant) {
        throw new BadRequestException('Tenant not found.');
      }

      const numberingConfig = (tenant.numberingFormats || {}) as any;
      const currentSequences = numberingConfig.sequences || {
        QUOTATION: 1,
        PURCHASE_ORDER: 1,
        INVOICE: 1,
        SERVICE: 1
      };

      const updatedSequences = {
        ...currentSequences,
        [entityType]: 1
      };

      const updatedNumberingFormats = {
        ...numberingConfig,
        sequences: updatedSequences
      };

      await tx.tenant.update({
        where: { id: tenantId },
        data: { numberingFormats: updatedNumberingFormats }
      });

      return updatedNumberingFormats;
    });
  }

  async updateTenantProfile(tenantId: string, body: any): Promise<any> {
    const { name, slug, currency, brandingConfig, logoUrl, email, address, gstNumber, authorizedPersons, bankDetails, numberingFormats } = body;

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (slug !== undefined) data.slug = slug;
    if (currency !== undefined) data.currency = currency;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (numberingFormats !== undefined) data.numberingFormats = numberingFormats;

    // Fetch existing tenant to preserve extended metadata in brandingConfig JSON
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!existingTenant) {
      throw new BadRequestException(`Tenant with ID "${tenantId}" not found.`);
    }

    const existingBranding = (existingTenant.brandingConfig as any) || {};

    const mergedBranding: any = {
      primaryColor: brandingConfig?.primary || brandingConfig?.primaryColor || existingBranding.primaryColor || '#6366f1',
      secondaryColor: brandingConfig?.secondary || brandingConfig?.secondaryColor || existingBranding.secondaryColor || '#0f172a',
      fontFamily: brandingConfig?.fontFamily || existingBranding.fontFamily || 'Outfit',
      watermarkText: brandingConfig?.watermarkText || existingBranding.watermarkText || 'ORIGINAL',
      customCss: brandingConfig?.customCss || existingBranding.customCss || '',
    };

    // Preserve extended metadata
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

    // Preserve features if already stored
    if (existingBranding.features) mergedBranding.features = existingBranding.features;
    if (existingBranding.rolePermissions) mergedBranding.rolePermissions = existingBranding.rolePermissions;
    if (existingBranding.numberingSequences) mergedBranding.numberingSequences = existingBranding.numberingSequences;

    data.brandingConfig = mergedBranding;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }
}
