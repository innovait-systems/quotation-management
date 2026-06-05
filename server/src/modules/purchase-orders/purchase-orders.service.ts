import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MetadataService } from '../metadata/metadata.service';
import { EntityType, POStatus, QuoteStatus, FieldType, Prisma } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metadataService: MetadataService,
  ) {}

  /**
   * Helper to generate sequential PO numbers matching tenant formatting
   */
  private async generatePONumber(tenantId: string): Promise<string> {
    return this.metadataService.generateNextNumber(tenantId, EntityType.PURCHASE_ORDER);
  }

  /**
   * Creates a brand new dynamic multi-tenant Purchase Order
   */
  async createPurchaseOrder(tenantId: string, data: any) {
    if (!data.supplierId) {
      throw new BadRequestException('supplierId is a required parameter.');
    }

    // 1. Fetch current dynamic custom field templates for snapshotting
    const activeCustomFields = await this.metadataService.getCustomFields(tenantId, EntityType.PURCHASE_ORDER);

    // 2. Validate user-submitted dynamic values against schema constraints
    const validatedDynamicValues = await this.metadataService.validatePayload(
      tenantId,
      EntityType.PURCHASE_ORDER,
      data.dynamicValues || {},
    );

    // 3. Compute lines totals using Prisma.Decimal
    let subTotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);
    const linesInput = data.lines || [];

    if (linesInput.length === 0) {
      throw new BadRequestException('Purchase Order must contain at least one item line.');
    }

    const computedLines = linesInput.map((line: any) => {
      const quantityOrdered = new Prisma.Decimal(line.quantityOrdered || 1);
      const unitPrice = new Prisma.Decimal(line.unitPrice || 0);
      const taxRate = new Prisma.Decimal(line.taxRate || 0);

      // Line Total Before Tax = QuantityOrdered * UnitPrice
      const totalBeforeTax = quantityOrdered.times(unitPrice);
      
      // Line Tax = TotalBeforeTax * (TaxRate / 100)
      const lineTax = totalBeforeTax.times(taxRate.div(100));
      
      // Total Line Amount = TotalBeforeTax + LineTax
      const totalLineAmount = totalBeforeTax.plus(lineTax);

      subTotal = subTotal.plus(totalBeforeTax);
      taxTotal = taxTotal.plus(lineTax);

      return {
        description: line.description || 'Procurement item',
        quantityOrdered,
        quantityReceived: new Prisma.Decimal(0),
        unitPrice,
        taxRate,
        total: totalLineAmount,
      };
    });

    const grandTotal = subTotal.plus(taxTotal);

    // 4. Securely solve dynamic calculated formulas using sandboxed Formula Engine
    const solvedDynamicValues = await this.metadataService.evaluateFormulaFields(
      tenantId,
      EntityType.PURCHASE_ORDER,
      validatedDynamicValues,
      {
        subTotal: subTotal.toNumber(),
        taxTotal: taxTotal.toNumber(),
        grandTotal: grandTotal.toNumber(),
      },
    );

    // Fetch Tenant details
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const poNumber = data.poNumber || await this.generatePONumber(tenantId);
    const deliveryTerms = data.deliveryTerms || null;

    // 5. Create PO and freeze schema snapshot inside the database record
    const po = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: data.supplierId,
        quotationId: data.quotationId || null,
        poNumber,
        status: POStatus.OPEN,
        subTotal,
        taxTotal,
        grandTotal,
        deliveryTerms,
        dynamicValues: solvedDynamicValues,
        metadataSchema: activeCustomFields as any,
        lines: {
          create: computedLines,
        },
      },
      include: {
        lines: true,
        supplier: true,
      },
    });

    return po;
  }

  /**
   * Converts an approved Quotation directly to a dynamic Purchase Order
   */
  async convertQuotation(tenantId: string, supplierId: string, quoteId: string) {
    // 1. Fetch quotation and its lines
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

    // 2. Map dynamic custom fields from Quotation to PO schema rules
    const poCustomFields = await this.metadataService.getCustomFields(tenantId, EntityType.PURCHASE_ORDER);
    const mappedDynamicValues: Record<string, any> = {};
    const quoteDynamicValues = (quotation.dynamicValues || {}) as Record<string, any>;

    poCustomFields.forEach((field) => {
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

    // 3. Compile dynamic Zod properties matching the PO schema structure
    const validatedDynamicValues = await this.metadataService.validatePayload(
      tenantId,
      EntityType.PURCHASE_ORDER,
      mappedDynamicValues,
    );

    // 4. Map line items directly to PO lines
    const poLines = quotation.lines.map((qLine) => {
      const quantityOrdered = qLine.quantity;
      const unitPrice = qLine.unitPrice;
      const taxRate = qLine.taxRate;
      
      const totalBeforeTax = quantityOrdered.times(unitPrice);
      const lineTax = totalBeforeTax.times(taxRate.div(100));
      const totalLineAmount = totalBeforeTax.plus(lineTax);

      return {
        description: qLine.description,
        quantityOrdered,
        quantityReceived: new Prisma.Decimal(0),
        unitPrice,
        taxRate,
        total: totalLineAmount,
      };
    });

    const subTotal = quotation.subTotal;
    const taxTotal = quotation.taxTotal;
    const grandTotal = subTotal.plus(taxTotal);

    // 5. Evaluate custom PO formulas inside the math sandbox
    const solvedDynamicValues = await this.metadataService.evaluateFormulaFields(
      tenantId,
      EntityType.PURCHASE_ORDER,
      validatedDynamicValues,
      {
        subTotal: subTotal.toNumber(),
        taxTotal: taxTotal.toNumber(),
        grandTotal: grandTotal.toNumber(),
      },
    );

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const poNumber = await this.generatePONumber(tenantId);

    // Execute atomic transacted creation & update Quotation status
    const po = await this.prisma.$transaction(async (tx) => {
      // Create Purchase Order record
      const poRecord = await tx.purchaseOrder.create({
        data: {
          tenantId,
          supplierId,
          quotationId: quotation.id,
          poNumber,
          status: POStatus.OPEN,
          subTotal,
          taxTotal,
          grandTotal,
          dynamicValues: solvedDynamicValues,
          metadataSchema: poCustomFields as any,
          lines: {
            create: poLines,
          },
        },
        include: {
          lines: true,
        },
      });

      // Update source Quotation to CONVERTED
      await tx.quotation.update({
        where: { id: quotation.id },
        data: { status: QuoteStatus.CONVERTED },
      });

      return poRecord;
    });

    return po;
  }

  /**
   * Records incremental item receipts and updates PO status under transaction locks
   */
  async receivePOItems(tenantId: string, poId: string, items: Array<{ lineId: string; quantity: number }>) {
    if (!items || items.length === 0) {
      throw new BadRequestException('Fulfillment updates must specify at least one item line receipt.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch target PO with database transaction locks
      const po = await tx.purchaseOrder.findFirst({
        where: { id: poId, tenantId },
        include: { lines: true },
      });

      if (!po) {
        throw new NotFoundException('Purchase Order not found.');
      }

      if (po.status === POStatus.CANCELLED || po.status === POStatus.COMPLETED) {
        throw new BadRequestException(`Cannot record deliveries for a PO with status ${po.status}.`);
      }

      // 2. Iterate and check incremental values for line limits
      for (const itemInput of items) {
        const matchingLine = po.lines.find((l) => l.id === itemInput.lineId);
        if (!matchingLine) {
          throw new BadRequestException(`Fulfillment target line ID "${itemInput.lineId}" does not exist in this PO.`);
        }

        const deltaQty = new Prisma.Decimal(itemInput.quantity);
        if (deltaQty.lte(0)) {
          throw new BadRequestException('Incremental delivery quantities must be greater than zero.');
        }

        const currentReceived = matchingLine.quantityReceived;
        const ordered = matchingLine.quantityOrdered;
        const newReceivedTotal = currentReceived.plus(deltaQty);

        // Disallow overflow fulfillment beyond ordered threshold
        if (newReceivedTotal.gt(ordered)) {
          throw new BadRequestException(
            `Receipt overflow on line "${matchingLine.description}". Ordered: ${ordered.toNumber()}, Current Total: ${currentReceived.toNumber()}, Input Delta: ${deltaQty.toNumber()}`,
          );
        }

        // Update the POLine quantities
        await tx.pOLine.update({
          where: { id: matchingLine.id },
          data: { quantityReceived: newReceivedTotal },
        });
      }

      // 3. Fetch fresh lines to verify totals and compute final PO status
      const updatedLines = await tx.pOLine.findMany({
        where: { poId },
      });

      let allCompleted = true;
      let anyReceived = false;

      updatedLines.forEach((line) => {
        const received = line.quantityReceived;
        const ordered = line.quantityOrdered;

        if (received.lt(ordered)) {
          allCompleted = false;
        }
        if (received.gt(0)) {
          anyReceived = true;
        }
      });

      let nextStatus: POStatus = POStatus.OPEN;
      if (allCompleted) {
        nextStatus = POStatus.COMPLETED;
      } else if (anyReceived) {
        nextStatus = POStatus.PARTIALLY_RECEIVED;
      }

      // Update parent PO status
      const updatedPO = await tx.purchaseOrder.update({
        where: { id: poId },
        data: { status: nextStatus },
        include: {
          lines: true,
          supplier: true,
        },
      });

      return updatedPO;
    });
  }

  /**
   * Retrieves all POs filtered by multi-tenant workspace context
   */
  async listPurchaseOrders(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      include: {
        supplier: true,
        lines: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Resolves a single PO matching strict tenant row credentials
   */
  async getPOById(tenantId: string, poId: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id: poId, tenantId },
      include: {
        supplier: true,
        lines: true,
        quotation: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase Order not found.');
    }

    return po;
  }

  async deletePurchaseOrder(tenantId: string, id: string) {
    const po = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!po) {
      throw new NotFoundException('Purchase Order not found.');
    }
    return this.prisma.purchaseOrder.delete({
      where: { id },
    });
  }
}
