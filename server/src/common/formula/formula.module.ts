import { Module, Global } from '@nestjs/common';
import { FormulaEngine } from './formula.engine';

@Global()
@Module({
  providers: [FormulaEngine],
  exports: [FormulaEngine],
})
export class FormulaModule {}
