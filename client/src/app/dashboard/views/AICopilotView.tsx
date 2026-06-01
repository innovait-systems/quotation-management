'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useDashboardStore, ActivityLog } from '../../../store/dashboardStore';
import { Sparkles, RefreshCw } from 'lucide-react';

export default function AICopilotView() {
  const { activeTenant } = useTenantStore();
  const { setCurrentTab } = useDashboardStore();

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiEntityType, setAiEntityType] = useState('QUOTATION');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiResult, setAiResult] = useState<any>(null);
  const [aiFormValues, setAiFormValues] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [actions, setActions] = useState<any[]>([]);

  const triggerAiTemplateGen = () => {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);
    setAiStep(1);

    setTimeout(() => {
      setAiStep(2);
      setTimeout(() => {
        setAiStep(3);
        setTimeout(() => {
          setAiStep(4);
          setTimeout(() => {
            const promptNorm = aiPrompt.toLowerCase();
            let generated: any;

            if (promptNorm.includes('sow') || promptNorm.includes('software') || promptNorm.includes('dev')) {
              generated = {
                title: 'Offshore Software Dev Contract',
                desc: 'Statement of Work structure featuring Sprint allocations, timezone matching, and auto SLA penalizations.',
                primaryColor: '#6366f1',
                terms: 'All sprint deliverables are audited on a 7-day client UAT review cycle. Delayed deliveries violate initial SLA timelines.',
                fields: [
                  { name: 'planned_sprints', label: 'Estimated Sprints Count', type: 'NUMBER', isRequired: true, defaultValue: 6 },
                  { name: 'resource_role', label: 'Primary Developer Level', type: 'DROPDOWN', isRequired: true, options: ['Lead Architect', 'Senior Engineer', 'Mid-Level Engineer', 'UI/UX Designer'], defaultValue: 'Senior Engineer' },
                  { name: 'include_warranty', label: 'Include SLA Warranty Coverage', type: 'CHECKBOX', isRequired: false, defaultValue: true },
                  { name: 'warranty_months', label: 'Warranty Period (Months)', type: 'NUMBER', isRequired: false, defaultValue: 12, visibility: 'include_warranty' },
                  { name: 'sla_breach_penalty', label: 'SLA Deviation Penalty Fee', type: 'FORMULA', formula: 'subTotal * 0.10' }
                ]
              };
            } else if (promptNorm.includes('delivery') || promptNorm.includes('freight') || promptNorm.includes('hardware')) {
              generated = {
                title: 'Hardware Procurement & Logistics PO',
                desc: 'Procurement template optimized for bulk hardware with freight zones and shipping handlers.',
                primaryColor: '#0ea5e9',
                terms: 'Freight insurance is automatically calculated based on the aggregate value. Shipping carrier must deliver cargo to destination within SLA timeframes.',
                fields: [
                  { name: 'shipping_carrier', label: 'Approved Freight Carrier', type: 'DROPDOWN', isRequired: true, options: ['FedEx Cargo', 'DHL Global Forwarding', 'UPS Freight'], defaultValue: 'DHL Global Forwarding' },
                  { name: 'delivery_zone', label: 'Destination Zone', type: 'DROPDOWN', isRequired: true, options: ['Zone-A (Domestic)', 'Zone-B (APAC)', 'Zone-C (EMEA)'], defaultValue: 'Zone-A (Domestic)' },
                  { name: 'is_expedited', label: 'Request Expedited Shipment (24h)', type: 'CHECKBOX', isRequired: false, defaultValue: false },
                  { name: 'expedite_cost', label: 'Expediting Delivery Fee', type: 'NUMBER', isRequired: false, defaultValue: 500, visibility: 'is_expedited' },
                  { name: 'freight_insurance_fee', label: 'Freight Insurance Coverage', type: 'FORMULA', formula: 'subTotal * 0.02' }
                ]
              };
            } else {
              generated = {
                title: 'Corporate Advisory Services SOW',
                desc: 'Standard consulting service template with travel allocations and retainer formulas.',
                primaryColor: '#f43f5e',
                terms: 'Travel expenses are audited in accordance with corporate advisory compliance guidelines. Advisory invoices are compiled monthly in arrears and are due net 15 days.',
                fields: [
                  { name: 'consulting_hours', label: 'Allocated Consulting Hours', type: 'NUMBER', isRequired: true, defaultValue: 40 },
                  { name: 'advisory_tier', label: 'Strategic Advisory Tier', type: 'DROPDOWN', isRequired: true, options: ['Executive Partner', 'Senior Principal', 'Management Consultant'], defaultValue: 'Senior Principal' },
                  { name: 'reimburse_travel', label: 'Enable Travel Reimbursements', type: 'CHECKBOX', isRequired: false, defaultValue: false },
                  { name: 'travel_allowance', label: 'Daily Travel Retainer', type: 'NUMBER', isRequired: false, defaultValue: 150, visibility: 'reimburse_travel' },
                  { name: 'retainer_setup_cost', label: 'Platform Retainer Setup', type: 'FORMULA', formula: 'subTotal * 0.05 + 250' }
                ]
              };
            }

            const defaults: Record<string, any> = { subTotal: 10000 };
            generated.fields.forEach((f: any) => {
              if (f.type === 'CHECKBOX') defaults[f.name] = f.defaultValue || false;
              else if (f.type === 'NUMBER') defaults[f.name] = f.defaultValue || 0;
              else defaults[f.name] = f.defaultValue || '';
            });

            if (generated.title.includes('Software')) defaults['sla_breach_penalty'] = defaults.subTotal * 0.10;
            else if (generated.title.includes('Hardware')) defaults['freight_insurance_fee'] = defaults.subTotal * 0.02;
            else defaults['retainer_setup_cost'] = defaults.subTotal * 0.05 + 250;

            setAiFormValues(defaults);
            setAiResult(generated);
            setAiGenerating(false);

            const auditNow = new Date();
            const auditTime = `${String(auditNow.getHours()).padStart(2, '0')}:${String(auditNow.getMinutes()).padStart(2, '0')}:${String(auditNow.getSeconds()).padStart(2, '0')}`;
            setLogs(prev => [{ id: String(Date.now()), timestamp: auditTime, user: 'Jarvis (AI Helper)', action: 'AI Template Compiled', impact: `Compiled blueprint layout: ${generated.title} (${generated.fields.length} Custom Fields)`, color: 'text-indigo-400' }, ...prev]);
          }, 600);
        }, 500);
      }, 500);
    }, 500);
  };

  const handleAiFormInputChange = (fieldName: string, val: any) => {
    const updated = { ...aiFormValues, [fieldName]: val };
    if (aiResult.title.includes('Software')) {
      updated['sla_breach_penalty'] = updated.subTotal * 0.10;
    } else if (aiResult.title.includes('Hardware')) {
      const shippingZoneCoeff = updated.delivery_zone === 'Zone-B (APAC)' ? 0.05 : 0.02;
      const baseExpedite = updated.is_expedited ? parseFloat(updated.expedite_cost || 0) : 0;
      updated['freight_insurance_fee'] = Math.round((updated.subTotal * shippingZoneCoeff + baseExpedite) * 100) / 100;
    } else {
      const travelAdd = updated.reimburse_travel ? parseFloat(updated.travel_allowance || 0) * 5 : 0;
      updated['retainer_setup_cost'] = updated.subTotal * 0.05 + 250 + travelAdd;
    }
    setAiFormValues(updated);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">AI Copilot Workspace</h1>
        <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Compile enterprise-grade custom schemas, mathematical formulas, and terms from plain text prompts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* AI INPUT */}
        <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 space-y-6 lg:col-span-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Template Instruction Prompt</h3>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Target Document Type</label>
            <select value={aiEntityType} onChange={(e) => setAiEntityType(e.target.value)} className="w-full rounded-xl p-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-primary">
              <option value="QUOTATION">Statement of Work (Quotation)</option>
              <option value="PURCHASE_ORDER">Supplier Purchase Order</option>
              <option value="INVOICE">Structured Tax Invoice</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Prompt Guidelines</label>
            <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={5} placeholder="e.g. 'Draft SOW contract with Sprint durations, advisory level selection dropdown, and automatic SLA penalty calculations...'" className="w-full rounded-2xl p-3.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-1 focus:ring-primary" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Preset Prompts Suggestions</span>
            <div className="flex flex-wrap gap-2">
              {[
                { text: 'Offshore Software SOW', q: 'Offshore software dev SOW with sprint count and SLA breach penalty formula' },
                { text: 'Logistics Freight PO', q: 'Logistics bulk hardware PO with shipping zones and carrier dropdown options' },
                { text: 'Advisory Consulting Retainer', q: 'Advisory consulting services with travel retainer calculations' }
              ].map((preset, idx) => (
                <button key={idx} onClick={() => setAiPrompt(preset.q)} className="px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary hover:bg-primary/20 transition-all text-left"
                  style={{ color: activeTenant.brandingConfig.primary, borderColor: `${activeTenant.brandingConfig.primary}20`, backgroundColor: `${activeTenant.brandingConfig.primary}10` }}>
                  {preset.text}
                </button>
              ))}
            </div>
          </div>

          <button onClick={triggerAiTemplateGen} disabled={aiGenerating || !aiPrompt.trim()} className="w-full py-3 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-sm transition-all hover:scale-[1.02] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md">
            <RefreshCw size={14} className={aiGenerating ? 'animate-spin' : ''} />
            <span>{aiGenerating ? 'AI Generating...' : 'Compile AI Layout'}</span>
          </button>
        </div>

        {/* AI PREVIEW */}
        <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 lg:col-span-2 min-h-[450px] flex flex-col justify-between">

          {!aiGenerating && !aiResult && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
              <Sparkles size={48} className="text-zinc-300 dark:text-zinc-700 animate-pulse mb-4" />
              <h3 className="text-lg font-bold text-slate-600 dark:text-zinc-400">Interactive Canvas Idle</h3>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-2 max-w-xs">Enter structural prompt instructions on the left panel to compile draft layout fields and mathematical variables.</p>
            </div>
          )}

          {aiGenerating && (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin mb-8" />
              <div className="w-full max-w-xs space-y-4">
                {[
                  { step: 1, label: 'Parsing natural language parameters...' },
                  { step: 2, label: 'Compiling dynamic custom properties...' },
                  { step: 3, label: 'Solving mathematical formula trees...' },
                  { step: 4, label: 'Assembling draft document preview...' }
                ].map((s) => (
                  <div key={s.step} className="flex items-center gap-3 text-xs font-semibold">
                    <span className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] ${aiStep >= s.step ? 'bg-indigo-500 text-white' : 'bg-zinc-200 text-slate-400 dark:bg-zinc-800 dark:text-zinc-600'}`}>
                      {aiStep > s.step ? '✓' : s.step}
                    </span>
                    <span className={aiStep >= s.step ? 'text-slate-800 dark:text-zinc-200' : 'text-slate-400 dark:text-zinc-600'}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!aiGenerating && aiResult && (
            <div className="flex-1 flex flex-col justify-between space-y-6">
              <div className="border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-full">AI Output Approved</span>
                    <h3 className="text-xl font-bold mt-1 text-slate-800 dark:text-zinc-100">{aiResult.title}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: aiResult.primaryColor }} />
                    <span>{aiResult.desc}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 flex-1">
                <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3.5 block">Live Compilation Testing</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Baseline Subtotal amount</label>
                      <input type="number" value={aiFormValues.subTotal} onChange={(e) => handleAiFormInputChange('subTotal', parseFloat(e.target.value) || 0)} className="rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
                    </div>

                    {aiResult.fields.map((f: any) => {
                      const isFormula = f.type === 'FORMULA';
                      const shouldShow = !f.visibility || !!aiFormValues[f.visibility];
                      if (!shouldShow) return null;

                      return (
                        <div key={f.name} className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                            <span>{f.label}</span>
                            {isFormula && <span className="text-[8px] bg-indigo-500/10 text-indigo-600 rounded-full px-1.5 py-0.5 uppercase tracking-wide">Solved Formula</span>}
                          </label>

                          {f.type === 'NUMBER' && (
                            <input type="number" value={aiFormValues[f.name]} onChange={(e) => handleAiFormInputChange(f.name, parseFloat(e.target.value) || 0)} className="rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
                          )}
                          {f.type === 'DROPDOWN' && (
                            <select value={aiFormValues[f.name]} onChange={(e) => handleAiFormInputChange(f.name, e.target.value)} className="rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none">
                              {f.options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          )}
                          {f.type === 'CHECKBOX' && (
                            <div className="flex items-center gap-2 py-1.5">
                              <input type="checkbox" checked={!!aiFormValues[f.name]} onChange={(e) => handleAiFormInputChange(f.name, e.target.checked)} className="rounded border-zinc-200 h-4 w-4 text-indigo-500" />
                              <span className="text-xs text-slate-500">Enable parameter</span>
                            </div>
                          )}
                          {isFormula && (
                            <div className="rounded-xl px-3 py-2 text-xs bg-indigo-500/5 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold flex justify-between items-center">
                              <span className="font-mono text-[10px] opacity-75">{f.formula}</span>
                              <span>${aiFormValues[f.name]?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-zinc-100/30 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Suggested Compliance Clauses</span>
                  <p className="text-xs text-slate-500 leading-relaxed italic">{aiResult.terms}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40 flex items-center justify-between text-xs">
                <span className="text-slate-400">Tested schema variables will be committed to `CustomField` databases.</span>
                <button
                  onClick={() => {
                    setCurrentTab('DASHBOARD');
                    setActions(prev => [{ id: String(Date.now()), type: 'info', message: `AI Layout '${aiResult.title}' successfully integrated in documents workflow.`, eta: 'Just now' }, ...prev]);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-bold cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{ backgroundColor: activeTenant.brandingConfig.primary }}
                >
                  Deploy AI Template
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
