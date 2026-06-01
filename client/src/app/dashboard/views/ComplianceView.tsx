'use client';

import React, { useState } from 'react';
import { Search, ShieldCheck, RefreshCw, Code } from 'lucide-react';

export default function ComplianceView() {
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);
  const [chainTampered, setChainTampered] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const mockComplianceLogs = [
    { id: 'log-101', timestamp: '2026-05-21 22:42:01', user: 'Rajesh S.', role: 'TENANT_ADMIN', action: 'CREATE_DRAFT_QUOTATION', entity: 'QUOTATION', targetId: 'QT-2026-8801', details: 'Initialized new quotation draft context with customized formula penalty terms.', oldState: null, newState: { quoteNumber: 'QT-2026-8801', subTotal: 1500, taxRate: 18, dynamicValues: { sla_penalty_percentage: 12 }, status: 'DRAFT' }, signature: '992aef3e120d88194cf3e1bcde5e93fa22efbc3488cf41ae092b3bcfe99a0ef1' },
    { id: 'log-102', timestamp: '2026-05-21 22:40:15', user: 'System Worker', role: 'OPERATIONS', action: 'CONVERT_QUOTE_TO_PO', entity: 'PURCHASE_ORDER', targetId: 'PO-2026-8008', details: 'Quotation QT-2026-8801 status updated to CONVERTED. Mapped lines and variables to new purchase order.', oldState: { status: 'APPROVED' }, newState: { poNumber: 'PO-2026-8008', quotationId: 'quote-9942', status: 'OPEN', subTotal: 1500, linesCount: 1, dynamicValues: { priority: 'MEDIUM', lead_time_days: 5 } }, signature: '8c983ef512d77bc341dbe3bc8d8f99e3aef234df56cf41ae092a11bcf22df342' },
    { id: 'log-103', timestamp: '2026-05-21 18:12:44', user: 'Operations Admin', role: 'OPERATIONS', action: 'RECORD_DELIVERY_RECEIPT', entity: 'PURCHASE_ORDER', targetId: 'PO-2026-8008', details: 'Registered partial receipt of ordered items. Line totals compiled successfully.', oldState: { quantityReceived: 0, status: 'OPEN' }, newState: { quantityReceived: 6, quantityOrdered: 10, status: 'PARTIALLY_RECEIVED' }, signature: '7a2bfbc348cf10de99df88acb341fbe12ef34dcd99ffae092b3bcfe981a293ef' },
    { id: 'log-104', timestamp: '2026-05-21 17:05:00', user: 'System Bot', role: 'FINANCE', action: 'SEND_INVOICE', entity: 'INVOICE', targetId: 'INV-2026-9904', details: 'Invoice generated and transmitted to Acme Supplier.', oldState: { status: 'DRAFT' }, newState: { invoiceNumber: 'INV-2026-9904', grandTotal: 14500, status: 'SENT', upiLink: 'upi://pay?pa=payment@antigravity' }, signature: '0e92acfe99bde341ae29bcf88fa99c2d1bce23df881f190e29bcf3fe12ef34ff' },
    { id: 'log-105', timestamp: '2026-05-21 16:30:11', user: 'Rajesh S.', role: 'TENANT_ADMIN', action: 'CREATE_CUSTOM_FIELD', entity: 'QUOTATION', targetId: 'field-warranty', details: 'Added new custom text configuration field with required bounds.', oldState: null, newState: { name: 'warranty_months', label: 'Warranty Period (Months)', type: 'NUMBER', isRequired: true, defaultValue: '12' }, signature: 'cde342df220bde192cf99a8fa88fb23e23bce34df99e1a092b3bcfe192efbcda' }
  ];

  const filteredLogs = mockComplianceLogs.filter(log => {
    if (!searchLogQuery) return true;
    const q = searchLogQuery.toLowerCase();
    return log.action.toLowerCase().includes(q) || log.user.toLowerCase().includes(q) || log.targetId.toLowerCase().includes(q) || log.details.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">SOC2 Audit Trace Ledger</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Cryptographically signed historical logs tracking database state mutations, user access records, and compliance verifications.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${chainTampered ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
            <ShieldCheck size={14} className={chainTampered ? 'animate-bounce' : ''} />
            <span>{chainTampered ? 'Signature Integrity Breach!' : 'Chain Signatures Confirmed'}</span>
          </span>
          <button onClick={() => { setIsRefreshing(true); setTimeout(() => { setIsRefreshing(false); setChainTampered(false); }, 600); }} className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 transition-all cursor-pointer">
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="glass-card rounded-3xl p-4 border border-zinc-200/50 dark:border-zinc-800/40 flex items-center gap-3">
        <Search size={16} className="text-slate-400" />
        <input type="text" placeholder="Search auditing traces by action, email, document numbers, or timestamp details..." value={searchLogQuery} onChange={(e) => setSearchLogQuery(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none border-none placeholder-slate-400 text-slate-700 dark:text-zinc-300" />
      </div>

      {/* TABLE */}
      <div className="glass-card rounded-3xl border border-zinc-200/50 dark:border-zinc-800/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/50 dark:bg-zinc-900/50 text-slate-400 font-bold uppercase tracking-wider border-b border-zinc-200/40 dark:border-zinc-800/30">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Audited Action</th>
                <th className="px-6 py-4">Stakeholder User</th>
                <th className="px-6 py-4">Document target</th>
                <th className="px-6 py-4">Trace Details</th>
                <th className="px-6 py-4 text-center">State Diffs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/40 dark:divide-zinc-800/30 font-medium">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-100/20 dark:hover:bg-zinc-800/10 transition-colors">
                  <td className="px-6 py-4 text-slate-400 font-mono whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-6 py-4"><span className="font-extrabold uppercase tracking-wide text-slate-800 dark:text-zinc-200">{log.action.replace(/_/g, ' ')}</span></td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-bold text-slate-700 dark:text-zinc-300">{log.user}</p>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest leading-none mt-0.5">{log.role}</p>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-indigo-500 dark:text-indigo-400 whitespace-nowrap">{log.targetId}</td>
                  <td className="px-6 py-4 text-slate-500 dark:text-zinc-400 max-w-sm truncate">{log.details}</td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => setSelectedAuditLog(log)} className="px-3 py-1.5 rounded-lg bg-zinc-200/50 dark:bg-zinc-800/60 text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 font-bold transition-all inline-flex items-center gap-1 cursor-pointer">
                      <Code size={12} />
                      <span>Inspect Diffs</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DIFF MODAL */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-3xl rounded-[32px] p-6 max-h-[85vh] overflow-y-auto flex flex-col justify-between border border-zinc-200/60 dark:border-zinc-800/60 animate-in zoom-in-95 duration-200 bg-white/95 dark:bg-zinc-900/95">

            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Cryptographic Trace Inspector</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mt-0.5">{selectedAuditLog.action.replace(/_/g, ' ')} Details</h3>
              </div>
              <button onClick={() => setSelectedAuditLog(null)} className="h-8 w-8 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 text-sm font-bold flex items-center justify-center cursor-pointer">✕</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 text-xs font-semibold text-slate-500 border-b border-zinc-200/50 dark:border-zinc-800/40">
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60">Timestamp</p>
                <p className="text-slate-800 dark:text-zinc-200 font-mono mt-0.5">{selectedAuditLog.timestamp}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60">Audited target</p>
                <p className="text-slate-800 dark:text-zinc-200 font-bold mt-0.5">{selectedAuditLog.entity}: {selectedAuditLog.targetId}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60">IP Address</p>
                <p className="text-slate-800 dark:text-zinc-200 font-mono mt-0.5">127.0.0.1</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider opacity-60">Integrity Signature</p>
                <p className="text-slate-800 dark:text-zinc-200 font-mono mt-0.5 truncate max-w-[120px]">{selectedAuditLog.signature}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-6">
              <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-rose-500 block mb-2">Before (Old State)</span>
                <pre className="text-[10px] font-mono text-rose-800 dark:text-rose-300 leading-relaxed overflow-x-auto max-h-48">
                  {selectedAuditLog.oldState ? JSON.stringify(selectedAuditLog.oldState, null, 2) : '// No preceding state (Insertion action)'}
                </pre>
              </div>
              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 block mb-2">After (New State)</span>
                <pre className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300 leading-relaxed overflow-x-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.newState, null, 2)}
                </pre>
              </div>
            </div>

            <div className="border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
              <span className="text-slate-400">Tampering with JSON databases breaks previous cryptographic hash chain.</span>
              <button onClick={() => { setChainTampered(true); setSelectedAuditLog(null); }} className="px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold hover:bg-rose-500/20 transition-all cursor-pointer text-center">
                ⚠️ Simulate Database Tampering
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
