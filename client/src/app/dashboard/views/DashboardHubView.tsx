'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useDashboardStore, MetricCard, ActivityLog, PendingAction } from '../../../store/dashboardStore';
import { getCurrencySymbol } from '../../../utils/currency';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  RefreshCw,
  Activity,
  ChevronRight,
} from 'lucide-react';

export default function DashboardHubView() {
  const { activeTenant, currentUser } = useTenantStore();
  const { getMetrics, getLogs, getPendingActions, setCurrentTab } = useDashboardStore();

  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activePlan = activeTenant.plan;

  useEffect(() => {
    // Hide Service SLAs metrics from dashboard metrics list for next phase
    const rawMetrics = getMetrics(activeTenant.id);
    const filteredMetrics = rawMetrics.filter(m => m.label !== 'SLA Compliance');
    const resolvedSymbol = getCurrencySymbol(activeTenant.currency);
    const mappedMetrics = filteredMetrics.map(m => {
      if (m.type === 'currency') {
        const valNum = parseFloat(m.value.replace(/[^0-9.]/g, ''));
        if (!isNaN(valNum)) {
          return {
            ...m,
            value: `${resolvedSymbol}${valNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          };
        }
      }
      return m;
    });
    setMetrics(mappedMetrics);
    setLogs(getLogs(activeTenant.id));
    setActions(getPendingActions(activeTenant.id));
  }, [activeTenant, getMetrics, getLogs, getPendingActions]);

  const handleSimulateTransaction = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newId = String(Date.now());
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      let newLog: ActivityLog;
      let newAction: PendingAction | null = null;
      let valModifier = 0;

      if (activeTenant.slug === 'antigravity') {
        newLog = { id: newId, timestamp: timeStr, user: `${currentUser.firstName} ${currentUser.lastName.charAt(0)}. (You)`, action: 'Record PO Partial Receipt', impact: 'Recorded 4 remaining Cloud nodes on PO-2026-8008 (COMPLETED)', color: 'text-emerald-500' };
        newAction = { id: `act-${newId}`, type: 'success', message: 'Purchase Order PO-2026-8008 successfully closed out!', eta: 'Just now' };
        valModifier = 12000;
      } else if (activeTenant.slug === 'stark') {
        newLog = { id: newId, timestamp: timeStr, user: 'Tony Stark', action: 'Custom Field Recalculated', impact: 'Iron Man Arc core formulas recalculated with 99.9% yield SOW', color: 'text-sky-500' };
        newAction = { id: `act-${newId}`, type: 'info', message: 'SOW formula solved successfully (Clamping variables frozen)', eta: '1s ago' };
        valModifier = 500000;
      } else {
        newLog = { id: newId, timestamp: timeStr, user: 'Acme Admin', action: 'Invoice Created', impact: 'Draft invoice INV-0495 compiled with default SLA templates', color: 'text-rose-500' };
        valModifier = 4500;
      }

      setLogs(prev => [newLog, ...prev.slice(0, 4)]);
      if (newAction) setActions(prev => [newAction!, ...prev]);

      setMetrics(prev => prev.map(m => {
        if (m.label === 'Invoiced (Collected)') {
          const valNum = parseFloat(m.value.replace(/[^0-9.]/g, ''));
          const symbol = getCurrencySymbol(activeTenant.currency);
          const updatedVal = (valNum + valModifier).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return { ...m, value: `${symbol}${updatedVal}`, change: '+15.2% (Recalculated)' };
        }
        return m;
      }));

      setIsRefreshing(false);
    }, 800);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      {/* HEADER GREETING */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 bg-clip-text text-transparent dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-100">
              Welcome Back, {currentUser.firstName}
            </h1>
            <span className="animate-bounce">👋</span>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 mt-1.5 text-sm">
            Here is your operational overview for <span className="font-bold text-slate-800 dark:text-zinc-200">{activeTenant.name}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSimulateTransaction}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-md"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Simulate Live Transaction</span>
          </button>

          {/* Next Phase: AI Design Canvas button hidden
          <button
            onClick={() => setCurrentTab('AI_COPILOT')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-semibold text-sm hover:bg-primary/15 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            style={{
              color: activeTenant.brandingConfig.primary,
              borderColor: `${activeTenant.brandingConfig.primary}20`,
              backgroundColor: `${activeTenant.brandingConfig.primary}10`
            }}
          >
            <Sparkles size={14} />
            <span>AI Design Canvas</span>
          </button>
          */}
        </div>
      </div>

      {/* 4-COLUMN METRIC KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((card, idx) => {
          const TrendIcon = card.isPositive ? TrendingUp : TrendingDown;
          const trendColor = card.isPositive ? 'text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-500 dark:text-rose-400 bg-rose-500/10 border-rose-500/20';

          return (
            <div key={idx} className="glass-card rounded-3xl p-6 relative flex flex-col justify-between group">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">{card.label}</p>
                <p className="text-3xl font-extrabold mt-3.5 tracking-tight text-slate-900 dark:text-zinc-50 group-hover:text-primary transition-colors"
                   style={{ '--color-primary': activeTenant.brandingConfig.primary } as React.CSSProperties}
                >{card.value}</p>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold leading-none ${trendColor}`}>
                  <TrendIcon size={10} />
                  <span>{card.change}</span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* REVENUE CHART & SLA DIAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* REVENUE GRAPH (Expanded to full row for next phase) */}
        <div className="glass-card rounded-3xl p-6 lg:col-span-3 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Analytics Workspace</p>
              <h3 className="text-lg font-bold mt-1 text-slate-800 dark:text-zinc-100">Monthly Operational Revenue</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/50 px-2.5 py-1 rounded-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ backgroundColor: activeTenant.brandingConfig.primary }} />
              <span>Full Analytics unlocked</span>
            </span>
          </div>

          <div className="flex-1 flex items-end justify-between h-48 py-6 gap-2">
            {[45, 60, 52, 70, 85, 65, 95, 80, 110, 90, 125, 145].map((height, i) => {
              const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
              const isLast = i === 11;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full bg-zinc-200/50 dark:bg-zinc-800/20 rounded-t-lg relative overflow-hidden h-36 flex items-end">
                    <div
                      className="w-full rounded-t-lg transition-all duration-700 ease-out origin-bottom group-hover:brightness-110"
                      style={{
                        height: `${height / 1.5}%`,
                        backgroundColor: isLast ? activeTenant.brandingConfig.primary : '#94a3b8'
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase">{months[i]}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-zinc-500 mt-2 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40">
            <p>Calculations enforce strict `Prisma.Decimal` arithmetic standards.</p>
            <a onClick={() => setCurrentTab('INVOICES')} className="font-semibold text-primary hover:underline cursor-pointer" style={{ color: activeTenant.brandingConfig.primary }}>View invoices grid →</a>
          </div>
        </div>

        {/* Next Phase: SLA COMPLIANCE DIAL hidden
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Service SLA Gauge</p>
              <h3 className="text-lg font-bold mt-1 text-slate-800 dark:text-zinc-100">SLA Contract Compliance</h3>
            </div>
            <Clock size={16} className="text-slate-400 dark:text-zinc-500" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
            <svg className="w-36 h-36 shrink-0 transform -rotate-90">
              <circle cx="72" cy="72" r="60" className="stroke-zinc-200 dark:stroke-zinc-800/60" strokeWidth="10" fill="transparent" />
              <circle cx="72" cy="72" r="60" className="stroke-primary transition-all duration-1000 ease-out" strokeWidth="10" fill="transparent" strokeDasharray={376.8} strokeDashoffset={376.8 * (1 - 0.984)} style={{ stroke: activeTenant.brandingConfig.primary }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black tracking-tight text-slate-800 dark:text-zinc-50">98.4%</span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-1.5">SLA Active</span>
            </div>
          </div>

          <div className="text-center text-xs text-slate-400 dark:text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4">
            <p>Target threshold SLA: <span className="font-semibold text-slate-700 dark:text-zinc-300">95.0%</span></p>
            <p className="mt-1">Active Breach Risk: <span className="font-bold text-emerald-500 uppercase tracking-widest text-[10px]">Minimal risk</span></p>
          </div>
        </div>
        */}

      </div>

      {/* PENDING ALERTS & AUDIT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PENDING ALERTS */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Procurement & Workflow Alerts</p>
              <h3 className="text-lg font-bold mt-1 text-slate-800 dark:text-zinc-100">High-Priority Actions Matrix</h3>
            </div>
            <span className="h-5 w-5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-extrabold flex items-center justify-center">
              {actions.length}
            </span>
          </div>

          <div className="flex-1 py-4 space-y-3.5 overflow-y-auto max-h-64">
            {actions.map((act) => {
              const isWarning = act.type === 'warning';
              const isInfo = act.type === 'info';
              const alertBg = isWarning
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300'
                : isInfo
                  ? 'bg-blue-500/10 border-blue-500/20 text-blue-800 dark:text-blue-300'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300';
              const AlertIcon = isWarning ? AlertTriangle : isInfo ? Info : CheckCircle2;

              return (
                <div key={act.id} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${alertBg} animate-in fade-in duration-300`}>
                  <AlertIcon size={16} className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium leading-relaxed">{act.message}</p>
                    {act.eta && (
                      <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60 mt-1">Timeline: {act.eta}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-xs text-slate-400 dark:text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4">
            <p>Triggers evaluated based on dynamic `WorkflowRule` automated parameters.</p>
          </div>
        </div>

        {/* REALTIME AUDIT FEED */}
        <div className="glass-card rounded-3xl p-6 flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">System Trace Feed</p>
              <h3 className="text-lg font-bold mt-1 text-slate-800 dark:text-zinc-100">Live Multi-Tenant Audit Logs</h3>
            </div>
            {/* Next Phase: SOC2 Ledger link hidden */}
            <Activity size={16} className="text-slate-400 dark:text-zinc-500" />
          </div>

          <div className="flex-1 py-4 space-y-4 overflow-y-auto max-h-64">
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4 items-start text-xs animate-in fade-in duration-300">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 shrink-0 font-mono mt-0.5">{log.timestamp}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-slate-800 dark:text-zinc-200 leading-none">{log.action}</p>
                    <span className="text-[9px] font-medium text-slate-400 dark:text-zinc-500 truncate">by {log.user}</span>
                  </div>
                  <p className="text-slate-500 dark:text-zinc-400 mt-1 font-medium">{log.impact}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-400 dark:text-zinc-500 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4">
            <p>Logs correspond strictly to `AuditLog` Postgres database models.</p>
          </div>
        </div>

      </div>

    </div>
  );
}
