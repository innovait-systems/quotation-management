'use client';

import React, { useState, useEffect } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useDashboardStore, MetricCard, ActivityLog, PendingAction } from '../../../store/dashboardStore';
import { useDocumentStore } from '../../../store/documentStore';
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

const getMoMChange = (currentList: any[], valueKey: string, dateKey: string) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let currentSum = 0;
  let lastSum = 0;

  currentList.forEach(item => {
    const itemDate = new Date(item[dateKey]);
    if (isNaN(itemDate.getTime())) return;
    
    const m = itemDate.getMonth();
    const y = itemDate.getFullYear();

    if (m === currentMonth && y === currentYear) {
      currentSum += Number(item[valueKey]);
    } else if (m === lastMonth && y === lastMonthYear) {
      lastSum += Number(item[valueKey]);
    }
  });

  if (lastSum === 0) return { change: '—', isPositive: true };
  const diff = ((currentSum - lastSum) / lastSum) * 100;
  const prefix = diff >= 0 ? '+' : '';
  return {
    change: `${prefix}${diff.toFixed(1)}%`,
    isPositive: diff >= 0
  };
};

const getQuotesMoMChange = (quotesList: any[]) => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  let currentCount = 0;
  let lastCount = 0;

  quotesList.forEach(item => {
    if (item.status === 'DRAFT') return;
    const itemDate = new Date(item.createdAt);
    if (isNaN(itemDate.getTime())) return;
    
    const m = itemDate.getMonth();
    const y = itemDate.getFullYear();

    if (m === currentMonth && y === currentYear) {
      currentCount++;
    } else if (m === lastMonth && y === lastMonthYear) {
      lastCount++;
    }
  });

  if (lastCount === 0) return { change: '—', isPositive: true };
  const diff = ((currentCount - lastCount) / lastCount) * 100;
  const prefix = diff >= 0 ? '+' : '';
  return {
    change: `${prefix}${diff.toFixed(1)}%`,
    isPositive: diff >= 0
  };
};

export default function DashboardHubView() {
  const { activeTenant, currentUser } = useTenantStore();
  const { setCurrentTab } = useDashboardStore();
  const { quotes, invoices, orders } = useDocumentStore();

  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [actions, setActions] = useState<PendingAction[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const tenantQuotes = quotes.filter(q => q.tenantId === activeTenant.id);
    const tenantInvoices = invoices.filter(i => i.tenantId === activeTenant.id);
    const tenantOrders = orders.filter(o => o.tenantId === activeTenant.id);
    const resolvedSymbol = getCurrencySymbol(activeTenant.currency);

    const totalInvoiceValue = tenantInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const quotesSentCount = tenantQuotes.filter(q => q.status !== 'DRAFT').length;
    const totalCollected = tenantInvoices.reduce((sum, inv) => sum + (inv.grandTotal - inv.balanceDue), 0);
    const totalPendingCollection = tenantInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

    const invoiceValChange = getMoMChange(tenantInvoices, 'grandTotal', 'issueDate');
    const quotesSentChange = getQuotesMoMChange(tenantQuotes);
    const collectedChange = getMoMChange(tenantInvoices, 'grandTotal', 'issueDate'); 
    const pendingChange = getMoMChange(tenantInvoices, 'balanceDue', 'issueDate');

    const mappedMetrics: MetricCard[] = [
      {
        label: 'Invoice Value',
        value: `${resolvedSymbol}${totalInvoiceValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: invoiceValChange.change === '—' ? '0.0%' : invoiceValChange.change,
        isPositive: invoiceValChange.change === '—' ? true : invoiceValChange.isPositive,
        type: 'currency'
      },
      {
        label: 'Quotes Sent',
        value: `${quotesSentCount} Sent`,
        change: quotesSentChange.change === '—' ? '0.0%' : quotesSentChange.change,
        isPositive: quotesSentChange.change === '—' ? true : quotesSentChange.isPositive,
        type: 'number'
      },
      {
        label: 'Invoiced (Collected)',
        value: `${resolvedSymbol}${totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: collectedChange.change === '—' ? '0.0%' : collectedChange.change,
        isPositive: collectedChange.change === '—' ? true : collectedChange.isPositive,
        type: 'currency'
      },
      {
        label: 'Pending Collection',
        value: `${resolvedSymbol}${totalPendingCollection.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        change: pendingChange.change === '—' ? '0.0%' : pendingChange.change,
        isPositive: pendingChange.change === '—' ? true : pendingChange.isPositive,
        type: 'currency'
      }
    ];

    // Build Activity Logs dynamically
    const dynamicLogs: ActivityLog[] = [];
    
    tenantQuotes.forEach(q => {
      dynamicLogs.push({
        id: `quote-log-create-${q.id}`,
        timestamp: q.createdAt ? q.createdAt.slice(0, 10) : 'Just now',
        user: 'Sales Exec',
        action: `Created Quote ${q.quoteNumber}`,
        impact: `Subtotal: ${resolvedSymbol}${q.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${q.status})`,
        color: 'text-indigo-500'
      });
    });

    tenantInvoices.forEach(i => {
      if (i.status === 'PAID') {
        dynamicLogs.push({
          id: `inv-log-paid-${i.id}`,
          timestamp: i.createdAt ? i.createdAt.slice(0, 10) : 'Just now',
          user: 'Reconciliation Bot',
          action: 'Payment Reconciled',
          impact: `Invoice ${i.invoiceNumber} marked as PAID`,
          color: 'text-emerald-500'
        });
      } else {
        dynamicLogs.push({
          id: `inv-log-sent-${i.id}`,
          timestamp: i.createdAt ? i.createdAt.slice(0, 10) : 'Just now',
          user: 'Finance Staff',
          action: i.status === 'DRAFT' ? 'Created Invoice Draft' : 'Invoice Sent',
          impact: `${i.invoiceNumber} for ${i.customerCompany} (${i.status})`,
          color: 'text-slate-500'
        });
      }
    });

    tenantOrders.forEach(o => {
      dynamicLogs.push({
        id: `po-log-${o.id}`,
        timestamp: o.createdAt ? o.createdAt.slice(0, 10) : 'Just now',
        user: 'Ops Staff',
        action: `Created Purchase Order ${o.poNumber}`,
        impact: `Total: ${resolvedSymbol}${o.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} (${o.status})`,
        color: 'text-amber-500'
      });
    });

    // Fallback if logs are empty (show seeding indicators or system initialization logs)
    if (dynamicLogs.length === 0) {
      dynamicLogs.push({
        id: 'system-init',
        timestamp: 'Init',
        user: 'System Engine',
        action: 'Workspace Provisioned',
        impact: `Cryptographic audit trails and metadata snapshots operational for ${activeTenant.name}`,
        color: 'text-indigo-500'
      });
    }

    const sortedLogs = dynamicLogs
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 5);

    // Build Pending Actions dynamically
    const dynamicActions: PendingAction[] = [];
    
    tenantQuotes.forEach(q => {
      if (q.status === 'DRAFT') {
        dynamicActions.push({
          id: `act-q-draft-${q.id}`,
          type: 'info',
          message: `Quote ${q.quoteNumber} is in draft mode (requires submission)`,
          eta: 'Pending'
        });
      } else if (q.status === 'SUBMITTED') {
        dynamicActions.push({
          id: `act-q-sub-${q.id}`,
          type: 'warning',
          message: `Quote ${q.quoteNumber} is submitted and awaiting client approval`,
          eta: 'Awaiting'
        });
      }
    });

    tenantInvoices.forEach(i => {
      if (i.status === 'DRAFT') {
        dynamicActions.push({
          id: `act-i-draft-${i.id}`,
          type: 'info',
          message: `Invoice draft ${i.invoiceNumber} is ready to be finalized and sent`,
          eta: 'Pending'
        });
      } else if (i.status === 'OVERDUE') {
        dynamicActions.push({
          id: `act-i-over-${i.id}`,
          type: 'warning',
          message: `Invoice ${i.invoiceNumber} for ${i.customerCompany} is overdue`,
          eta: 'Overdue'
        });
      }
    });

    tenantOrders.forEach(o => {
      if (o.status === 'OPEN') {
        dynamicActions.push({
          id: `act-o-open-${o.id}`,
          type: 'warning',
          message: `Purchase Order ${o.poNumber} has pending delivery receipt`,
          eta: 'Open'
        });
      }
    });

    // Fallback if actions are empty
    if (dynamicActions.length === 0) {
      dynamicActions.push({
        id: 'act-clear',
        type: 'success',
        message: 'All procurement and billing workflows are up-to-date!',
        eta: 'Completed'
      });
    }

    setMetrics(mappedMetrics);
    setLogs(sortedLogs);
    setActions(dynamicActions.slice(0, 5));
  }, [activeTenant, quotes, invoices, orders]);

  const handleSimulateTransaction = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      const newId = String(Date.now());
      const now = new Date();
      const resolvedSymbol = getCurrencySymbol(activeTenant.currency);

      if (activeTenant.slug === 'antigravity') {
        // Antigravity Tenant: Simulate PO creation
        const simulatedPO = {
          id: `sim-po-${newId}`,
          poNumber: `PO-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          tenantId: activeTenant.id,
          supplierId: `sim-sup-${newId}`,
          supplierName: 'Operations Admin',
          supplierCompany: 'Cloud Labs Supplier Inc.',
          quotationId: null,
          quotationRef: null,
          status: 'COMPLETED' as const,
          subTotal: 12000,
          taxTotal: 2160,
          grandTotal: 14160,
          currency: resolvedSymbol,
          deliveryTerms: 'Standard PO Receipt',
          lines: [
            { id: `sim-po-line-${newId}`, description: 'Simulated PO Cloud Nodes Fulfillment', quantityOrdered: 4, quantityReceived: 4, unitPrice: 3000, taxRate: 18, total: 14160 }
          ],
          dynamicValues: {},
          createdAt: now.toISOString().slice(0, 10)
        };
        useDocumentStore.getState().addPurchaseOrder(simulatedPO);
      } else if (activeTenant.slug === 'stark') {
        // Stark Tenant: Simulate Quote approval
        const simulatedQuote = {
          id: `sim-q-${newId}`,
          quoteNumber: `QT-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          tenantId: activeTenant.id,
          customerId: `sim-cust-${newId}`,
          customerName: 'Pepper Potts',
          customerCompany: 'Stark Industries',
          validUntil: new Date(now.getTime() + 15 * 86400000).toISOString().slice(0, 10),
          version: 1,
          status: 'APPROVED' as const,
          subTotal: 500000,
          taxTotal: 90000,
          discountTotal: 0,
          grandTotal: 590000,
          currency: resolvedSymbol,
          terms: 'Iron Man Arc Formula recalculated',
          lines: [
            { id: `sim-q-line-${newId}`, description: 'Vibranium Yield SOW Formula Calculation', quantity: 1, unitPrice: 500000, taxRate: 18, discount: 0 }
          ],
          dynamicValues: {},
          revisions: [],
          createdAt: now.toISOString().slice(0, 10)
        };
        useDocumentStore.getState().addQuotation(simulatedQuote);
      } else {
        // Other tenants: Simulate Invoice creation and payment
        const simulatedInvoice = {
          id: `sim-inv-${newId}`,
          invoiceNumber: `INV-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          tenantId: activeTenant.id,
          customerId: `sim-cust-${newId}`,
          customerName: 'Acme Admin',
          customerCompany: 'Acme Corp',
          quotationRef: null,
          issueDate: now.toISOString().slice(0, 10),
          dueDate: new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10),
          status: 'PAID' as const,
          subTotal: 4500,
          taxTotal: 810,
          discountTotal: 0,
          grandTotal: 5310,
          balanceDue: 0,
          currency: resolvedSymbol,
          lines: [
            { id: `sim-inv-line-${newId}`, description: 'Simulated B2B SLA Billing', quantity: 1, unitPrice: 4500, taxRate: 18, discount: 0 }
          ],
          payments: [
            { id: `sim-pay-${newId}`, amount: 5310, method: 'Stripe Reconciled', reference: `TXN-${newId}`, recordedAt: now.toISOString().slice(0, 19).replace('T', ' '), recordedBy: 'System Auto Engine' }
          ],
          dynamicValues: {},
          createdAt: now.toISOString().slice(0, 10)
        };
        useDocumentStore.getState().addInvoice(simulatedInvoice);
      }

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
