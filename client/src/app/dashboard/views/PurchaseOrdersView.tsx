'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useCustomersStore } from '../../../store/customersStore';
import { PurchaseOrderRecord, POLineItem } from './purchaseOrdersData';
import { useDocumentStore } from '../../../store/documentStore';
import { usePermissions } from '../../../hooks/usePermissions';

import StatusBadge from '../../../components/ui/StatusBadge';
import StatCard from '../../../components/ui/StatCard';
import DataTable, { Column } from '../../../components/ui/DataTable';
import SlidePanel from '../../../components/ui/SlidePanel';
import LineItemEditor, { LineItem } from '../../../components/ui/LineItemEditor';
import { useCustomFieldsStore } from '../../../store/customFieldsStore';
import { useTemplatesStore } from '../../../store/templatesStore';
import DynamicFormCompiler from '../../../components/dynamic-form/dynamic-form';
import { exportDocumentToPDF } from '../../../utils/pdfExporter';
import {
  ShoppingBag, Plus, Package, CheckCircle2, Clock, Ban,
  ArrowRight, Download, Truck, X, Mail
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

export default function PurchaseOrdersView() {
  const { activeTenant } = useTenantStore();
  const { can } = usePermissions();
  const { getActiveFieldsForEntity, fields } = useCustomFieldsStore();
  const { templates, activeTemplateIds } = useTemplatesStore();
  const { customers } = useCustomersStore();

  const { orders: allOrders, addPurchaseOrder, updatePurchaseOrder } = useDocumentStore();
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([]);

  React.useEffect(() => {
    setOrders(allOrders.filter(o => o.tenantId === activeTenant.id));
  }, [allOrders, activeTenant.id]);

  const [selectedPO, setSelectedPO] = useState<PurchaseOrderRecord | null>(null);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);
  const [smtpFromEmail, setSmtpFromEmail] = useState('');
  const [smtpSubject, setSmtpSubject] = useState('');
  const [smtpBody, setSmtpBody] = useState('');


  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrderRecord | null>(null);

  // Create form
  const [formTemplateId, setFormTemplateId] = useState(activeTemplateIds['PURCHASE_ORDER']);
  const [formSupplier, setFormSupplier] = useState('');
  const [formSupplierCompany, setFormSupplierCompany] = useState('');
  const [formCustomerAddress, setFormCustomerAddress] = useState('');
  const [formDeliveryTerms, setFormDeliveryTerms] = useState('');
  const [formNewLines, setFormNewLines] = useState<LineItem[]>([
    { id: 'new-1', description: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 },
  ]);
  const [formCurrency, setFormCurrency] = useState(activeTenant.currency === 'EUR' ? '€' : '$');
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [formCustomColumns, setFormCustomColumns] = useState<{ key: string; label: string; type: 'text' | 'number' }[]>([]);
  const [formAuthorizedPersonId, setFormAuthorizedPersonId] = useState('');

  const tenantCustomers = customers.filter(c => c.tenantId === activeTenant.id);

  // Receive form
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});

  const purchaseOrderFields = fields.filter(f => f.entityType === 'PURCHASE_ORDER' && f.isActive);
  const primaryFields = purchaseOrderFields.filter(f => f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const customFields = purchaseOrderFields.filter(f => !f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const poTemplates = templates.filter(t => t.entityType === 'PURCHASE_ORDER');

  // Calculate baseline totals for dynamic values evaluation
  let draftSubTotal = 0;
  formNewLines.forEach((l) => {
    draftSubTotal += l.quantity * l.unitPrice;
  });
  const draftTaxTotal = Math.round(draftSubTotal * 0.18 * 100) / 100;
  const draftGrandTotal = Math.round((draftSubTotal + draftTaxTotal) * 100) / 100;

  const stats = {
    total: orders.length,
    open: orders.filter(o => o.status === 'OPEN' || o.status === 'APPROVED').length,
    partial: orders.filter(o => o.status === 'PARTIALLY_RECEIVED').length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
  };

  const totalValue = orders.reduce((sum, o) => sum + o.grandTotal, 0);

  const columns: Column<PurchaseOrderRecord>[] = [
    { key: 'poNumber', label: 'PO Number', sortable: true, render: (row) => <span className="font-mono font-bold text-slate-950 dark:text-zinc-100">{row.poNumber}</span> },
    { key: 'supplierCompany', label: 'Supplier', sortable: true, render: (row) => (
      <div>
        <p className="font-bold text-slate-700 dark:text-zinc-300">{row.supplierCompany}</p>
        {row.quotationRef && <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">From {row.quotationRef}</p>}
      </div>
    )},
    { key: 'createdAt', label: 'Date Issued', sortable: true },
    { key: 'grandTotal', label: 'Grand Total', sortable: true, render: (row) => <span className="font-bold">{row.currency}{row.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> },
    { key: 'lines', label: 'Item Lines', render: (row) => <span className="text-slate-400 font-semibold">{row.lines.length} lines</span> },
    { key: 'status', label: 'Fulfillment', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
  ];

  const handleCreate = () => {
    let subTotal = 0;
    const lines: POLineItem[] = formNewLines.map((l, i) => {
      const lineTotal = l.quantity * l.unitPrice * (1 + l.taxRate / 100);
      subTotal += l.quantity * l.unitPrice;
      const poLine: POLineItem = { id: `pol-new-${i}`, description: l.description, quantityOrdered: l.quantity, quantityReceived: 0, unitPrice: l.unitPrice, taxRate: l.taxRate, total: Math.round(lineTotal * 100) / 100 };
      formCustomColumns.forEach(col => {
        poLine[col.key] = l[col.key];
      });
      return poLine;
    });
    const taxTotal = Math.round(subTotal * 0.18 * 100) / 100;
    const newPO: PurchaseOrderRecord = {
      id: `po-${Date.now()}`, poNumber: `PO-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`, tenantId: activeTenant.id,
      supplierId: `sup-${Date.now()}`, supplierName: formSupplier, supplierCompany: formSupplierCompany,
      quotationId: null, quotationRef: null, status: 'OPEN',
      subTotal: Math.round(subTotal * 100) / 100, taxTotal, grandTotal: Math.round((subTotal + taxTotal) * 100) / 100,
      currency: formCurrency, deliveryTerms: formDeliveryTerms,
      lines, customColumns: formCustomColumns, dynamicValues: dynamicValues, createdAt: new Date().toISOString().slice(0, 10),
      templateId: formTemplateId, customerAddress: formCustomerAddress || undefined,
      authorizedPersonId: formAuthorizedPersonId || undefined,
    };
    addPurchaseOrder(newPO);
    resetForm();
    setIsCreateOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingPO) return;
    let subTotal = 0;
    const lines = formNewLines.map((l, i) => {
      const lineTotal = l.quantity * l.unitPrice * (1 + l.taxRate / 100);
      subTotal += l.quantity * l.unitPrice;
      const poLine: any = { id: `pol-new-${i}`, description: l.description, quantityOrdered: l.quantity, quantityReceived: editingPO.lines[i]?.quantityReceived || 0, unitPrice: l.unitPrice, taxRate: l.taxRate, total: Math.round(lineTotal * 100) / 100 };
      formCustomColumns.forEach(col => {
        poLine[col.key] = l[col.key];
      });
      return poLine;
    });
    const taxTotal = Math.round(subTotal * 0.18 * 100) / 100;

    const updatedPO = {
      ...editingPO,
      supplierName: formSupplier,
      supplierCompany: formSupplierCompany,
      customerAddress: formCustomerAddress || undefined,
      deliveryTerms: formDeliveryTerms,
      lines,
      customColumns: formCustomColumns,
      currency: formCurrency,
      dynamicValues: dynamicValues,
      subTotal: Math.round(subTotal * 100) / 100,
      taxTotal,
      grandTotal: Math.round((subTotal + taxTotal) * 100) / 100,
      templateId: formTemplateId,
      authorizedPersonId: formAuthorizedPersonId || undefined,
    };

    updatePurchaseOrder(updatedPO);
    resetForm();
    setEditingPO(null);
    setIsCreateOpen(false);
  };

  const resetForm = () => {
    const defaultTplId = activeTemplateIds['PURCHASE_ORDER'];
    const defaultTpl = useTemplatesStore.getState().getTemplate(defaultTplId);
    setFormTemplateId(defaultTplId);
    setFormSupplier('');
    setFormSupplierCompany('');
    setFormCustomerAddress('');
    setFormDeliveryTerms('');
    setFormNewLines([{ id: 'new-1', description: '', quantity: 1, unitPrice: 0, taxRate: 18, discount: 0 }]);
    setFormCurrency(activeTenant.currency === 'EUR' ? '€' : '$');
    setDynamicValues({});
    setFormAuthorizedPersonId('');
    setFormCustomColumns(defaultTpl?.config?.lineItemColumns || []);
  };

  const openReceive = (po: PurchaseOrderRecord) => {
    const qtys: Record<string, number> = {};
    po.lines.forEach(l => { qtys[l.id] = 0; });
    setReceiveQtys(qtys);
    setIsReceiveOpen(true);
  };

  const handleReceive = () => {
    if (!selectedPO) return;
    const updatedLines = selectedPO.lines.map(line => {
      const addQty = receiveQtys[line.id] || 0;
      const newReceived = Math.min(line.quantityOrdered, line.quantityReceived + addQty);
      return { ...line, quantityReceived: newReceived };
    });
    const allReceived = updatedLines.every(l => l.quantityReceived >= l.quantityOrdered);
    const anyReceived = updatedLines.some(l => l.quantityReceived > 0);
    const newStatus = allReceived ? 'COMPLETED' : anyReceived ? 'PARTIALLY_RECEIVED' : selectedPO.status;
    const updatedPO = { ...selectedPO, lines: updatedLines, status: newStatus as PurchaseOrderRecord['status'] };

    updatePurchaseOrder(updatedPO);
    setSelectedPO(updatedPO);
    setIsReceiveOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Purchase Orders Pipeline</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Manage procurement, supplier agreements, and partial item delivery audits.</p>
        </div>
        {can('purchase_orders', 'create') && (
          <button onClick={() => { resetForm(); setEditingPO(null); setIsCreateOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md">
            <Plus size={14} /><span>New Purchase Order</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total POs" value={String(stats.total)} icon={<ShoppingBag size={18} />} accentColor={activeTenant.brandingConfig.primary} />
        <StatCard label="Open / Awaiting" value={String(stats.open)} change={`${stats.open} pending`} isPositive={false} icon={<Clock size={18} />} accentColor="#3b82f6" />
        <StatCard label="Partially Received" value={String(stats.partial)} icon={<Package size={18} />} accentColor="#f59e0b" />
        <StatCard label="Completed" value={String(stats.completed)} change={`${activeTenant.currency === 'EUR' ? '€' : '$'}${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`} isPositive={true} icon={<CheckCircle2 size={18} />} accentColor="#10b981" />
      </div>

      <DataTable<PurchaseOrderRecord>
        columns={columns}
        data={orders}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => { setSelectedPO(row); setIsDetailOpen(true); }}
        emptyMessage="No purchase orders found"
      />

      {/* CREATE PANEL */}
      <SlidePanel open={isCreateOpen} onClose={() => { setIsCreateOpen(false); setEditingPO(null); }} title={editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'} subtitle={editingPO ? `Modify purchase order details for ${editingPO.poNumber}` : 'Add supplier details and specify line items for procurement.'}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">
              {editingPO ? 'Edits will be saved.' : 'Draft will be saved.'}
            </span>
            <div className="flex gap-3">
              <button onClick={() => { setIsCreateOpen(false); setEditingPO(null); }} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">Cancel</button>
              <button onClick={editingPO ? handleSaveEdit : handleCreate} disabled={!formSupplierCompany} className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40">{editingPO ? 'Save Changes' : 'Create PO'}</button>
            </div>
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
              {poTemplates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.id === activeTemplateIds['PURCHASE_ORDER'] ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">Select Registered Partner / Supplier (Auto-fill)</label>
            <select
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) return;
                const cust = tenantCustomers.find(c => c.id === selectedId);
                if (cust) {
                  setFormSupplier(cust.name);
                  setFormSupplierCompany(cust.company);
                  setFormCustomerAddress(cust.address);
                  setFormCurrency(cust.currency === 'EUR' ? '€' : cust.currency === 'GBP' ? '£' : cust.currency === 'INR' ? '₹' : '$');
                }
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
              defaultValue=""
            >
              <option value="">-- Choose registered partner to auto-fill details --</option>
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
              
              if (field.name === 'supplierName') {
                val = formSupplier;
                setter = setFormSupplier;
              } else if (field.name === 'supplierCompany') {
                val = formSupplierCompany;
                setter = setFormSupplierCompany;
              } else if (field.name === 'customerAddress') {
                val = formCustomerAddress;
                setter = setFormCustomerAddress;
              } else if (field.name === 'deliveryTerms') {
                val = formDeliveryTerms;
                setter = setFormDeliveryTerms;
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
                  subTotal: draftSubTotal,
                  taxTotal: draftTaxTotal,
                  discountTotal: 0,
                  grandTotal: draftGrandTotal,
                }}
              />
            </div>
          )}

          <LineItemEditor
            items={formNewLines}
            onChange={setFormNewLines}
            currency={formCurrency}
            showDiscount={false}
            customColumns={formCustomColumns}
            onCustomColumnsChange={setFormCustomColumns}
          />
        </div>
      </SlidePanel>

      {/* DETAIL PANEL */}
      <SlidePanel
        open={isDetailOpen && !!selectedPO}
        onClose={() => { setIsDetailOpen(false); setSelectedPO(null); }}
        title={selectedPO?.poNumber || ''}
        subtitle={selectedPO?.supplierCompany || ''}
        width="max-w-3xl"
        footer={
          selectedPO && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                {selectedPO.status === 'OPEN' && can('purchase_orders', 'edit') && (
                  <button 
                    onClick={() => {
                      setEditingPO(selectedPO);
                      setFormTemplateId(selectedPO.templateId || '');
                      setFormSupplier(selectedPO.supplierName);
                      setFormSupplierCompany(selectedPO.supplierCompany);
                      setFormCustomerAddress(selectedPO.customerAddress || '');
                      setFormDeliveryTerms(selectedPO.deliveryTerms || '');
                      setFormNewLines(selectedPO.lines.map(l => {
                        const baseItem: LineItem = {
                          id: l.id,
                          description: l.description,
                          quantity: l.quantityOrdered,
                          unitPrice: l.unitPrice,
                          taxRate: l.taxRate,
                          discount: 0
                        };
                        (selectedPO.customColumns || []).forEach(col => {
                          baseItem[col.key] = l[col.key];
                        });
                        return baseItem;
                      }));
                      setFormCustomColumns(selectedPO.customColumns || []);
                      setFormCurrency(selectedPO.currency);
                      setFormAuthorizedPersonId(selectedPO.authorizedPersonId || '');
                      setDynamicValues(selectedPO.dynamicValues || {});
                      setIsDetailOpen(false);
                      setIsCreateOpen(true);
                    }} 
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all"
                  >
                    Edit PO
                  </button>
                )}
                {(selectedPO.status === 'OPEN' || selectedPO.status === 'APPROVED' || selectedPO.status === 'PARTIALLY_RECEIVED') && can('purchase_orders', 'receive_goods') && (
                  <button onClick={() => openReceive(selectedPO)} className="px-3 py-2 rounded-xl text-xs font-bold text-white hover:scale-[1.02] transition-all flex items-center gap-1.5" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>
                    <Truck size={12} /> Record Receipt
                  </button>
                )}
                 {selectedPO.status === 'OPEN' && can('purchase_orders', 'approve') && (
                  <button onClick={() => { setOrders(prev => prev.map(o => o.id === selectedPO.id ? { ...o, status: 'CANCELLED' } : o)); setSelectedPO(prev => prev ? { ...prev, status: 'CANCELLED' } : null); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5">
                    <Ban size={12} /> Cancel PO
                  </button>
                )}
                {(selectedPO.status === 'OPEN' || selectedPO.status === 'APPROVED') && (
                  <button 
                    onClick={() => {
                      // Initialize editable SMTP fields
                      const orgEmail = activeTenant.email || `procurement@${activeTenant.slug}.innovait-systems.com`;
                      setSmtpFromEmail(orgEmail);
                      setSmtpSubject(`Purchase Order ${selectedPO.poNumber} from ${activeTenant.name}`);
                      setSmtpBody(`Hello ${selectedPO.supplierCompany} Sales Team,\n\nPlease find enclosed purchase order ${selectedPO.poNumber} issued by ${activeTenant.name} for procurement services.\n\nPlease review and acknowledge receipt of this purchase order. Settle any delivery logistics according to the shipping coordinates listed inside the attached PDF document.\n\nBest Regards,\n${activeTenant.name}`);
                      setIsEmailPreviewOpen(true);
                    }} 
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 hover:bg-sky-500/20 transition-all flex items-center gap-1.5"
                  >
                    <Mail size={12} /> Send PO
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportDocumentToPDF(selectedPO, 'PURCHASE_ORDER', activeTenant)} className="px-3 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center gap-1.5"><Download size={12} /> Export PDF</button>
                <button onClick={() => exportDocumentToPDF(selectedPO, 'PURCHASE_ORDER', activeTenant, 'download')} className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"><Download size={12} /> Download PDF</button>
              </div>
            </div>
          )
        }
      >
        {selectedPO && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedPO.status} size="md" />
              <span className="text-xs text-slate-400 font-medium">Created {selectedPO.createdAt}</span>
              {selectedPO.quotationRef && (
                <span className="text-xs font-bold text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">From {selectedPO.quotationRef}</span>
              )}
            </div>

            {/* Supplier */}
            <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Supplier Details</span>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div><p className="text-slate-400 text-xs">Contact</p><p className="font-bold text-slate-800 dark:text-zinc-200">{selectedPO.supplierName}</p></div>
                <div><p className="text-slate-400 text-xs">Company</p><p className="font-bold text-slate-800 dark:text-zinc-200">{selectedPO.supplierCompany}</p></div>
              </div>
              {selectedPO.customerAddress && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Vendor Address</p>
                  <p className="font-medium text-slate-700 dark:text-zinc-300 mt-0.5 whitespace-pre-line">{selectedPO.customerAddress}</p>
                </div>
              )}
              {selectedPO.templateId && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400">Selected Theme Template</p>
                  <p className="font-bold text-indigo-500 mt-0.5">
                    {useTemplatesStore.getState().getTemplate(selectedPO.templateId)?.name || 'Custom Theme'}
                  </p>
                </div>
              )}
              {selectedPO.authorizedPersonId && (
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 text-xs mb-2">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-1.5">Authorized Signatory</p>
                  {(() => {
                    const person = activeTenant.authorizedPersons?.find(p => p.id === selectedPO.authorizedPersonId);
                    if (!person) return <p className="font-semibold text-slate-500 italic mt-0.5">Assigned signatory not found in active settings</p>;
                    return (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/30">
                        {person.signatureUrl ? (
                          <div className="h-8 w-16 shrink-0 bg-white border border-zinc-200/50 rounded-lg p-1 flex items-center justify-center">
                            <img src={person.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-8 w-16 shrink-0 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200/50 dark:border-zinc-800/40 rounded-lg flex items-center justify-center text-[7px] text-zinc-300 dark:text-zinc-700 font-mono">No Signature</div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-zinc-200 text-xs">{person.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold">{person.designation}</p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {selectedPO.deliveryTerms && <p className="text-xs text-slate-400 mt-3 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2 italic">{selectedPO.deliveryTerms}</p>}
            </div>

            {/* Lines with fulfillment */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Line Items & Fulfillment</span>
              <div className="space-y-3">
                {selectedPO.lines.map(line => {
                  const pct = line.quantityOrdered > 0 ? (line.quantityReceived / line.quantityOrdered) * 100 : 0;
                  const isFull = line.quantityReceived >= line.quantityOrdered;
                  return (
                    <div key={line.id} className="border border-zinc-200/60 dark:border-zinc-800/40 rounded-2xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-zinc-200">{line.description}</p>
                        <span className="text-xs font-bold">{selectedPO.currency}{line.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                        <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                          <span>Unit: {selectedPO.currency}{line.unitPrice.toFixed(2)} × {line.quantityOrdered} ({line.taxRate}% tax)</span>
                          {(selectedPO.customColumns || []).map((col: any) => (
                            <span key={col.key} className="border-l border-zinc-300 dark:border-zinc-700 pl-2">
                              {col.label}: <strong>{line[col.key] !== undefined ? String(line[col.key]) : '—'}</strong>
                            </span>
                          ))}
                        </span>
                        <span className={`font-bold ${isFull ? 'text-emerald-500' : 'text-amber-500'}`}>{line.quantityReceived} / {line.quantityOrdered} received</span>
                      </div>
                      <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end text-xs space-y-1">
                <div className="text-right space-y-1">
                  <div className="flex gap-8"><span className="text-slate-400">Subtotal</span><span className="font-bold w-24">{selectedPO.currency}{selectedPO.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex gap-8"><span className="text-slate-400">Tax</span><span className="font-bold w-24">{selectedPO.currency}{selectedPO.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                  <div className="flex gap-8 pt-1 border-t border-zinc-200/50 dark:border-zinc-800/30"><span className="font-extrabold">Grand Total</span><span className="font-extrabold text-sm w-24">{selectedPO.currency}{selectedPO.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                </div>
              </div>
            </div>

            {/* Dynamic Values */}
            {Object.keys(selectedPO.dynamicValues).length > 0 && (
              <div className="bg-indigo-500/5 border border-indigo-500/15 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Dynamic Metadata</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(selectedPO.dynamicValues).map(([key, val]) => (
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
          </div>
        )}
      </SlidePanel>

      {/* RECEIVE ITEMS MODAL */}
      {isReceiveOpen && selectedPO && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[28px] p-6 shadow-2xl border border-zinc-200/60 dark:border-zinc-800/60 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Record Delivery Receipt</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{selectedPO.poNumber}</h3>
              </div>
              <button onClick={() => setIsReceiveOpen(false)} className="h-8 w-8 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 flex items-center justify-center"><X size={18} /></button>
            </div>

            <div className="space-y-4 mb-6">
              {selectedPO.lines.filter(l => l.quantityReceived < l.quantityOrdered).map(line => {
                const remaining = line.quantityOrdered - line.quantityReceived;
                return (
                  <div key={line.id} className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate">{line.description}</p>
                      <p className="text-[10px] text-slate-400">Remaining: {remaining} of {line.quantityOrdered}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      value={receiveQtys[line.id] || 0}
                      onChange={(e) => setReceiveQtys(prev => ({ ...prev, [line.id]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)) }))}
                      className="w-20 rounded-xl px-3 py-2 text-sm font-bold text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                    />
                  </div>
                );
              })}
              {selectedPO.lines.every(l => l.quantityReceived >= l.quantityOrdered) && (
                <p className="text-xs text-emerald-500 font-bold text-center py-4">All items fully received.</p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setIsReceiveOpen(false)} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300">Cancel</button>
              <button onClick={handleReceive} disabled={Object.values(receiveQtys).every(v => v === 0)} className="px-4 py-2 rounded-xl text-white text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>
                Confirm Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SIMULATED DOCUMENT SMTP OUTBOX MODAL                      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEmailPreviewOpen && selectedPO && (
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
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Mock document router log: 1 transaction attachment sent to supplier mail coordinates</p>
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
              const matchedCust = customers.find(c => c.company === selectedPO.supplierCompany && c.tenantId === activeTenant.id);
              const poEmail = matchedCust?.poEmail || matchedCust?.email || `procurement@${selectedPO.supplierCompany.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
              
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
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{poEmail}</span>
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
                        <div className="flex justify-between"><span className="text-slate-400">PO Number:</span><span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{selectedPO.poNumber}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Order Value:</span><span className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedPO.currency}{selectedPO.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                        <div className="flex justify-between"><span className="text-slate-400">Date Issued:</span><span className="font-bold text-slate-800 dark:text-zinc-200">{selectedPO.createdAt}</span></div>
                      </div>

                      {/* CTA Download Link — now uses 'download' mode */}
                      <div className="text-center py-2">
                        <button
                          onClick={() => {
                            exportDocumentToPDF(selectedPO, 'PURCHASE_ORDER', activeTenant, 'download');
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
