'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { useCustomersStore } from '../../../store/customersStore';
import { useAgreementsStore, Agreement, AgreementVersion } from '../../../store/agreementsStore';
import DataTable, { Column } from '../../../components/ui/DataTable';
import SlidePanel from '../../../components/ui/SlidePanel';
import StatusBadge from '../../../components/ui/StatusBadge';
import StatCard from '../../../components/ui/StatCard';
import {
  Files, Plus, Search, UploadCloud, History, Download, Trash2,
  Calendar, CheckCircle2, AlertCircle, Clock, Info, ShieldAlert,
  FileCheck, FileText, FileSpreadsheet, RefreshCw
} from 'lucide-react';

const uploadedBlobsCache: Record<string, Blob> = {};

export default function AgreementsView() {
  const { activeTenant } = useTenantStore();
  const { getCustomersForTenant } = useCustomersStore();
  const {
    getAgreementsForTenant,
    addAgreement,
    addDocumentVersion,
    updateAgreementStatus,
    deleteAgreement
  } = useAgreementsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [docTypeFilter, setDocTypeFilter] = useState('ALL');
  const [selectedAgr, setSelectedAgr] = useState<Agreement | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Forms state for Create Agreement
  const [newTitle, setNewTitle] = useState('');
  const [newCustId, setNewCustId] = useState('');
  const [newDocType, setNewDocType] = useState<Agreement['documentType']>('Agreement');
  const [newDesc, setNewDesc] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('v1.0.0');
  const [newVersionNotes, setNewVersionNotes] = useState('Initial uploaded master release.');

  // Mock Upload state for Create Agreement
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileSize, setUploadedFileSize] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Forms state for Add Version
  const [newVerLabel, setNewVerLabel] = useState('');
  const [newVerNotes, setNewVerNotes] = useState('');
  const [isUploadingVer, setIsUploadingVer] = useState(false);
  const [uploadVerProgress, setUploadVerProgress] = useState(0);
  const [uploadedVerFileName, setUploadedVerFileName] = useState('');
  const [uploadedVerFileSize, setUploadedVerFileSize] = useState('');
  const [uploadedVerFile, setUploadedVerFile] = useState<File | null>(null);
  const fileVerInputRef = useRef<HTMLInputElement>(null);

  const tenantCustomers = getCustomersForTenant(activeTenant.id);
  const tenantAgreements = getAgreementsForTenant(activeTenant.id);

  // Apply search query and filters
  const filteredAgreements = tenantAgreements.filter((agr) => {
    const matchesSearch =
      agr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agr.customerCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agr.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = docTypeFilter === 'ALL' || agr.documentType === docTypeFilter;
    return matchesSearch && matchesType;
  });

  // Telemetry KPIs
  const stats = {
    total: tenantAgreements.length,
    active: tenantAgreements.filter(a => a.status === 'ACTIVE').length,
    drafts: tenantAgreements.filter(a => a.status === 'DRAFT').length,
    totalVersions: tenantAgreements.reduce((sum, a) => sum + a.versions.length, 0)
  };

  const getDocIcon = (type: Agreement['documentType']) => {
    switch (type) {
      case 'SLA Contract': return <ShieldAlert className="text-indigo-500" size={16} />;
      case 'SOW Draft': return <FileSpreadsheet className="text-amber-500" size={16} />;
      case 'Tax Invoice': return <FileCheck className="text-emerald-500" size={16} />;
      default: return <FileText className="text-slate-400" size={16} />;
    }
  };

  const handleDownloadFile = (fileName: string, title: string, versionLabel: string) => {
    let blob = uploadedBlobsCache[fileName];

    if (!blob) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') {
        const pdfString = 
          `%PDF-1.4\n` +
          `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
          `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
          `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n` +
          `4 0 obj\n<< /Length 250 >>\nstream\n` +
          `BT\n/F1 14 Tf\n72 750 Td\n(Agreement / Document Download) Tj\n0 -24 Td\n/F1 12 Tf\n(Document Title: ${title}) Tj\n0 -18 Td\n(Version: ${versionLabel}) Tj\n0 -18 Td\n(Original File: ${fileName}) Tj\n0 -36 Td\n(This is a downloaded document for the active workspace.) Tj\nET\nendstream\nendobj\n` +
          `xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000212 00000 n\n` +
          `trailer\n<< /Size 5 /Root 1 0 R >>\n` +
          `startxref\n360\n` +
          `%%EOF`;
        blob = new Blob([pdfString], { type: 'application/pdf' });
      } else {
        const content = `Agreement/Document Download File: ${fileName}\n` +
          `Title: ${title}\n` +
          `Version: ${versionLabel}\n` +
          `Generated At: ${new Date().toLocaleString()}\n\n` +
          `This is a downloaded document for the active workspace.`;
        blob = new Blob([content], { type: 'application/octet-stream' });
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Columns for the Agreements Table
  const columns: Column<Agreement>[] = [
    {
      key: 'title',
      label: 'Document Title',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {getDocIcon(row.documentType)}
          <span className="font-bold text-slate-800 dark:text-zinc-200">{row.title}</span>
        </div>
      )
    },
    {
      key: 'documentType',
      label: 'Category',
      sortable: true,
      render: (row) => (
        <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full border border-zinc-200/50 dark:border-zinc-800/40">
          {row.documentType}
        </span>
      )
    },
    {
      key: 'customerCompany',
      label: 'Associated Customer',
      sortable: true,
      render: (row) => (
        <div>
          <p className="font-bold text-slate-700 dark:text-zinc-300">{row.customerCompany}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{row.customerName}</p>
        </div>
      )
    },
    {
      key: 'versions',
      label: 'Active Version',
      render: (row) => {
        const activeVer = row.versions[row.versions.length - 1];
        return (
          <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
            <History size={12} />
            <span>{activeVer?.versionLabel || 'N/A'}</span>
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => {
        const activeVer = row.versions[row.versions.length - 1];
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (activeVer) {
                handleDownloadFile(activeVer.fileName, row.title, activeVer.versionLabel);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-indigo-600 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all text-xs font-bold cursor-pointer"
          >
            <Download size={12} />
            <span>Download</span>
          </button>
        );
      }
    }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isNewDoc: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const chosenName = file.name;
    const chosenSize = `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    if (isNewDoc) {
      setUploadedFile(file);
      setUploadedFileName(chosenName);
      setUploadedFileSize(chosenSize);
      setIsUploading(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploading(false);
            return 100;
          }
          return prev + 20;
        });
      }, 150);
    } else {
      setUploadedVerFile(file);
      setUploadedVerFileName(chosenName);
      setUploadedVerFileSize(chosenSize);
      setIsUploadingVer(true);
      setUploadVerProgress(0);

      const interval = setInterval(() => {
        setUploadVerProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsUploadingVer(false);
            return 100;
          }
          return prev + 20;
        });
      }, 150);
    }
  };

  const handleCreateAgreement = () => {
    if (!newTitle || !newCustId || !uploadedFileName) return;

    const customer = tenantCustomers.find((c) => c.id === newCustId);
    if (!customer) return;

    if (uploadedFile) {
      uploadedBlobsCache[uploadedFileName] = uploadedFile;
    }

    addAgreement(
      {
        tenantId: activeTenant.id,
        title: newTitle,
        documentType: newDocType,
        customerId: newCustId,
        customerName: customer.name,
        customerCompany: customer.company,
        description: newDesc,
        status: 'ACTIVE'
      },
      {
        versionLabel: newVersionLabel,
        changeDescription: newVersionNotes,
        fileName: uploadedFileName,
        fileSize: uploadedFileSize
      }
    );

    // Reset Form states
    setNewTitle('');
    setNewCustId('');
    setNewDocType('Agreement');
    setNewDesc('');
    setNewVersionLabel('v1.0.0');
    setNewVersionNotes('Initial uploaded master release.');
    setUploadedFileName('');
    setUploadedFileSize('');
    setUploadedFile(null);
    setIsCreateOpen(false);
  };

  const handleAddVersion = () => {
    if (!selectedAgr || !newVerLabel || !uploadedVerFileName) return;

    if (uploadedVerFile) {
      uploadedBlobsCache[uploadedVerFileName] = uploadedVerFile;
    }

    addDocumentVersion(selectedAgr.id, {
      versionLabel: newVerLabel,
      changeDescription: newVerNotes,
      fileName: uploadedVerFileName,
      fileSize: uploadedVerFileSize
    });

    // Update active view details referencing store changes
    const updatedStoreList = useAgreementsStore.getState().agreements;
    const latestAgr = updatedStoreList.find((a) => a.id === selectedAgr.id);
    if (latestAgr) {
      setSelectedAgr(latestAgr);
    }

    // Reset Version upload forms
    setNewVerLabel('');
    setNewVerNotes('');
    setUploadedVerFileName('');
    setUploadedVerFileSize('');
    setUploadedVerFile(null);
    setUploadVerProgress(0);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this document agreement record?')) {
      deleteAgreement(id);
      setIsDetailOpen(false);
      setSelectedAgr(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Agreements & Service Documents</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Securely store support SOWs, check operational agreements, and audit client version histories.</p>
        </div>
        <button
          onClick={() => {
            setNewTitle('');
            setNewCustId('');
            setNewDocType('Agreement');
            setNewDesc('');
            setNewVersionLabel('v1.0.0');
            setNewVersionNotes('Initial uploaded master release.');
            setUploadedFileName('');
            setUploadedFileSize('');
            setUploadProgress(0);
            setIsUploading(false);
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md cursor-pointer"
        >
          <Plus size={14} />
          <span>Upload Document</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Documents" value={String(stats.total)} icon={<Files size={18} />} accentColor={activeTenant.brandingConfig.primary} />
        <StatCard label="Active Agreements" value={String(stats.active)} icon={<CheckCircle2 size={18} />} accentColor="#10b981" />
        <StatCard label="Pending Drafts" value={String(stats.drafts)} icon={<Clock size={18} />} accentColor="#f59e0b" />
        <StatCard label="Version Commits" value={String(stats.totalVersions)} icon={<History size={18} />} accentColor="#6366f1" />
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="glass-card rounded-2xl px-4 py-2.5 border border-zinc-200/50 dark:border-zinc-800/40 flex items-center gap-3 flex-1 w-full">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search documents by title, description, or associated clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none border-none placeholder-slate-400 text-slate-700 dark:text-zinc-300"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider hidden lg:inline">Category:</span>
          <select
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            className="rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 px-4 py-2.5 text-xs font-bold bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 focus:outline-none w-full sm:w-auto"
          >
            <option value="ALL">All Categories</option>
            <option value="Agreement">Standard Agreement</option>
            <option value="SLA Contract">SLA Contract</option>
            <option value="SOW Draft">SOW Draft</option>
            <option value="Tax Invoice">Tax Invoice</option>
            <option value="Other">Other Type</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable<Agreement>
        columns={columns}
        data={filteredAgreements}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => {
          setSelectedAgr(row);
          setIsDetailOpen(true);
        }}
        emptyMessage="No documents or service agreements found matching standard criteria"
      />

      {/* UPLOAD DOCUMENT SLIDE PANEL */}
      <SlidePanel
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Upload Document"
        subtitle="Create agreement profile, select customer, and upload initial file version."
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">Values will be stored in persistent database logs.</span>
            <div className="flex gap-3">
              <button
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgreement}
                disabled={!newTitle || !newCustId || !uploadedFileName || isUploading}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40"
              >
                Save & Commit
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Document Title *</label>
            <input
              type="text"
              placeholder="e.g. Wayne Security Integration SLA"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Document Category *</label>
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value as Agreement['documentType'])}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
              >
                <option value="Agreement">Standard Agreement</option>
                <option value="SLA Contract">SLA Contract</option>
                <option value="SOW Draft">SOW Draft</option>
                <option value="Tax Invoice">Tax Invoice</option>
                <option value="Other">Other Type</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Select Customer *</label>
              <select
                value={newCustId}
                onChange={(e) => setNewCustId(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                required
              >
                <option value="">-- Choose Customer --</option>
                {tenantCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Description / Scope Details</label>
            <textarea
              placeholder="Provide a brief summary of the services, licensing parameters, or project boundaries covered by this document..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300 resize-none"
            />
          </div>

          {/* FILE UPLOAD COMPONENT BLOCK */}
          <div className="space-y-2 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">File Attachment *</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e, true)}
              className="hidden"
            />
            
            {!uploadedFileName ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6 flex flex-col items-center justify-center text-center hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all cursor-pointer group"
              >
                <UploadCloud size={28} className="text-slate-400 dark:text-zinc-600 group-hover:scale-105 transition-transform" />
                <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 mt-2">Drag and drop file here, or click to browse</p>
                <p className="text-[10px] text-slate-400 mt-1">Supports PDF, DOCX, XLSX (Max 10 MB)</p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                      <FileText size={18} />
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300 truncate">{uploadedFileName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{uploadedFileSize}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setUploadedFileName('');
                      setUploadedFileSize('');
                      setUploadProgress(0);
                    }}
                    className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
 
                {isUploading && (
                  <div className="mt-3.5 space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Uploading document content...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-150"
                        style={{ width: `${uploadProgress}%`, backgroundColor: activeTenant.brandingConfig.primary }}
                      />
                    </div>
                  </div>
                )}
                
                {!isUploading && uploadProgress === 100 && (
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                    <CheckCircle2 size={12} />
                    <span>Secure upload completed successfully!</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INITIAL VERSION CONTROL DETAILS */}
          <div className="space-y-4 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1">
              <History size={12} />
              <span>Initial Version Control Specifications</span>
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5 sm:col-span-1">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Version Label *</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0.0"
                  value={newVersionLabel}
                  onChange={(e) => setNewVersionLabel(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  required
                />
                <p className="text-[9px] text-slate-400 mt-0.5">Flexible tag configuration.</p>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Initial Release Notes *</label>
                <input
                  type="text"
                  placeholder="e.g. Initial master draft signed by legal officers"
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </SlidePanel>

      {/* AGREEMENT INSPECTOR & VERSIONING HISTORY SLIDE PANEL */}
      <SlidePanel
        open={isDetailOpen && !!selectedAgr}
        onClose={() => setIsDetailOpen(false)}
        title={selectedAgr?.title || ''}
        subtitle={selectedAgr?.customerCompany || ''}
        width="max-w-3xl"
        footer={
          selectedAgr && (
            <div className="flex items-center justify-between w-full">
              <button
                onClick={() => handleDelete(selectedAgr.id)}
                className="flex items-center gap-1 text-xs font-bold text-rose-500 hover:text-rose-700 border border-rose-500/20 px-3 py-2 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={12} />
                <span>Delete Document</span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const currentVer = selectedAgr.versions[selectedAgr.versions.length - 1];
                    if (currentVer) {
                      handleDownloadFile(currentVer.fileName, selectedAgr.title, currentVer.versionLabel);
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-300 flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95 cursor-pointer"
                >
                  <Download size={12} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          )
        }
      >
        {selectedAgr && (
          <div className="space-y-6">
            
            {/* META LABELS */}
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedAgr.status} size="md" />
              
              <button
                onClick={() => {
                  const nextStatus = selectedAgr.status === 'ACTIVE' ? 'EXPIRED' : 'ACTIVE';
                  updateAgreementStatus(selectedAgr.id, nextStatus);
                  setSelectedAgr({ ...selectedAgr, status: nextStatus });
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all border cursor-pointer ${
                  selectedAgr.status === 'ACTIVE'
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/15'
                }`}
              >
                Set as {selectedAgr.status === 'ACTIVE' ? 'Inactive' : 'Active'}
              </button>

              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 rounded-full border border-zinc-200/50 dark:border-zinc-800/40">
                {selectedAgr.documentType}
              </span>
              <span className="text-xs text-slate-400">Created {selectedAgr.createdAt}</span>
            </div>

            {/* DESCRIPTION */}
            <div className="bg-zinc-100/30 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Document Scope & Description</span>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{selectedAgr.description || 'No description summary defined.'}</p>
            </div>

            {/* ACTIVE FILE SPEC */}
            {(() => {
              const activeVer = selectedAgr.versions[selectedAgr.versions.length - 1];
              return (
                <div className="p-4 rounded-2xl border border-indigo-500/10 bg-indigo-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 dark:text-indigo-400">
                      <FileCheck size={20} />
                    </div>
                    <div className="truncate">
                      <p className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 leading-none">Active Version File</p>
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 mt-1 truncate">{activeVer?.fileName}</p>
                      <p className="text-[10px] text-indigo-500 font-semibold mt-0.5">{activeVer?.fileSize} • Uploaded by {activeVer?.uploadedBy}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-indigo-500 text-white rounded-full self-start sm:self-auto shrink-0 shadow-xs">
                    Uptime Release: {activeVer?.versionLabel}
                  </span>
                </div>
              );
            })()}

            {/* DYNAMIC UPLOAD NEW VERSION FORM */}
            <div className="p-4.5 rounded-[24px] border border-zinc-200/60 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/30 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5">
                  <UploadCloud size={14} className="text-primary" style={{ color: activeTenant.brandingConfig.primary }} />
                  <span>Commit Custom Document Version</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Revise agreement details and update state tracker versions dynamically.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">Custom Version Tag *</label>
                  <input
                    type="text"
                    placeholder="e.g. v2.0-final"
                    value={newVerLabel}
                    onChange={(e) => setNewVerLabel(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>
                
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 dark:text-zinc-400">Detailed Modification changelog *</label>
                  <input
                    type="text"
                    placeholder="e.g. Finalized payment terms structure based on feedback"
                    value={newVerNotes}
                    onChange={(e) => setNewVerNotes(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* simulated version uploader */}
              <input
                type="file"
                ref={fileVerInputRef}
                onChange={(e) => handleFileUpload(e, false)}
                className="hidden"
              />

              {!uploadedVerFileName ? (
                <button
                  type="button"
                  onClick={() => fileVerInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900/40 text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UploadCloud size={14} />
                  <span>Choose revised file attachment...</span>
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/40 text-xs flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 truncate">
                      <FileText size={14} className="text-indigo-500 shrink-0" />
                      <span className="font-semibold text-slate-700 dark:text-zinc-300 truncate">{uploadedVerFileName} ({uploadedVerFileSize})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedVerFileName('');
                        setUploadedVerFileSize('');
                        setUploadVerProgress(0);
                      }}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  </div>

                  {isUploadingVer && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[9px] font-bold text-slate-400">
                        <span>Uploading...</span>
                        <span>{uploadVerProgress}%</span>
                      </div>
                      <div className="h-1 bg-zinc-100 dark:bg-zinc-850 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-150"
                          style={{ width: `${uploadVerProgress}%`, backgroundColor: activeTenant.brandingConfig.primary }}
                        />
                      </div>
                    </div>
                  )}

                  {!isUploadingVer && uploadVerProgress === 100 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-0.5">
                        <CheckCircle2 size={10} />
                        <span>Ready to commit.</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleAddVersion}
                        className="px-3 py-1 rounded bg-zinc-900 dark:bg-white text-white dark:text-black font-extrabold text-[10px] hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                      >
                        Commit Version
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* VERSION CONTROL HISTORY TIMELINE */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-4 flex items-center gap-1.5">
                <History size={12} />
                <span>Version Control Ledger History ({selectedAgr.versions.length})</span>
              </span>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800/80">
                {selectedAgr.versions
                  .slice()
                  .reverse() // Render newest versions at the top of the history timeline
                  .map((ver, idx) => {
                    const isLatest = idx === 0;
                    return (
                      <div key={ver.id} className="relative animate-in slide-in-from-top-1.5 duration-200">
                        
                        {/* Timeline Node Icon Glow */}
                        <div
                          className={`absolute -left-6 top-1.5 h-3.5 w-3.5 rounded-full border-2 bg-white dark:bg-zinc-950 flex items-center justify-center transition-all ${
                            isLatest
                              ? 'border-indigo-500 ring-4 ring-indigo-500/10'
                              : 'border-zinc-300 dark:border-zinc-700'
                          }`}
                        />

                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-black uppercase text-[10px] ${isLatest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'}`}>
                              {ver.versionLabel}
                            </span>
                            {isLatest && (
                              <span className="px-1.5 py-0.5 text-[8px] bg-indigo-500/10 text-indigo-500 font-extrabold rounded-full tracking-wide">
                                ACTIVE RELEASE
                              </span>
                            )}
                            <span className="text-[9px] text-slate-400 font-semibold font-mono">({ver.fileSize})</span>
                            <span className="text-[9px] text-slate-400 select-none">•</span>
                            <span className="text-[9px] text-slate-400 font-medium">Uploaded by {ver.uploadedBy} on {ver.uploadedAt}</span>
                          </div>
                          
                          <p className="font-bold text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/30 p-2.5 rounded-xl">
                            {ver.changeDescription}
                          </p>

                          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-400 hover:text-indigo-500 cursor-pointer w-fit select-none"
                               onClick={() => handleDownloadFile(ver.fileName, selectedAgr.title, ver.versionLabel)}>
                            <Download size={10} />
                            <span>Download {ver.fileName}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

          </div>
        )}
      </SlidePanel>

    </div>
  );
}
