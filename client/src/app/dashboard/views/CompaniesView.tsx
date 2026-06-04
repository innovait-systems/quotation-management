'use client';

import React, { useState } from 'react';
import { useTenantStore, Tenant, TenantFeatures, defaultSubscriptionPlans } from '../../../store/tenantStore';
import StatCard from '../../../components/ui/StatCard';
import DataTable, { Column } from '../../../components/ui/DataTable';
import SlidePanel from '../../../components/ui/SlidePanel';
import { getCurrencySymbol } from '../../../utils/currency';
import {
  Building2, Plus, Search, Check, Trash2, Edit, ShieldCheck, 
  Wallet, RefreshCw, X, Landmark, Compass, Sliders, CheckSquare, Square,
  Users, BadgeDollarSign
} from 'lucide-react';

const PLAN_BADGES: Record<string, string> = {
  FREE: 'bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40',
  STARTUP: 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20',
  BUSINESS: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
  ENTERPRISE: 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
};

const BRAND_COLORS = [
  { primary: '#6366f1', secondary: '#0f172a', name: 'Indigo' },
  { primary: '#10b981', secondary: '#059669', name: 'Emerald' },
  { primary: '#8b5cf6', secondary: '#7c3aed', name: 'Violet' },
  { primary: '#f43f5e', secondary: '#e11d48', name: 'Rose' },
  { primary: '#f59e0b', secondary: '#d97706', name: 'Amber' },
  { primary: '#0f172a', secondary: '#020617', name: 'Slate' }
];

const DEFAULT_FEATURES: TenantFeatures = {
  email_notifications: true,
  slack_integration: false,
  auto_reminders: true,
  mfa_enforce: false,
  ip_whitelist: false,
  audit_trail: true,
  auto_numbering: true,
  pdf_watermark: true,
  esignature: false,
  auto_convert: false,
  formula_engine: true,
  ai_copilot: true
};

export default function CompaniesView() {
  const { 
    activeTenant, 
    tenantsList, 
    addTenant, 
    updateTenant, 
    deleteTenant, 
    setActiveTenant,
    users,
    addUser,
    deleteUser,
    subscriptionPlans
  } = useTenantStore();

  // Form states (common for create and edit) - declared first to prevent ReferenceError
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPlan, setFormPlan] = useState<'FREE' | 'STARTUP' | 'BUSINESS' | 'ENTERPRISE'>('FREE');
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formEmail, setFormEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formGstNumber, setFormGstNumber] = useState('');
  const [formPrimaryColor, setFormPrimaryColor] = useState('#6366f1');
  const [formSecondaryColor, setFormSecondaryColor] = useState('#0f172a');
  const [formFeatures, setFormFeatures] = useState<TenantFeatures>({ ...DEFAULT_FEATURES });
  const [formPassword, setFormPassword] = useState('password');

  // Safe fallback to prevent hydration or empty store array TypeError crashes
  const plans = (subscriptionPlans && subscriptionPlans.length) ? subscriptionPlans : defaultSubscriptionPlans;
  const selectedPlanData = plans.find(p => p.key === formPlan);

  // User creation inside selected company
  const [newUserName, setNewUserName] = useState('');
  const [newUserLastName, setNewUserLastName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password');
  const [newUserRole, setNewUserRole] = useState<'TENANT_ADMIN' | 'FINANCE' | 'SALES' | 'OPERATIONS' | 'VIEWER'>('TENANT_ADMIN');

  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Statistics
  const totalCount = tenantsList.length;
  const enterpriseCount = tenantsList.filter(t => t.plan === 'ENTERPRISE').length;
  const businessCount = tenantsList.filter(t => t.plan === 'BUSINESS').length;
  const startupCount = tenantsList.filter(t => t.plan === 'STARTUP').length;

  const calculateMRR = (tenants: Tenant[]) => {
    return tenants.reduce((sum, t) => {
      const plan = plans.find(p => p.key === t.plan);
      return sum + (plan ? plan.priceMonthly : 0);
    }, 0);
  };
  const currentMRR = calculateMRR(tenantsList);
  
  // Calculate average active features across all tenants
  const averageFeatures = totalCount > 0 
    ? (tenantsList.reduce((acc, t) => {
        const activeCount = Object.values(t.features || {}).filter(Boolean).length;
        return acc + activeCount;
      }, 0) / totalCount).toFixed(1)
    : '0';

  // Filtered tenants list
  const filteredTenants = tenantsList.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'ALL' || t.plan === planFilter;
    return matchesSearch && matchesPlan;
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormName(val);
    if (!selectedTenant) {
      setFormSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const handleOnboard = () => {
    if (!formName || !formSlug) return;
    
    const newTenantId = `tenant-${Date.now()}`;
    addTenant({
      id: newTenantId,
      name: formName,
      slug: formSlug,
      plan: formPlan,
      currency: formCurrency,
      brandingConfig: {
        primary: formPrimaryColor,
        secondary: formSecondaryColor
      },
      email: formEmail || undefined,
      address: formAddress || undefined,
      gstNumber: formGstNumber || undefined,
      authorizedPersons: [],
      bankDetails: {
        accountNo: '',
        beneficiaryName: '',
        bankName: '',
        ifscCode: '',
        swiftCode: '',
        branch: ''
      }
    }, formPassword);

    // Apply selected feature toggles directly
    updateTenant(newTenantId, { features: formFeatures });

    resetForm();
    setIsCreateOpen(false);
  };

  const handleUpdate = () => {
    if (!selectedTenant || !formName || !formSlug) return;

    updateTenant(selectedTenant.id, {
      name: formName,
      slug: formSlug,
      plan: formPlan,
      currency: formCurrency,
      email: formEmail,
      address: formAddress,
      gstNumber: formGstNumber,
      brandingConfig: {
        primary: formPrimaryColor,
        secondary: formSecondaryColor
      },
      features: formFeatures
    });

    setIsDetailOpen(false);
    setSelectedTenant(null);
  };

  const handleDelete = (id: string) => {
    if (tenantsList.length <= 1) {
      alert('Cannot delete the last remaining organization workspace.');
      return;
    }
    if (confirm('Are you sure you want to delete this organization? All associated data and user accounts under this workspace will be deleted.')) {
      deleteTenant(id);
      setIsDetailOpen(false);
      setSelectedTenant(null);
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormPlan('FREE');
    setFormCurrency('USD');
    setFormEmail('');
    setFormAddress('');
    setFormGstNumber('');
    setFormPrimaryColor('#6366f1');
    setFormSecondaryColor('#0f172a');
    setFormFeatures({ ...DEFAULT_FEATURES });
    setFormPassword('password');
  };

  const openDetails = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setFormName(tenant.name);
    setFormSlug(tenant.slug);
    setFormPlan(tenant.plan);
    setFormCurrency(tenant.currency || 'USD');
    setFormEmail(tenant.email || '');
    setFormAddress(tenant.address || '');
    setFormGstNumber(tenant.gstNumber || '');
    setFormPrimaryColor(tenant.brandingConfig.primary);
    setFormSecondaryColor(tenant.brandingConfig.secondary);
    setFormFeatures(tenant.features ? { ...tenant.features } : { ...DEFAULT_FEATURES });
    setIsDetailOpen(true);
  };

  const toggleFeature = (key: keyof TenantFeatures) => {
    setFormFeatures(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      label: 'Workspace / Organization',
      sortable: true,
      render: (row) => {
        const isCurrent = row.id === activeTenant.id;
        return (
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white font-extrabold text-sm shadow-sm"
              style={{ backgroundColor: row.brandingConfig.primary }}
            >
              {row.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-slate-800 dark:text-zinc-200">{row.name}</p>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">/org/{row.slug}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'plan',
      label: 'Service Tier Plan',
      sortable: true,
      render: (row) => (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${PLAN_BADGES[row.plan]}`}>
          {row.plan}
        </span>
      )
    },
    {
      key: 'currency',
      label: 'Billing Spec',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-slate-700 dark:text-zinc-300">{row.currency}</span>
          <span className="text-slate-400 dark:text-zinc-500 ml-1">({getCurrencySymbol(row.currency)})</span>
        </div>
      )
    },
    {
      key: 'features',
      label: 'Enabled Features',
      render: (row) => {
        const activeCount = Object.values(row.features || {}).filter(Boolean).length;
        const totalFeatures = Object.keys(DEFAULT_FEATURES).length;
        return (
          <div className="flex items-center gap-2">
            <div className="w-16 bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full" 
                style={{ 
                  width: `${(activeCount / totalFeatures) * 100}%`,
                  backgroundColor: row.brandingConfig.primary
                }} 
              />
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
              {activeCount}/{totalFeatures}
            </span>
          </div>
        );
      }
    },
    {
      key: 'id',
      label: 'Control Actions',
      render: (row) => {
        const isCurrent = row.id === activeTenant.id;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => openDetails(row)}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Edit properties"
            >
              <Edit size={13} className="text-slate-500 dark:text-zinc-400" />
            </button>
            <button
              onClick={() => setActiveTenant(row.id)}
              disabled={isCurrent}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                isCurrent 
                  ? 'opacity-40 cursor-default bg-zinc-100 dark:bg-zinc-800 border-transparent text-slate-400 dark:text-zinc-500' 
                  : 'bg-zinc-900 text-white dark:bg-white dark:text-black border-transparent hover:scale-105 active:scale-95'
              }`}
            >
              {isCurrent ? 'Activated' : 'Switch Workspace'}
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">SaaS Organizations Directory</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
            Onboard new customer company workspace portals, control plan limitations, and activate feature clearance.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md self-start md:self-auto"
        >
          <Plus size={14} />
          <span>Onboard Company</span>
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Companies"
          value={String(totalCount)}
          icon={<Building2 size={18} />}
          accentColor={activeTenant.brandingConfig.primary}
        />
        <StatCard
          label="SaaS MRR (Revenue)"
          value={`$${currentMRR.toLocaleString()}/mo`}
          change={`+${(totalCount > 1 ? 12.5 * totalCount : 8.4).toFixed(1)}% growth`}
          isPositive={true}
          icon={<BadgeDollarSign size={18} />}
          accentColor="#10b981"
        />
        <StatCard
          label="Enterprise / Business"
          value={`${enterpriseCount} / ${businessCount}`}
          change="Premium Tiers"
          isPositive={true}
          icon={<Wallet size={18} />}
          accentColor="#6366f1"
        />
        <StatCard
          label="Avg Active Features"
          value={`${averageFeatures} features`}
          change="Out of 12 specs"
          isPositive={true}
          icon={<Sliders size={18} />}
          accentColor="#f59e0b"
        />
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search workspaces by name or slug..."
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
        
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plan Filter:</span>
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="rounded-xl px-3 py-2 text-xs font-semibold bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/55 focus:outline-none"
          >
            <option value="ALL">All Plans</option>
            <option value="FREE">FREE</option>
            <option value="STARTUP">STARTUP</option>
            <option value="BUSINESS">BUSINESS</option>
            <option value="ENTERPRISE">ENTERPRISE</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable<Tenant>
        columns={columns}
        data={filteredTenants}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => openDetails(row)}
        emptyMessage="No onboarded companies match the search filters."
      />

      {/* CREATE SLIDE PANEL */}
      <SlidePanel
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Onboard Company Workspace"
        subtitle="Provision a separate B2B workspace tenant sandbox with visual branding colors and feature toggles."
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Account will be immediately provisioned.</span>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleOnboard}
                disabled={!formName || !formSlug}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-40"
              >
                Create Workspace
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Organization Name *</label>
              <input
                type="text"
                value={formName}
                onChange={handleNameChange}
                placeholder="SpaceX Logistics"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Workspace URL Slug *</label>
              <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <span className="bg-zinc-100 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center border-r border-zinc-200 dark:border-zinc-800">
                  /org/
                </span>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                  placeholder="spacex-logistics"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono text-slate-700 dark:text-zinc-300 bg-transparent"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">SaaS Plan Tier</label>
              <select
                value={formPlan}
                onChange={(e) => setFormPlan(e.target.value as any)}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
              >
                {plans.map(plan => (
                  <option key={plan.key} value={plan.key}>{plan.name} ({plan.key})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Billing Currency</label>
              <select
                value={formCurrency}
                onChange={(e) => setFormCurrency(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Billing Contact Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="billing@spacex.com"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Default Admin Password *</label>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="password"
                required
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Corporate Address</label>
              <textarea
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="1 SpaceX Way, Hawthorne, CA 90250"
                rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Tax Reg / GSTIN ID</label>
              <input
                type="text"
                value={formGstNumber}
                onChange={(e) => setFormGstNumber(e.target.value)}
                placeholder="06AAAAA1111A1Z1"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Branding Visual Color Grid */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Visual Workspace Branding Color</label>
            <div className="grid grid-cols-6 gap-3">
              {BRAND_COLORS.map((color) => {
                const isSelected = formPrimaryColor === color.primary;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setFormPrimaryColor(color.primary);
                      setFormSecondaryColor(color.secondary);
                    }}
                    className={`group flex h-10 w-full rounded-xl overflow-hidden relative cursor-pointer hover:scale-105 active:scale-95 transition-all border ${
                      isSelected 
                        ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' 
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                    title={color.name}
                  >
                    <div className="w-1/2 h-full" style={{ backgroundColor: color.primary }} />
                    <div className="w-1/2 h-full" style={{ backgroundColor: color.secondary }} />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                        <Check size={14} className="text-white drop-shadow" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Features Toggle Checklist Grid */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5">
              <Compass size={14} className="text-slate-400" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Feature Access Permissions</label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
              {Object.keys(DEFAULT_FEATURES).map((featKey) => {
                const key = featKey as keyof TenantFeatures;
                const value = formFeatures[key];
                const label = key
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, c => c.toUpperCase());
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFeature(key)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all border border-transparent cursor-pointer"
                  >
                    {value ? (
                      <CheckSquare size={16} className="text-indigo-500 shrink-0" />
                    ) : (
                      <Square size={16} className="text-slate-400 shrink-0" />
                    )}
                    <span className={value ? 'text-slate-800 dark:text-zinc-100 font-bold' : 'text-slate-500 dark:text-zinc-400'}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* DETAIL / EDIT SLIDE PANEL */}
      <SlidePanel
        open={isDetailOpen && !!selectedTenant}
        onClose={() => { setIsDetailOpen(false); setSelectedTenant(null); }}
        title={selectedTenant?.name || ''}
        subtitle="Manage organization workspace settings, features clearance, and metadata details."
        width="max-w-2xl"
        footer={
          selectedTenant && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleDelete(selectedTenant.id)}
                disabled={tenantsList.length <= 1}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-40 disabled:hover:bg-transparent transition-all"
              >
                <Trash2 size={13} />
                <span>Delete Organization</span>
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsDetailOpen(false); setSelectedTenant(null); }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={!formName || !formSlug}
                  className="px-4 py-2 rounded-xl text-white text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-40"
                  style={{ backgroundColor: activeTenant.brandingConfig.primary }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedTenant && (
          <div className="space-y-6">
            {/* Visual Header */}
            <div className="flex items-center gap-4 bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white font-extrabold text-lg shadow-sm animate-pulse"
                style={{ backgroundColor: formPrimaryColor }}
              >
                {formName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-800 dark:text-zinc-200 text-base truncate">{formName}</p>
                <div className="flex items-center gap-1.5 text-xs text-indigo-500 font-semibold mt-0.5">
                  <ShieldCheck size={13} />
                  <span>SaaS Tenant ID: {selectedTenant.id}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Organization Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={handleNameChange}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Workspace URL Slug *</label>
                <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <span className="bg-zinc-100 dark:bg-zinc-950 px-3 py-2.5 text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center border-r border-zinc-200 dark:border-zinc-800">
                    /org/
                  </span>
                  <input
                    type="text"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                    className="flex-1 px-3 py-2 text-sm focus:outline-none font-mono text-slate-700 dark:text-zinc-300 bg-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">SaaS Plan Tier</label>
                <select
                  value={formPlan}
                  onChange={(e) => setFormPlan(e.target.value as any)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
                >
                  {plans.map(plan => (
                    <option key={plan.key} value={plan.key}>{plan.name} ({plan.key})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Billing Currency</label>
                <select
                  value={formCurrency}
                  onChange={(e) => setFormCurrency(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Billing Contact Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Corporate Address</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Tax Reg / GSTIN ID</label>
                <input
                  type="text"
                  value={formGstNumber}
                  onChange={(e) => setFormGstNumber(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Branding Visual Color Grid */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Visual Workspace Branding Color</label>
              <div className="grid grid-cols-6 gap-3">
                {BRAND_COLORS.map((color) => {
                  const isSelected = formPrimaryColor === color.primary;
                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => {
                        setFormPrimaryColor(color.primary);
                        setFormSecondaryColor(color.secondary);
                      }}
                      className={`group flex h-10 w-full rounded-xl overflow-hidden relative cursor-pointer hover:scale-105 active:scale-95 transition-all border ${
                        isSelected 
                          ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' 
                          : 'border-zinc-200 dark:border-zinc-800'
                      }`}
                      title={color.name}
                    >
                      <div className="w-1/2 h-full" style={{ backgroundColor: color.primary }} />
                      <div className="w-1/2 h-full" style={{ backgroundColor: color.secondary }} />
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                          <Check size={14} className="text-white drop-shadow" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Features Toggle Checklist Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-1.5">
                <Compass size={14} className="text-slate-400" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Feature Access Permissions</label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/50">
                {Object.keys(DEFAULT_FEATURES).map((featKey) => {
                  const key = featKey as keyof TenantFeatures;
                  const value = formFeatures[key];
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase());
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleFeature(key)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all border border-transparent cursor-pointer"
                    >
                      {value ? (
                        <CheckSquare size={16} className="text-indigo-500 shrink-0" />
                      ) : (
                        <Square size={16} className="text-slate-400 shrink-0" />
                      )}
                      <span className={value ? 'text-slate-800 dark:text-zinc-100 font-bold' : 'text-slate-500 dark:text-zinc-400'}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subscription & Quota Details Section */}
            <div className="space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40">
              <div className="flex items-center gap-1.5">
                <BadgeDollarSign size={14} className="text-slate-400 animate-pulse" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Subscription & Quota Details</label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/40 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Plan & Pricing</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-800 dark:text-zinc-150">
                      ${selectedPlanData ? selectedPlanData.priceMonthly : 0}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 font-medium">/mo</span>
                    <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      formPlan === 'FREE' ? 'bg-zinc-100 text-slate-650 dark:bg-zinc-800 dark:text-zinc-355' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    }`}>
                      {formPlan}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-455 dark:text-zinc-455 leading-relaxed">
                    {selectedPlanData ? selectedPlanData.description : 'No description available.'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/40 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Quota Limits</p>
                  <ul className="text-[11px] text-slate-600 dark:text-zinc-450 space-y-1 font-semibold">
                    <li>• Custom Fields: <strong className="text-slate-800 dark:text-zinc-200">{selectedPlanData ? (selectedPlanData.maxCustomFields === 999 ? 'Unlimited' : selectedPlanData.maxCustomFields) : 0}</strong></li>
                    <li>• Monthly Exports: <strong className="text-slate-800 dark:text-zinc-200">{selectedPlanData ? (selectedPlanData.maxMonthlyExports === 9999 ? 'Unlimited' : selectedPlanData.maxMonthlyExports) : 0}</strong></li>
                    <li>• AI Tokens/mo: <strong className="text-slate-800 dark:text-zinc-200">{selectedPlanData ? selectedPlanData.maxAiTokens : '0'}</strong></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Workspace Users Section */}
            <div className="space-y-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40">
              <div className="flex items-center gap-1.5">
                <Users size={14} className="text-slate-400" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Workspace Users Directory</label>
              </div>

              {/* List of current company users */}
              <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                {users.filter(u => u.tenantId === selectedTenant.id).map(user => (
                  <div key={user.id} className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/20 bg-zinc-50/50 dark:bg-zinc-950/20 text-xs">
                    <div>
                      <p className="font-bold text-slate-800 dark:text-zinc-200">{user.firstName} {user.lastName}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">{user.email} &bull; <span className="font-semibold text-indigo-500">{user.role}</span></p>
                    </div>
                    {users.filter(u => u.tenantId === selectedTenant.id).length > 1 && (
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="p-1 rounded-md text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Remove user account"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add User Form */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/40 space-y-3">
                <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Provision Workspace User Account</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="First Name"
                    className="rounded-xl px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  />
                  <input
                    type="text"
                    value={newUserLastName}
                    onChange={(e) => setNewUserLastName(e.target.value)}
                    placeholder="Last Name"
                    className="rounded-xl px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="User Email Address"
                    className="rounded-xl px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as any)}
                    className="rounded-xl px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold"
                  >
                    <option value="TENANT_ADMIN">Tenant Admin</option>
                    <option value="FINANCE">Finance Staff</option>
                    <option value="SALES">Sales Executive</option>
                    <option value="OPERATIONS">Operations Staff</option>
                    <option value="VIEWER">Guest Viewer</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Password"
                    className="flex-1 text-xs rounded-xl px-2.5 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      if (!newUserName || !newUserEmail) return;
                      addUser({
                        tenantId: selectedTenant.id,
                        firstName: newUserName,
                        lastName: newUserLastName,
                        email: newUserEmail.trim().toLowerCase(),
                        role: newUserRole,
                        password: newUserPassword
                      });
                      setNewUserName('');
                      setNewUserLastName('');
                      setNewUserEmail('');
                      setNewUserPassword('password');
                    }}
                    disabled={!newUserName || !newUserEmail}
                    className="px-3.5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black font-bold text-xs rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                  >
                    Add User
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
