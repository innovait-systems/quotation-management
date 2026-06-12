import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType } from '@prisma/client';

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async createTemplate(tenantId: string, data: any) {
    return this.prisma.template.create({
      data: {
        tenantId,
        name: data.name,
        entityType: data.entityType as EntityType,
        dataSchema: data.dataSchema || {},
        layoutConfig: data.layoutConfig || {},
        themeConfig: data.themeConfig || {},
        htmlMarkup: data.htmlMarkup || '',
        version: data.version || 1,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async listTemplates(tenantId: string) {
    return this.prisma.template.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTemplateById(tenantId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException('Template not found.');
    }
    return template;
  }

  async updateTemplate(tenantId: string, id: string, data: any) {
    const template = await this.prisma.template.findFirst({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException('Template not found.');
    }

    return this.prisma.template.update({
      where: { id },
      data: {
        name: data.name,
        entityType: data.entityType as EntityType,
        dataSchema: data.dataSchema,
        layoutConfig: data.layoutConfig,
        themeConfig: data.themeConfig,
        htmlMarkup: data.htmlMarkup,
        version: data.version,
        isActive: data.isActive,
      },
    });
  }

  async deleteTemplate(tenantId: string, id: string) {
    const template = await this.prisma.template.findFirst({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException('Template not found.');
    }

    return this.prisma.template.delete({
      where: { id },
    });
  }
}
