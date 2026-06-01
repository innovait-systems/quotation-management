import { Module } from '@nestjs/common';
import { DocumentEngineService } from './document-engine.service';
import { ExcelExportService } from './excel-export.service';
import { ExportsController } from './exports.controller';

@Module({
  controllers: [ExportsController],
  providers: [DocumentEngineService, ExcelExportService],
  exports: [DocumentEngineService, ExcelExportService],
})
export class ExportsModule {}
