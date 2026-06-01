'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = 'No records found',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null || bVal == null) return 0;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 p-12 flex flex-col items-center justify-center text-center">
        <Inbox size={40} className="text-zinc-300 dark:text-zinc-700 mb-4" />
        <p className="text-sm font-semibold text-slate-400 dark:text-zinc-500">{emptyMessage}</p>
        <p className="text-xs text-slate-300 dark:text-zinc-600 mt-1">Records will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-zinc-100/50 dark:bg-zinc-900/50 text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider border-b border-zinc-200/40 dark:border-zinc-800/30">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-6 py-4 ${col.sortable ? 'cursor-pointer select-none hover:text-slate-600 dark:hover:text-zinc-300 transition-colors' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc'
                        ? <ChevronUp size={12} className="text-slate-500" />
                        : <ChevronDown size={12} className="text-slate-500" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800/30 font-medium text-slate-700 dark:text-zinc-300">
            {sortedData.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`transition-colors ${onRowClick ? 'cursor-pointer hover:bg-zinc-100/30 dark:hover:bg-zinc-800/15' : 'hover:bg-zinc-100/20 dark:hover:bg-zinc-800/10'}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4">
                    {col.render ? col.render(row, idx) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
