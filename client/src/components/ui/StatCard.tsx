'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  accentColor?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, change, isPositive = true, accentColor, icon }: StatCardProps) {
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;
  const trendColor = isPositive
    ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    : 'text-rose-500 bg-rose-500/10 border-rose-500/20';

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between group relative overflow-hidden min-h-[130px]">
      {/* Accent top bar */}
      {accentColor && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 opacity-60"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
          {label}
        </p>
        {icon && (
          <div className="text-slate-300 dark:text-zinc-700 group-hover:text-slate-400 dark:group-hover:text-zinc-600 transition-colors">
            {icon}
          </div>
        )}
      </div>

      <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 mt-2">
        {value}
      </p>

      {change && (
        <div className="flex items-center gap-2 mt-3">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold leading-none ${trendColor}`}>
            <TrendIcon size={10} />
            <span>{change}</span>
          </span>
        </div>
      )}
    </div>
  );
}
