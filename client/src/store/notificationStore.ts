import { create } from 'zustand';

export interface Notification {
  id: string;
  tenantId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  module: 'QUOTATIONS' | 'INVOICES' | 'PURCHASE_ORDERS' | 'SERVICES' | 'SYSTEM' | 'USERS';
  isRead: boolean;
  createdAt: string; // ISO string
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (
    title: string,
    message: string,
    type: Notification['type'],
    module: Notification['module'],
    tenantId: string
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: (tenantId: string) => void;
  clearAll: (tenantId: string) => void;
  deleteNotification: (id: string) => void;
}

const initialSeedNotifications: Notification[] = [
  // InnovaIT Systems default seed notifications
  {
    id: 'seed-inv-1',
    tenantId: 'tenant-innovait',
    title: 'Invoice Auto-Sent',
    message: 'Invoice INV-2026-9904 sent to client Acme Corp.',
    type: 'success',
    module: 'INVOICES',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
  },
  {
    id: 'seed-q-1',
    tenantId: 'tenant-innovait',
    title: 'Quotation Expiring',
    message: 'Quote QT-2026-8801 is expiring in 2 days (requires admin clearance).',
    type: 'warning',
    module: 'QUOTATIONS',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: 'seed-sys-1',
    tenantId: 'global-saas',
    title: 'Security Alert',
    message: 'System administration access key successfully verified.',
    type: 'info',
    module: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
  },
  {
    id: 'seed-u-1',
    tenantId: 'tenant-innovait',
    title: 'Team Directory Updated',
    message: 'New team member Company Admin added to database.',
    type: 'success',
    module: 'USERS',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },

  // SpaceX Cloud Labs default seed notifications
  {
    id: 'seed-spacex-po-1',
    tenantId: 'tenant-spacex',
    title: 'Vibranium Shipment',
    message: 'Purchase Order PO-2339 created successfully for Acme Partner.',
    type: 'success',
    module: 'PURCHASE_ORDERS',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
  },
  {
    id: 'seed-spacex-inv-1',
    tenantId: 'tenant-spacex',
    title: 'Payment Reconciled',
    message: 'Invoice INV-9938 marked as PAID (Stripe webhook received).',
    type: 'success',
    module: 'INVOICES',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4 hours ago
  },

  // Wayne Enterprises default seed notifications
  {
    id: 'seed-wayne-sys-1',
    tenantId: 'tenant-wayne',
    title: 'e-Keys Verified',
    message: 'High-Value SOW successfully signed and cryptographically verified with e-Keys.',
    type: 'success',
    module: 'SYSTEM',
    isRead: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: 'seed-wayne-audit-1',
    tenantId: 'tenant-wayne',
    title: 'SOC2 Audit Ledger',
    message: 'SOC2 compliance check completed successfully (0 warnings detected).',
    type: 'info',
    module: 'SYSTEM',
    isRead: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
  }
];

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: initialSeedNotifications,

  addNotification: (title, message, type, module, tenantId) =>
    set((state) => ({
      notifications: [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tenantId,
          title,
          message,
          type,
          module,
          isRead: false,
          createdAt: new Date().toISOString(),
        },
        ...state.notifications,
      ],
    })),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    })),

  markAllAsRead: (tenantId) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.tenantId === tenantId ? { ...n, isRead: true } : n
      ),
    })),

  clearAll: (tenantId) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.tenantId !== tenantId),
    })),

  deleteNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),
}));
