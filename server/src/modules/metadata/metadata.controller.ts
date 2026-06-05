import { Controller, Post, Get, Delete, Body, Param, Headers, BadRequestException } from '@nestjs/common';
import { MetadataService } from './metadata.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType, FieldType } from '@prisma/client';
import { CacheControl } from '../../common/decorators/cache-control.decorator';

@Controller('api/v1/metadata')
export class MetadataController {
  constructor(
    private readonly metadataService: MetadataService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('fields')
  async createField(
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() body: {
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
    },
  ) {
    const tenantId = await this.resolveTenantId(tenantHeader);
    
    if (!body.entityType || !body.name || !body.label || !body.type) {
      throw new BadRequestException('entityType, name, label, and type are required body parameters.');
    }
    
    return this.metadataService.createCustomField(tenantId, body);
  }

  @Get('fields/:entityType')
  @CacheControl({ isPublic: true, sMaxAge: 300, staleWhileRevalidate: 600 })
  async getFields(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('entityType') entityType: string,
  ) {
    const tenantId = await this.resolveTenantId(tenantHeader);
    
    const uppercaseType = entityType.toUpperCase();
    if (!Object.values(EntityType).includes(uppercaseType as EntityType)) {
      throw new BadRequestException(
        `Invalid entityType. Must be one of: ${Object.values(EntityType).join(', ')}`,
      );
    }
    
    return this.metadataService.getCustomFields(tenantId, uppercaseType as EntityType);
  }

  @Delete('fields/:id')
  async deleteField(
    @Headers('x-tenant-id') tenantHeader: string,
    @Param('id') fieldId: string,
  ) {
    const tenantId = await this.resolveTenantId(tenantHeader);
    return this.metadataService.deleteCustomField(tenantId, fieldId);
  }

  /**
   * Helper utility to resolve tenant context dynamically for local API sandboxes
   */
  private async resolveTenantId(suppliedId?: string): Promise<string> {
    if (suppliedId && (suppliedId.length === 36 || suppliedId.startsWith('tenant-'))) {
      return suppliedId; // Valid ID directly
    }

    // Attempt lookup by slug or fetch the default seeded tenant
    const tenant = await this.prisma.tenant.findFirst({
      where: suppliedId ? { slug: suppliedId } : {},
    });

    if (!tenant) {
      throw new BadRequestException(
        'Tenant context resolution failed. Please ensure the database is seeded and database URL is connected.',
      );
    }

    return tenant.id;
  }

  @Post('numbering-formats')
  async updateNumberingFormats(
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() body: Record<string, string>,
  ) {
    const tenantId = await this.resolveTenantId(tenantHeader);
    return this.metadataService.updateNumberingFormats(tenantId, body);
  }

  @Post('numbering-formats/reset')
  async resetSequence(
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() body: { entityType: EntityType },
  ) {
    const tenantId = await this.resolveTenantId(tenantHeader);
    if (!body.entityType) {
      throw new BadRequestException('entityType is a required parameter.');
    }
    const uppercaseType = body.entityType.toUpperCase();
    if (!Object.values(EntityType).includes(uppercaseType as EntityType)) {
      throw new BadRequestException(
        `Invalid entityType. Must be one of: ${Object.values(EntityType).join(', ')}`,
      );
    }
    return this.metadataService.resetSequence(tenantId, uppercaseType as EntityType);
  }

  @Post('tenant-profile')
  async updateTenantProfile(
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() body: any,
  ) {
    const tenantId = await this.resolveTenantId(tenantHeader);
    return this.metadataService.updateTenantProfile(tenantId, body);
  }
}
