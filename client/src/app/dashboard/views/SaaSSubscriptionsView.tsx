'use client';

import React, { useState } from 'react';
import { useTenantStore, SubscriptionPlanItem } from '../../../store/tenantStore';
import { useDashboardStore } from '../../../store/dashboardStore';
import StatCard from '../../../components/ui/StatCard';
import SlidePanel from '../../../components/ui/SlidePanel';
import { 
  Wallet, Plus, Trash2, Edit, Check, AlertTriangle, ShieldCheck, 
  HelpCircle, Landmark, Sliders, CheckSquare, Square, BadgeDollarSign,
  Users, Layers, Sparkles, X, ChevronRight
} from 'lucide-react';

export default function SaaSSubscriptionsView() {
  const { 
    subscriptionPlans, 
    tenantsList, 
    addSubscriptionPlan, 
    updateSubscriptionPlan, 
    deleteSubscriptionPlan 
  } = useTenantStore();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formKey, setFormKey] = useState('');
  const [formPriceMonthly, setFormPriceMonthly] = useState(0);
  const [formPriceAnnually, setFormPriceAnnually] = useState(0);
  const [formMaxFields, setFormMaxFields] = useState(10);
  const [formMaxExports, setFormMaxExports] = useState(50);
  const [formMaxAiTokens, setFormMaxAiTokens] = useState('200k');
  const [formMaxWorkflows, setFormMaxWorkflows] = useState(500);
  const [formDescription, setFormDescription] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');

  // Statistics
  const totalPlans = subscriptionPlans.length;
  const customTiers = subscriptionPlans.filter(p => !['FREE', 'STARTUP', 'BUSINESS', 'ENTERPRISE'].includes(p.key)).length;
  
  // Calculate dynamic MRR by mapping tenants to active plan monthly costs
  const calculateMRR = () => {
    return tenantsList.reduce((sum, tenant) => {
      const matchedPlan = subscriptionPlans.find(p => p.key === tenant.plan);
      return sum + (matchedPlan ? matchedPlan.priceMonthly : 0);
    }, 0);
  };
  const activeMRR = calculateMRR();

  // Count active paying tenants (non-FREE plan)
  const activePayingTenants = tenantsList.filter(t => t.plan !== 'FREE').length;

  const resetForm = () => {
    setFormName('');
    setFormKey('');
    setFormPriceMonthly(0);
    setFormPriceAnnually(0);
    setFormMaxFields(10);
    setFormMaxExports(50);
    setFormMaxAiTokens('200k');
    setFormMaxWorkflows(500);
    setFormDescription('');
    setFormFeaturesText('');
  };

  const handleAddPlan = () => {
    if (!formName || !formKey) return;
    
    addSubscriptionPlan({
      name: formName,
      key: formKey.toUpperCase().replace(/\s+/g, '_'),
      priceMonthly: Number(formPriceMonthly),
      priceAnnually: Number(formPriceAnnually),
      maxCustomFields: Number(formMaxFields),
      maxMonthlyExports: Number(formMaxExports),
      maxAiTokens: formMaxAiTokens,
      maxWorkflowRuns: Number(formMaxWorkflows),
      description: formDescription,
      features: formFeaturesText ? formFeaturesText.split('\n').filter(Boolean) : []
    });

    resetForm();
    setIsCreateOpen(false);
  };

  const openEditPlan = (plan: SubscriptionPlanItem) => {
    setSelectedPlan(plan);
    setFormName(plan.name);
    setFormKey(plan.key);
    setFormPriceMonthly(plan.priceMonthly);
    setFormPriceAnnually(plan.priceAnnually);
    setFormMaxFields(plan.maxCustomFields);
    setFormMaxExports(plan.maxMonthlyExports);
    setFormMaxAiTokens(plan.maxAiTokens);
    setFormMaxWorkflows(plan.maxWorkflowRuns);
    setFormDescription(plan.description);
    setFormFeaturesText(plan.features.join('\n'));
    setIsEditOpen(true);
  };

  const handleUpdatePlan = () => {
    if (!selectedPlan || !formName) return;

    updateSubscriptionPlan(selectedPlan.id, {
      name: formName,
      priceMonthly: Number(formPriceMonthly),
      priceAnnually: Number(formPriceAnnually),
      maxCustomFields: Number(formMaxFields),
      maxMonthlyExports: Number(formMaxExports),
      maxAiTokens: formMaxAiTokens,
      maxWorkflowRuns: Number(formMaxWorkflows),
      description: formDescription,
      features: formFeaturesText ? formFeaturesText.split('\n').filter(Boolean) : []
    });

    setIsEditOpen(false);
    setSelectedPlan(null);
  };

  const handleDeletePlan = (plan: SubscriptionPlanItem) => {
    const activeCount = tenantsList.filter(t => t.plan === plan.key).length;
    if (activeCount > 0) {
      alert(`Cannot delete this subscription plan because it is currently assigned to ${activeCount} active organization workspaces. Reassign them first to delete.`);
      return;
    }
    
    if (confirm(`Are you sure you want to delete the plan tier "${plan.name}"? This action cannot be undone.`)) {
      deleteSubscriptionPlan(plan.id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">SaaS Subscriptions Pricing console</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
            Define subscription tiers, control operational limits, and set pricing models for client organization workspaces.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setIsCreateOpen(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md self-start md:self-auto"
        >
          <Plus size={14} />
          <span>Create Subscription Tier</span>
        </button>
      </div>

      {/* STATISTICS METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Plan Tiers"
          value={String(totalPlans)}
          icon={<Layers size={18} />}
          accentColor="#6366f1"
        />
        <StatCard
          label="Active MRR (Revenue)"
          value={`$${activeMRR.toLocaleString()}/mo`}
          icon={<BadgeDollarSign size={18} />}
          accentColor="#10b981"
        />
        <StatCard
          label="Active Paying Orgs"
          value={`${activePayingTenants} of ${tenantsList.length}`}
          change="Non-Free accounts"
          isPositive={true}
          icon={<Users size={18} />}
          accentColor="#3b82f6"
        />
        <StatCard
          label="Custom Tier Packages"
          value={String(customTiers)}
          change="Added dynamically"
          isPositive={true}
          icon={<Sparkles size={18} />}
          accentColor="#f59e0b"
        />
      </div>

      {/* PRICING PLANS GRID */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-6">Active Subscription Tiers List</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subscriptionPlans.map((plan) => {
            const isSystemDefault = ['FREE', 'STARTUP', 'BUSINESS', 'ENTERPRISE'].includes(plan.key);
            const assignedCount = tenantsList.filter(t => t.plan === plan.key).length;
            
            return (
              <div 
                key={plan.id}
                className="glass-card rounded-[32px] p-6 border border-zinc-200/50 dark:border-zinc-800/40 bg-white dark:bg-zinc-900/60 shadow-sm flex flex-col justify-between min-h-[440px] relative overflow-hidden"
              >
                {/* Visual Header */}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                      {plan.key}
                    </span>
                    {assignedCount > 0 && (
                      <span className="text-[9px] font-bold text-slate-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Users size={10} />
                        {assignedCount} {assignedCount === 1 ? 'Org' : 'Orgs'}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-zinc-50 mt-3">{plan.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 line-clamp-2 min-h-[32px]">{plan.description || 'No description provided.'}</p>
                  
                  <div className="mt-4 pt-4 border-t border-zinc-200/30 dark:border-zinc-800/20 flex justify-between items-baseline">
                    <div>
                      <span className="text-2xl font-black text-slate-900 dark:text-zinc-50">${plan.priceMonthly}</span>
                      <span className="text-xs text-slate-400"> /mo</span>
                    </div>
                    <div className="text-right text-[10px] text-emerald-500 font-bold">
                      ${plan.priceAnnually}/mo annually
                    </div>
                  </div>

                  {/* Quota Limits summary */}
                  <div className="mt-5 space-y-2.5 p-3 rounded-2xl bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200/40 dark:border-zinc-800/10 text-xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-450 dark:text-zinc-550">Quota Boundaries</p>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-zinc-400">
                      <div>Fields: <strong className="text-slate-950 dark:text-zinc-100">{plan.maxCustomFields === 999 ? 'Unlimited' : plan.maxCustomFields}</strong></div>
                      <div>Exports: <strong className="text-slate-950 dark:text-zinc-100">{plan.maxMonthlyExports === 9999 ? 'Unlimited' : plan.maxMonthlyExports}</strong></div>
                      <div>AI: <strong className="text-slate-950 dark:text-zinc-100">{plan.maxAiTokens}</strong></div>
                      <div>Workflows: <strong className="text-slate-950 dark:text-zinc-100">{plan.maxWorkflowRuns === 99999 ? 'Unlimited' : plan.maxWorkflowRuns}</strong></div>
                    </div>
                  </div>

                  {/* Features List */}
                  <ul className="text-xs text-slate-500 dark:text-zinc-400 mt-5 space-y-1.5 pr-1 max-h-[100px] overflow-y-auto">
                    {plan.features.map((feat, index) => (
                      <li key={index} className="flex items-center gap-1.5">
                        <Check size={11} className="text-emerald-500 shrink-0" />
                        <span className="truncate">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Operations */}
                <div className="mt-8 pt-4 border-t border-zinc-200/30 dark:border-zinc-800/20 flex gap-2">
                  <button
                    onClick={() => openEditPlan(plan)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer"
                  >
                    <Edit size={12} />
                    <span>Edit Tier</span>
                  </button>
                  <button
                    onClick={() => handleDeletePlan(plan)}
                    disabled={assignedCount > 0}
                    className={`p-2 rounded-xl border transition-all ${
                      assignedCount > 0 
                        ? 'border-transparent bg-zinc-100 dark:bg-zinc-800/30 text-slate-400 dark:text-zinc-650 cursor-not-allowed opacity-40'
                        : 'border-rose-500/20 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer'
                    }`}
                    title={assignedCount > 0 ? "Cannot delete plan with active users" : "Delete plan tier"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CREATE SLIDE PANEL */}
      <SlidePanel
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Subscription Plan"
        subtitle="Establish a new pricing tier with specific limits and features for organizations."
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">New plan will be dynamically active.</span>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlan}
                disabled={!formName || !formKey}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-40"
              >
                Create Plan
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Plan Name *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Enterprise Pro Plus"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Plan Key / Code *</label>
              <input
                type="text"
                value={formKey}
                onChange={(e) => setFormKey(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                placeholder="ENTERPRISE_PRO"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary font-mono text-slate-700 dark:text-zinc-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Monthly Pricing ($) *</label>
              <input
                type="number"
                value={formPriceMonthly}
                onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Annual Pricing ($) *</label>
              <input
                type="number"
                value={formPriceAnnually}
                onChange={(e) => setFormPriceAnnually(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max Custom Fields *</label>
              <input
                type="number"
                value={formMaxFields}
                onChange={(e) => setFormMaxFields(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max Monthly Exports *</label>
              <input
                type="number"
                value={formMaxExports}
                onChange={(e) => setFormMaxExports(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max AI Tokens *</label>
              <input
                type="text"
                value={formMaxAiTokens}
                onChange={(e) => setFormMaxAiTokens(e.target.value)}
                placeholder="200k"
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max Workflows *</label>
              <input
                type="number"
                value={formMaxWorkflows}
                onChange={(e) => setFormMaxWorkflows(Number(e.target.value))}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Describe what is unique about this plan tier..."
              rows={2}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Bullet-point Features (one per line)</label>
              <span className="text-[10px] text-slate-400">Press enter for each new feature</span>
            </div>
            <textarea
              value={formFeaturesText}
              onChange={(e) => setFormFeaturesText(e.target.value)}
              placeholder="Custom PDF exporter&#10;Unlimited document lines&#10;Priority support SLA"
              rows={4}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono text-xs"
            />
          </div>
        </div>
      </SlidePanel>

      {/* EDIT SLIDE PANEL */}
      <SlidePanel
        open={isEditOpen && !!selectedPlan}
        onClose={() => { setIsEditOpen(false); setSelectedPlan(null); }}
        title={`Edit Plan: ${selectedPlan?.name}`}
        subtitle="Modify settings and limits for the selected subscription tier."
        footer={
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">All updates will apply to subscribers immediately.</span>
            <div className="flex gap-3">
              <button
                onClick={() => { setIsEditOpen(false); setSelectedPlan(null); }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdatePlan}
                disabled={!formName}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold hover:scale-[1.02] active:scale-98 transition-all disabled:opacity-40"
                style={{ backgroundColor: '#6366f1' }}
              >
                Save Changes
              </button>
            </div>
          </div>
        }
      >
        {selectedPlan && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Plan Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 font-mono">Plan Key / Code (Immutable)</label>
                <input
                  type="text"
                  disabled
                  value={formKey}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-zinc-100 dark:bg-zinc-800/40 border border-zinc-250/20 text-slate-400 dark:text-zinc-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Monthly Pricing ($) *</label>
                <input
                  type="number"
                  value={formPriceMonthly}
                  onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Annual Pricing ($) *</label>
                <input
                  type="number"
                  value={formPriceAnnually}
                  onChange={(e) => setFormPriceAnnually(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max Custom Fields *</label>
                <input
                  type="number"
                  value={formMaxFields}
                  onChange={(e) => setFormMaxFields(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max Monthly Exports *</label>
                <input
                  type="number"
                  value={formMaxExports}
                  onChange={(e) => setFormMaxExports(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max AI Tokens *</label>
                <input
                  type="text"
                  value={formMaxAiTokens}
                  onChange={(e) => setFormMaxAiTokens(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Max Workflows *</label>
                <input
                  type="number"
                  value={formMaxWorkflows}
                  onChange={(e) => setFormMaxWorkflows(Number(e.target.value))}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Description</label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Bullet-point Features (one per line)</label>
                <span className="text-[10px] text-slate-400">Press enter for each new feature</span>
              </div>
              <textarea
                value={formFeaturesText}
                onChange={(e) => setFormFeaturesText(e.target.value)}
                rows={4}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono text-xs"
              />
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
