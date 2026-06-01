'use client';

import React from 'react';

type EntityType = 'QUOTATION' | 'PURCHASE_ORDER' | 'INVOICE' | 'SERVICE';

const statusColors: Record<string, string> = {
  // Quotation statuses
  DRAFT: 'bg-zinc-200/60 text-zinc-600 border-zinc-300/40 dark:bg-zinc-800/60 dark:text-zinc-400 dark:border-zinc-700/40',
  SUBMITTED: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  APPROVED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  REJECTED: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
  EXPIRED: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400',
  CONVERTED: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400',
  CLOSED: 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20 dark:text-zinc-400',

  // PO statuses
  OPEN: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400',
  PARTIALLY_RECEIVED: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  CANCELLED: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:text-rose-400',

  // Invoice statuses
  SENT: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  PAID: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
  PARTIALLY_PAID: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  OVERDUE: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',

  // Service statuses
  IN_PROGRESS: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400',
  PENDING_CLIENT: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  BREACHED: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400',
};

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors['DRAFT'];
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-0.5 text-[10px]'
    : 'px-3 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full border font-extrabold tracking-wide uppercase ${colors} ${sizeClasses}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
