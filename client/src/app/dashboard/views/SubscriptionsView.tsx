'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { Check, AlertTriangle, Wallet, Zap, ArrowUpRight, Receipt, CalendarClock } from 'lucide-react';
import { useDashboardStore, ActivityLog } from '../../../store/dashboardStore';

export default function SubscriptionsView() {
  const { activeTenant } = useTenantStore();
  const { setCurrentTab } = useDashboardStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const activePlan = activeTenant.plan;

  const handleUpgradePlan = (plan: 'FREE' | 'STARTUP' | 'BUSINESS' | 'ENTERPRISE') => {
    activeTenant.plan = plan;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const newLog: ActivityLog = {
      id: String(Date.now()),
      timestamp: timeStr,
      user: 'Rajesh S. (Admin)',
      action: 'Upgrade Plan Tier',
      impact: `Subscription plan upgraded to ${plan} tier (Quota limits reset)`,
      color: 'text-indigo-500'
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const limits = activePlan === 'FREE' ? { fields: 5, exports: 10, ai: '50k', runs: 100 }
    : activePlan === 'STARTUP' ? { fields: 15, exports: 50, ai: '200k', runs: 500 }
    : activePlan === 'BUSINESS' ? { fields: 50, exports: 250, ai: '1M', runs: 2500 }
    : { fields: 999, exports: 9999, ai: '100M', runs: 99999 };

  const usage = { fields: 4, exports: 6, ai: '12k', runs: 42 };

  const mockBillingHistory = [
    { id: 'bil-1', date: '2026-05-01', description: 'Enterprise Plan — Monthly', amount: '$499.00', status: 'Paid' },
    { id: 'bil-2', date: '2026-04-01', description: 'Enterprise Plan — Monthly', amount: '$499.00', status: 'Paid' },
    { id: 'bil-3', date: '2026-03-01', description: 'Business Plan — Monthly', amount: '$199.00', status: 'Paid' },
    { id: 'bil-4', date: '2026-02-01', description: 'Business Plan — Monthly', amount: '$199.00', status: 'Paid' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Subscriptions & Billing</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Manage your SaaS subscription tier, monitor API quota consumption, and review billing history.</p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}
          >Monthly</button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-white dark:bg-zinc-800 shadow-sm text-slate-900 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'}`}
          >
            Annual
            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Save 20%</span>
          </button>
        </div>
      </div>

      {/* CURRENT PLAN BANNER */}
      <div
        className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 relative overflow-hidden"
        style={{ borderLeft: `4px solid ${activeTenant.brandingConfig.primary}` }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white font-bold"
              style={{ backgroundColor: activeTenant.brandingConfig.primary }}
            >
              <Zap size={20} />
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Current Active Plan</p>
              <p className="text-xl font-extrabold text-slate-900 dark:text-zinc-50 mt-0.5">{activePlan} Tier</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5">Billing cycle: {billingCycle === 'monthly' ? 'Monthly' : 'Annual (20% off)'} • Next renewal: June 1, 2026</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-slate-900 dark:text-zinc-50">
              {activePlan === 'FREE' ? '$0' : activePlan === 'STARTUP' ? (billingCycle === 'monthly' ? '$49' : '$39') : activePlan === 'BUSINESS' ? (billingCycle === 'monthly' ? '$199' : '$159') : (billingCycle === 'monthly' ? '$499' : '$399')}
              <span className="text-xs font-semibold text-slate-400">/mo</span>
            </p>
            {billingCycle === 'annual' && activePlan !== 'FREE' && (
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Saving 20% with annual billing</p>
            )}
          </div>
        </div>
      </div>

      {/* ACTIVE METERING METRICS */}
      <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-6">Active Resource Quota Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-zinc-400">Custom Fields</span>
              <span className="text-slate-800 dark:text-zinc-200">{usage.fields} / {activePlan === 'ENTERPRISE' ? '∞' : limits.fields}</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (usage.fields / limits.fields) * 100)}%`, backgroundColor: activeTenant.brandingConfig.primary }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Dynamic variables allowed on documents.</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-zinc-400">PDF/Excel Exports</span>
              <span className="text-slate-800 dark:text-zinc-200">{usage.exports} / {limits.exports}</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(usage.exports / limits.exports) * 100}%`, backgroundColor: activeTenant.brandingConfig.primary }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Monthly generated spreadsheet/prints.</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-zinc-400">AI Prompt Tokens</span>
              <span className="text-slate-800 dark:text-zinc-200">{usage.ai} / {limits.ai}</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-indigo-500" style={{ width: '24%' }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Tokens consumed in AI copilot workspace.</span>
          </div>

          <div>
            <div className="flex justify-between text-xs font-bold mb-2">
              <span className="text-slate-600 dark:text-zinc-400">Workflow Automations</span>
              <span className="text-slate-800 dark:text-zinc-200">{usage.runs} / {limits.runs}</span>
            </div>
            <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-emerald-500" style={{ width: '42%' }} />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Event automation script runs.</span>
          </div>

        </div>
      </div>

      {/* PRICING PLANS */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-6">Select Subscription Tier Plan</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          {([
            { key: 'FREE' as const, label: 'Starter Sandbox', tag: 'Free Baseline', tagColor: 'text-slate-400', price: '$0', annualPrice: '$0', border: 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500/20', activeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', features: ['Max 5 custom fields', '10 PDF monthly exports', 'Default brand presets'], warn: 'No AI template parsing' },
            { key: 'STARTUP' as const, label: 'Growth Startup', tag: 'Popular', tagColor: 'text-rose-500', price: '$49', annualPrice: '$39', border: 'border-rose-500 bg-rose-500/5 ring-1 ring-rose-500/20', activeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', features: ['Max 15 custom fields', '50 PDF/Excel exports', 'Custom branding layout', '200k monthly AI tokens'] },
            { key: 'BUSINESS' as const, label: 'Enterprise Lite', tag: 'Scale', tagColor: 'text-amber-500', price: '$199', annualPrice: '$159', border: 'border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20', activeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', features: ['Max 50 custom fields', '250 exports / formulas', 'Automated custom rules', '1M monthly AI tokens'] },
            { key: 'ENTERPRISE' as const, label: 'Unlimited Corp', tag: 'Unrestricted', tagColor: 'text-emerald-500', price: '$499', annualPrice: '$399', border: 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20', activeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', features: ['Unlimited custom properties', 'Unlimited PDF / Excel reports', 'Cryptographic SOC2 Audits', '100M custom AI tokens'] },
          ]).map(plan => (
            <div key={plan.key} className={`glass-card rounded-3xl p-6 border flex flex-col justify-between min-h-[380px] relative ${activePlan === plan.key ? plan.border : 'border-zinc-200/50 dark:border-zinc-800/40'}`}>
              <div>
                <span className={`text-[10px] font-extrabold uppercase tracking-widest ${plan.tagColor}`}>{plan.tag}</span>
                <h4 className="text-xl font-bold mt-1.5 text-slate-800 dark:text-zinc-100">{plan.label}</h4>
                <p className="text-3xl font-black mt-4 text-slate-900 dark:text-zinc-50">
                  {billingCycle === 'monthly' ? plan.price : plan.annualPrice}
                  <span className="text-xs font-semibold text-slate-400">/mo</span>
                </p>
                {billingCycle === 'annual' && plan.key !== 'FREE' && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1">Billed annually ({plan.annualPrice === '$39' ? '$468' : plan.annualPrice === '$159' ? '$1,908' : '$4,788'}/yr)</p>
                )}
                <ul className="text-xs space-y-2.5 text-slate-500 dark:text-zinc-400 mt-6">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2"><Check size={12} className="text-emerald-500" />{f}</li>
                  ))}
                  {plan.warn && (
                    <li className="flex items-center gap-2 text-rose-500"><AlertTriangle size={12} />{plan.warn}</li>
                  )}
                </ul>
              </div>
              <button
                onClick={() => handleUpgradePlan(plan.key)}
                disabled={activePlan === plan.key}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all mt-8 ${activePlan === plan.key ? plan.activeBg : 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-[1.02]'}`}
              >
                {activePlan === plan.key ? 'Active Plan' : 'Select Plan'}
              </button>
            </div>
          ))}

        </div>
      </div>

      {/* BILLING HISTORY */}
      <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40">
        <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-slate-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Billing History</h3>
          </div>
          <button className="text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors flex items-center gap-1">
            Download All <ArrowUpRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {mockBillingHistory.map(bill => (
            <div key={bill.id} className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center">
                  <CalendarClock size={14} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">{bill.description}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{bill.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">{bill.amount}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{bill.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UPGRADE ACTIVITY LOG */}
      {logs.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4">Plan Change Activity</h3>
          <div className="space-y-3">
            {logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 text-xs">
                <span className="font-mono text-slate-400 shrink-0 mt-0.5">{log.timestamp}</span>
                <div>
                  <p className="font-bold text-slate-700 dark:text-zinc-300">{log.action}</p>
                  <p className="text-slate-400 mt-0.5">{log.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
