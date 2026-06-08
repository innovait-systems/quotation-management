'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useTemplatesStore, TemplateEntityType } from '../../../store/templatesStore';
import {
  Printer, Trash2, Plus, RefreshCw, GripVertical, Check, Save,
  Eye, EyeOff
} from 'lucide-react';

export default function TemplatesView() {
  const { activeTenant } = useTenantStore();

  // Document Templates Designer State
  const {
    templates,
    activeTemplateIds,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    setDefaultTemplate,
    resetTemplate
  } = useTemplatesStore();

  const [selectedTemplateEntity, setSelectedTemplateEntity] = useState<TemplateEntityType>('QUOTATION');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [templateSaveStatus, setTemplateSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const currentTemplates = templates.filter(t => t.entityType === selectedTemplateEntity);
  const activeTemplate = currentTemplates.find(t => t.id === selectedTemplateId) || currentTemplates.find(t => t.id === activeTemplateIds[selectedTemplateEntity]) || currentTemplates[0] || templates[0];
  const previewLogoUrl = activeTemplate?.config?.logoUrl || activeTenant.logoUrl;
  const previewCompanyAddress = activeTemplate?.config?.companyAddress || activeTenant.address;

  const handleAddSpacer = () => {
    if (!activeTemplate) return;
    const newSpacerId = `spacer_${Date.now()}`;
    const newOrder = [...activeTemplate.layoutOrder, newSpacerId];
    updateTemplate(activeTemplate.id, { layoutOrder: newOrder });
  };

  const handleRemoveSpacer = (spacerId: string) => {
    if (!activeTemplate) return;
    const newOrder = activeTemplate.layoutOrder.filter(id => id !== spacerId);
    const spacerHeights = { ...(activeTemplate.config.spacerHeights || {}) };
    delete spacerHeights[spacerId];
    updateTemplate(activeTemplate.id, {
      layoutOrder: newOrder,
      config: { spacerHeights }
    });
  };

  const toggleBlockVisibility = (blockId: string) => {
    if (!activeTemplate) return;
    const hiddenBlocks = { ...(activeTemplate.config.hiddenBlocks || {}) };
    hiddenBlocks[blockId] = !hiddenBlocks[blockId];
    updateTemplate(activeTemplate.id, { config: { hiddenBlocks } });
  };

  const isBlockVisible = (blockId: string) => {
    if (activeTemplate.config.hiddenBlocks?.[blockId]) {
      return false;
    }
    if (blockId.startsWith('spacer')) {
      return true;
    }
    switch (blockId) {
      case 'logo_brand':
        return true;
      case 'brand_logo':
        return true;
      case 'org_details':
        return true;
      case 'doc_title':
        return true;
      case 'company_details':
        return true;
      case 'customer_details':
        return activeTemplate.config.showBillingAddress;
      case 'details_box':
        return activeTemplate.config.showDetailsBox;
      case 'main_table':
        return true;
      case 'custom_fields':
        return activeTemplate.config.showCustomFields;
      case 'upi_qr':
        return selectedTemplateEntity === 'INVOICE' && activeTemplate.config.showQrCode;
      case 'signatures':
        return selectedTemplateEntity !== 'SERVICE' && activeTemplate.config.showSignature;
      case 'footer_terms':
        return !!activeTemplate.config.footerTerms;
      default:
        return false;
    }
  };

  const renderPreviewBlock = (blockId: string) => {
    if (blockId.startsWith('spacer')) {
      const heightVal = activeTemplate.config.spacerHeights?.[blockId] || 'medium';
      const spacerHeightsMap = {
        none: 0,
        small: 12,
        medium: 24,
        large: 36,
        xl: 48
      };
      const heightPx = spacerHeightsMap[heightVal];
      return (
        <div
          key={blockId}
          className="w-full flex items-center justify-center transition-all duration-300 animate-in fade-in"
          style={{ height: `${heightPx}px` }}
        >
          {heightPx > 0 ? (
            <div className="w-full h-full border border-dashed border-indigo-300/40 dark:border-indigo-800/40 bg-indigo-500/5 flex items-center justify-center pointer-events-none select-none rounded-lg">
              <span className="text-[8px] font-mono tracking-widest text-indigo-400/80 uppercase">
                Spacer Gap ({heightVal}: {heightPx}px)
              </span>
            </div>
          ) : (
            <div className="w-full h-full border border-dashed border-slate-200/30 dark:border-slate-800/30 flex items-center justify-center pointer-events-none select-none rounded-lg">
              <span className="text-[7px] font-mono tracking-widest text-slate-300 uppercase">
                Spacer Gap (none)
              </span>
            </div>
          )}
        </div>
      );
    }

    switch (blockId) {
      case 'logo_brand':
        return (
          <div
            key="logo_brand"
            className="flex flex-col gap-2 transition-all duration-300 animate-in fade-in duration-300"
            style={{
              alignItems: activeTemplate.config.headerAlign === 'left'
                ? 'flex-start'
                : activeTemplate.config.headerAlign === 'right'
                  ? 'flex-end'
                  : 'center',
              textAlign: activeTemplate.config.headerAlign
            }}
          >
            {previewLogoUrl ? (
              <img src={previewLogoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain rounded-lg mb-2" />
            ) : (
              <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-xs mb-2">No Logo</div>
            )}
            <h4 className="text-xl font-extrabold tracking-tight text-slate-900">{activeTenant.name}</h4>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Multi-tenant Cloud Services</p>
          </div>
        );

      case 'brand_logo':
        return (
          <div
            key="brand_logo"
            className="flex flex-col transition-all duration-300 animate-in fade-in duration-300"
            style={{
              alignItems: activeTemplate.config.headerAlign === 'left'
                ? 'flex-start'
                : activeTemplate.config.headerAlign === 'right'
                  ? 'flex-end'
                  : 'center',
              textAlign: activeTemplate.config.headerAlign
            }}
          >
            {previewLogoUrl ? (
              <img src={previewLogoUrl} alt="Logo" className="h-12 max-w-[200px] object-contain rounded-lg" />
            ) : (
              <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-300 text-xs">No Logo</div>
            )}
          </div>
        );

      case 'org_details':
        return (
          <div
            key="org_details"
            className="flex flex-col gap-1 transition-all duration-300 animate-in fade-in duration-300"
            style={{
              alignItems: activeTemplate.config.headerAlign === 'left'
                ? 'flex-start'
                : activeTemplate.config.headerAlign === 'right'
                  ? 'flex-end'
                  : 'center',
              textAlign: activeTemplate.config.headerAlign
            }}
          >
            <h4 className="text-xl font-extrabold tracking-tight text-slate-900">{activeTenant.name}</h4>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Multi-tenant Cloud Services</p>
          </div>
        );

      case 'doc_title':
        return (
          <div
            key="doc_title"
            className="border-b-2 pb-3 flex flex-col gap-0.5 transition-all duration-300 animate-in fade-in duration-300"
            style={{
              borderColor: activeTemplate.config.accentColor,
              alignItems: activeTemplate.config.headerAlign === 'left'
                ? 'flex-start'
                : activeTemplate.config.headerAlign === 'right'
                  ? 'flex-end'
                  : 'center',
              textAlign: activeTemplate.config.headerAlign
            }}
          >
            <span
              className="text-sm font-extrabold uppercase tracking-wider"
              style={{ color: activeTemplate.config.accentColor }}
            >
              {selectedTemplateEntity === 'QUOTATION' && 'PROPOSAL / QUOTATION'}
              {selectedTemplateEntity === 'PURCHASE_ORDER' && 'PURCHASE ORDER'}
              {selectedTemplateEntity === 'INVOICE' && 'TAX INVOICE'}
              {selectedTemplateEntity === 'SERVICE' && 'SERVICE SLA DELIVERABLES'}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              {selectedTemplateEntity === 'QUOTATION' && 'QT-2026-8801'}
              {selectedTemplateEntity === 'PURCHASE_ORDER' && 'PO-2026-4091'}
              {selectedTemplateEntity === 'INVOICE' && 'INV-2026-0043'}
              {selectedTemplateEntity === 'SERVICE' && 'SVC-2026-0921'}
            </span>
          </div>
        );

      case 'company_details': {
        const isCard = (activeTemplate.config.blockStyles?.['company_details'] || 'plain') === 'card';
        return (
          <div
            key="company_details"
            className={`text-[10px] flex flex-col gap-0.5 animate-in fade-in duration-300 ${isCard
                ? 'bg-slate-50 p-3.5 rounded-2xl border border-slate-100/85 text-slate-600 shadow-2xs'
                : 'text-slate-500'
              }`}
          >
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">Company Details</span>
            <span className="font-semibold text-slate-700">{activeTenant.name}</span>
            <span className="whitespace-pre-line leading-relaxed">{previewCompanyAddress || 'No company address configured'}</span>
          </div>
        );
      }

      case 'customer_details': {
        const isCard = (activeTemplate.config.blockStyles?.['customer_details'] || 'card') !== 'plain';
        return (
          <div
            key="customer_details"
            className={`flex flex-col gap-1 text-[11px] animate-in fade-in duration-300 ${isCard
                ? 'bg-slate-50 p-3.5 rounded-2xl border border-slate-100 shadow-2xs'
                : 'text-slate-500'
              }`}
          >
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
              {selectedTemplateEntity === 'PURCHASE_ORDER' ? 'SUPPLIER / VENDOR' : 'CLIENT RECIPIENT'}
            </span>
            <span className={`font-extrabold ${isCard ? 'text-slate-800' : 'text-slate-700 font-bold'}`}>Acme Supply Systems LLC</span>
            <span className="text-slate-500">Suite 404, Tech Park East</span>
            <span className="text-slate-500 font-mono">accounts@acmesupply.co</span>
          </div>
        );
      }

      case 'details_box': {
        const isCard = (activeTemplate.config.blockStyles?.['details_box'] || 'card') !== 'plain';
        return (
          <div
            key="details_box"
            className={`flex flex-col gap-2 text-[11px] animate-in fade-in duration-300 ${isCard
                ? 'bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs'
                : 'text-slate-500'
              }`}
          >
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block">DOCUMENT DETAILS</span>
            <div className="flex justify-between">
              <span className="text-slate-400">Date Created</span>
              <span className="font-bold text-slate-700 font-mono">2026-05-22</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">
                {selectedTemplateEntity === 'QUOTATION' && 'Valid Until'}
                {selectedTemplateEntity === 'PURCHASE_ORDER' && 'Delivery Terms'}
                {selectedTemplateEntity === 'INVOICE' && 'Due Date'}
                {selectedTemplateEntity === 'SERVICE' && 'SLA Deadline'}
              </span>
              <span className="font-bold text-slate-700 font-mono">
                {selectedTemplateEntity === 'QUOTATION' && '2026-06-22'}
                {selectedTemplateEntity === 'PURCHASE_ORDER' && 'FOB Port'}
                {selectedTemplateEntity === 'INVOICE' && '2026-06-21'}
                {selectedTemplateEntity === 'SERVICE' && '48h SLA Priority'}
              </span>
            </div>
            {activeTemplate.config.showStatus !== false && (
              <div className="flex justify-between border-t border-slate-100/50 pt-1.5 mt-0.5">
                <span className="text-slate-400">Status</span>
                <span className="font-extrabold text-emerald-500 uppercase tracking-wider text-[9px]">APPROVED</span>
              </div>
            )}
          </div>
        );
      }

      case 'main_table':
        return (
          <div key="main_table" className="animate-in fade-in duration-300">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr
                  className="text-white text-[9px] uppercase tracking-wider font-extrabold"
                  style={{ backgroundColor: activeTemplate.config.accentColor }}
                >
                  <th className="p-2.5 rounded-l-lg">Description</th>
                  <th className="p-2.5 text-right">Qty</th>
                  <th className="p-2.5 text-right">Rate</th>
                  <th className="p-2.5 text-right rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  className="text-slate-700 transition-colors"
                  style={{
                    borderBottom: activeTemplate.config.borderStyle === 'thin'
                      ? '1px solid #f1f5f9'
                      : activeTemplate.config.borderStyle === 'dotted'
                        ? '1px dashed #cbd5e1'
                        : 'none'
                  }}
                >
                  <td className="p-2.5 font-medium">Enterprise Cloud Infrastructure Node setup</td>
                  <td className="p-2.5 text-right font-mono">1</td>
                  <td className="p-2.5 text-right font-mono">$4,500.00</td>
                  <td className="p-2.5 text-right font-bold text-slate-900 font-mono">$4,500.00</td>
                </tr>
                <tr
                  className="text-slate-700 transition-colors"
                  style={{
                    borderBottom: activeTemplate.config.borderStyle === 'thin'
                      ? '1px solid #f1f5f9'
                      : activeTemplate.config.borderStyle === 'dotted'
                        ? '1px dashed #cbd5e1'
                        : 'none'
                  }}
                >
                  <td className="p-2.5 font-medium">SOC2 Database Integrity & Log monitors</td>
                  <td className="p-2.5 text-right font-mono">12</td>
                  <td className="p-2.5 text-right font-mono">$250.00</td>
                  <td className="p-2.5 text-right font-bold text-slate-900 font-mono">$3,000.00</td>
                </tr>
              </tbody>
            </table>

            {/* Dotted border line helper */}
            {activeTemplate.config.borderStyle === 'accent' && (
              <div
                className="h-0.5 w-full mt-1.5 rounded-full"
                style={{ backgroundColor: activeTemplate.config.accentColor }}
              />
            )}

            {/* SLA Progress Bar Mock (Only for SERVICE tab) */}
            {selectedTemplateEntity === 'SERVICE' && (
              <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 mt-4 text-[11px] animate-in slide-in-from-top duration-300">
                <div className="flex justify-between font-bold mb-2">
                  <span className="text-sky-600 uppercase tracking-widest text-[8px]">SLA Deliverable Resolution</span>
                  <span className="text-sky-600 font-extrabold">85% Complete</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: '85%', backgroundColor: activeTemplate.config.accentColor }}
                  />
                </div>
              </div>
            )}

            {/* Mock Total Section */}
            {selectedTemplateEntity !== 'SERVICE' && (
              <div className="flex justify-end mt-4">
                <div className="w-[180px] text-[11px] space-y-1.5">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-700 font-mono">$7,500.00</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (18%)</span>
                    <span className="font-bold text-slate-700 font-mono">$1,350.00</span>
                  </div>
                  <div
                    className="flex justify-between pt-2 border-t font-extrabold text-[13px]"
                    style={{
                      borderTopColor: activeTemplate.config.borderStyle === 'accent'
                        ? activeTemplate.config.accentColor
                        : '#e2e8f0'
                    }}
                  >
                    <span>Total Due</span>
                    <span className="font-mono" style={{ color: activeTemplate.config.accentColor }}>$8,850.00</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'custom_fields':
        return (
          <div key="custom_fields" className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/50 text-[11px] animate-in fade-in duration-300">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2">
              DYNAMIC CUSTOM FIELDS
            </span>
            <div className="grid grid-cols-2 gap-3 font-medium">
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[8px] text-indigo-500 uppercase font-extrabold tracking-wider block">Warranty Period</span>
                <span className="text-slate-800 font-bold block mt-0.5">24 Months</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[8px] text-indigo-500 uppercase font-extrabold tracking-wider block">Priority Classification</span>
                <span className="text-slate-800 font-bold block mt-0.5">High Severity</span>
              </div>
            </div>
          </div>
        );

      case 'upi_qr':
        return (
          <div key="upi_qr" className="bg-emerald-500/5 p-3 rounded-2xl border border-emerald-500/10 flex items-center gap-2.5 animate-in slide-in-from-left duration-300">
            <div className="bg-white p-1 rounded-lg border shrink-0">
              <div className="h-10 w-10 bg-slate-900 flex items-center justify-center text-white text-[7px] font-bold rounded">
                QR CODE
              </div>
            </div>
            <div className="text-[9px] leading-tight">
              <p className="font-extrabold text-slate-800">Scan & Pay UPI</p>
              <p className="text-slate-400 mt-0.5 font-mono">Instant settlement</p>
            </div>
          </div>
        );

      case 'signatures':
        return (
          <div key="signatures" className="flex flex-col items-end gap-1 text-right animate-in slide-in-from-right duration-300">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">AUTHORIZED SIGNATORY</span>
            <span
              className="text-base font-bold italic tracking-wide mt-1"
              style={{ color: activeTemplate.config.accentColor }}
            >

            </span>
            <div className="w-[120px] h-0.5 bg-slate-200 mt-1" />
          </div>
        );

      case 'footer_terms':
        return (
          <div key="footer_terms" className="border-t border-slate-100 pt-4 mt-4 animate-in fade-in duration-300">
            <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">TERMS & NOTES</span>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
              {activeTemplate.config.footerTerms}
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const visibleBlocks = activeTemplate.layoutOrder.filter(isBlockVisible);
  const widths = activeTemplate.config.blockWidths || {};

  const previewElements = (
    <div className="flex flex-wrap gap-4 w-full items-start">
      {visibleBlocks.map((blockId) => {
        const width = widths[blockId] || 'full';
        let widthClass = 'w-full';
        if (width === 'half') {
          widthClass = 'w-[calc(50%-8px)]';
        } else if (width === 'third') {
          widthClass = 'w-[calc(33.333%-11px)]';
        }
        return (
          <div key={blockId} className={`${widthClass} transition-all duration-300`}>
            {renderPreviewBlock(blockId)}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-zinc-50">
            Document Templates
          </h1>
          <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
            Design and organize print layout templates for Quotations, Invoices, Purchase Orders, and Service contracts.
          </p>
        </div>
      </div>

      {activeTemplate && (
        <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40">
          <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
            <Printer size={18} style={{ color: activeTenant.brandingConfig.primary }} />
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Visual Template Designer</h3>
              <p className="text-xs text-slate-400">Visually configure vector print templates, colors, typography, and dynamic blocks for each service.</p>
            </div>
          </div>

          {/* Entity Selector Tabs */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-6">
            {(['QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'SERVICE'] as TemplateEntityType[]).map((entity) => (
              <button
                key={entity}
                type="button"
                onClick={() => {
                  setSelectedTemplateEntity(entity);
                  setSelectedTemplateId('');
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${selectedTemplateEntity === entity
                    ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-50 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                  }`}
              >
                {entity.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Designer Container */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

            {/* 1. Designer Controls Left Column */}
            <div className="xl:col-span-5 space-y-5">

              {/* Multiple Template Manager */}
              <div className="bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30 text-xs space-y-4">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px]">Saved Custom Themes</label>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-600 text-white flex items-center gap-1 hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    <Plus size={10} />
                    New Theme
                  </button>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2 animate-in slide-in-from-top duration-200">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Create New Custom Theme</p>
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. Premium Consulting Theme"
                      className="w-full rounded-lg px-2 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newTemplateName.trim()) return;
                          const newId = createTemplate(newTemplateName.trim(), selectedTemplateEntity);
                          setSelectedTemplateId(newId);
                          setNewTemplateName('');
                          setShowCreateForm(false);
                        }}
                        className="flex-1 py-1 text-center bg-indigo-600 text-white rounded font-bold text-[10px]"
                      >
                        Create
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateForm(false)}
                        className="px-2 py-1 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 rounded text-[10px]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* List current templates */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {currentTemplates.map((tpl) => {
                    const isDefault = activeTemplateIds[selectedTemplateEntity] === tpl.id;
                    const isEditing = activeTemplate.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isEditing
                            ? 'bg-zinc-900/5 dark:bg-white/5 border-indigo-500 text-slate-900 dark:text-zinc-50 font-bold'
                            : 'bg-white dark:bg-zinc-950 border-zinc-200/50 dark:border-zinc-800/40 text-slate-500 hover:text-slate-700 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                          }`}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs truncate max-w-[150px]">{tpl.name}</span>
                          {isDefault && (
                            <span className="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Active Default</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {!isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultTemplate(selectedTemplateEntity, tpl.id)}
                              className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300"
                            >
                              Set Default
                            </button>
                          )}
                          {currentTemplates.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteTemplate(tpl.id);
                                if (activeTemplate.id === tpl.id) {
                                  setSelectedTemplateId('');
                                }
                              }}
                              className="text-rose-500 hover:text-rose-700 p-1"
                              title="Delete Theme"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Layout & Style Toolbox</p>

              <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30 text-xs">

                {/* Header Alignment */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-500 dark:text-zinc-400 block">Header Logo & Title Alignment</label>
                  <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateTemplate(activeTemplate.id, { config: { headerAlign: align } })}
                        className={`px-3 py-1.5 font-bold rounded-lg capitalize transition-all ${activeTemplate.config.headerAlign === align
                            ? 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-zinc-100 shadow-xs'
                            : 'text-slate-400 hover:text-slate-600 dark:text-zinc-400'
                          }`}
                      >
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Selector */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Typography Font Family</label>
                  <select
                    value={activeTemplate.config.fontFamily}
                    onChange={(e) => updateTemplate(activeTemplate.id, { config: { fontFamily: e.target.value as any } })}
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  >
                    <option value="Plus Jakarta Sans">Plus Jakarta Sans (Modern Clean)</option>
                    <option value="Outfit">Outfit (Geometric Premium)</option>
                    <option value="Inter">Inter (Functional Corporate)</option>
                    <option value="Roboto">Roboto (Sleek High Tech)</option>
                  </select>
                </div>

                {/* Accent Tones Selector */}
                <div className="space-y-2">
                  <label className="font-bold text-slate-500 dark:text-zinc-400 block">Accent Color Tone</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Swatches */}
                    {[
                      { name: 'Preset', hex: activeTenant.brandingConfig.primary },
                      { name: 'Indigo', hex: '#6366f1' },
                      { name: 'Violet', hex: '#8b5cf6' },
                      { name: 'Emerald', hex: '#10b981' },
                      { name: 'Sky', hex: '#0ea5e9' },
                      { name: 'Rose', hex: '#f43f5e' },
                      { name: 'Orange', hex: '#f97316' }
                    ].map((swatch) => (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => updateTemplate(activeTemplate.id, { config: { accentColor: swatch.hex } })}
                        className="h-6 w-6 rounded-full border border-black/10 dark:border-white/10 relative transition-transform hover:scale-110 active:scale-95"
                        style={{ backgroundColor: swatch.hex }}
                        title={swatch.name}
                      >
                        {activeTemplate.config.accentColor.toLowerCase() === swatch.hex.toLowerCase() && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold">✓</span>
                        )}
                      </button>
                    ))}

                    {/* Hex Picker Input */}
                    <input
                      type="text"
                      value={activeTemplate.config.accentColor}
                      onChange={(e) => updateTemplate(activeTemplate.id, { config: { accentColor: e.target.value } })}
                      className="w-20 rounded-xl px-2 py-1 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono tracking-wider ml-2"
                    />
                  </div>
                </div>

                {/* Table Border Style */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Document Border Style</label>
                  <select
                    value={activeTemplate.config.borderStyle}
                    onChange={(e) => updateTemplate(activeTemplate.id, { config: { borderStyle: e.target.value as any } })}
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  >
                    <option value="thin">Thin Gray Border</option>
                    <option value="accent">Accent Colored Header</option>
                    <option value="dotted">Dotted Separators</option>
                    <option value="none">Minimal (No Borders)</option>
                  </select>
                </div>

                {/* Watermark Input */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Watermark Custom Text</label>
                  <input
                    type="text"
                    value={activeTemplate.config.watermarkText}
                    onChange={(e) => updateTemplate(activeTemplate.id, { config: { watermarkText: e.target.value.toUpperCase() } })}
                    placeholder="e.g. DRAFT"
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-bold uppercase tracking-wider"
                  />
                </div>

                {/* Block Visibility Grid */}
                <div className="space-y-2 pt-2">
                  <label className="font-bold text-slate-500 dark:text-zinc-400 block">Render Document Components</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 bg-white/50 dark:bg-zinc-900/20 p-3 rounded-xl border border-zinc-200/30 dark:border-zinc-800/10">

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeTemplate.config.showBillingAddress}
                        onChange={(e) => updateTemplate(activeTemplate.id, { config: { showBillingAddress: e.target.checked } })}
                        id="comp-billing"
                        className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-800"
                      />
                      <label htmlFor="comp-billing" className="font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">Client Addresses</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeTemplate.config.showDetailsBox}
                        onChange={(e) => updateTemplate(activeTemplate.id, { config: { showDetailsBox: e.target.checked } })}
                        id="comp-details"
                        className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-800"
                      />
                      <label htmlFor="comp-details" className="font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">Document Info Box</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeTemplate.config.showStatus !== false}
                        onChange={(e) => updateTemplate(activeTemplate.id, { config: { showStatus: e.target.checked } })}
                        id="comp-status"
                        className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-800"
                      />
                      <label htmlFor="comp-status" className="font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">Document Status</label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={activeTemplate.config.showCustomFields}
                        onChange={(e) => updateTemplate(activeTemplate.id, { config: { showCustomFields: e.target.checked } })}
                        id="comp-custom-fields"
                        className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-800"
                      />
                      <label htmlFor="comp-custom-fields" className="font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">Custom Fields Grid</label>
                    </div>

                    {selectedTemplateEntity === 'INVOICE' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeTemplate.config.showQrCode}
                          onChange={(e) => updateTemplate(activeTemplate.id, { config: { showQrCode: e.target.checked } })}
                          id="comp-qr"
                          className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-800"
                        />
                        <label htmlFor="comp-qr" className="font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">Payment UPI QR</label>
                      </div>
                    )}

                    {selectedTemplateEntity !== 'SERVICE' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={activeTemplate.config.showSignature}
                          onChange={(e) => updateTemplate(activeTemplate.id, { config: { showSignature: e.target.checked } })}
                          id="comp-sig"
                          className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-800"
                        />
                        <label htmlFor="comp-sig" className="font-bold text-slate-600 dark:text-zinc-300 cursor-pointer">Signature Block</label>
                      </div>
                    )}

                  </div>
                </div>

                {/* Legal Footer Terms */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Legal Agreement / Terms of Service</label>
                  <textarea
                    value={activeTemplate.config.footerTerms}
                    onChange={(e) => updateTemplate(activeTemplate.id, { config: { footerTerms: e.target.value } })}
                    rows={3}
                    placeholder="e.g. Payments must be processed..."
                    className="w-full rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none leading-relaxed"
                  />
                </div>

                {/* Custom Line Item Columns Configurator */}
                {selectedTemplateEntity !== 'SERVICE' && (
                  <div className="space-y-2 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/30">
                    <label className="font-bold text-slate-500 dark:text-zinc-400 block">Default Line Item Columns</label>
                    <p className="text-[10px] text-slate-400 leading-normal">Configure custom columns (like UoM, Unit) that apply automatically to documents created with this template.</p>

                    {/* Active Columns */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(!activeTemplate.config.lineItemColumns || activeTemplate.config.lineItemColumns.length === 0) ? (
                        <span className="text-[10px] italic text-slate-400">No custom columns added to this template.</span>
                      ) : (
                        (activeTemplate.config.lineItemColumns || []).map((col) => (
                          <span key={col.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] font-bold text-slate-700 dark:text-zinc-300 shadow-2xs">
                            <span>{col.label} ({col.type === 'number' ? '#' : 'abc'})</span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = (activeTemplate.config.lineItemColumns || []).filter(c => c.key !== col.key);
                                updateTemplate(activeTemplate.id, { config: { lineItemColumns: next } });
                              }}
                              className="text-rose-500 hover:text-rose-600 font-extrabold"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    {/* Add Column Input Form */}
                    <div className="flex gap-1.5 pt-1.5">
                      <input
                        type="text"
                        placeholder="Column Label (e.g. UoM)"
                        id="new-tpl-col-label"
                        className="flex-1 rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = (e.currentTarget as HTMLInputElement).value.trim();
                            if (!val) return;
                            const key = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
                            if (!key) return;
                            const current = activeTemplate.config.lineItemColumns || [];
                            if (current.some(c => c.key === key)) return;
                            const next = [...current, { key, label: val, type: 'text' as const }];
                            updateTemplate(activeTemplate.id, { config: { lineItemColumns: next } });
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('new-tpl-col-label') as HTMLInputElement;
                          if (!el) return;
                          const val = el.value.trim();
                          if (!val) return;
                          const key = val.toLowerCase().replace(/[^a-z0-9]/g, '_');
                          if (!key) return;
                          const current = activeTemplate.config.lineItemColumns || [];
                          if (current.some(c => c.key === key)) return;
                          const next = [...current, { key, label: val, type: 'text' as const }];
                          updateTemplate(activeTemplate.id, { config: { lineItemColumns: next } });
                          el.value = '';
                        }}
                        className="px-3 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black font-bold text-xs"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}

                {/* Save & Reset controls */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTemplateSaveStatus('saving');
                      setTimeout(() => {
                        setTemplateSaveStatus('saved');
                        setTimeout(() => setTemplateSaveStatus('idle'), 2000);
                      }, 500);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-transform"
                    style={{ backgroundColor: activeTemplate.config.accentColor }}
                  >
                    {templateSaveStatus === 'saving' ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Saving Changes...</span>
                      </>
                    ) : templateSaveStatus === 'saved' ? (
                      <>
                        <Check size={14} />
                        <span>Saved to Store!</span>
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        <span>Save Design</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      resetTemplate(activeTemplate.entityType);
                      setTemplateSaveStatus('saved');
                      setTimeout(() => setTemplateSaveStatus('idle'), 1500);
                    }}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all text-xs"
                  >
                    Reset Defaults
                  </button>
                </div>

              </div>

              {/* Overrides */}
              <div className="space-y-4 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30 text-xs">
                <label className="font-bold text-slate-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px]">Branding Overrides</label>

                <div className="space-y-3">
                  {/* Logo override */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-500 dark:text-zinc-400">Company Logo override</label>
                      <span className="text-[9px] font-medium text-slate-400 italic">
                        {activeTemplate.config.logoUrl ? 'Custom' : 'Using Global Default'}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={activeTemplate.config.logoUrl || ''}
                      onChange={(e) => updateTemplate(activeTemplate.id, { config: { logoUrl: e.target.value || undefined } })}
                      placeholder="Paste custom logo URL (leave empty for default)"
                      className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Address override */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-slate-500 dark:text-zinc-400">Company Address override</label>
                      <span className="text-[9px] font-medium text-slate-400 italic">
                        {activeTemplate.config.companyAddress ? 'Custom' : 'Using Global Default'}
                      </span>
                    </div>
                    <textarea
                      value={activeTemplate.config.companyAddress || ''}
                      onChange={(e) => updateTemplate(activeTemplate.id, { config: { companyAddress: e.target.value || undefined } })}
                      placeholder="Paste custom company address (leave empty for default)"
                      rows={2}
                      className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>
              </div>

              {/* Drag & Drop Reordering Panel */}
              <div className="space-y-3 bg-zinc-50/50 dark:bg-zinc-900/30 p-5 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30 text-xs">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-slate-500 dark:text-zinc-400 block uppercase tracking-wider text-[10px]">Drag & Drop Layout Blocks</label>
                  <button
                    type="button"
                    onClick={handleAddSpacer}
                    className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold transition-all hover:scale-105 cursor-pointer shadow-3xs"
                  >
                    + Add Spacer
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed mb-2">Drag cards up/down to customize print ordering. Rearrangement renders reactively in the preview.</p>

                <div className="space-y-2">
                  {activeTemplate.layoutOrder.map((blockId, idx) => {
                    const blockLabels: Record<string, string> = {
                      logo_brand: '1. Brand Header (Logo & Org)',
                      brand_logo: '1a. Brand Logo (Image only)',
                      org_details: '1b. Org Details (Name/Tagline)',
                      doc_title: '1.5 Dynamic Document Title',
                      company_details: '2. Company Address details',
                      customer_details: '3. Customer Billing address',
                      details_box: '4. Document Info Details',
                      main_table: '5. Itemized Table & Total',
                      custom_fields: '6. Dynamic Custom Fields',
                      upi_qr: '7. Scan & Pay UPI QR',
                      signatures: '8. Authorized Signature Block',
                      footer_terms: '9. Terms & Footer notes',
                      spacer: '↔ Customizable Spacer Gap'
                    };

                    const blockLabel = blockId.startsWith('spacer')
                      ? '↔ Spacer Gap'
                      : (blockLabels[blockId] || blockId);

                    const isDragging = draggingIndex === idx;
                    const isDragOver = dragOverIndex === idx;
                    const isHidden = !!activeTemplate.config.hiddenBlocks?.[blockId];

                    return (
                      <div
                        key={blockId}
                        draggable="true"
                        onDragStart={(e) => {
                          setDraggingIndex(idx);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverIndex !== idx) setDragOverIndex(idx);
                        }}
                        onDragEnd={() => {
                          setDraggingIndex(null);
                          setDragOverIndex(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingIndex !== null && draggingIndex !== idx) {
                            const newOrder = [...activeTemplate.layoutOrder];
                            const [removed] = newOrder.splice(draggingIndex, 1);
                            newOrder.splice(idx, 0, removed);
                            updateTemplate(activeTemplate.id, { layoutOrder: newOrder });
                          }
                          setDraggingIndex(null);
                          setDragOverIndex(null);
                        }}
                        className={`flex items-center gap-2 p-2.5 bg-white dark:bg-zinc-950 border rounded-xl cursor-grab active:cursor-grabbing transition-all ${isDragging ? 'opacity-40 border-indigo-500 scale-[0.98]' : 'border-zinc-200/60 dark:border-zinc-800/40 font-semibold'
                          } ${isDragOver ? 'border-t-2 border-t-indigo-500 bg-indigo-500/5' : ''} ${isHidden ? 'opacity-50 border-dashed bg-slate-50/50 dark:bg-zinc-900/20' : ''
                          }`}
                      >
                        <GripVertical size={14} className="text-slate-400 shrink-0 cursor-grab" />

                        {/* Show/Hide block visibility toggle */}
                        <button
                          type="button"
                          onClick={() => toggleBlockVisibility(blockId)}
                          className={`p-1 rounded transition-all hover:scale-110 shrink-0 cursor-pointer ${isHidden
                              ? 'text-rose-500 hover:text-rose-600 bg-rose-500/10'
                              : 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100'
                            }`}
                          title={isHidden ? 'Show Block' : 'Hide Block'}
                        >
                          {isHidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>

                        <span className="text-[11px] text-slate-700 dark:text-zinc-300">
                          {blockLabel}
                        </span>

                        {/* Small badge to show status */}
                        {blockId === 'upi_qr' && selectedTemplateEntity !== 'INVOICE' && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded ml-2">Invoices Only</span>
                        )}
                        {blockId === 'signatures' && selectedTemplateEntity === 'SERVICE' && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded ml-2">Service Disabled</span>
                        )}

                        {/* Trash icon for dynamic custom spacers */}
                        {blockId.startsWith('spacer') && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSpacer(blockId)}
                            className="text-rose-500 hover:text-rose-600 p-1 shrink-0 cursor-pointer transition-transform hover:scale-110"
                            title="Delete Spacer"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}

                        {/* Width Toggle & Style Control */}
                        <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Spacer Height Cycle Toggle */}
                          {blockId.startsWith('spacer') && (
                            <button
                              key="spacer-height-toggle"
                              type="button"
                              onClick={() => {
                                const spacerHeights = { ...(activeTemplate.config.spacerHeights || {}) };
                                const currentHeight = spacerHeights[blockId] || 'medium';
                                const heights: ('none' | 'small' | 'medium' | 'large' | 'xl')[] = ['none', 'small', 'medium', 'large', 'xl'];
                                const nextIndex = (heights.indexOf(currentHeight) + 1) % heights.length;
                                const nextHeight = heights[nextIndex];
                                spacerHeights[blockId] = nextHeight;
                                updateTemplate(activeTemplate.id, { config: { spacerHeights } });
                              }}
                              className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border cursor-pointer bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-extrabold shadow-2xs animate-pulse"
                            >
                              Height: {activeTemplate.config.spacerHeights?.[blockId] || 'medium'}
                            </button>
                          )}

                          {/* Card Style Toggle (Only for Details blocks) */}
                          {['company_details', 'customer_details', 'details_box'].includes(blockId) && (
                            <button
                              key="style-toggle"
                              type="button"
                              onClick={() => {
                                const blockStyles = { ...(activeTemplate.config.blockStyles || {}) };
                                const currentStyle = blockStyles[blockId] || (blockId === 'company_details' ? 'plain' : 'card');
                                blockStyles[blockId] = currentStyle === 'plain' ? 'card' : 'plain';
                                updateTemplate(activeTemplate.id, { config: { blockStyles } });
                              }}
                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border cursor-pointer ${(activeTemplate.config.blockStyles?.[blockId] || (blockId === 'company_details' ? 'plain' : 'card')) === 'card'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60 font-extrabold shadow-2xs'
                                  : 'bg-zinc-50 dark:bg-zinc-900 text-slate-400 border-zinc-200 dark:border-zinc-800'
                                }`}
                            >
                              {(activeTemplate.config.blockStyles?.[blockId] || (blockId === 'company_details' ? 'plain' : 'card')) === 'card' ? 'Card BG' : 'Plain'}
                            </button>
                          )}

                          {!blockId.startsWith('spacer') && (
                            <button
                              key="width-toggle"
                              type="button"
                              onClick={() => {
                                const blockWidths = { ...(activeTemplate.config.blockWidths || {}) };
                                const currentWidth = blockWidths[blockId] || 'full';
                                let newWidth: 'full' | 'half' | 'third' = 'full';
                                if (currentWidth === 'full') newWidth = 'half';
                                else if (currentWidth === 'half') newWidth = 'third';
                                else newWidth = 'full';
                                blockWidths[blockId] = newWidth;
                                updateTemplate(activeTemplate.id, { config: { blockWidths } });
                              }}
                              className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider transition-all border cursor-pointer ${(activeTemplate.config.blockWidths?.[blockId] || 'full') === 'half'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60 font-extrabold shadow-2xs'
                                  : (activeTemplate.config.blockWidths?.[blockId] || 'full') === 'third'
                                    ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800/60 font-extrabold shadow-2xs'
                                    : 'bg-zinc-50 dark:bg-zinc-900 text-slate-400 border-zinc-200 dark:border-zinc-800'
                                }`}
                            >
                              {(activeTemplate.config.blockWidths?.[blockId] || 'full') === 'half'
                                ? '½ Width'
                                : (activeTemplate.config.blockWidths?.[blockId] || 'full') === 'third'
                                  ? '⅓ Width'
                                  : 'Full'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* 2. Live Interactive Preview Right Column */}
            <div className="xl:col-span-7 space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Real-time Print Preview</p>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 animate-pulse">Reactive Canvas Active</span>
              </div>

              {/* Document preview frame */}
              <div
                className="relative border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white text-zinc-900 p-8 min-h-[640px] shadow-lg overflow-hidden transition-all duration-300 select-none"
                style={{
                  fontFamily: activeTemplate.config.fontFamily === 'Plus Jakarta Sans'
                    ? "'Plus Jakarta Sans', sans-serif"
                    : activeTemplate.config.fontFamily === 'Outfit'
                      ? "'Outfit', sans-serif"
                      : activeTemplate.config.fontFamily === 'Inter'
                        ? "'Inter', sans-serif"
                        : "'Roboto', sans-serif"
                }}
              >

                {/* Rotated watermark */}
                {activeTenant.features.pdf_watermark && activeTemplate.config.watermarkText && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
                    <div className="text-rose-500/8 border-4 border-rose-500/8 px-6 py-2 rounded-xl text-3xl font-black uppercase tracking-[10px] rotate-[-30deg]">
                      {activeTemplate.config.watermarkText}
                    </div>
                  </div>
                )}
                {/* Sequential Block Rendering */}
                {previewElements}

              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
