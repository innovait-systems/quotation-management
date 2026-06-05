'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useCustomersStore } from '../../../store/customersStore';
import { useDashboardStore } from '../../../store/dashboardStore';
import { QuotationRecord } from './quotationsData';
import { InvoiceRecord } from './invoicesData';
import { PurchaseOrderRecord } from './purchaseOrdersData';
import { useDocumentStore } from '../../../store/documentStore';
import { usePermissions } from '../../../hooks/usePermissions';

import StatusBadge from '../../../components/ui/StatusBadge';
import StatCard from '../../../components/ui/StatCard';
import DataTable, { Column } from '../../../components/ui/DataTable';
import SlidePanel from '../../../components/ui/SlidePanel';
import LineItemEditor, { LineItem, calcTotals } from '../../../components/ui/LineItemEditor';
import { useCustomFieldsStore } from '../../../store/customFieldsStore';
import { useTemplatesStore } from '../../../store/templatesStore';
import DynamicFormCompiler from '../../../components/dynamic-form/dynamic-form';
import { exportDocumentToPDF } from '../../../utils/pdfExporter';
import { getCurrencySymbol } from '../../../utils/currency';
import {
  FileText, Plus, ArrowRight, Eye, Edit3, Copy, Download,
  ChevronRight, Clock, GitBranch, Sparkles, X, ArrowLeftRight,
  Mail, Phone, Trash2
} from 'lucide-react';

const renderFieldInput = (
  field: any,
  value: any,
  onChange: (val: any) => void
) => {
  const isRequired = field.isRequired;
  const label = field.label;
  
  const inputClass = "w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300";
  
  let inputElement = null;
  
  if (field.type === 'TEXTAREA' || field.type === 'RICH_TEXT') {
    inputElement = (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`${inputClass} resize-none`}
        required={isRequired}
      />
    );
  } else if (field.type === 'DATE') {
    inputElement = (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        style={{ height: '48px' }}
        required={isRequired}
      />
    );
  } else if (field.type === 'NUMBER') {
    inputElement = (
      <input
        type="number"
        value={value !== undefined ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        className={inputClass}
        required={isRequired}
      />
    );
  } else if (field.type === 'CHECKBOX') {
    inputElement = (
      <div className="flex items-center space-x-2 py-2">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 h-4 w-4"
        />
        <span className="text-sm text-slate-700 dark:text-zinc-300">Enable {label}</span>
      </div>
    );
  } else if (field.type === 'DROPDOWN') {
    inputElement = (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        required={isRequired}
      >
        <option value="">Select option...</option>
        {(field.options || []).map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  } else {
    // TEXT fallback
    inputElement = (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        required={isRequired}
      />
    );
  }
  
  return (
    <div className="space-y-1.5 flex-1 min-w-0">
      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center justify-between">
        <span>{label} {isRequired && <span className="text-red-500">*</span>}</span>
      </label>
      {inputElement}
    </div>
  );
};


export default function QuotationsView() {
  const { activeTenant, currentUser } = useTenantStore();
  const { can } = usePermissions();
  const userName = `${currentUser.firstName} ${currentUser.lastName}`;
  const { setCurrentTab } = useDashboardStore();
  const { getActiveFieldsForEntity, fields } = useCustomFieldsStore();
  const { templates, activeTemplateIds } = useTemplatesStore();
  const { customers } = useCustomersStore();

  const { quotes: allQuotes, addQuotation, updateQuotation, deleteQuotation, addInvoice, addPurchaseOrder } = useDocumentStore();
  const [quotes, setQuotes] = useState<QuotationRecord[]>([]);

  React.useEffect(() => {
    setQuotes(allQuotes.filter(q => q.tenantId === activeTenant.id));
  }, [allQuotes, activeTenant.id]);

  const [selectedQuote, setSelectedQuote] = useState<QuotationRecord | null>(null);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpSubject, setSmtpSubject] = useState('');
  const [smtpBody, setSmtpBody] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingQuote, setEditingQuote] = useState<QuotationRecord | null>(null);

  // Form state
  const [formTemplateId, setFormTemplateId] = useState(activeTemplateIds['QUOTATION']);
  const [formCustomer, setFormCustomer] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formTerms, setFormTerms] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('');
  const [formLines, setFormLines] = useState<LineItem[]>([
    { id: 'new-1', description: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 },
  ]);
  const [formCurrency, setFormCurrency] = useState(getCurrencySymbol(activeTenant.currency));
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [formCustomColumns, setFormCustomColumns] = useState<{ key: string; label: string; type: 'text' | 'number' }[]>([]);
  const [formAuthorizedPersonId, setFormAuthorizedPersonId] = useState('');
  const [showLineItems, setShowLineItems] = useState(false);

  const handlePaymentTermsChange = (val: string) => {
    setFormPaymentTerms(val);
    if (!val) return;
    const match = val.match(/\d+/);
    if (match) {
      const days = parseInt(match[0], 10);
      const date = new Date();
      date.setDate(date.getDate() + days);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      setFormValidUntil(`${yyyy}-${mm}-${dd}`);
    }
  };

  const tenantCustomers = customers.filter(c => c.tenantId === activeTenant.id);

  const quotationFields = fields.filter(f => f.entityType === 'QUOTATION' && f.isActive);
  const primaryFields = quotationFields.filter(f => f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const customFields = quotationFields.filter(f => !f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const totals = calcTotals(formLines);
  const quotationTemplates = templates.filter(t => t.entityType === 'QUOTATION');

  const stats = {
    total: quotes.length,
    pending: quotes.filter(q => q.status === 'SUBMITTED' || q.status === 'DRAFT').length,
    approved: quotes.filter(q => q.status === 'APPROVED').length,
    converted: quotes.filter(q => q.status === 'CONVERTED').length,
  };

  const columns: Column<QuotationRecord>[] = [
    {
      key: 'quoteNumber', label: 'Quote Ref', sortable: true,
      render: (row) => <span className="font-mono font-bold text-slate-950 dark:text-zinc-100">{row.quoteNumber}</span>
    },
    {
      key: 'customerCompany', label: 'Customer', sortable: true,
      render: (row) => (
        <div>
          <p className="font-bold text-slate-700 dark:text-zinc-300">{row.customerCompany}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{row.customerName}</p>
        </div>
      )
    },
    { key: 'validUntil', label: 'Valid Until', sortable: true },
    {
      key: 'grandTotal', label: 'Grand Total', sortable: true,
      render: (row) => <span className="font-bold">{row.currency}{row.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
    },
    {
      key: 'version', label: 'Version', sortable: true,
      render: (row) => <span className="text-slate-400 font-semibold">v{row.version}</span>
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'pdf', label: 'PDF',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            exportDocumentToPDF(row, 'QUOTATION', activeTenant, 'download');
          }}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center active:scale-95"
          title="Download PDF"
        >
          <Download size={14} />
        </button>
      )
    },
  ];

  const handleCreate = () => {
    const newQuote: QuotationRecord = {
      id: `q-${Date.now()}`,
      quoteNumber: useTenantStore.getState().incrementAndGetNextNumber('QUOTATION'),
      tenantId: activeTenant.id,
      customerId: `cust-${Date.now()}`,
      customerName: formCustomer,
      customerCompany: formCompany,
      validUntil: formValidUntil,
      version: 1,
      status: 'DRAFT',
      subTotal: totals.subTotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal,
      currency: formCurrency,
      terms: formTerms,
      lines: formLines,
      customColumns: formCustomColumns,
      dynamicValues: dynamicValues,
      revisions: [{ version: 1, changedBy: userName, timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), note: 'Initial draft created.' }],
      createdAt: new Date().toISOString().slice(0, 10),
      templateId: formTemplateId,
      customerAddress: formCustomerAddress || undefined,
      authorizedPersonId: formAuthorizedPersonId || undefined,
      paymentTerms: formPaymentTerms || undefined,
    };
    addQuotation(newQuote);
    resetForm();
    setIsCreateOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingQuote) return;
    const updatedQuote = {
      ...editingQuote,
      customerName: formCustomer,
      customerCompany: formCompany,
      customerAddress: formCustomerAddress || undefined,
      validUntil: formValidUntil,
      terms: formTerms,
      lines: formLines,
      customColumns: formCustomColumns,
      currency: formCurrency,
      dynamicValues: dynamicValues,
      subTotal: totals.subTotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal,
      templateId: formTemplateId,
      authorizedPersonId: formAuthorizedPersonId || undefined,
      paymentTerms: formPaymentTerms || undefined,
      pdfBase64: undefined,
    };

    updateQuotation(updatedQuote);
    resetForm();
    setEditingQuote(null);
    setIsCreateOpen(false);
  };

  const handleConvertToPO = (quote: QuotationRecord) => {
    // 1. Mark the quotation as converted locally and globally
    const updatedQuote = { ...quote, status: 'CONVERTED' as const, pdfBase64: undefined };
    updateQuotation(updatedQuote);

    // 2. Create and unshift a new Purchase Order Record
    const newPO: PurchaseOrderRecord = {
      id: `po-${Date.now()}`,
      poNumber: useTenantStore.getState().incrementAndGetNextNumber('PURCHASE_ORDER'),
      tenantId: quote.tenantId,
      supplierId: quote.customerId, // Map customer to supplier
      supplierName: quote.customerName,
      supplierCompany: quote.customerCompany,
      quotationId: quote.id,
      quotationRef: quote.quoteNumber,
      status: 'OPEN',
      subTotal: quote.subTotal,
      taxTotal: quote.taxTotal,
      grandTotal: quote.grandTotal,
      currency: quote.currency,
      deliveryTerms: quote.terms || 'FOB Destination. Standard shipping terms.',
      lines: quote.lines.map((l, i) => ({
        id: `pol-conv-${i}`,
        description: l.description,
        quantityOrdered: l.quantity,
        quantityReceived: 0,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
        total: (l.quantity * l.unitPrice - l.discount) * (1 + l.taxRate / 100)
      })),
      customColumns: quote.customColumns,
      dynamicValues: { ...quote.dynamicValues, priority: 'MEDIUM' },
      createdAt: new Date().toISOString().slice(0, 10),
      templateId: 'PURCHASE_ORDER',
      customerAddress: quote.customerAddress,
      authorizedPersonId: quote.authorizedPersonId,
    };
    addPurchaseOrder(newPO);

    // 3. Clear selected details and redirect to Purchase Orders tab
    setIsDetailOpen(false);
    setSelectedQuote(null);
    setCurrentTab('PURCHASE_ORDERS');
  };

  const handleConvertToInvoice = (quote: QuotationRecord) => {
    // 1. Mark the quotation as converted locally and globally
    const updatedQuote = { ...quote, status: 'CONVERTED' as const, pdfBase64: undefined };
    updateQuotation(updatedQuote);

    // 2. Create and unshift a new Invoice Record
    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoiceNumber: useTenantStore.getState().incrementAndGetNextNumber('INVOICE'),
      tenantId: quote.tenantId,
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerCompany: quote.customerCompany,
      customerAddress: quote.customerAddress,
      quotationRef: quote.quoteNumber,
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), // Net 30 default
      status: 'DRAFT',
      subTotal: quote.subTotal,
      taxTotal: quote.taxTotal,
      discountTotal: quote.discountTotal,
      grandTotal: quote.grandTotal,
      balanceDue: quote.grandTotal,
      currency: quote.currency,
      lines: quote.lines,
      customColumns: quote.customColumns,
      payments: [],
      dynamicValues: { ...quote.dynamicValues, payment_terms: 'Net 30' },
      createdAt: new Date().toISOString().slice(0, 10),
      templateId: quote.templateId,
      authorizedPersonId: quote.authorizedPersonId,
    };
    addInvoice(newInvoice);

    // 3. Clear selected details and redirect to Invoices tab
    setIsDetailOpen(false);
    setSelectedQuote(null);
    setCurrentTab('INVOICES');
  };

  const handleCreateRevision = (quote: QuotationRecord) => {
    const newVersion = quote.version + 1;
    const revised: QuotationRecord = {
      ...quote,
      id: `q-${Date.now()}`,
      version: newVersion,
      status: 'DRAFT',
      revisions: [
        ...quote.revisions,
        { version: newVersion, changedBy: userName, timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), note: `Revision v${newVersion} created from v${quote.version}.` }
      ],
    };
    // Sync with global mock data to persist changes across tab switches
    addQuotation(revised);
    setSelectedQuote(revised);
  };

  const resetForm = () => {
    const defaultTplId = activeTemplateIds['QUOTATION'];
    const defaultTpl = useTemplatesStore.getState().getTemplate(defaultTplId);
    setFormTemplateId(defaultTplId);
    setFormCustomer('');
    setFormCompany('');
    setFormCustomerAddress('');
    setFormValidUntil('');
    setFormTerms('');
    setFormPaymentTerms('');
    setFormLines([{ id: 'new-1', description: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }]);
    setFormCurrency(getCurrencySymbol(activeTenant.currency));
    setDynamicValues({});
    setFormAuthorizedPersonId('');
    setFormCustomColumns(defaultTpl?.config?.lineItemColumns || []);
    setShowLineItems(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Quotations Workspace</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
            Manage multi-tenant business proposals, track dynamic calculated metrics, and auto-convert layouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {can('quotations', 'create') && (
            <>
              <button onClick={() => setCurrentTab('AI_COPILOT')} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all">
                <Sparkles size={14} />
                <span>AI Generate</span>
              </button>
              <button onClick={() => { resetForm(); setIsCreateOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md">
                <Plus size={14} />
                <span>New Quotation</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Quotations" value={String(stats.total)} icon={<FileText size={18} />} accentColor={activeTenant.brandingConfig.primary} />
        <StatCard label="Pending Review" value={String(stats.pending)} change={`${stats.pending} active`} isPositive={false} icon={<Clock size={18} />} accentColor="#f59e0b" />
        <StatCard label="Approved" value={String(stats.approved)} change="Ready" isPositive={true} icon={<ArrowRight size={18} />} accentColor="#10b981" />
        <StatCard label="Converted" value={String(stats.converted)} change="To PO/Invoice" isPositive={true} icon={<ArrowLeftRight size={18} />} accentColor="#6366f1" />
      </div>

      {/* DATA TABLE */}
      <DataTable<QuotationRecord>
        columns={columns}
        data={quotes}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => { setSelectedQuote(row); setIsDetailOpen(true); }}
        emptyMessage="No quotations found"
      />

      {/* CREATE SLIDE PANEL */}
      <SlidePanel
        open={isCreateOpen}
        onClose={() => { setIsCreateOpen(false); setEditingQuote(null); }}
        title={editingQuote ? 'Edit Quotation Draft' : 'Create New Quotation'}
        width="max-w-5xl"
        subtitle={editingQuote ? `Modify quotation draft properties for ${editingQuote.quoteNumber}` : 'Fill in customer details and add line items to generate a draft quote.'}
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {editingQuote ? 'Edits will be saved to the draft.' : 'Draft will be saved to workspace.'}
            </span>
            <div className="flex gap-3">
              <button onClick={() => { setIsCreateOpen(false); setEditingQuote(null); }} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">Cancel</button>
              <button 
                onClick={editingQuote ? handleSaveEdit : handleCreate} 
                disabled={!formCustomer || !formCompany || formLines.length === 0} 
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40"
              >
                {editingQuote ? 'Save Changes' : 'Create Draft'}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6 animate-in slide-in-from-bottom duration-300">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">Select Template Theme</label>
            <select
              value={formTemplateId}
              onChange={(e) => {
                const tplId = e.target.value;
                setFormTemplateId(tplId);
                const tpl = useTemplatesStore.getState().getTemplate(tplId);
                if (tpl && tpl.config) {
                  setFormCustomColumns(tpl.config.lineItemColumns || []);
                }
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            >
              {quotationTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.id === activeTemplateIds['QUOTATION'] ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">Select Registered Customer (Auto-fill)</label>
            <select
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) return;
                const cust = tenantCustomers.find(c => c.id === selectedId);
                if (cust) {
                  setFormCustomer(cust.name);
                  setFormCompany(cust.company);
                  setFormCustomerAddress(cust.address);
                  setFormTerms(cust.paymentTerms);
                  if (cust.paymentTerms) {
                    handlePaymentTermsChange(cust.paymentTerms);
                  } else {
                    setFormPaymentTerms('');
                  }
                  setFormCurrency(getCurrencySymbol(cust.currency));
                }
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
              defaultValue=""
            >
              <option value="">-- Choose registered customer to auto-fill details --</option>
              {tenantCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Primary Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primaryFields.map(field => {
              let val = '';
              let setter = (v: any) => {};
              
              if (field.name === 'customerName') {
                val = formCustomer;
                setter = setFormCustomer;
              } else if (field.name === 'customerCompany') {
                val = formCompany;
                setter = setFormCompany;
              } else if (field.name === 'customerAddress') {
                val = formCustomerAddress;
                setter = setFormCustomerAddress;
              } else if (field.name === 'validUntil') {
                val = formValidUntil;
                setter = setFormValidUntil;
              } else if (field.name === 'terms') {
                val = formTerms;
                setter = setFormTerms;
              } else if (field.name === 'paymentTerms') {
                val = formPaymentTerms;
                setter = handlePaymentTermsChange;
              } else {
                return null;
              }
              
              return (
                <div key={field.id} className={field.type === 'TEXTAREA' || field.type === 'RICH_TEXT' ? 'sm:col-span-2' : ''}>
                  {renderFieldInput(field, val, setter)}
                </div>
              );
            })}
          </div>

          {/* Signatory Selection Dropdown */}
          <div className="space-y-1.5 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 mt-2">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">Authorized Signatory (Optional)</label>
            <select
              value={formAuthorizedPersonId}
              onChange={(e) => setFormAuthorizedPersonId(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            >
              <option value="">No Signatory Assigned</option>
              {(activeTenant.authorizedPersons || []).map(person => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.designation})
                </option>
              ))}
            </select>
          </div>

          {/* Collapsible Line Items Section */}
          <div className="border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl overflow-hidden bg-zinc-50/20 dark:bg-zinc-900/5 transition-all">
            <button
              type="button"
              onClick={() => setShowLineItems(!showLineItems)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-zinc-300">
                  Line Items Details
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-500">
                  {formLines.length} {formLines.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                  Total: {formCurrency}{totals.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
                <ChevronRight
                  size={16}
                  className={`text-slate-400 transform transition-transform duration-200 ${
                    showLineItems ? 'rotate-90' : ''
                  }`}
                />
              </div>
            </button>

            {showLineItems && (
              <div className="p-5 border-t border-zinc-200/40 dark:border-zinc-800/30 bg-white dark:bg-zinc-950/20 animate-in slide-in-from-top duration-200">
                <LineItemEditor
                  items={formLines}
                  onChange={setFormLines}
                  currency={formCurrency}
                  customColumns={formCustomColumns}
                  onCustomColumnsChange={setFormCustomColumns}
                />
              </div>
            )}
          </div>

          {customFields.length > 0 && (
            <div className="p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/30 dark:bg-zinc-900/10">
              <DynamicFormCompiler
                fields={customFields}
                onChange={setDynamicValues}
                initialValues={dynamicValues}
                baselineContext={{
                  subTotal: totals.subTotal,
                  taxTotal: totals.taxTotal,
                  discountTotal: totals.discountTotal,
                  grandTotal: totals.grandTotal,
                }}
              />
            </div>
          )}
        </div>
      </SlidePanel>

      {/* DETAIL SLIDE PANEL */}
      <SlidePanel
        open={isDetailOpen && !!selectedQuote}
        onClose={() => { setIsDetailOpen(false); setSelectedQuote(null); }}
        title={selectedQuote?.quoteNumber || ''}
        subtitle={`${selectedQuote?.customerCompany} — v${selectedQuote?.version}`}
        width="max-w-3xl"
        footer={
          selectedQuote && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {can('quotations', 'delete') && (
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this quotation? This action is irreversible.')) {
                        deleteQuotation(selectedQuote.id);
                        setIsDetailOpen(false);
                        setSelectedQuote(null);
                      }
                    }} 
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete Quotation
                  </button>
                )}
                {selectedQuote.status === 'DRAFT' && (
                  <>
                    {can('quotations', 'edit') && (
                      <button 
                        onClick={() => {
                          setEditingQuote(selectedQuote);
                          setFormTemplateId(selectedQuote.templateId || '');
                          setFormCustomer(selectedQuote.customerName);
                          setFormCompany(selectedQuote.customerCompany);
                          setFormCustomerAddress(selectedQuote.customerAddress || '');
                          setFormValidUntil(selectedQuote.validUntil);
                          setFormTerms(selectedQuote.terms || '');
                          setFormPaymentTerms(selectedQuote.paymentTerms || '');
                          setFormLines(selectedQuote.lines);
                          setFormCustomColumns(selectedQuote.customColumns || []);
                          setFormCurrency(selectedQuote.currency);
                          setFormAuthorizedPersonId(selectedQuote.authorizedPersonId || '');
                          setDynamicValues(selectedQuote.dynamicValues || {});
                          setIsDetailOpen(false);
                          setIsCreateOpen(true);
                        }} 
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all"
                      >
                        Edit Draft
                      </button>
                    )}
                    {can('quotations', 'edit') && (
                      <button 
                        onClick={() => {
                           const updated = { ...selectedQuote, status: 'SUBMITTED' as const, pdfBase64: undefined };
                           updateQuotation(updated);
                           setSelectedQuote(updated);
                        }} 
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                      >
                        Submit for Approval
                      </button>
                    )}
                  </>
                )}
                {selectedQuote.status === 'SUBMITTED' && can('quotations', 'approve') && (
                  <>
                    <button 
                      onClick={() => {                         const updated = { ...selectedQuote, status: 'APPROVED' as const, pdfBase64: undefined }; 
                         updateQuotation(updated);
                         setSelectedQuote(updated); 
                      }} 
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => {                         const updated = { ...selectedQuote, status: 'REJECTED' as const, pdfBase64: undefined }; 
                         updateQuotation(updated);
                         setSelectedQuote(updated); 
                      }} 
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                    >
                      Reject
                    </button>
                  </>
                )}
                {selectedQuote.status === 'APPROVED' && can('quotations', 'convert') && (
                  <div className="flex gap-2">
                    <button onClick={() => handleConvertToPO(selectedQuote)} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all flex items-center gap-1.5">
                      <ArrowRight size={12} /> Convert to PO
                    </button>
                    <button onClick={() => handleConvertToInvoice(selectedQuote)} className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:scale-[1.02] transition-all flex items-center gap-1.5" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>
                      <ArrowRight size={12} /> Convert to Invoice
                    </button>
                  </div>
                )}
                {(selectedQuote.status === 'DRAFT' || selectedQuote.status === 'SUBMITTED' || selectedQuote.status === 'APPROVED') && (
                  <button 
                    onClick={() => {
                      if (selectedQuote.status === 'DRAFT') {
                        const updated = { ...selectedQuote, status: 'SUBMITTED' as const, pdfBase64: undefined };
                        updateQuotation(updated);
                        setSelectedQuote(updated);
                      }
                      // Initialize editable SMTP fields
                      const orgEmail = activeTenant.email || `sales@${activeTenant.slug}.innovait-systems.com`;
                      setSmtpFromEmail(orgEmail);
                      setSmtpSubject(`Commercial Proposal ${selectedQuote.quoteNumber} from ${activeTenant.name}`);
                      setSmtpBody(`Hello ${selectedQuote.customerCompany} Procurement Team,\n\nPlease find enclosed commercial proposal/quotation ${selectedQuote.quoteNumber} (Version ${selectedQuote.version}) issued by ${activeTenant.name} for your review.\n\nTo approve this quotation, please respond directly to this email or request a conversion using your Quotation dashboard console.\n\nBest Regards,\n${activeTenant.name}`);
                      setIsEmailPreviewOpen(true);
                    }} 
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 hover:bg-sky-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Mail size={12} /> Send Quotation
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {can('quotations', 'create') && (
                  <button onClick={() => handleCreateRevision(selectedQuote)} className="px-3 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5"><Copy size={12} /> New Revision</button>
                )}
                {can('quotations', 'export') && (
                  <>
                    <button onClick={() => exportDocumentToPDF(selectedQuote, 'QUOTATION', activeTenant)} className="px-3 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5"><Download size={12} /> Export PDF</button>
                    <button onClick={() => exportDocumentToPDF(selectedQuote, 'QUOTATION', activeTenant, 'download')} className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"><Download size={12} /> Download PDF</button>
                  </>
                )}
              </div>
            </div>
          )
        }
      >
        {selectedQuote && (
          <div className="space-y-6">
            {/* Status & Meta */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedQuote.status} size="md" />
              <span className="text-xs text-slate-400 font-medium">Created {selectedQuote.createdAt}</span>
              <span className="text-xs text-slate-400 font-medium">•</span>
              <span className="text-xs text-slate-400 font-medium">Expires {selectedQuote.validUntil}</span>
            </div>

            {/* Customer Info */}
            <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Customer Details</span>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-slate-400 text-xs">Contact</p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">{selectedQuote.customerName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Company</p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">{selectedQuote.customerCompany}</p>
                </div>
              </div>
              {selectedQuote.customerAddress && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Billing Address</p>
                  <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5 whitespace-pre-line">{selectedQuote.customerAddress}</p>
                </div>
              )}
              {selectedQuote.paymentTerms && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Payment Terms</p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{selectedQuote.paymentTerms}</p>
                </div>
              )}
              {selectedQuote.templateId && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Selected Theme Template</p>
                  <p className="font-bold text-indigo-500 mt-0.5">
                    {useTemplatesStore.getState().getTemplate(selectedQuote.templateId)?.name || 'Custom Theme'}
                  </p>
                </div>
              )}
              {selectedQuote.authorizedPersonId && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-2">Authorized Signatory</p>
                  {(() => {
                    const person = activeTenant.authorizedPersons?.find(p => p.id === selectedQuote.authorizedPersonId);
                    if (!person) return <p className="font-semibold text-slate-500 italic mt-0.5">Assigned signatory not found in active settings</p>;
                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-200 hover:border-indigo-500/30 dark:hover:border-indigo-500/20">
                        {person.signatureUrl ? (
                          <div className="h-14 w-28 shrink-0 bg-white border border-zinc-200/60 rounded-xl p-1.5 flex items-center justify-center shadow-inner">
                            <img src={person.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-14 w-28 shrink-0 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200/50 dark:border-zinc-800/40 rounded-xl flex items-center justify-center text-[8px] text-zinc-400 dark:text-zinc-600 font-mono">No Signature</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-2">
                            <p className="font-extrabold text-slate-800 dark:text-zinc-100 text-sm leading-snug">{person.name}</p>
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold tracking-wide uppercase">{person.designation}</span>
                          </div>
                          <div className="flex flex-col gap-1 mt-2 text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                            {person.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail size={12} className="text-slate-400 dark:text-zinc-500" />
                                <span className="font-mono text-[10px] select-all hover:text-indigo-500 transition-colors">{person.email}</span>
                              </div>
                            )}
                            {person.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone size={12} className="text-slate-400 dark:text-zinc-500" />
                                <span className="font-mono text-[10px] select-all hover:text-indigo-500 transition-colors">{person.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Line Items */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Line Items</span>
              <div className="border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-zinc-100/60 dark:bg-zinc-900/60 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Description</th>
                      {(selectedQuote.customColumns || []).map((col: any) => (
                        <th key={col.key} className="px-4 py-3 text-right">{col.label}</th>
                      ))}
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Unit Price</th>
                      <th className="px-4 py-3 text-right">Tax</th>
                      <th className="px-4 py-3 text-right">Discount</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                    {selectedQuote.lines.map(line => {
                      const lineTotal = (line.quantity * line.unitPrice - line.discount) * (1 + line.taxRate / 100);
                      return (
                        <tr key={line.id}>
                          <td className="px-4 py-3 font-medium text-slate-700 dark:text-zinc-300">{line.description}</td>
                          {(selectedQuote.customColumns || []).map((col: any) => (
                            <td key={col.key} className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-zinc-400">
                              {line[col.key] !== undefined ? String(line[col.key]) : '—'}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-bold">{line.quantity}</td>
                          <td className="px-4 py-3 text-right">{selectedQuote.currency}{line.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{line.taxRate}%</td>
                          <td className="px-4 py-3 text-right text-rose-500">{line.discount > 0 ? `-${selectedQuote.currency}${line.discount.toFixed(2)}` : '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900 dark:text-zinc-100">{selectedQuote.currency}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="bg-zinc-50/80 dark:bg-zinc-900/40 border-t border-zinc-200/50 dark:border-zinc-800/40 px-4 py-3 flex justify-end">
                  <div className="text-xs space-y-1 text-right">
                    <div className="flex gap-8"><span className="text-slate-400">Subtotal</span><span className="font-bold w-24">{selectedQuote.currency}{selectedQuote.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex gap-8"><span className="text-slate-400">Tax</span><span className="font-bold w-24">{selectedQuote.currency}{selectedQuote.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                    {selectedQuote.discountTotal > 0 && <div className="flex gap-8"><span className="text-slate-400">Discount</span><span className="font-bold text-rose-500 w-24">-{selectedQuote.currency}{selectedQuote.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
                    <div className="flex gap-8 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/30"><span className="font-extrabold text-slate-800 dark:text-zinc-100">Grand Total</span><span className="font-extrabold text-sm w-24">{selectedQuote.currency}{selectedQuote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Values */}
            {Object.keys(selectedQuote.dynamicValues).length > 0 && (
              <div className="bg-indigo-500/5 border border-indigo-500/15 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Dynamic Metadata Fields</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(selectedQuote.dynamicValues).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-[10px] text-indigo-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Terms */}
            {selectedQuote.terms && (
              <div className="bg-zinc-100/30 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Terms & Conditions</span>
                <p className="text-xs text-slate-500 leading-relaxed italic">{selectedQuote.terms}</p>
              </div>
            )}

            {/* Revision History */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5"><GitBranch size={12} /> Revision History</span>
              <div className="space-y-3">
                {selectedQuote.revisions.map((rev, idx) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="h-5 w-5 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-slate-500">{rev.version}</div>
                      {idx < selectedQuote.revisions.length - 1 && <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800" />}
                    </div>
                    <div className="text-xs pb-2">
                      <p className="font-bold text-slate-700 dark:text-zinc-300">{rev.note}</p>
                      <p className="text-slate-400 mt-0.5">{rev.changedBy} — {rev.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SIMULATED DOCUMENT SMTP OUTBOX MODAL                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEmailPreviewOpen && selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200 text-slate-800 dark:text-zinc-200">
          <div className="glass-panel w-full max-w-2xl rounded-3xl bg-zinc-50 dark:bg-zinc-950 p-6 shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Outbox Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Mail size={18} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                    Simulated SMTP Mail Delivery
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Dispatched</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Mock document router log: 1 transaction attachment sent to client mail coordinates</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailPreviewOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Editable Email Envelope Fields */}
            {(() => {
              const matchedCust = customers.find(c => c.company === selectedQuote.customerCompany && c.tenantId === activeTenant.id);
              const quotationsEmail = matchedCust?.quotationsEmail || matchedCust?.email || `sales@${selectedQuote.customerCompany.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
              
              return (
                <>
                  <div className="rounded-2xl border border-zinc-200/50 bg-white/70 dark:border-zinc-800/50 dark:bg-zinc-900/70 p-4 text-xs space-y-3 mb-4 text-left">
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-bold text-slate-400 shrink-0 font-mono">From:</span>
                      <input
                        type="email"
                        value={smtpFromEmail}
                        onChange={(e) => setSmtpFromEmail(e.target.value)}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-bold text-slate-400 shrink-0 font-mono">To:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{quotationsEmail}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-16 font-bold text-slate-400 shrink-0 font-mono">Subject:</span>
                      <input
                        type="text"
                        value={smtpSubject}
                        onChange={(e) => setSmtpSubject(e.target.value)}
                        className="flex-1 rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold text-slate-800 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Editable Email Body */}
                  <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 overflow-hidden shadow-inner p-6 text-slate-700 dark:text-zinc-300">
                    <div className="max-w-lg mx-auto space-y-5">
                      
                      {/* Email Tenant Brand Header */}
                      <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 pb-4 justify-center sm:justify-start">
                        {activeTenant.logoUrl ? (
                          <img src={activeTenant.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain rounded" />
                        ) : (
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>
                            {activeTenant.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-sm font-black text-slate-800 dark:text-zinc-100 tracking-tight">{activeTenant.name}</span>
                      </div>

                      {/* Editable Body Textarea */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Body</label>
                        <textarea
                          value={smtpBody}
                          onChange={(e) => setSmtpBody(e.target.value)}
                          rows={7}
                          className="w-full rounded-xl px-4 py-3 text-xs bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-slate-600 dark:text-zinc-300 resize-y leading-relaxed"
                        />
                      </div>

                      {/* Account Details Box */}
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800/60 p-4 text-xs space-y-2 text-left">
                        <div className="flex justify-between"><span className="text-slate-400">Quotation Number:</span><span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{selectedQuote.quoteNumber}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Proposal Value:</span><span className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedQuote.currency}{selectedQuote.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Valid Until:</span><span className="font-bold text-slate-800 dark:text-zinc-200">{selectedQuote.validUntil}</span></div>
                      </div>

                      {/* CTA Download Link — now uses 'download' mode */}
                      <div className="text-center py-2">
                        <button
                          onClick={() => {
                            exportDocumentToPDF(selectedQuote, 'QUOTATION', activeTenant, 'download');
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer w-full justify-center sm:w-auto"
                          style={{ backgroundColor: activeTenant.brandingConfig.primary || '#6366f1' }}
                        >
                          <span>Download PDF Document</span>
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Modal Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 mt-5 gap-4">
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-full sm:max-w-[55%] leading-tight text-left">
                * Virtual Mailbox dispatch complete. The recipient address was dynamically pulled from this account's onboarding registry config.
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  Close Outbox
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
