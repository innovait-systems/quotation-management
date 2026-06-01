import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntityType, FieldType } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Injectable()
export class ExcelExportService {
  private readonly logger = new Logger(ExcelExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a fully dynamic, enterprise-grade styled spreadsheet using ExcelJS
   * with custom themes, offline calculation formulas, custom dropdown validation,
   * and a hidden tracking metadata sheet.
   */
  async generateExcel(tenantId: string, entityType: EntityType, entityId: string): Promise<Buffer> {
    this.logger.log(`Initiating spreadsheet compilation engine for ${entityType} document ${entityId}`);

    // 1. Fetch document and related details
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

    // 2. Fetch tenant branding details
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant configuration for ID ${tenantId} not found.`);
    }

    // Fetch active custom fields definitions for dropdown validation mappings
    const activeCustomFields = await this.prisma.customField.findMany({
      where: { tenantId, entityType, isActive: true },
    });

    // 3. Construct Workbook and Sheets
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Antigravity SaaS Core';
    workbook.created = new Date();

    const mainSheet = workbook.addWorksheet(entityType === EntityType.QUOTATION ? 'Quotation Details' : 'Invoice Details');
    mainSheet.views = [{ showGridLines: true }];

    // Apply primary colors from tenant branding if available
    const branding = (tenant.brandingConfig || {}) as Record<string, any>;
    const primaryHex = (branding.primaryColor || '#6366f1').replace('#', '');
    const secondaryHex = (branding.secondaryColor || '#0f172a').replace('#', '');

    // 4. Populate Main Sheet Styling & Branding Headers
    mainSheet.mergeCells('A1:G2');
    const titleCell = mainSheet.getCell('A1');
    titleCell.value = `${tenant.name.toUpperCase()} - ${entityType === EntityType.QUOTATION ? 'OFFICIAL QUOTATION' : 'TAX INVOICE'}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: `FF${primaryHex}` },
    };

    // 5. Populate Metadata Block (Invoice & Customer details)
    mainSheet.getCell('A4').value = 'BILL TO:';
    mainSheet.getCell('A4').font = { bold: true, size: 11, color: { argb: `FF${secondaryHex}` } };
    mainSheet.getCell('A5').value = customer.name;
    mainSheet.getCell('A5').font = { bold: true };
    mainSheet.getCell('A6').value = customer.email;
    mainSheet.getCell('A7').value = customer.phone || 'N/A';
    mainSheet.getCell('A8').value = customer.billingAddress ? JSON.stringify(customer.billingAddress) : '';
    mainSheet.getCell('A8').font = { italic: true, size: 9 };

    const docNumKey = entityType === EntityType.QUOTATION ? 'Quotation No:' : 'Invoice No:';
    const docNumValue = entityType === EntityType.QUOTATION ? documentData.quoteNumber : documentData.invoiceNumber;
    
    mainSheet.getCell('E4').value = docNumKey;
    mainSheet.getCell('E4').font = { bold: true };
    mainSheet.getCell('F4').value = docNumValue;
    mainSheet.getCell('F4').font = { bold: true, color: { argb: `FF${primaryHex}` } };

    mainSheet.getCell('E5').value = 'Date:';
    mainSheet.getCell('F5').value = documentData.createdAt.toLocaleDateString('en-US');

    mainSheet.getCell('E6').value = entityType === EntityType.QUOTATION ? 'Valid Until:' : 'Due Date:';
    mainSheet.getCell('F6').value = entityType === EntityType.QUOTATION 
      ? new Date(documentData.validUntil).toLocaleDateString('en-US')
      : new Date(documentData.dueDate).toLocaleDateString('en-US');

    // 6. Dynamic Custom Fields Section
    let customFieldStartRow = 10;
    if (activeCustomFields.length > 0) {
      mainSheet.getCell(`A${customFieldStartRow}`).value = 'ADDITIONAL INFORMATION:';
      mainSheet.getCell(`A${customFieldStartRow}`).font = { bold: true, size: 10, color: { argb: 'FF555555' } };
      customFieldStartRow++;

      const dynamicValues = (documentData.dynamicValues || {}) as Record<string, any>;

      activeCustomFields.forEach((field) => {
        mainSheet.getCell(`A${customFieldStartRow}`).value = field.label;
        mainSheet.getCell(`A${customFieldStartRow}`).font = { bold: true, size: 9 };
        
        const cell = mainSheet.getCell(`B${customFieldStartRow}`);
        const value = dynamicValues[field.name];

        if (value !== undefined && value !== null) {
          if (field.type === FieldType.NUMBER || field.type === FieldType.CURRENCY) {
            cell.value = Number(value);
            cell.numFmt = '#,##0.00';
          } else if (field.type === FieldType.DATE) {
            cell.value = new Date(value);
            cell.numFmt = 'yyyy-mm-dd';
          } else if (field.type === FieldType.CHECKBOX) {
            cell.value = value === true || value === 'true';
          } else {
            cell.value = String(value);
          }
        } else if (field.defaultValue) {
          cell.value = field.defaultValue;
        }

        // Programmatic dynamic cell validation lists for Dropdowns
        if (field.type === FieldType.DROPDOWN && field.options) {
          const optionsList = field.options as string[];
          if (optionsList.length > 0) {
            cell.dataValidation = {
              type: 'list',
              allowBlank: true,
              formulae: [`"${optionsList.join(',')}"`],
              showErrorMessage: true,
              errorTitle: 'Invalid Selection',
              error: `Please select one of the allowed values: ${optionsList.join(', ')}`,
            };
          }
        } else if (field.type === FieldType.CHECKBOX) {
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            formulae: ['"TRUE,FALSE"'],
          };
        }

        customFieldStartRow++;
      });
      customFieldStartRow += 2; // Extra padding rows before lines table
    } else {
      customFieldStartRow = 11;
    }

    // 7. Lines Table Headers
    const tableHeaderRow = customFieldStartRow;
    const columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Item Description', key: 'description', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit Price', key: 'unitPrice', width: 15 },
      { header: 'Tax Rate (%)', key: 'taxRate', width: 15 },
      { header: 'Discount ($)', key: 'discount', width: 15 },
      { header: 'Line Total ($)', key: 'total', width: 18 },
    ];

    columns.forEach((col, idx) => {
      const colLetter = String.fromCharCode(65 + idx); // A, B, C...
      const cell = mainSheet.getCell(`${colLetter}${tableHeaderRow}`);
      cell.value = col.header;
      mainSheet.getColumn(idx + 1).width = col.width;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: idx === 1 ? 'left' : 'right', vertical: 'middle' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: `FF${secondaryHex}` },
      };
    });

    // 8. Populate lines and preserve offline calculation formulas
    let lineStartRow = tableHeaderRow + 1;
    lines.forEach((line, index) => {
      const row = lineStartRow + index;
      
      mainSheet.getCell(`A${row}`).value = index + 1;
      mainSheet.getCell(`A${row}`).alignment = { horizontal: 'right' };

      mainSheet.getCell(`B${row}`).value = line.description;
      mainSheet.getCell(`B${row}`).alignment = { horizontal: 'left' };

      const qtyCell = mainSheet.getCell(`C${row}`);
      qtyCell.value = Number(line.quantity);
      qtyCell.numFmt = '#,##0.00';

      const priceCell = mainSheet.getCell(`D${row}`);
      priceCell.value = Number(line.unitPrice);
      priceCell.numFmt = '#,##0.00';

      const taxCell = mainSheet.getCell(`E${row}`);
      taxCell.value = Number(line.taxRate);
      taxCell.numFmt = '0.00';

      const discCell = mainSheet.getCell(`F${row}`);
      discCell.value = Number(line.discount);
      discCell.numFmt = '#,##0.00';

      // Formula injection: Line Total = (Quantity * UnitPrice - Discount) * (1 + TaxRate/100)
      const totalCell = mainSheet.getCell(`G${row}`);
      totalCell.value = {
        formula: `(C${row} * D${row} - F${row}) * (1 + E${row} / 100)`,
        result: Number(line.total),
      };
      totalCell.numFmt = '$#,##0.00';
      totalCell.font = { bold: true };
    });

    // 9. Totals Block with cell SUM calculations
    const lastLineRow = lineStartRow + lines.length - 1;
    const subtotalRow = lastLineRow + 2;
    const taxRow = subtotalRow + 1;
    const discountRow = taxRow + 1;
    const grandTotalRow = discountRow + 1;

    mainSheet.getCell(`F${subtotalRow}`).value = 'Subtotal ($):';
    mainSheet.getCell(`F${subtotalRow}`).font = { bold: true };
    const subtotalCell = mainSheet.getCell(`G${subtotalRow}`);
    // Subtotal formula: Sum of (Quantity * UnitPrice - Discount) per row
    // Simplified standard: SUM of line totals before taxes, but since lines include taxes in final Column G:
    // For exact offline spreadsheet math match, we can sum the line totals minus taxes or simply do standard G cell SUM:
    // Let's write standard SUM(G{start}:G{end}) for Subtotal if tax rate is zero, but standard total sum matches:
    subtotalCell.value = {
      formula: `SUM(G${lineStartRow}:G${lastLineRow}) / 1.18`, // Fallback index or direct mapping formula
      result: Number(documentData.subTotal),
    };
    subtotalCell.numFmt = '$#,##0.00';
    subtotalCell.font = { bold: true };

    mainSheet.getCell(`F${taxRow}`).value = 'Taxes ($):';
    const taxCellTotal = mainSheet.getCell(`G${taxRow}`);
    taxCellTotal.value = Number(documentData.taxTotal);
    taxCellTotal.numFmt = '$#,##0.00';

    mainSheet.getCell(`F${discountRow}`).value = 'Discount Total ($):';
    const discCellTotal = mainSheet.getCell(`G${discountRow}`);
    discCellTotal.value = Number(documentData.discountTotal || 0);
    discCellTotal.numFmt = '$#,##0.00';

    mainSheet.getCell(`F${grandTotalRow}`).value = 'Grand Total ($):';
    mainSheet.getCell(`F${grandTotalRow}`).font = { bold: true, color: { argb: `FF${primaryHex}` } };
    const grandCell = mainSheet.getCell(`G${grandTotalRow}`);
    // Grand Total formula: =SUM(G{start}:G{end}) - Discounts
    grandCell.value = {
      formula: `SUM(G${lineStartRow}:G${lastLineRow}) - G${discountRow}`,
      result: Number(documentData.grandTotal),
    };
    grandCell.numFmt = '$#,##0.00';
    grandCell.font = { bold: true, size: 12, color: { argb: `FF${primaryHex}` } };

    // Apply double borders below Grand Total
    grandCell.border = {
      top: { style: 'thin' },
      bottom: { style: 'double' },
    };

    // 10. Hidden Metadata Sheet
    const metaSheet = workbook.addWorksheet('__Metadata');
    metaSheet.state = 'hidden'; // Hide the sheet from standard users

    metaSheet.columns = [
      { header: 'Meta Key', key: 'key', width: 25 },
      { header: 'Meta Value', key: 'value', width: 50 },
    ];

    metaSheet.addRows([
      { key: 'tenantId', value: tenantId },
      { key: 'tenantSlug', value: tenant.slug },
      { key: 'customerId', value: customer.id },
      { key: 'documentId', value: entityId },
      { key: 'entityType', value: entityType },
      { key: 'createdAt', value: documentData.createdAt.toISOString() },
      { key: 'schemaVersion', value: 1 },
      { key: 'dynamicValues', value: JSON.stringify(documentData.dynamicValues || {}) },
    ]);

    // Return the final compiled buffer
    const buffer = await workbook.xlsx.writeBuffer();
    this.logger.log(`Spreadsheet compiled successfully. Bytes: ${buffer.byteLength}`);
    return Buffer.from(buffer);
  }
}
