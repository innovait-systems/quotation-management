import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetadataService } from '../metadata/metadata.service';
import { EntityType, QuoteStatus, Prisma } from '@prisma/client';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadataService,
  ) {}

  /**
   * Creates a brand new multi-tenant quotation
   * @param tenantId Target tenant owner ID context
   * @param creatorId ID of user creating the quote
   * @param data Base Quotation payload containing customerId, lines, terms, and custom dynamicValues
   */
  async createQuotation(tenantId: string, creatorId: string, data: any) {
    if (!data.customerId) {
      throw new BadRequestException('customerId is a required parameter.');
    }

    // 1. Fetch current dynamic custom field templates to store a compliance snapshot
    const activeCustomFields = await this.metadataService.getCustomFields(tenantId, EntityType.QUOTATION);

    // 2. Validate user-submitted dynamic values against live schema
    const validatedDynamicValues = await this.metadataService.validatePayload(
      tenantId,
      EntityType.QUOTATION,
      data.dynamicValues || {},
    );

    // 3. Compute baseline lines mathematical sums
    let subTotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    const linesInput = data.lines || [];

    if (linesInput.length === 0) {
      throw new BadRequestException('Quotation must contain at least one item line.');
    }

    const computedLines = linesInput.map((line: any) => {
      const quantity = new Prisma.Decimal(line.quantity || 1);
      const unitPrice = new Prisma.Decimal(line.unitPrice || 0);
      const taxRate = new Prisma.Decimal(line.taxRate || 0);
      const discount = new Prisma.Decimal(line.discount || 0);

      // Line Total Before Tax = (Quantity * UnitPrice) - Discount
      const totalBeforeTax = quantity.times(unitPrice).minus(discount);
      
      // Line Tax = TotalBeforeTax * (TaxRate / 100)
      const lineTax = totalBeforeTax.times(taxRate.div(100));
      
      // Total Line Amount = TotalBeforeTax + LineTax
      const totalLineAmount = totalBeforeTax.plus(lineTax);

      subTotal = subTotal.plus(totalBeforeTax);
      taxTotal = taxTotal.plus(lineTax);

      return {
        description: line.description || 'Service/Product line',
        quantity,
        unitPrice,
        taxRate,
        discount,
        total: totalLineAmount,
      };
    });

    const grandTotal = subTotal.plus(taxTotal);

    // 4. Securely solve dynamic calculated formulas using our sandboxed parser
    const solvedDynamicValues = await this.metadataService.evaluateFormulaFields(
      tenantId,
      EntityType.QUOTATION,
      validatedDynamicValues,
      {
        subTotal: subTotal.toNumber(),
        taxTotal: taxTotal.toNumber(),
        grandTotal: grandTotal.toNumber(),
      },
    );

    // 5. Save the document and freeze the schema snapshot inside the record
    const quotation = await this.prisma.quotation.create({
      data: {
        tenantId,
        customerId: data.customerId,
        creatorId,
        quoteNumber: data.quoteNumber || `QT-${Date.now()}`,
        version: 1,
        status: QuoteStatus.DRAFT,
        subTotal,
        taxTotal,
        discountTotal: new Prisma.Decimal(0),
        grandTotal,
        validUntil: new Date(data.validUntil || Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 Days default
        terms: data.terms,
        dynamicValues: solvedDynamicValues,
        metadataSchema: activeCustomFields as any, // Snapshot metadata structure for total backwards compatibility
        lines: {
          create: computedLines,
        },
      },
      include: {
        lines: true,
      },
    });

    return quotation;
  }

  /**
   * Increments the document version sequence and logs parent traces
   * @param tenantId Target tenant owner ID
   * @param creatorId User resolving the revision request
   * @param quoteId Target quotation identifier
   */
  async createRevision(tenantId: string, creatorId: string, quoteId: string) {
    const original = await this.prisma.quotation.findFirst({
      where: { id: quoteId, tenantId },
      include: { lines: true },
    });

    if (!original) {
      throw new NotFoundException('Target Quotation does not exist.');
    }

    // Create duplicate with incremented version pointer
    const revision = await this.prisma.quotation.create({
      data: {
        tenantId,
        customerId: original.customerId,
        creatorId,
        quoteNumber: original.quoteNumber,
        version: original.version + 1,
        revisionOfId: original.id,
        status: QuoteStatus.DRAFT,
        subTotal: original.subTotal,
        taxTotal: original.taxTotal,
        discountTotal: original.discountTotal,
        grandTotal: original.grandTotal,
        validUntil: original.validUntil,
        terms: original.terms,
        dynamicValues: original.dynamicValues as any,
        metadataSchema: original.metadataSchema as any, // Preserve exact historic schema model
        lines: {
          create: original.lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            discount: l.discount,
            total: l.total,
          })),
        },
      },
      include: {
        lines: true,
      },
    });

    // Mark original quote as Converted / Superseded
    await this.prisma.quotation.update({
      where: { id: original.id },
      data: { status: QuoteStatus.CLOSED },
    });

    return revision;
  }

  async getQuotationById(tenantId: string, quoteId: string) {
    const quote = await this.prisma.quotation.findFirst({
      where: { id: quoteId, tenantId },
      include: { lines: true },
    });
    if (!quote) throw new NotFoundException('Quotation not found.');
    return quote;
  }

  async listQuotations(tenantId: string) {
    return this.prisma.quotation.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { lines: true },
    });
  }
}
