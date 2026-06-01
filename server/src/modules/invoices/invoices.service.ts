import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetadataService } from '../metadata/metadata.service';
import { EntityType, InvoiceStatus, QuoteStatus, FieldType, Prisma } from '@prisma/client';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadataService,
  ) {}

  /**
   * Helper to generate UPI deep-link URL for payment QR codes
   */
  private generateUpiDeepLink(
    tenantName: string,
    invoiceNumber: string,
    amount: string | number,
    brandingConfig: any,
  ): string {
    // Read upiVpa from tenant brandingConfig if configured, else default
    const upiVpa = brandingConfig?.upiVpa || 'payment@antigravity';
    const payeeName = brandingConfig?.payeeName || tenantName;
    const amountStr = Number(amount).toFixed(2);
    
    return `upi://pay?pa=${upiVpa}&pn=${encodeURIComponent(payeeName)}&tr=${invoiceNumber}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(`Payment for Invoice ${invoiceNumber}`)}`;
  }

  /**
   * Helper to generate document number using numberingFormats pattern
   */
  private generateInvoiceNumber(tenant: any): string {
    const format = tenant.numberingFormats?.INVOICE || 'INV-{YYYY}-{NNNN}';
    const now = new Date();
    const year = now.getFullYear().toString();
    const randomSeq = Math.floor(1000 + Math.random() * 9000).toString(); // Fallback sequence
    
    return format
      .replace('{YYYY}', year)
      .replace('{NNNN}', randomSeq);
  }

  /**
   * Creates a brand new multi-tenant invoice
   */
  async createInvoice(tenantId: string, creatorId: string, data: any) {
    if (!data.customerId) {
      throw new BadRequestException('customerId is a required parameter.');
    }

    // 1. Fetch current dynamic custom field templates to store a compliance snapshot
    const activeCustomFields = await this.metadataService.getCustomFields(tenantId, EntityType.INVOICE);

    // 2. Validate user-submitted dynamic values against live schema
    const validatedDynamicValues = await this.metadataService.validatePayload(
      tenantId,
      EntityType.INVOICE,
      data.dynamicValues || {},
    );

    // 3. Compute baseline lines mathematical sums
    let subTotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    let discountTotal = new Prisma.Decimal(data.discountTotal || 0);
    const linesInput = data.lines || [];

    if (linesInput.length === 0) {
      throw new BadRequestException('Invoice must contain at least one item line.');
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

    const grandTotal = subTotal.plus(taxTotal).minus(discountTotal);
    const balanceDue = grandTotal; // Initial balance due is grand total

    // 4. Securely solve dynamic calculated formulas using our sandboxed parser
    const solvedDynamicValues = await this.metadataService.evaluateFormulaFields(
      tenantId,
      EntityType.INVOICE,
      validatedDynamicValues,
      {
        subTotal: subTotal.toNumber(),
        taxTotal: taxTotal.toNumber(),
        grandTotal: grandTotal.toNumber(),
      },
    );

    // Fetch Tenant for branding & upi information
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const invoiceNumber = data.invoiceNumber || this.generateInvoiceNumber(tenant);
    const paymentQrCode = this.generateUpiDeepLink(tenant.name, invoiceNumber, grandTotal.toNumber(), tenant.brandingConfig);

    const issueDate = data.issueDate ? new Date(data.issueDate) : new Date();
    const dueDate = data.dueDate ? new Date(data.dueDate) : new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 Days default

    // 5. Save the document and freeze the schema snapshot inside the record
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        customerId: data.customerId,
        quotationId: data.quotationId || null,
        creatorId,
        invoiceNumber,
        status: InvoiceStatus.DRAFT,
        issueDate,
        dueDate,
        subTotal,
        taxTotal,
        discountTotal,
        grandTotal,
        balanceDue,
        paymentQrCode,
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

    return invoice;
  }

  /**
   * Automatically converts a Quotation to an Invoice
   */
  async convertQuotation(tenantId: string, creatorId: string, quoteId: string) {
    // 1. Fetch the quotation along with lines
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quoteId, tenantId },
      include: { lines: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found.');
    }

    if (quotation.status === QuoteStatus.CONVERTED || quotation.status === QuoteStatus.CLOSED) {
      throw new BadRequestException('Quotation is already closed or converted.');
    }

    // 2. Fetch current dynamic fields for INVOICE to validate or map custom fields
    const invoiceCustomFields = await this.metadataService.getCustomFields(tenantId, EntityType.INVOICE);

    // Map dynamic values from Quotation if matching properties exist, else fallback to defaults
    const mappedDynamicValues: Record<string, any> = {};
    const quoteDynamicValues = (quotation.dynamicValues || {}) as Record<string, any>;
    
    invoiceCustomFields.forEach((field) => {
      if (quoteDynamicValues[field.name] !== undefined) {
        mappedDynamicValues[field.name] = quoteDynamicValues[field.name];
      } else if (field.defaultValue !== null && field.defaultValue !== undefined) {
        if (field.type === FieldType.NUMBER) {
          mappedDynamicValues[field.name] = Number(field.defaultValue);
        } else if (field.type === FieldType.CHECKBOX) {
          mappedDynamicValues[field.name] = field.defaultValue === 'true';
        } else {
          mappedDynamicValues[field.name] = field.defaultValue;
        }
      }
    });

    // 3. Compile mapped dynamic values against Invoice metadata engine
    const validatedDynamicValues = await this.metadataService.validatePayload(
      tenantId,
      EntityType.INVOICE,
      mappedDynamicValues,
    );

    // 4. Recalculate dynamic formulas based on Invoice specific custom fields
    const solvedDynamicValues = await this.metadataService.evaluateFormulaFields(
      tenantId,
      EntityType.INVOICE,
      validatedDynamicValues,
      {
        subTotal: quotation.subTotal.toNumber(),
        taxTotal: quotation.taxTotal.toNumber(),
        grandTotal: quotation.grandTotal.toNumber(),
      },
    );

    // 5. Fetch Tenant context
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant context not found.');
    }

    const invoiceNumber = this.generateInvoiceNumber(tenant);
    const paymentQrCode = this.generateUpiDeepLink(tenant.name, invoiceNumber, quotation.grandTotal.toNumber(), tenant.brandingConfig);

    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days standard

    // 6. Create the Invoice in transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      // Create Invoice
      const createdInvoice = await tx.invoice.create({
        data: {
          tenantId,
          customerId: quotation.customerId,
          quotationId: quotation.id,
          creatorId,
          invoiceNumber,
          status: InvoiceStatus.DRAFT,
          issueDate,
          dueDate,
          subTotal: quotation.subTotal,
          taxTotal: quotation.taxTotal,
          discountTotal: quotation.discountTotal,
          grandTotal: quotation.grandTotal,
          balanceDue: quotation.grandTotal,
          paymentQrCode,
          dynamicValues: solvedDynamicValues,
          metadataSchema: invoiceCustomFields as any,
          lines: {
            create: quotation.lines.map((l) => ({
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

      // Update Quotation status to CONVERTED
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: QuoteStatus.CONVERTED },
      });

      return createdInvoice;
    });

    return invoice;
  }

  async getInvoiceById(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
      include: { lines: true, customer: true, quotation: true },
    });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  async listInvoices(tenantId: string) {
    return this.prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { lines: true, customer: true },
    });
  }

  /**
   * Processes an invoice payment, decrements balanceDue, and updates state
   */
  async recordPayment(tenantId: string, invoiceId: string, amountPaid: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found.');
    }

    const newBalanceDue = Prisma.Decimal.max(0, invoice.balanceDue.minus(amountPaid));
    let status = invoice.status;

    if (newBalanceDue.isZero()) {
      status = InvoiceStatus.PAID;
    } else if (newBalanceDue.lt(invoice.grandTotal)) {
      status = InvoiceStatus.PARTIALLY_PAID;
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        balanceDue: newBalanceDue,
        status,
      },
      include: {
        lines: true,
      },
    });

    return updatedInvoice;
  }
}
