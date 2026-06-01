'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  [key: string]: any; // Allow arbitrary custom column properties like UoM, Unit, etc.
}

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency?: string;
  showDiscount?: boolean;
  customColumns?: { key: string; label: string; type: 'text' | 'number' }[];
  onCustomColumnsChange?: (columns: { key: string; label: string; type: 'text' | 'number' }[]) => void;
}

function calcLineTotal(item: LineItem): number {
  const subtotal = item.quantity * item.unitPrice - item.discount;
  const tax = subtotal * (item.taxRate / 100);
  return Math.round((subtotal + tax) * 100) / 100;
}

export function calcTotals(items: LineItem[]) {
  let subTotal = 0;
  let taxTotal = 0;
  let discountTotal = 0;

  items.forEach((item) => {
    const lineSubtotal = item.quantity * item.unitPrice - item.discount;
    const lineTax = lineSubtotal * (item.taxRate / 100);
    subTotal += lineSubtotal;
    taxTotal += lineTax;
    discountTotal += item.discount;
  });

  return {
    subTotal: Math.round(subTotal * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    discountTotal: Math.round(discountTotal * 100) / 100,
    grandTotal: Math.round((subTotal + taxTotal) * 100) / 100,
  };
}

export default function LineItemEditor({
  items,
  onChange,
  currency = '$',
  showDiscount = true,
  customColumns = [],
  onCustomColumnsChange,
}: LineItemEditorProps) {
  const [showColManager, setShowColManager] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState<'text' | 'number'>('text');

  const addLine = () => {
    const newItem: LineItem = {
      id: `line-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      discount: 0,
    };
    // Initialize custom columns with empty strings/zeros
    customColumns.forEach((col) => {
      newItem[col.key] = col.type === 'number' ? 0 : '';
    });
    onChange([...items, newItem]);
  };

  const removeLine = (id: string) => {
    onChange(items.filter((i) => i.id !== id));
  };

  const updateLine = (id: string, field: string, value: any) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const totals = calcTotals(items);

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Line Items
          </span>
          {onCustomColumnsChange && (
            <button
              type="button"
              onClick={() => setShowColManager(!showColManager)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-bold transition-all ${
                showColManager
                  ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'
                  : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <Settings size={11} />
              <span>Configure Columns</span>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black text-[10px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Plus size={12} />
          <span>Add Line</span>
        </button>
      </div>

      {/* Column Manager Panel */}
      {showColManager && onCustomColumnsChange && (
        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200">Manage Custom Line Columns</h4>
            <button
              type="button"
              onClick={() => setShowColManager(false)}
              className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline"
            >
              Close
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed">
            Add custom columns like <strong>UoM</strong>, <strong>Unit</strong>, or <strong>Part Code</strong>. These are saved locally inside this document record.
          </p>

          {/* Active Columns Tags */}
          <div className="flex flex-wrap gap-2 pt-1">
            {customColumns.length === 0 ? (
              <span className="text-[10px] italic text-slate-400 dark:text-zinc-600">No custom columns added yet.</span>
            ) : (
              customColumns.map((col) => (
                <span
                  key={col.key}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 shadow-sm"
                >
                  <span>{col.label} ({col.type === 'number' ? '#' : 'abc'})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = customColumns.filter((c) => c.key !== col.key);
                      onCustomColumnsChange(next);
                      // Clean up fields in lines
                      onChange(
                        items.map((item) => {
                          const copy = { ...item };
                          delete copy[col.key];
                          return copy;
                        })
                      );
                    }}
                    className="text-rose-500 hover:text-rose-600 font-extrabold text-sm leading-none transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add New Column Form */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/30">
            <input
              type="text"
              placeholder="e.g. UoM, Unit, Part No"
              value={newColLabel}
              onChange={(e) => setNewColLabel(e.target.value)}
              className="flex-1 rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
            <select
              value={newColType}
              onChange={(e) => setNewColType(e.target.value as 'text' | 'number')}
              className="rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            >
              <option value="text">Text (abc)</option>
              <option value="number">Number (#)</option>
            </select>
            <button
              type="button"
              onClick={() => {
                if (!newColLabel.trim()) return;
                const key = newColLabel.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
                if (!key) return;
                if (customColumns.some((c) => c.key === key)) return;
                
                const newCol = { key, label: newColLabel.trim(), type: newColType };
                onCustomColumnsChange([...customColumns, newCol]);
                
                // Initialize column value on existing items
                onChange(
                  items.map((item) => ({
                    ...item,
                    [key]: newColType === 'number' ? 0 : '',
                  }))
                );
                
                setNewColLabel('');
              }}
              className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black font-bold text-xs hover:scale-[1.02] transition-all"
            >
              Add Column
            </button>
          </div>
        </div>
      )}

      {/* Main Table */}
      {items.length === 0 ? (
        <div className="border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-8 text-center">
          <p className="text-xs text-slate-400 dark:text-zinc-500">No line items yet. Click &quot;Add Line&quot; to begin.</p>
        </div>
      ) : (
        <div className="border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="bg-zinc-100/60 dark:bg-zinc-900/60 text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">
                  <th className="px-3 py-3 text-left">Description</th>
                  
                  {/* Dynamic Custom Column Headers */}
                  {customColumns.map((col) => (
                    <th key={col.key} className="px-3 py-3 text-right w-24">
                      {col.label}
                    </th>
                  ))}

                  <th className="px-3 py-3 text-right w-20">Qty</th>
                  <th className="px-3 py-3 text-right w-24">Unit Price</th>
                  <th className="px-3 py-3 text-right w-20">Tax %</th>
                  {showDiscount && <th className="px-3 py-3 text-right w-24">Discount</th>}
                  <th className="px-3 py-3 text-right w-28">Total</th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                {items.map((item) => (
                  <tr key={item.id} className="text-slate-700 dark:text-zinc-300 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10">
                    {/* Description */}
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLine(item.id, 'description', e.target.value)}
                        placeholder="Item description..."
                        className="w-full bg-transparent border-0 focus:outline-none font-medium text-xs placeholder:text-slate-300 dark:placeholder:text-zinc-600 text-slate-800 dark:text-zinc-200"
                      />
                    </td>

                    {/* Dynamic Custom Column Inputs */}
                    {customColumns.map((col) => (
                      <td key={col.key} className="px-3 py-2">
                        <input
                          type={col.type === 'number' ? 'number' : 'text'}
                          value={item[col.key] !== undefined ? item[col.key] : ''}
                          onChange={(e) =>
                            updateLine(
                              item.id,
                              col.key,
                              col.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                            )
                          }
                          placeholder={`—`}
                          className="w-full bg-transparent border-0 focus:outline-none font-semibold text-right text-xs text-slate-800 dark:text-zinc-200"
                        />
                      </td>
                    ))}

                    {/* Qty */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={item.quantity}
                        onChange={(e) => updateLine(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-0 focus:outline-none font-bold text-right text-xs text-slate-900 dark:text-zinc-100"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unitPrice}
                        onChange={(e) => updateLine(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-0 focus:outline-none font-bold text-right text-xs text-slate-900 dark:text-zinc-100"
                      />
                    </td>

                    {/* Tax Rate */}
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={item.taxRate}
                        onChange={(e) => updateLine(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border-0 focus:outline-none text-right text-xs text-slate-600 dark:text-zinc-400"
                      />
                    </td>

                    {/* Discount */}
                    {showDiscount && (
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.discount}
                          onChange={(e) => updateLine(item.id, 'discount', parseFloat(e.target.value) || 0)}
                          className="w-full bg-transparent border-0 focus:outline-none text-right text-xs text-rose-500 font-semibold"
                        />
                      </td>
                    )}

                    {/* Line Total */}
                    <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-zinc-100">
                      {currency}
                      {calcLineTotal(item).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>

                    {/* Remove Action */}
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(item.id)}
                        className="text-slate-300 hover:text-rose-500 dark:text-zinc-600 dark:hover:text-rose-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals footer */}
          <div className="bg-zinc-50/80 dark:bg-zinc-900/40 border-t border-zinc-200/50 dark:border-zinc-800/40 px-4 py-3">
            <div className="flex flex-col items-end gap-1 text-xs">
              <div className="flex items-center gap-6">
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Subtotal</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300 w-28 text-right">
                  {currency}
                  {totals.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {showDiscount && totals.discountTotal > 0 && (
                <div className="flex items-center gap-6">
                  <span className="text-slate-400 dark:text-zinc-500 font-medium">Discount</span>
                  <span className="font-bold text-rose-500 w-28 text-right">
                    -{currency}
                    {totals.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-6">
                <span className="text-slate-400 dark:text-zinc-500 font-medium">Tax</span>
                <span className="font-bold text-slate-700 dark:text-zinc-300 w-28 text-right">
                  {currency}
                  {totals.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-6 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/30 mt-1">
                <span className="font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider text-[10px]">
                  Grand Total
                </span>
                <span className="font-extrabold text-slate-900 dark:text-zinc-50 w-28 text-right text-sm">
                  {currency}
                  {totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
