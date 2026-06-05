import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType } from '@prisma/client';
import * as handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';

@Injectable()
export class DocumentEngineService {
  private readonly logger = new Logger(DocumentEngineService.name);

  constructor(private readonly prisma: PrismaService) {
    // Register custom Handlebars helpers for template convenience
    handlebars.registerHelper('eq', (a, b) => a === b);
    handlebars.registerHelper('formatCurrency', (value, currency) => {
      const parsedValue = Number(value);
      if (isNaN(parsedValue)) return '0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD',
      }).format(parsedValue);
    });
    handlebars.registerHelper('formatDate', (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    });
  }

  /**
   * Resolves, compiles, and interpolates data layouts, coordinates, and custom styling parameters into a raw HTML string.
   */
  async renderHtml(tenantId: string, entityType: EntityType, entityId: string, templateId?: string): Promise<string> {
    // 1. Fetch document and related stakeholder details
    let documentData: any = null;
    let customer: any = null;
    let lines: any[] = [];

    if (entityType === EntityType.QUOTATION) {
      documentData = await this.prisma.quotation.findFirst({
        where: { id: entityId, tenantId },
        include: { lines: true, customer: true },
      });
      if (documentData) {
        customer = documentData.customer;
        lines = documentData.lines;
      }
    } else if (entityType === EntityType.INVOICE) {
      documentData = await this.prisma.invoice.findFirst({
        where: { id: entityId, tenantId },
        include: { lines: true, customer: true },
      });
      if (documentData) {
        customer = documentData.customer;
        lines = documentData.lines;
      }
    }

    if (!documentData) {
      throw new NotFoundException(`Transactional document of type ${entityType} and ID ${entityId} could not be resolved.`);
    }

    // 2. Load tenant branding details and styles
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant configuration details for ID ${tenantId} not found.`);
    }

    // 3. Find target template or fallback to first available active document template
    let template = null;
    if (templateId) {
      template = await this.prisma.template.findFirst({
        where: { id: templateId, tenantId, entityType },
      });
    } else {
      template = await this.prisma.template.findFirst({
        where: { tenantId, entityType, isActive: true },
      });
    }

    if (!template) {
      throw new NotFoundException(`No active visual template configurations found for document type ${entityType}.`);
    }

    // 4. Interpolate variables using Handlebars compiler
    const rawHtml = template.htmlMarkup;
    const compiledTemplate = handlebars.compile(rawHtml);

    // Context contains document attributes, tenant, customer, layout configurations, and styling classes
    const context = {
      ...documentData,
      documentNumber: entityType === EntityType.QUOTATION ? documentData.quoteNumber : documentData.invoiceNumber,
      isQuotation: entityType === EntityType.QUOTATION,
      isInvoice: entityType === EntityType.INVOICE,
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        logoUrl: tenant.logoUrl,
        currency: tenant.currency,
        branding: tenant.brandingConfig,
      },
      customer,
      lines: lines.map((line) => ({
        description: line.description,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        taxRate: Number(line.taxRate),
        discount: Number(line.discount),
        total: Number(line.total),
      })),
      subTotal: Number(documentData.subTotal),
      taxTotal: Number(documentData.taxTotal),
      discountTotal: Number(documentData.discountTotal || 0),
      grandTotal: Number(documentData.grandTotal),
      balanceDue: documentData.balanceDue ? Number(documentData.balanceDue) : 0,
      dynamicValues: documentData.dynamicValues || {},
      layout: template.layoutConfig,
      theme: template.themeConfig,
    };

    return compiledTemplate(context);
  }

  /**
   * Safe asynchronous worker utilizing Puppeteer browser pools to compile PDF binaries from HTML markup blueprints
   */
  async generatePdf(tenantId: string, entityType: EntityType, entityId: string, templateId?: string): Promise<Buffer> {
    this.logger.log(`Initiating asynchronous A4 PDF render queue pipeline for ${entityType} document ${entityId}`);
    
    // 1. Render data blueprint interpolation
    const html = await this.renderHtml(tenantId, entityType, entityId, templateId);

    // 2. Launch sandboxed browser instance
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      
      // Inject Outfit and Inter fonts using web fonts support
      await page.setContent(html, { waitUntil: 'networkidle0' as any });

      // Load template configuration details to read orientation and print dimensions
      let template = null;
      if (templateId) {
        template = await this.prisma.template.findFirst({
          where: { id: templateId, tenantId, entityType },
        });
      } else {
        template = await this.prisma.template.findFirst({
          where: { tenantId, entityType, isActive: true },
        });
      }

      const layout = (template?.layoutConfig || {}) as Record<string, any>;
      const margins = layout.margins || { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' };
      const pageSize = layout.pageSize || 'A4';
      const landscape = layout.orientation === 'landscape';

      // 3. Print layout to PDF buffer using Puppeteer page API
      const pdfBuffer = await page.pdf({
        format: pageSize,
        landscape,
        printBackground: true,
        margin: {
          top: margins.top || '15mm',
          bottom: margins.bottom || '15mm',
          left: margins.left || '15mm',
          right: margins.right || '15mm',
        },
      });

      this.logger.log(`PDF successfully compiled in memory buffer for ${entityType} document ${entityId}. Bytes: ${pdfBuffer.length}`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Headless Chromium PDF render worker crashed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Generates A4 PDF directly from raw HTML template string with CSS page rules.
   */
  async generatePdfFromHtml(html: string): Promise<Buffer> {
    this.logger.log('Initiating server-side raw HTML to PDF compilation pipeline');

    const browser = await puppeteer.launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    try {
      const page = await browser.newPage();
      
      // Inject the completed HTML and wait for remote assets to resolve
      await page.setContent(html, { waitUntil: 'networkidle0' as any });

      // Generate the PDF buffer with A4 layout and exact print background colors
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
      });

      this.logger.log(`PDF compiled from HTML successfully. Bytes: ${pdfBuffer.length}`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`HTML to PDF Puppeteer rendering failed: ${error.message}`, error.stack);
      throw error;
    } finally {
      await browser.close();
    }
  }
}
