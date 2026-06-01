import { Controller, Get, Param, Post, Body, Res, UseGuards, Req, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DocumentEngineService } from './document-engine.service';
import { ExcelExportService } from './excel-export.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { EntityType } from '@prisma/client';

@Controller('api/v1/exports')
@UseGuards(TenantGuard, RbacGuard)
export class ExportsController {
  constructor(
    private readonly documentEngine: DocumentEngineService,
    private readonly excelExport: ExcelExportService,
  ) {}

  /**
   * Generates a PDF directly from frontend-compiled HTML using Puppeteer headless browser
   */
  @Post('pdf/render')
  async renderPdf(
    @Body('html') html: string,
    @Body('filename') filename: string,
    @Res() res: any,
  ) {
    if (!html) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: 'Missing required parameter "html" in request body.',
      });
    }

    try {
      const pdfBuffer = await this.documentEngine.generatePdfFromHtml(html);
      const fileName = filename || 'document.pdf';

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.end(pdfBuffer);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: `Headless Chromium PDF render worker crashed: ${error.message}`,
      });
    }
  }

  /**
   * Generates and streams down an A4 PDF document matching the visual template
   */
  @Get('pdf/:entityType/:id')
  async exportPdf(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('id') entityId: string,
    @Res() res: any,
  ) {
    const tenantId = req.tenant.id;
    const typeEnum = EntityType[entityType.toUpperCase() as keyof typeof EntityType];

    if (!typeEnum) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Invalid document type entity: ${entityType}. Must be one of: QUOTATION, INVOICE.`,
      });
    }

    try {
      const pdfBuffer = await this.documentEngine.generatePdf(tenantId, typeEnum, entityId);
      
      const fileName = `${entityType.toLowerCase()}_${entityId}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.end(pdfBuffer);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: `Asynchronous PDF generation worker failure: ${error.message}`,
      });
    }
  }

  /**
   * Compiles and streams down a structured spreadsheet containing cell formulas and validations
   */
  @Get('excel/:entityType/:id')
  async exportExcel(
    @Req() req: any,
    @Param('entityType') entityType: string,
    @Param('id') entityId: string,
    @Res() res: any,
  ) {
    const tenantId = req.tenant.id;
    const typeEnum = EntityType[entityType.toUpperCase() as keyof typeof EntityType];

    if (!typeEnum) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        message: `Invalid document type entity: ${entityType}. Must be one of: QUOTATION, INVOICE.`,
      });
    }

    try {
      const excelBuffer = await this.excelExport.generateExcel(tenantId, typeEnum, entityId);
      
      const fileName = `${entityType.toLowerCase()}_${entityId}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      return res.end(excelBuffer);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message: `Excel spreadsheet compilation engine failure: ${error.message}`,
      });
    }
  }
}
