import { create } from 'zustand';

export type DashboardTab = 'DASHBOARD' | 'QUOTATIONS' | 'PURCHASE_ORDERS' | 'INVOICES' | 'SERVICES' | 'SETTINGS' | 'SUBSCRIPTIONS' | 'AI_COPILOT' | 'COMPLIANCE' | 'TEMPLATES' | 'CUSTOMERS' | 'AGREEMENTS' | 'USERS';

export interface MetricCard {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  type: 'currency' | 'number' | 'percentage';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  impact: string;
  color: string;
}

export interface PendingAction {
  id: string;
  type: 'warning' | 'info' | 'success';
  message: string;
  eta?: string;
}

interface DashboardState {
  currentTab: DashboardTab;
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark';
  setCurrentTab: (tab: DashboardTab) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  getMetrics: (tenantId: string) => MetricCard[];
  getLogs: (tenantId: string) => ActivityLog[];
  getPendingActions: (tenantId: string) => PendingAction[];
}

// Mock dynamic telemetry indexed by Tenant ID
const tenantTelemetry: Record<string, {
  metrics: MetricCard[];
  logs: ActivityLog[];
  actions: PendingAction[];
}> = {
  'tenant-antigravity': {
    metrics: [
      { label: 'Total Revenue', value: '$145,200.00', change: '+12.4%', isPositive: true, type: 'currency' },
      { label: 'SLA Compliance', value: '98.4%', change: '+1.2%', isPositive: true, type: 'percentage' },
      { label: 'Pending Purchase Orders', value: '8 Drafts', change: '-2 active', isPositive: false, type: 'number' },
      { label: 'Outstanding Balance', value: '$12,450.00', change: '-4.5% billing', isPositive: true, type: 'currency' }
    ],
    logs: [
      { id: '1', timestamp: '19:42:01', user: 'Rajesh S.', action: 'Created Quote QT-2026-8801', impact: 'Subtotal: $1,500.00 (+ Dynamic Fields)', color: 'text-indigo-500' },
      { id: '2', timestamp: '19:40:15', user: 'System Worker', action: 'Quotation Converted', impact: 'QT-2026-8801 shifted to PO-2026-8008', color: 'text-emerald-500' },
      { id: '3', timestamp: '18:12:44', user: 'Operations Admin', action: 'Recorded PO Receipt', impact: 'PO-2026-8008 partially received (6 Nodes)', color: 'text-amber-500' },
      { id: '4', timestamp: '17:05:00', user: 'System Bot', action: 'Invoice Auto-Sent', impact: 'INV-2026-9904 sent to client Acme Corp', color: 'text-slate-500' }
    ],
    actions: [
      { id: 'a1', type: 'warning', message: 'Quote QT-2026-8801 is expiring in 2 days (requires admin clearance)', eta: '2d left' },
      { id: 'a2', type: 'info', message: 'Supplier Acme Supply Corp has outstanding shipment receipt pending', eta: 'Today' },
      { id: 'a3', type: 'success', message: 'Invoice INV-2026-9904 fully reconciled (Stripe card matching completed)', eta: 'Just now' }
    ]
  },
  'tenant-acme': {
    metrics: [
      { label: 'Total Revenue', value: '$84,150.00', change: '+8.2%', isPositive: true, type: 'currency' },
      { label: 'SLA Compliance', value: '92.1%', change: '-0.8%', isPositive: false, type: 'percentage' },
      { label: 'Pending Purchase Orders', value: '3 Drafts', change: '+3 active', isPositive: true, type: 'number' },
      { label: 'Outstanding Balance', value: '$8,900.00', change: '+18% unpaid', isPositive: false, type: 'currency' }
    ],
    logs: [
      { id: '1', timestamp: '20:12:00', user: 'Supply Admin', action: 'Created Purchase Order PO-2339', impact: 'Total: $3,200.00 to Acme Partner', color: 'text-indigo-500' },
      { id: '2', timestamp: '18:50:33', user: 'Reconciliation Bot', action: 'Payment Reconciled', impact: 'Invoice INV-9938 marked as PAID', color: 'text-emerald-500' }
    ],
    actions: [
      { id: 'ac1', type: 'warning', message: 'Invoice INV-9941 is overdue by 5 days (Escalation warning sent)', eta: 'Overdue' }
    ]
  },
  'tenant-stark': {
    metrics: [
      { label: 'Total Revenue', value: '€2,450,900.00', change: '+24.6%', isPositive: true, type: 'currency' },
      { label: 'SLA Compliance', value: '99.9%', change: '+0.1%', isPositive: true, type: 'percentage' },
      { label: 'Pending Purchase Orders', value: '45 Drafts', change: 'Supercharged', isPositive: true, type: 'number' },
      { label: 'Outstanding Balance', value: '€45,000.00', change: '-10% MoM', isPositive: true, type: 'currency' }
    ],
    logs: [
      { id: '1', timestamp: '21:11:09', user: 'Jarvis (AI)', action: 'Processed Vibranium Order', impact: 'PO-9908 created for Stark Tower Procurement', color: 'text-sky-500' },
      { id: '2', timestamp: '20:55:00', user: 'Pepper Potts', action: 'Approved High-Value Contract', impact: 'SOW for Shield Defense initialized', color: 'text-emerald-500' }
    ],
    actions: [
      { id: 'st1', type: 'success', message: 'Shield Contract SOW successfully signed and verified with e-Keys', eta: 'Completed' }
    ]
  }
};

export const useDashboardStore = create<DashboardState>((set, get) => ({
  currentTab: 'DASHBOARD',
  sidebarCollapsed: false,
  theme: 'dark',
  setCurrentTab: (tab) => set({ currentTab: tab }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  toggleTheme: () => set((state) => {
    const nextTheme = state.theme === 'light' ? 'dark' : 'light';
    if (typeof window !== 'undefined') {
      localStorage.setItem('quotation-theme-preference', nextTheme);
    }
    return { theme: nextTheme };
  }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('quotation-theme-preference', theme);
    }
    set({ theme });
  },
  getMetrics: (tenantId) => tenantTelemetry[tenantId]?.metrics || [],
  getLogs: (tenantId) => tenantTelemetry[tenantId]?.logs || [],
  getPendingActions: (tenantId) => tenantTelemetry[tenantId]?.actions || []
}));
