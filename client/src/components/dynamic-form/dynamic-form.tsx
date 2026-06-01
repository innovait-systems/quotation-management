"use client";

import React, { useState, useEffect } from 'react';

export interface CustomFieldConfig {
  id: string;
  entityType: string;
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
  defaultValue?: string;
  options?: any; // array of strings
  validationRules?: any;
  formula?: string;
  visibilityRule?: any; // { when: string, equals: any }
}

interface DynamicFormCompilerProps {
  fields: CustomFieldConfig[];
  onChange: (values: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  baselineContext?: Record<string, number>; // Subtotal, tax totals from document lines
}

export default function DynamicFormCompiler({
  fields,
  onChange,
  initialValues = {},
  baselineContext = {},
}: DynamicFormCompilerProps) {
  const [formState, setFormState] = useState<Record<string, any>>({});

  // 1. Initialize default values
  useEffect(() => {
    const defaultState: Record<string, any> = { ...initialValues };
    
    fields.forEach((field) => {
      if (defaultState[field.name] === undefined) {
        if (field.type === 'CHECKBOX') {
          defaultState[field.name] = field.defaultValue === 'true';
        } else if (field.type === 'NUMBER' || field.type === 'CURRENCY') {
          defaultState[field.name] = field.defaultValue ? parseFloat(field.defaultValue) : undefined;
        } else {
          defaultState[field.name] = field.defaultValue || '';
        }
      }
    });
    
    setFormState(defaultState);
  }, [fields]);

  // 2. Handle change & recalculate formula fields
  const handleInputChange = (fieldName: string, value: any) => {
    const updatedState = { ...formState, [fieldName]: value };
    
    // Evaluate dynamic formula fields instantly on state updates
    const finalState = evaluateFormulas(updatedState);
    
    setFormState(finalState);
    onChange(finalState);
  };

  // 3. Securely evaluate formulas locally on the client
  const evaluateFormulas = (currentState: Record<string, any>): Record<string, any> => {
    const resultState = { ...currentState };
    const formulaFields = fields.filter((f) => f.type === 'FORMULA' && f.formula);

    formulaFields.forEach((field) => {
      const expression = field.formula!;
      try {
        let expressionWithValues = expression;
        
        // Match variables in expression
        const variables = expression.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
        
        variables.forEach((token) => {
          // Skip built-in Math/Logic strings
          if (['if', 'round', 'min', 'max', 'abs'].includes(token.toLowerCase())) {
            return;
          }
          
          // Resolve variable value from baseline context (e.g. subTotal) or dynamic state inputs
          let val = 0;
          if (token in baselineContext) {
            val = baselineContext[token];
          } else if (token in currentState) {
            val = parseFloat(currentState[token]) || 0;
          }
          
          const regex = new RegExp(`\\b${token}\\b`, 'g');
          expressionWithValues = expressionWithValues.replace(regex, String(val));
        });

        // Lexical validation: restrict characters to safe arithmetic expressions
        if (!/^[0-9+\-*/().\s]+$/.test(expressionWithValues)) {
          resultState[field.name] = 0;
          return;
        }

        // Safe evaluation context in strict mode
        const evaluated = Function(`"use strict"; return (${expressionWithValues})`)();
        
        resultState[field.name] = typeof evaluated === 'number' && isFinite(evaluated) 
          ? Math.round(evaluated * 100) / 100 
          : 0;
      } catch (err) {
        resultState[field.name] = 0;
      }
    });

    return resultState;
  };

  // 4. Verify conditional field visibilities
  const checkFieldVisibility = (field: CustomFieldConfig): boolean => {
    const rule = field.visibilityRule;
    if (!rule || !rule.when) return true;

    const sourceValue = formState[rule.when];
    if (sourceValue === undefined) return false;

    if (rule.equals !== undefined) {
      const normSource = typeof sourceValue === 'string' ? sourceValue.toLowerCase() : sourceValue;
      const normEquals = typeof rule.equals === 'string' ? rule.equals.toLowerCase() : rule.equals;
      return String(normSource) === String(normEquals);
    }

    return true;
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200/50 pb-2 mb-4 dark:border-gray-800/50">
        <h3 className="text-sm font-semibold text-gray-900 tracking-wide dark:text-gray-100 uppercase">
          Dynamic Attributes
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">Metadata-driven custom property mapping.</p>
      </div>

      <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-2">
        {fields
          .filter((field) => checkFieldVisibility(field))
          .map((field) => {
            const isFormula = field.type === 'FORMULA';
            
            return (
              <div
                key={field.id}
                className={`flex flex-col space-y-1.5 ${
                  field.type === 'RICH_TEXT' ? 'sm:col-span-2' : ''
                }`}
              >
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 flex items-center justify-between">
                  <span>{field.label}</span>
                  {field.isRequired && !isFormula && (
                    <span className="text-[10px] text-red-500 font-semibold uppercase tracking-wider">
                      * Required
                    </span>
                  )}
                  {isFormula && (
                    <span className="text-[9px] text-indigo-500 font-mono tracking-wider uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded-full dark:text-indigo-400">
                      Calculated
                    </span>
                  )}
                </label>

                {/* Number & Currency Inputs */}
                {(field.type === 'NUMBER' || field.type === 'CURRENCY') && (
                  <input
                    type="number"
                    value={formState[field.name] !== undefined ? formState[field.name] : ''}
                    placeholder={field.defaultValue || '0.00'}
                    onChange={(e) =>
                      handleInputChange(
                        field.name,
                        e.target.value === '' ? undefined : parseFloat(e.target.value),
                      )
                    }
                    className="glass-card w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-950 dark:border-gray-800"
                  />
                )}

                {/* Standard Text Input */}
                {field.type === 'TEXT' && (
                  <input
                    type="text"
                    value={formState[field.name] || ''}
                    placeholder={field.defaultValue || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="glass-card w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-950 dark:border-gray-800"
                  />
                )}

                {/* Dropdown Input */}
                {field.type === 'DROPDOWN' && (
                  <select
                    value={formState[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="glass-card w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-950 dark:border-gray-800"
                  >
                    <option value="">Select option...</option>
                    {(field.options as string[] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* Multi-Select Select box */}
                {field.type === 'MULTI_SELECT' && (
                  <select
                    multiple
                    value={formState[field.name] || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, (item) => item.value);
                      handleInputChange(field.name, selected);
                    }}
                    className="glass-card w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-950 dark:border-gray-800 min-h-[80px]"
                  >
                    {(field.options as string[] || []).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}

                {/* Checkbox Trigger */}
                {field.type === 'CHECKBOX' && (
                  <div className="flex items-center space-x-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={!!formState[field.name]}
                      onChange={(e) => handleInputChange(field.name, e.target.checked)}
                      className="rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Enable {field.label} option
                    </span>
                  </div>
                )}

                {/* Date Selection */}
                {field.type === 'DATE' && (
                  <input
                    type="date"
                    value={
                      formState[field.name]
                        ? new Date(formState[field.name]).toISOString().substring(0, 10)
                        : ''
                    }
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="glass-card w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-950 dark:border-gray-800"
                  />
                )}

                {/* Secure Read-Only Formulas display */}
                {isFormula && (
                  <div className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-indigo-500/5 border border-indigo-500/20 text-indigo-600 font-semibold dark:text-indigo-400 dark:bg-indigo-950/20">
                    <span className="font-mono text-xs">{field.formula}</span>
                    <span className="font-sans text-base">
                      {formState[field.name] !== undefined ? formState[field.name] : '0.00'}
                    </span>
                  </div>
                )}

                {/* Rich Text Area */}
                {field.type === 'RICH_TEXT' && (
                  <textarea
                    rows={4}
                    value={formState[field.name] || ''}
                    placeholder={field.defaultValue || 'Enter detailed description...'}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="glass-card w-full rounded-lg px-3 py-2 text-sm bg-white border border-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:bg-gray-950 dark:border-gray-800"
                  />
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
