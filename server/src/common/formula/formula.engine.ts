import { Injectable, Logger } from '@nestjs/common';
import { Parser } from 'expr-eval';

export interface FormulaContext {
  subTotal?: number;
  taxRate?: number;
  discount?: number;
  [key: string]: any;
}

@Injectable()
export class FormulaEngine {
  private readonly logger = new Logger(FormulaEngine.name);
  private parser: Parser;
  private readonly allowedFunctions = ['IF', 'ROUND', 'MIN', 'MAX', 'ABS'];

  constructor() {
    this.parser = new Parser({
      operators: {
        add: true,
        subtract: true,
        multiply: true,
        divide: true,
        remainder: true,
        power: false, // Turn off arbitrary power iterations to prevent CPU locks
        logical: true,
        comparison: true,
        in: false,
        assignment: false
      }
    });

    // Remove round and abs from unaryOps so they can be registered as standard functions
    delete this.parser.unaryOps.round;
    delete this.parser.unaryOps.abs;

    // Whitelist approved operational logical/math routines
    this.allowedFunctions.forEach((fnName) => {
      this.parser.functions[fnName.toLowerCase()] = this.getSandboxFunction(fnName);
    });
  }

  /**
   * Securely evaluates a dynamic calculated expression in a math sandbox
   * @param formula Expression string (e.g., "subTotal * 0.05")
   * @param context Scope parameters matching variable names inside the expression
   */
  evaluate(formula: string, context: FormulaContext): number {
    if (!formula || formula.trim() === '') return 0;

    // 1. Check expression complexity boundaries
    if (formula.length > 256) {
      throw new Error('Formula calculation density exceeds maximum execution size limit (256 chars).');
    }

    // 2. Perform raw lexical token filters for safety
    this.sanitizeSyntaxPattern(formula);

    try {
      const parsedExpression = this.parser.parse(formula);
      
      // Clean context keys to prevent Prototype Injection
      const sanitizedContext = this.sanitizeContext(context);
      
      const result = parsedExpression.evaluate(sanitizedContext);
      
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        return 0;
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Formula calculation failed for "${formula}": ${error.message}`);
      throw new Error(`Formula execution failed: ${error.message}`);
    }
  }

  private sanitizeSyntaxPattern(formula: string): void {
    const dangerousPatterns = [
      /\[/, // Prevent arbitrary property indexes
      /\]/,
      /prototype/,
      /__proto__/,
      /constructor/,
      /;/ // Disallow multiple chained instruction lines
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(formula)) {
        throw new Error('Security alert: Restricted lexical characters detected in formula.');
      }
    }
  }

  private sanitizeContext(context: FormulaContext): Record<string, number> {
    const cleanContext: Record<string, number> = {};
    
    Object.keys(context).forEach((key) => {
      // Disallow context prototype access keys
      if (['prototype', '__proto__', 'constructor'].includes(key)) {
        return;
      }
      
      const val = context[key];
      if (typeof val === 'number') {
        cleanContext[key] = val;
      } else if (typeof val === 'string') {
        // Attempt to parse numerical string parameters
        const parsed = parseFloat(val);
        cleanContext[key] = isNaN(parsed) ? 0 : parsed;
      } else if (typeof val === 'boolean') {
        cleanContext[key] = val ? 1 : 0;
      }
    });

    return cleanContext;
  }

  private getSandboxFunction(fnName: string) {
    switch (fnName) {
      case 'IF':
        return (condition: any, trueVal: number, falseVal: number) => {
          const isTrue = typeof condition === 'boolean' ? condition : !!condition;
          return isTrue ? trueVal : falseVal;
        };
      case 'ROUND':
        return (val: number, precision: number) => {
          const factor = Math.pow(10, Math.floor(precision));
          return Math.round(val * factor) / factor;
        };
      case 'MIN':
        return (...args: number[]) => Math.min(...args);
      case 'MAX':
        return (...args: number[]) => Math.max(...args);
      case 'ABS':
        return (val: number) => Math.abs(val);
      default:
        throw new Error(`Execution error: Function "${fnName}" is not registered.`);
    }
  }
}
