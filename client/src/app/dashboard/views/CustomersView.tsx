'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useCustomersStore, Customer } from '../../../store/customersStore';
import StatCard from '../../../components/ui/StatCard';
import DataTable, { Column } from '../../../components/ui/DataTable';
import SlidePanel from '../../../components/ui/SlidePanel';
import {
  Users, Plus, Mail, Phone, MapPin, Landmark, ShieldCheck, 
  Trash2, X, FileText, CheckCircle2, DollarSign
} from 'lucide-react';

export default function CustomersView() {
  const { activeTenant } = useTenantStore();
  const { customers, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomersStore();

  useEffect(() => {
    fetchCustomers(activeTenant.id);
  }, [activeTenant.id, fetchCustomers]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create form state
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formTerms, setFormTerms] = useState('Net 30');
  const [formNotes, setFormNotes] = useState('');

  // Document-specific emails state (Create form)
  const [formQuotationsEmail, setFormQuotationsEmail] = useState('');
  const [formPoEmail, setFormPoEmail] = useState('');
  const [formInvoicesEmail, setFormInvoicesEmail] = useState('');
  const [formSameAsEmail, setFormSameAsEmail] = useState(true);

  // Edit form state (for detail slide panel)
  const [editName, setEditName] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCurrency, setEditCurrency] = useState('USD');
  const [editTerms, setEditTerms] = useState('Net 30');
  const [editNotes, setEditNotes] = useState('');

  // Document-specific emails state (Edit form)
  const [editQuotationsEmail, setEditQuotationsEmail] = useState('');
  const [editPoEmail, setEditPoEmail] = useState('');
  const [editInvoicesEmail, setEditInvoicesEmail] = useState('');
  const [editSameAsEmail, setEditSameAsEmail] = useState(true);

  // Filter customers based on active tenant
  const tenantCustomers = customers.filter(c => c.tenantId === activeTenant.id);

  // Search filter
  const filteredCustomers = tenantCustomers.filter(c => {
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      c.company.toLowerCase().includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  });

  // Calculate statistics
  const totalCount = tenantCustomers.length;
  const usdCount = tenantCustomers.filter(c => c.currency === 'USD').length;
  const eurCount = tenantCustomers.filter(c => c.currency === 'EUR').length;
  const net30Count = tenantCustomers.filter(c => c.paymentTerms === 'Net 30').length;

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      label: 'Contact Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-bold text-slate-800 dark:text-zinc-200">{row.name}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Mail size={10} />
            <span>{row.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'company',
      label: 'Company Name',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-bold text-slate-700 dark:text-zinc-300">{row.company}</p>
          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
            <Phone size={10} />
            <span>{row.phone}</span>
          </div>
        </div>
      )
    },
    {
      key: 'currency',
      label: 'Preferred Currency',
      sortable: true,
      render: (row) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40">
          {row.currency}
        </span>
      )
    },
    {
      key: 'paymentTerms',
      label: 'Payment Terms',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-600 dark:text-zinc-300 text-xs">
          {row.paymentTerms}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Onboarded Date',
      sortable: true
    }
  ];

  const handleCreate = () => {
    if (!formName || !formCompany || !formEmail) return;

    const finalQuotationsEmail = formSameAsEmail ? formEmail : formQuotationsEmail;
    const finalPoEmail = formSameAsEmail ? formEmail : formPoEmail;
    const finalInvoicesEmail = formSameAsEmail ? formEmail : formInvoicesEmail;
    
    addCustomer({
      tenantId: activeTenant.id,
      name: formName,
      company: formCompany,
      email: formEmail,
      phone: formPhone,
      address: formAddress,
      currency: formCurrency,
      paymentTerms: formTerms,
      notes: formNotes,
      quotationsEmail: finalQuotationsEmail,
      poEmail: finalPoEmail,
      invoicesEmail: finalInvoicesEmail
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = () => {
    if (!selectedCust || !editName || !editCompany || !editEmail) return;

    const finalEditQuotationsEmail = editSameAsEmail ? editEmail : editQuotationsEmail;
    const finalEditPoEmail = editSameAsEmail ? editEmail : editPoEmail;
    const finalEditInvoicesEmail = editSameAsEmail ? editEmail : editInvoicesEmail;

    updateCustomer(selectedCust.id, {
      name: editName,
      company: editCompany,
      email: editEmail,
      phone: editPhone,
      address: editAddress,
      currency: editCurrency,
      paymentTerms: editTerms,
      notes: editNotes,
      quotationsEmail: finalEditQuotationsEmail,
      poEmail: finalEditPoEmail,
      invoicesEmail: finalEditInvoicesEmail
    });

    setIsDetailOpen(false);
    setSelectedCust(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this customer record?')) {
      deleteCustomer(id);
      setIsDetailOpen(false);
      setSelectedCust(null);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormAddress('');
    setFormCurrency('USD');
    setFormTerms('Net 30');
    setFormNotes('');
    setFormQuotationsEmail('');
    setFormPoEmail('');
    setFormInvoicesEmail('');
    setFormSameAsEmail(true);
  };

  const openDetails = (cust: Customer) => {
    setSelectedCust(cust);
    setEditName(cust.name);
    setEditCompany(cust.company);
    setEditEmail(cust.email);
    setEditPhone(cust.phone);
    setEditAddress(cust.address);
    setEditCurrency(cust.currency);
    setEditTerms(cust.paymentTerms);
    setEditNotes(cust.notes || '');

    // Auto-detect if document-specific emails match primary email
    const isSynced = 
      (!cust.quotationsEmail || cust.quotationsEmail === cust.email) &&
      (!cust.poEmail || cust.poEmail === cust.email) &&
      (!cust.invoicesEmail || cust.invoicesEmail === cust.email);

    setEditSameAsEmail(isSynced);
    setEditQuotationsEmail(cust.quotationsEmail || cust.email);
    setEditPoEmail(cust.poEmail || cust.email);
    setEditInvoicesEmail(cust.invoicesEmail || cust.email);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Customer Directory</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
            Onboard commercial accounts, assign primary billing addresses, and establish document payterms.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md self-start md:self-auto"
        >
          <Plus size={14} />
          <span>Onboard Customer</span>
        </button>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={String(totalCount)}
          icon={<Users size={18} />}
          accentColor={activeTenant.brandingConfig.primary}
        />
        <StatCard
          label="USD Accounts"
          value={String(usdCount)}
          change="Standard billing"
          isPositive={true}
          icon={<DollarSign size={18} />}
          accentColor="#10b981"
        />
        <StatCard
          label="EUR Accounts"
          value={String(eurCount)}
          change="Cross-border"
          isPositive={true}
          icon={<Landmark size={18} />}
          accentColor="#6366f1"
        />
        <StatCard
          label="Net 30 Accounts"
          value={String(net30Count)}
          change="Standard terms"
          isPositive={true}
          icon={<FileText size={18} />}
          accentColor="#f59e0b"
        />
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search customers by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-2xl pl-4 pr-10 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/55 focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400 font-semibold hidden sm:block">
          Showing {filteredCustomers.length} of {totalCount} records
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable<Customer>
        columns={columns}
        data={filteredCustomers}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => openDetails(row)}
        emptyMessage="No customers found for this workspace. Onboard one to get started."
      />

      {/* CREATE SLIDE PANEL */}
      <SlidePanel
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Onboard Commercial Account"
        subtitle="Specify direct contact information, billing address, and default credit settings."
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Account will be immediately registered.</span>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!formName || !formCompany || !formEmail}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40"
              >
                Register Customer
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Contact Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Marcus Chen"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Company Name *</label>
              <input
                type="text"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
                placeholder="Acme Supply Corp"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Email Address *</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="mchen@acmesupply.com"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Phone Number</label>
              <input
                type="text"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+1 (555) 019-2834"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Document-Specific Emails Section */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/40 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Document Dispatch Coordinates</span>
              <label className="flex items-center gap-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formSameAsEmail}
                  onChange={(e) => setFormSameAsEmail(e.target.checked)}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <span>Same as Main Email</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-slate-500 dark:text-zinc-400">Quotations Email</label>
                <input
                  type="email"
                  value={formSameAsEmail ? formEmail : formQuotationsEmail}
                  disabled={formSameAsEmail}
                  onChange={(e) => setFormQuotationsEmail(e.target.value)}
                  placeholder="e.g. sales@company.com"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-slate-500 dark:text-zinc-400">Purchase Orders Email</label>
                <input
                  type="email"
                  value={formSameAsEmail ? formEmail : formPoEmail}
                  disabled={formSameAsEmail}
                  onChange={(e) => setFormPoEmail(e.target.value)}
                  placeholder="e.g. ops@company.com"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5 text-left">
                <label className="font-bold text-slate-500 dark:text-zinc-400">Invoices Email</label>
                <input
                  type="email"
                  value={formSameAsEmail ? formEmail : formInvoicesEmail}
                  disabled={formSameAsEmail}
                  onChange={(e) => setFormInvoicesEmail(e.target.value)}
                  placeholder="e.g. accounts@company.com"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Billing Address</label>
            <textarea
              value={formAddress}
              onChange={(e) => setFormAddress(e.target.value)}
              placeholder="100 Industrial Parkway, Warehouse 4B, Detroit, MI 48201"
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Preferred Currency</label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Payment Terms</label>
              <select
                value={formTerms}
                onChange={(e) => setFormTerms(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold"
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Due on Receipt">Due on Receipt</option>
                <option value="Milestone 50/50">Milestone 50/50</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Internal Accounts Notes</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Critical customer accounts manager handles all specific invoicing overrides."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
        </div>
      </SlidePanel>

      {/* DETAIL / EDIT SLIDE PANEL */}
      <SlidePanel
        open={isDetailOpen && !!selectedCust}
        onClose={() => { setIsDetailOpen(false); setSelectedCust(null); }}
        title={selectedCust?.company || ''}
        subtitle={`Registered Account — Onboarded ${selectedCust?.createdAt}`}
        width="max-w-2xl"
        footer={
          selectedCust && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedCust.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
              >
                <Trash2 size={13} />
                <span>Delete Account</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsDetailOpen(false); setSelectedCust(null); }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!editName || !editCompany || !editEmail}
                  className="px-4 py-2 rounded-xl text-white text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40"
                  style={{ backgroundColor: activeTenant.brandingConfig.primary }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedCust && (
          <div className="space-y-6">
            {/* Visual Account Badge */}
            <div className="flex items-center gap-4 bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white font-extrabold text-lg shadow-sm"
                style={{ backgroundColor: activeTenant.brandingConfig.primary }}
              >
                {editCompany.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 dark:text-zinc-200 text-base truncate">{editCompany}</p>
                <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold mt-0.5">
                  <ShieldCheck size={13} />
                  <span>Compliance Account Checked</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Contact Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Company Name *</label>
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Email Address *</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Document-Specific Emails Section */}
            <div className="p-4 rounded-2xl bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200/40 dark:border-zinc-800/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Document Dispatch Coordinates</span>
                <label className="flex items-center gap-2 text-xs font-semibold text-indigo-500 dark:text-indigo-400 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={editSameAsEmail}
                    onChange={(e) => setEditSameAsEmail(e.target.checked)}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span>Same as Main Email</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Quotations Email</label>
                  <input
                    type="email"
                    value={editSameAsEmail ? editEmail : editQuotationsEmail}
                    disabled={editSameAsEmail}
                    onChange={(e) => setEditQuotationsEmail(e.target.value)}
                    placeholder="e.g. sales@company.com"
                    className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Purchase Orders Email</label>
                  <input
                    type="email"
                    value={editSameAsEmail ? editEmail : editPoEmail}
                    disabled={editSameAsEmail}
                    onChange={(e) => setEditPoEmail(e.target.value)}
                    placeholder="e.g. ops@company.com"
                    className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="font-bold text-slate-500 dark:text-zinc-400">Invoices Email</label>
                  <input
                    type="email"
                    value={editSameAsEmail ? editEmail : editInvoicesEmail}
                    disabled={editSameAsEmail}
                    onChange={(e) => setEditInvoicesEmail(e.target.value)}
                    placeholder="e.g. accounts@company.com"
                    className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Billing Address</label>
              <textarea
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Preferred Currency</label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Payment Terms</label>
                <select
                  value={editTerms}
                  onChange={(e) => setEditTerms(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold"
                >
                  <option value="Net 15">Net 15</option>
                  <option value="Net 30">Net 30</option>
                  <option value="Net 45">Net 45</option>
                  <option value="Due on Receipt">Due on Receipt</option>
                  <option value="Milestone 50/50">Milestone 50/50</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Internal Accounts Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
