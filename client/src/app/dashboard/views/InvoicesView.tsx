'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useCustomersStore } from '../../../store/customersStore';
import { InvoiceRecord } from './invoicesData';
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
  CreditCard, Plus, DollarSign, Clock, AlertTriangle, CheckCircle2,
  Download, X, Banknote, Mail, Phone, Trash2
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


export default function InvoicesView() {
  const { activeTenant, currentUser } = useTenantStore();
  const { can } = usePermissions();
  const userName = `${currentUser.firstName} ${currentUser.lastName}`;
  const { getActiveFieldsForEntity, fields } = useCustomFieldsStore();
  const { templates, activeTemplateIds } = useTemplatesStore();
  const { customers } = useCustomersStore();

  const { invoices: allInvoices, addInvoice, updateInvoice, deleteInvoice } = useDocumentStore();
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);

  React.useEffect(() => {
    setInvoices(allInvoices.filter(i => i.tenantId === activeTenant.id));
  }, [allInvoices, activeTenant.id]);

  const [selectedInv, setSelectedInv] = useState<InvoiceRecord | null>(null);


  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [editingInv, setEditingInv] = useState<InvoiceRecord | null>(null);

  // Create form
  const [formTemplateId, setFormTemplateId] = useState(activeTemplateIds['INVOICE']);
  const [formCustomer, setFormCustomer] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formLines, setFormLines] = useState<LineItem[]>([
    { id: 'inv-new-1', description: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 },
  ]);
  const [formCurrency, setFormCurrency] = useState(getCurrencySymbol(activeTenant.currency));
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [formCustomColumns, setFormCustomColumns] = useState<{ key: string; label: string; type: 'text' | 'number' }[]>([]);
  const [formAuthorizedPersonId, setFormAuthorizedPersonId] = useState('');

  const invoiceFields = fields.filter(f => f.entityType === 'INVOICE' && f.isActive);
  const primaryFields = invoiceFields.filter(f => f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const customFields = invoiceFields.filter(f => !f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const totals = calcTotals(formLines);
  const invoiceTemplates = templates.filter(t => t.entityType === 'INVOICE');

  // Payment form
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState('Wire Transfer');
  const [payRef, setPayRef] = useState('');

  const cur = getCurrencySymbol(activeTenant.currency);
  const tenantCustomers = customers.filter(c => c.tenantId === activeTenant.id);

  const stats = {
    totalInvoiced: invoices.reduce((s, i) => s + i.grandTotal, 0),
    totalPaid: invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + i.grandTotal, 0),
    outstanding: invoices.reduce((s, i) => s + i.balanceDue, 0),
    overdue: invoices.filter(i => i.status === 'OVERDUE').length,
  };

  const columns: Column<InvoiceRecord>[] = [
    { key: 'invoiceNumber', label: 'Invoice Ref', sortable: true, render: (row) => <span className="font-mono font-bold text-slate-950 dark:text-zinc-100">{row.invoiceNumber}</span> },
    { key: 'customerCompany', label: 'Customer', sortable: true, render: (row) => (
      <div>
        <p className="font-bold text-slate-700 dark:text-zinc-300">{row.customerCompany}</p>
        <p className="text-[10px] text-slate-400 mt-0.5">{row.customerName}</p>
      </div>
    )},
    { key: 'dueDate', label: 'Due Date', sortable: true, render: (row) => {
      const isOverdue = row.status === 'OVERDUE';
      const daysPast = isOverdue ? Math.ceil((Date.now() - new Date(row.dueDate).getTime()) / 86400000) : 0;
      return (
        <div>
          <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>{row.dueDate}</span>
          {isOverdue && <p className="text-[10px] text-rose-500 font-bold mt-0.5">{daysPast}d overdue</p>}
        </div>
      );
    }},
    { key: 'grandTotal', label: 'Grand Total', sortable: true, render: (row) => <span className="font-bold">{row.currency}{row.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: 'balanceDue', label: 'Balance Due', sortable: true, render: (row) => (
      <span className={`font-bold ${row.balanceDue > 0 ? 'text-amber-600' : 'text-emerald-500'}`}>
        {row.balanceDue > 0 ? `${row.currency}${row.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'Settled'}
      </span>
    )},
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'pdf', label: 'PDF',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            exportDocumentToPDF(row, 'INVOICE', activeTenant, 'download');
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
    const newInv: InvoiceRecord = {
      id: `inv-${Date.now()}`,
      invoiceNumber: useTenantStore.getState().incrementAndGetNextNumber('INVOICE'),
      tenantId: activeTenant.id, customerId: `cust-${Date.now()}`, customerName: formCustomer, customerCompany: formCompany,
      quotationRef: null, issueDate: new Date().toISOString().slice(0, 10), dueDate: formDueDate,
      status: 'DRAFT', subTotal: totals.subTotal, taxTotal: totals.taxTotal, discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal, balanceDue: totals.grandTotal, currency: formCurrency, lines: formLines,
      customColumns: formCustomColumns,
      payments: [], dynamicValues: dynamicValues, createdAt: new Date().toISOString().slice(0, 10),
      templateId: formTemplateId, customerAddress: formCustomerAddress || undefined,
      authorizedPersonId: formAuthorizedPersonId || undefined,
    };
    addInvoice(newInv);
    resetForm();
    setIsCreateOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingInv) return;
    const updatedInv = {
      ...editingInv,
      customerName: formCustomer,
      customerCompany: formCompany,
      customerAddress: formCustomerAddress || undefined,
      dueDate: formDueDate,
      lines: formLines,
      customColumns: formCustomColumns,
      currency: formCurrency,
      dynamicValues: dynamicValues,
      subTotal: totals.subTotal,
      taxTotal: totals.taxTotal,
      discountTotal: totals.discountTotal,
      grandTotal: totals.grandTotal,
      balanceDue: totals.grandTotal,
      templateId: formTemplateId,
      authorizedPersonId: formAuthorizedPersonId || undefined,
      pdfBase64: undefined,
    };

    updateInvoice(updatedInv);
    resetForm();
    setEditingInv(null);
    setIsCreateOpen(false);
  };

  const resetForm = () => {
    const defaultTplId = activeTemplateIds['INVOICE'];
    const defaultTpl = useTemplatesStore.getState().getTemplate(defaultTplId);
    setFormTemplateId(defaultTplId);
    setFormCustomer('');
    setFormCompany('');
    setFormCustomerAddress('');
    setFormDueDate('');
    setFormLines([{ id: `inv-new-${Date.now()}`, description: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }]);
    setFormCurrency(getCurrencySymbol(activeTenant.currency));
    setDynamicValues({});
    setFormAuthorizedPersonId('');
    setFormCustomColumns(defaultTpl?.config?.lineItemColumns || []);
  };

  const handleRecordPayment = () => {
    if (!selectedInv || payAmount <= 0) return;
    
    const newPayment = { id: `pay-${Date.now()}`, amount: payAmount, method: payMethod, reference: payRef || `REF-${Date.now()}`, recordedAt: new Date().toISOString().slice(0, 19).replace('T', ' '), recordedBy: userName };
    const newBalance = Math.max(0, Math.round((selectedInv.balanceDue - payAmount) * 100) / 100);
    const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID';
    const updated = { ...selectedInv, payments: [...selectedInv.payments, newPayment], balanceDue: newBalance, status: newStatus as InvoiceRecord['status'], pdfBase64: undefined };

    updateInvoice(updated);
    setSelectedInv(updated);
    setIsPayOpen(false);
    setPayAmount(0); setPayRef('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Invoice Billing Pipeline</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Generate tax receipts, track outstanding subtotal balances, and verify Stripe reconciliations.</p>
        </div>
        {can('invoices', 'create') && (
          <button onClick={() => { setFormCustomer(''); setFormCompany(''); setFormDueDate(''); setIsCreateOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md">
            <Plus size={14} /><span>New Invoice</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoiced" value={`${cur}${stats.totalInvoiced.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<CreditCard size={18} />} accentColor={activeTenant.brandingConfig.primary} />
        <StatCard label="Amount Paid" value={`${cur}${stats.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} change="Settled" isPositive={true} icon={<CheckCircle2 size={18} />} accentColor="#10b981" />
        <StatCard label="Outstanding" value={`${cur}${stats.outstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} isPositive={false} icon={<DollarSign size={18} />} accentColor="#f59e0b" />
        <StatCard label="Overdue" value={String(stats.overdue)} change={stats.overdue > 0 ? 'Requires attention' : 'None'} isPositive={stats.overdue === 0} icon={<AlertTriangle size={18} />} accentColor="#ef4444" />
      </div>

      <DataTable<InvoiceRecord>
        columns={columns}
        data={invoices}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => { setSelectedInv(row); setIsDetailOpen(true); }}
        emptyMessage="No invoices found"
      />

      {/* CREATE PANEL */}
      <SlidePanel open={isCreateOpen} onClose={() => { setIsCreateOpen(false); setEditingInv(null); }} title={editingInv ? 'Edit Draft Invoice' : 'Create Invoice'} width="max-w-5xl" subtitle={editingInv ? `Modify invoice draft properties for ${editingInv.invoiceNumber}` : 'Add customer and line items to generate a draft invoice.'}
        footer={
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => { setIsCreateOpen(false); setEditingInv(null); }} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300">Cancel</button>
            <button onClick={editingInv ? handleSaveEdit : handleCreate} disabled={!formCompany} className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40">{editingInv ? 'Save Changes' : 'Create Draft'}</button>
          </div>
        }
      >
        <div className="space-y-6">
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
              {invoiceTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.id === activeTemplateIds['INVOICE'] ? '(Default)' : ''}
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
                  setFormCurrency(getCurrencySymbol(cust.currency));
                  
                  // Calculate due date based on payment terms
                  const terms = cust.paymentTerms;
                  let days = 30; // default Net 30
                  if (terms === 'Net 15') days = 15;
                  else if (terms === 'Net 45') days = 45;
                  else if (terms === 'Due on Receipt') days = 0;
                  
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + days);
                  setFormDueDate(targetDate.toISOString().slice(0, 10));
                }
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
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
              } else if (field.name === 'dueDate') {
                val = formDueDate;
                setter = setFormDueDate;
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

          <LineItemEditor
            items={formLines}
            onChange={setFormLines}
            currency={formCurrency}
            customColumns={formCustomColumns}
            onCustomColumnsChange={setFormCustomColumns}
          />
        </div>
      </SlidePanel>

      {/* DETAIL PANEL */}
      <SlidePanel open={isDetailOpen && !!selectedInv} onClose={() => { setIsDetailOpen(false); setSelectedInv(null); }} title={selectedInv?.invoiceNumber || ''} subtitle={selectedInv?.customerCompany || ''} width="max-w-3xl"
        footer={
          selectedInv && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {can('invoices', 'delete') && (
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this invoice? This action is irreversible.')) {
                        deleteInvoice(selectedInv.id);
                        setIsDetailOpen(false);
                        setSelectedInv(null);
                      }
                    }} 
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={12} /> Delete Invoice
                  </button>
                )}
                {selectedInv.status === 'DRAFT' && (
                  <>
                    {can('invoices', 'edit') && (
                      <button 
                        onClick={() => {
                          setEditingInv(selectedInv);
                          setFormTemplateId(selectedInv.templateId || '');
                          setFormCustomer(selectedInv.customerName);
                          setFormCompany(selectedInv.customerCompany);
                          setFormCustomerAddress(selectedInv.customerAddress || '');
                          setFormDueDate(selectedInv.dueDate);
                          setFormLines(selectedInv.lines);
                          setFormCustomColumns(selectedInv.customColumns || []);
                          setFormCurrency(selectedInv.currency);
                          setFormAuthorizedPersonId(selectedInv.authorizedPersonId || '');
                          setDynamicValues(selectedInv.dynamicValues || {});
                          setIsDetailOpen(false);
                          setIsCreateOpen(true);
                        }} 
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all"
                      >
                        Edit Draft
                      </button>
                    )}
                    {can('invoices', 'send') && (
                      <button 
                        onClick={() => { 
                          if (selectedInv) {
                            const updated = { ...selectedInv, status: 'SENT' as const, pdfBase64: undefined };
                            updateInvoice(updated);
                            setSelectedInv(updated);
                          }
                          setIsEmailPreviewOpen(true);
                        }} 
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 hover:bg-sky-500/20 transition-all"
                      >
                        Send Invoice
                      </button>
                    )}
                  </>
                )}
                {selectedInv.balanceDue > 0 && selectedInv.status !== 'DRAFT' && can('invoices', 'record_payment') && (
                  <button onClick={() => { setPayAmount(selectedInv.balanceDue); setPayRef(''); setIsPayOpen(true); }} className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:scale-[1.02] transition-all flex items-center gap-1.5" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>
                    <Banknote size={12} /> Record Payment
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportDocumentToPDF(selectedInv, 'INVOICE', activeTenant)} className="px-3 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center gap-1.5"><Download size={12} /> Export PDF</button>
                <button onClick={() => exportDocumentToPDF(selectedInv, 'INVOICE', activeTenant, 'download')} className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"><Download size={12} /> Download PDF</button>
              </div>
            </div>
          )
        }
      >
        {selectedInv && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedInv.status} size="md" />
              <span className="text-xs text-slate-400">Issued {selectedInv.issueDate}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className={`text-xs font-bold ${selectedInv.status === 'OVERDUE' ? 'text-rose-500' : 'text-slate-400'}`}>Due {selectedInv.dueDate}</span>
              {selectedInv.quotationRef && <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">From {selectedInv.quotationRef}</span>}
            </div>

            {/* Customer Info */}
            <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Customer Details</span>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <p className="text-slate-400 text-xs">Contact</p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">{selectedInv.customerName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Company</p>
                  <p className="font-bold text-slate-800 dark:text-zinc-200">{selectedInv.customerCompany}</p>
                </div>
              </div>
              {selectedInv.customerAddress && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Billing Address</p>
                  <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5 whitespace-pre-line">{selectedInv.customerAddress}</p>
                </div>
              )}
              {selectedInv.templateId && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Selected Theme Template</p>
                  <p className="font-bold text-indigo-500 mt-0.5">
                    {useTemplatesStore.getState().getTemplate(selectedInv.templateId)?.name || 'Custom Theme'}
                  </p>
                </div>
              )}
              {selectedInv.authorizedPersonId && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3 text-xs">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-2">Authorized Signatory</p>
                  {(() => {
                    const person = activeTenant.authorizedPersons?.find(p => p.id === selectedInv.authorizedPersonId);
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

            {/* Payment Method (Bank Details) */}
            <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Payment Method (Bank Details)</span>
              {(() => {
                const bank = activeTenant.bankDetails && activeTenant.bankDetails.accountNo
                  ? activeTenant.bankDetails
                  : {
                      accountNo: '—',
                      beneficiaryName: '—',
                      bankName: '—',
                      ifscCode: '—',
                      swiftCode: '—',
                      branch: '—'
                    };
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400 text-[10px]">Beneficiary Name</p>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{bank.beneficiaryName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Bank Name</p>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{bank.bankName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Account Number</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{bank.accountNo}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">IFSC Code</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{bank.ifscCode}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Swift Code</p>
                      <p className="font-mono font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{bank.swiftCode}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-[10px]">Branch Location</p>
                      <p className="font-bold text-slate-800 dark:text-zinc-200 mt-0.5">{bank.branch}</p>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Balance highlight */}
            <div className={`p-4 rounded-2xl border ${selectedInv.balanceDue <= 0 ? 'bg-emerald-500/5 border-emerald-500/15' : selectedInv.status === 'OVERDUE' ? 'bg-rose-500/5 border-rose-500/15' : 'bg-amber-500/5 border-amber-500/15'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Balance Due</p>
                  <p className={`text-2xl font-extrabold mt-1 ${selectedInv.balanceDue <= 0 ? 'text-emerald-600' : selectedInv.status === 'OVERDUE' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {selectedInv.balanceDue <= 0 ? 'SETTLED' : `${selectedInv.currency}${selectedInv.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Grand Total</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{selectedInv.currency}{selectedInv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Line Items</span>
              <div className="border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-zinc-100/60 dark:bg-zinc-900/60 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Description</th>
                    {(selectedInv.customColumns || []).map((col: any) => (
                      <th key={col.key} className="px-4 py-3 text-right">{col.label}</th>
                    ))}
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Tax</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30">
                    {selectedInv.lines.map(line => {
                      const lt = (line.quantity * line.unitPrice - line.discount) * (1 + line.taxRate / 100);
                      return (
                        <tr key={line.id}>
                          <td className="px-4 py-3 font-medium">{line.description}</td>
                          {(selectedInv.customColumns || []).map((col: any) => (
                            <td key={col.key} className="px-4 py-3 text-right font-semibold text-slate-600 dark:text-zinc-400">
                              {line[col.key] !== undefined ? String(line[col.key]) : '—'}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-bold">{line.quantity}</td>
                          <td className="px-4 py-3 text-right">{selectedInv.currency}{line.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{line.taxRate}%</td>
                          <td className="px-4 py-3 text-right font-bold">{selectedInv.currency}{lt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Dynamic Values */}
            {selectedInv.dynamicValues && Object.keys(selectedInv.dynamicValues).length > 0 && (
              <div className="bg-indigo-500/5 border border-indigo-500/15 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Dynamic Metadata Fields</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(selectedInv.dynamicValues).map(([key, val]) => (
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

            {/* Payment History */}
            {selectedInv.payments.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5"><Banknote size={12} /> Payment History</span>
                <div className="space-y-2">
                  {selectedInv.payments.map(pay => (
                    <div key={pay.id} className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                      <div>
                        <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{selectedInv.currency}{pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{pay.method} — {pay.reference}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">{pay.recordedAt}</p>
                        <p className="text-[10px] text-slate-400">by {pay.recordedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </SlidePanel>

      {/* PAYMENT MODAL */}
      {isPayOpen && selectedInv && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[28px] p-6 shadow-2xl border border-zinc-200/60 dark:border-zinc-800/60 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
              <div><span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Record Payment</span><h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{selectedInv.invoiceNumber}</h3></div>
              <button onClick={() => setIsPayOpen(false)} className="h-8 w-8 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 flex items-center justify-center"><X size={18} /></button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-sm"><span className="text-slate-400">Balance Due</span><span className="font-bold text-amber-600">{selectedInv.currency}{selectedInv.balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Payment Amount *</label>
                <input type="number" min={0} max={selectedInv.balanceDue} step={0.01} value={payAmount} onChange={(e) => setPayAmount(Math.min(selectedInv.balanceDue, parseFloat(e.target.value) || 0))} className="w-full rounded-xl px-3 py-2.5 text-sm font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Payment Method</label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  <option>Wire Transfer</option><option>Stripe Card</option><option>Bank Transfer</option><option>UPI</option><option>Check</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500">Reference / Transaction ID</label>
                <input type="text" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="WT-39201" className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setIsPayOpen(false)} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300">Cancel</button>
              <button onClick={handleRecordPayment} disabled={payAmount <= 0} className="px-4 py-2 rounded-xl text-white text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>Confirm Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SIMULATED DOCUMENT SMTP OUTBOX MODAL                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEmailPreviewOpen && selectedInv && (
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

            {/* Email Envelope Fields */}
            {(() => {
              const matchedCust = customers.find(c => c.company === selectedInv.customerCompany && c.tenantId === activeTenant.id);
              const invoicesEmail = matchedCust?.invoicesEmail || matchedCust?.email || `accounts@${selectedInv.customerCompany.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
              
              return (
                <>
                  <div className="rounded-2xl border border-zinc-200/50 bg-white/70 dark:border-zinc-800/50 dark:bg-zinc-900/70 p-4 text-xs space-y-2 mb-4 font-mono text-left">
                    <div className="flex"><span className="w-16 font-bold text-slate-400">From:</span><span className="text-slate-600 dark:text-zinc-300">billing@{activeTenant.slug}.innovait-systems.com</span></div>
                    <div className="flex"><span className="w-16 font-bold text-slate-400">To:</span><span className="text-indigo-600 dark:text-indigo-400 font-bold">{invoicesEmail}</span></div>
                    <div className="flex"><span className="w-16 font-bold text-slate-400">Subject:</span><span className="text-slate-800 dark:text-zinc-100 font-bold text-left">Tax Invoice {selectedInv.invoiceNumber} from {activeTenant.name}</span></div>
                  </div>

                  {/* Simulated HTML Email Body Viewport */}
                  <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 overflow-hidden shadow-inner p-8 text-slate-700 dark:text-zinc-300">
                    <div className="max-w-md mx-auto space-y-6">
                      
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

                      {/* Email Greeting */}
                      <div className="space-y-3 text-left">
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                          Tax Invoice {selectedInv.invoiceNumber}
                        </h3>
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                          Hello <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedInv.customerCompany}</span> Finance Team,
                        </p>
                        <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                          Please find enclosed tax invoice <strong>{selectedInv.invoiceNumber}</strong> issued by <strong>{activeTenant.name}</strong> for your commercial services.
                        </p>
                      </div>

                      {/* Account Details Box */}
                      <div className="rounded-2xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800/60 p-4 text-xs space-y-2 text-left">
                        <div className="flex justify-between"><span className="text-slate-400">Invoice Number:</span><span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{selectedInv.invoiceNumber}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Amount Due:</span><span className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedInv.currency}{selectedInv.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Due Date:</span><span className="font-bold text-slate-800 dark:text-zinc-200">{selectedInv.dueDate}</span></div>
                      </div>

                      {/* CTA Download Link */}
                      <div className="text-center py-2">
                        <button
                          onClick={() => {
                            exportDocumentToPDF(selectedInv, 'INVOICE', activeTenant);
                          }}
                          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer w-full justify-center sm:w-auto"
                          style={{ backgroundColor: activeTenant.brandingConfig.primary || '#6366f1' }}
                        >
                          <span>Review & Download PDF Document</span>
                          <Download size={14} />
                        </button>
                      </div>

                      <div className="text-[11px] leading-relaxed text-slate-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/40 pt-4 space-y-2 text-left">
                        <p className="font-bold uppercase tracking-wider text-[9px]">Payment & Settlement Instructions</p>
                        <p>To settle this invoice, please pay using your preferred bank details coordinates visible in the exported PDF, or scan the instant UPI QR code inside the Quotation dashboard console.</p>
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
