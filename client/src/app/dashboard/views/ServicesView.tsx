'use client';

import React, { useState } from 'react';
import { useTenantStore } from '../../../store/tenantStore';
import { usePermissions } from '../../../hooks/usePermissions';
import { useCustomersStore } from '../../../store/customersStore';
import { useCustomFieldsStore } from '../../../store/customFieldsStore';
import DynamicFormCompiler from '../../../components/dynamic-form/dynamic-form';
import { ServiceRecord, ServiceActivity } from './servicesData';
import { useDocumentStore } from '../../../store/documentStore';
import StatusBadge from '../../../components/ui/StatusBadge';
import StatCard from '../../../components/ui/StatCard';
import DataTable, { Column } from '../../../components/ui/DataTable';
import SlidePanel from '../../../components/ui/SlidePanel';
import {
  Wrench, Plus, Activity, Clock, AlertTriangle, CheckCircle2,
  Download, MessageSquare, Timer, Users
} from 'lucide-react';
import { exportDocumentToPDF } from '../../../utils/pdfExporter';
import { getCurrencySymbol } from '../../../utils/currency';

const renderFieldInput = (
  field: any,
  value: any,
  onChange: (val: any) => void
) => {
  const isRequired = field.isRequired;
  const label = field.label;
  
  const inputClass = "w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300";
  
  let inputElement = null;
  
  if (field.type === 'TEXTAREA' || field.type === 'RICH_TEXT') {
    inputElement = (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className={`${inputClass} resize-none`}
        required={isRequired}
      />
    );
  } else if (field.type === 'DATE') {
    inputElement = (
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        style={{ height: '48px' }}
        required={isRequired}
      />
    );
  } else if (field.type === 'NUMBER') {
    inputElement = (
      <input
        type="number"
        value={value !== undefined ? value : ''}
        onChange={(e) => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
        className={inputClass}
        required={isRequired}
      />
    );
  } else if (field.type === 'CHECKBOX') {
    inputElement = (
      <div className="flex items-center space-x-2 py-2">
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded text-indigo-600 border-gray-300 focus:ring-indigo-500 h-4 w-4"
        />
        <span className="text-sm text-slate-700 dark:text-zinc-300">Enable {label}</span>
      </div>
    );
  } else if (field.type === 'DROPDOWN') {
    inputElement = (
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        required={isRequired}
      >
        <option value="">Select option...</option>
        {(field.options || []).map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  } else {
    // TEXT fallback
    inputElement = (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        required={isRequired}
      />
    );
  }
  
  return (
    <div className="space-y-1.5 flex-1 min-w-0">
      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 flex items-center justify-between">
        <span>{label} {isRequired && <span className="text-red-500">*</span>}</span>
      </label>
      {inputElement}
    </div>
  );
};

export default function ServicesView() {
  const { activeTenant, currentUser } = useTenantStore();
  const { can } = usePermissions();
  const userName = `${currentUser.firstName} ${currentUser.lastName}`;
  const { getActiveFieldsForEntity, fields } = useCustomFieldsStore();
  const { customers, fetchCustomers } = useCustomersStore();

  const { services: allServices, fetchDocuments, addService, updateService } = useDocumentStore();
  const [services, setServices] = useState<ServiceRecord[]>([]);

  React.useEffect(() => {
    fetchCustomers(activeTenant.id);
    fetchDocuments(activeTenant.id);
  }, [activeTenant.id, fetchCustomers, fetchDocuments]);

  React.useEffect(() => {
    setServices(allServices.filter(s => s.tenantId === activeTenant.id));
  }, [allServices, activeTenant.id]);

  const [selectedSvc, setSelectedSvc] = useState<ServiceRecord | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [editingSvc, setEditingSvc] = useState<ServiceRecord | null>(null);

  // Create form
  const [formTitle, setFormTitle] = useState('');
  const [formCustomer, setFormCustomer] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formTeam, setFormTeam] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formBillingCycle, setFormBillingCycle] = useState('');
  const [formCost, setFormCost] = useState(0);
  const [formTerms, setFormTerms] = useState('');
  const [formPaymentTerms, setFormPaymentTerms] = useState('');
  const [dynamicValues, setDynamicValues] = useState<Record<string, any>>({});
  const [formAuthorizedPersonId, setFormAuthorizedPersonId] = useState('');

  const handlePaymentTermsChange = (val: string) => {
    setFormPaymentTerms(val);
    if (!val) return;
    const match = val.match(/\d+/);
    if (match) {
      const days = parseInt(match[0], 10);
      const date = new Date();
      date.setDate(date.getDate() + days);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      setFormDeadline(`${yyyy}-${mm}-${dd}`);
    }
  };

  const tenantCustomers = customers.filter(c => c.tenantId === activeTenant.id);

  const serviceFields = fields.filter(f => f.entityType === 'SERVICE' && f.isActive);
  const primaryFields = serviceFields.filter(f => f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);
  const customFields = serviceFields.filter(f => !f.isStatic).sort((a, b) => a.sortOrder - b.sortOrder);

  const stats = {
    active: services.filter(s => s.status === 'OPEN' || s.status === 'IN_PROGRESS' || s.status === 'PENDING_CLIENT').length,
    breached: services.filter(s => s.status === 'BREACHED').length,
    completed: services.filter(s => s.status === 'COMPLETED').length,
    complianceRate: services.length > 0
      ? Math.round((services.filter(s => s.status !== 'BREACHED').length / services.length) * 1000) / 10
      : 100,
  };

  const columns: Column<ServiceRecord>[] = [
    { key: 'serviceNumber', label: 'Service Ref', sortable: true, render: (row) => <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">{row.serviceNumber || row.id}</span> },
    { key: 'title', label: 'Service Title', sortable: true, render: (row) => <span className="font-bold text-slate-800 dark:text-zinc-200">{row.title}</span> },
    { key: 'customerCompany', label: 'Client', sortable: true, render: (row) => (
      <div><p className="font-bold text-slate-700 dark:text-zinc-300">{row.customerCompany}</p><p className="text-[10px] text-slate-400 mt-0.5">{row.customerName}</p></div>
    )},
    { key: 'slaDeadline', label: 'SLA Deadline', sortable: true, render: (row) => {
      const now = new Date();
      const deadline = new Date(row.slaDeadline);
      const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / 86400000);
      const isExpired = diffDays < 0;
      return (
        <div>
          <span className={isExpired ? 'text-rose-500 font-bold' : diffDays <= 3 ? 'text-amber-500 font-bold' : ''}>{row.slaDeadline}</span>
          <p className={`text-[10px] font-bold mt-0.5 ${isExpired ? 'text-rose-500' : diffDays <= 3 ? 'text-amber-500' : 'text-slate-400'}`}>
            {isExpired ? `${Math.abs(diffDays)}d overdue` : `${diffDays}d remaining`}
          </p>
        </div>
      );
    }},
    { key: 'assignedTeam', label: 'Team', render: (row) => <span className="text-slate-400 font-semibold">{row.assignedTeam}</span> },
    { key: 'status', label: 'Status', sortable: true, render: (row) => <StatusBadge status={row.status} /> },
    {
      key: 'pdf', label: 'PDF',
      render: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            exportDocumentToPDF(row, 'SERVICE', activeTenant, 'download');
          }}
          className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all flex items-center justify-center active:scale-95"
          title="Download PDF"
        >
          <Download size={14} />
        </button>
      )
    },
  ];

  const handleCreate = () => {
    const newSvc: ServiceRecord = {
      id: `svc-${Date.now()}`,
      serviceNumber: useTenantStore.getState().incrementAndGetNextNumber('SERVICE'),
      title: formTitle,
      tenantId: activeTenant.id,
      customerId: `cust-${Date.now()}`, customerName: formCustomer, customerCompany: formCompany,
      description: formDescription, status: 'OPEN', slaDeadline: formDeadline,
      assignedTeam: formTeam,
      serviceLocation: formLocation || undefined,
      billingCycle: formBillingCycle || undefined,
      serviceCost: formCost || undefined,
      terms: formTerms || undefined,
      authorizedPersonId: formAuthorizedPersonId || undefined,
      paymentTerms: formPaymentTerms || undefined,
      activities: [{ id: `sa-${Date.now()}`, timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '), user: userName, type: 'NOTE', content: 'Service ticket created.' }],
      dynamicValues: { priority: 'MEDIUM', estimated_hours: 0, completion_percentage: 0, ...dynamicValues },
      createdAt: new Date().toISOString().slice(0, 10),
    };
    addService(newSvc);
    setFormTitle(''); setFormCustomer(''); setFormCompany(''); setFormDescription(''); setFormDeadline(''); setFormTeam('');
    setFormLocation(''); setFormBillingCycle(''); setFormCost(0); setFormTerms('');
    setFormAuthorizedPersonId('');
    setFormPaymentTerms('');
    setDynamicValues({});
    setIsCreateOpen(false);
  };

  const handleSaveEdit = () => {
    if (!editingSvc) return;
    const updatedSvc = {
      ...editingSvc,
      title: formTitle,
      customerName: formCustomer,
      customerCompany: formCompany,
      description: formDescription,
      slaDeadline: formDeadline,
      assignedTeam: formTeam,
      serviceLocation: formLocation || undefined,
      billingCycle: formBillingCycle || undefined,
      serviceCost: formCost || undefined,
      terms: formTerms || undefined,
      authorizedPersonId: formAuthorizedPersonId || undefined,
      paymentTerms: formPaymentTerms || undefined,
      dynamicValues: { ...editingSvc.dynamicValues, ...dynamicValues },
      pdfBase64: undefined,
    };

    updateService(updatedSvc);
    setFormTitle(''); setFormCustomer(''); setFormCompany(''); setFormDescription(''); setFormDeadline(''); setFormTeam('');
    setFormLocation(''); setFormBillingCycle(''); setFormCost(0); setFormTerms('');
    setFormAuthorizedPersonId('');
    setFormPaymentTerms('');
    setDynamicValues({});
    setEditingSvc(null);
    setIsCreateOpen(false);
  };

  const handleAddNote = () => {
    if (!selectedSvc || !newNote.trim()) return;
    const activity: ServiceActivity = {
      id: `sa-${Date.now()}`, timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      user: userName, type: 'NOTE', content: newNote,
    };
    
    const updated = { ...selectedSvc, activities: [...selectedSvc.activities, activity], pdfBase64: undefined };
    updateService(updated);
    setSelectedSvc(updated);
    setNewNote('');
  };

  const handleStatusChange = (newStatus: ServiceRecord['status']) => {
    if (!selectedSvc) return;
    const activity: ServiceActivity = {
      id: `sa-${Date.now()}`, timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      user: 'System', type: 'STATUS_CHANGE', content: `Status updated: ${selectedSvc.status} → ${newStatus}`,
    };
    const updated = { ...selectedSvc, status: newStatus, activities: [...selectedSvc.activities, activity], pdfBase64: undefined };
    updateService(updated);
    setSelectedSvc(updated);
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case 'STATUS_CHANGE': return <Activity size={12} className="text-sky-500" />;
      case 'ESCALATION': return <AlertTriangle size={12} className="text-rose-500" />;
      case 'ASSIGNMENT': return <Users size={12} className="text-indigo-500" />;
      default: return <MessageSquare size={12} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Service SLA Tracking</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Monitor client support deliverables, check SLA compliance deadlines, and track resolution milestones.</p>
        </div>
        {can('services', 'create') && (
          <button onClick={() => {
            setFormTitle(''); setFormCustomer(''); setFormCompany(''); setFormDescription(''); setFormDeadline(''); setFormTeam('');
            setFormLocation(''); setFormBillingCycle(''); setFormCost(0); setFormTerms('');
            setFormPaymentTerms('');
            setDynamicValues({});
            setEditingSvc(null);
            setIsCreateOpen(true);
          }} className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm hover:scale-[1.02] transition-all shadow-md">
            <Plus size={14} /><span>New Service Ticket</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Services" value={String(stats.active)} icon={<Wrench size={18} />} accentColor={activeTenant.brandingConfig.primary} />
        <StatCard label="SLA Breached" value={String(stats.breached)} change={stats.breached > 0 ? 'Needs attention' : 'All clear'} isPositive={stats.breached === 0} icon={<AlertTriangle size={18} />} accentColor="#ef4444" />
        <StatCard label="Completed" value={String(stats.completed)} isPositive={true} icon={<CheckCircle2 size={18} />} accentColor="#10b981" />
        <StatCard label="Compliance Rate" value={`${stats.complianceRate}%`} change={stats.complianceRate >= 95 ? 'Healthy' : 'Below target'} isPositive={stats.complianceRate >= 95} icon={<Timer size={18} />} accentColor="#6366f1" />
      </div>

      <DataTable<ServiceRecord>
        columns={columns}
        data={services}
        keyExtractor={(row) => row.id}
        onRowClick={(row) => { setSelectedSvc(row); setIsDetailOpen(true); }}
        emptyMessage="No service tickets found"
      />

      {/* CREATE PANEL */}
      <SlidePanel open={isCreateOpen} onClose={() => { setIsCreateOpen(false); setEditingSvc(null); }} title={editingSvc ? 'Edit Service Ticket' : 'Create Service Ticket'} subtitle={editingSvc ? `Modify SLA details for ${editingSvc.title}` : 'Define SLA parameters and assign support team.'}
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-400">
              {editingSvc ? 'Edits will be saved.' : 'Ticket will be saved.'}
            </span>
            <div className="flex gap-3">
              <button onClick={() => { setIsCreateOpen(false); setEditingSvc(null); }} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-slate-600 dark:text-zinc-300">Cancel</button>
              <button onClick={editingSvc ? handleSaveEdit : handleCreate} disabled={!formTitle || !formCompany} className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold hover:scale-[1.02] transition-all disabled:opacity-40">{editingSvc ? 'Save Changes' : 'Create Ticket'}</button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">Select Registered Client (Auto-fill)</label>
            <select
              onChange={(e) => {
                const selectedId = e.target.value;
                if (!selectedId) return;
                const cust = tenantCustomers.find(c => c.id === selectedId);
                if (cust) {
                  setFormCustomer(cust.name);
                  setFormCompany(cust.company);
                }
              }}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
              defaultValue=""
            >
              <option value="">-- Choose registered customer to auto-fill details --</option>
              {tenantCustomers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.company} ({c.name})
                </option>
              ))}
            </select>
          </div>

          {/* Dynamic Primary Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {primaryFields.map(field => {
              let val: any = '';
              let setter = (v: any) => {};
              
              if (field.name === 'title') {
                val = formTitle;
                setter = setFormTitle;
              } else if (field.name === 'customerName') {
                val = formCustomer;
                setter = setFormCustomer;
              } else if (field.name === 'customerCompany') {
                val = formCompany;
                setter = setFormCompany;
              } else if (field.name === 'description') {
                val = formDescription;
                setter = setFormDescription;
              } else if (field.name === 'slaDeadline') {
                val = formDeadline;
                setter = setFormDeadline;
              } else if (field.name === 'assignedTeam') {
                val = formTeam;
                setter = setFormTeam;
              } else if (field.name === 'serviceLocation') {
                val = formLocation;
                setter = setFormLocation;
              } else if (field.name === 'billingCycle') {
                val = formBillingCycle;
                setter = setFormBillingCycle;
              } else if (field.name === 'serviceCost') {
                val = formCost;
                setter = setFormCost;
              } else if (field.name === 'terms') {
                val = formTerms;
                setter = setFormTerms;
              } else if (field.name === 'paymentTerms') {
                val = formPaymentTerms;
                setter = handlePaymentTermsChange;
              } else {
                return null;
              }
              
              return (
                <div key={field.id} className={field.type === 'TEXTAREA' || field.type === 'RICH_TEXT' ? 'sm:col-span-2' : ''}>
                  {renderFieldInput(field, val, setter)}
                </div>
              );
            })}
          </div>

          {/* Signatory Selection Dropdown */}
          <div className="space-y-1.5 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 mt-2">
            <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 block">Authorized Signatory (Optional)</label>
            <select
              value={formAuthorizedPersonId}
              onChange={(e) => setFormAuthorizedPersonId(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
            >
              <option value="">No Signatory Assigned</option>
              {(activeTenant.authorizedPersons || []).map(person => (
                <option key={person.id} value={person.id}>
                  {person.name} ({person.designation})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-400">If assigned, the designated signature will embed at the bottom of the exported PDF SLA sheet.</p>
          </div>

          {customFields.length > 0 && (
            <div className="p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/30 dark:bg-zinc-900/10">
              <DynamicFormCompiler
                fields={customFields}
                onChange={setDynamicValues}
                initialValues={dynamicValues}
                baselineContext={{}}
              />
            </div>
          )}
        </div>
      </SlidePanel>

      {/* DETAIL PANEL */}
      <SlidePanel open={isDetailOpen && !!selectedSvc} onClose={() => { setIsDetailOpen(false); setSelectedSvc(null); }} title={selectedSvc?.title || ''} subtitle={selectedSvc?.customerCompany || ''} width="max-w-3xl"
        footer={
          selectedSvc && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                {selectedSvc.status === 'OPEN' && can('services', 'edit') && (
                  <button 
                    onClick={() => {
                      setEditingSvc(selectedSvc);
                      setFormTitle(selectedSvc.title);
                      setFormCustomer(selectedSvc.customerName);
                      setFormCompany(selectedSvc.customerCompany);
                      setFormDescription(selectedSvc.description);
                      setFormDeadline(selectedSvc.slaDeadline);
                      setFormTeam(selectedSvc.assignedTeam);
                      setFormLocation(selectedSvc.serviceLocation || '');
                      setFormBillingCycle(selectedSvc.billingCycle || '');
                      setFormCost(selectedSvc.serviceCost || 0);
                      setFormTerms(selectedSvc.terms || '');
                      setFormPaymentTerms(selectedSvc.paymentTerms || '');
                      setFormAuthorizedPersonId(selectedSvc.authorizedPersonId || '');
                      setDynamicValues(selectedSvc.dynamicValues || {});
                      setIsDetailOpen(false);
                      setIsCreateOpen(true);
                    }} 
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all"
                  >
                    Edit Ticket
                  </button>
                )}
                {selectedSvc.status === 'OPEN' && can('services', 'update_status') && <button onClick={() => handleStatusChange('IN_PROGRESS')} className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 hover:bg-sky-500/20 transition-all">Start Work</button>}
                {selectedSvc.status === 'IN_PROGRESS' && (
                  <>
                    {can('services', 'edit') && (
                      <button 
                        onClick={() => {
                          setEditingSvc(selectedSvc);
                          setFormTitle(selectedSvc.title);
                          setFormCustomer(selectedSvc.customerName);
                          setFormCompany(selectedSvc.customerCompany);
                          setFormDescription(selectedSvc.description);
                          setFormDeadline(selectedSvc.slaDeadline);
                          setFormTeam(selectedSvc.assignedTeam);
                          setFormLocation(selectedSvc.serviceLocation || '');
                          setFormBillingCycle(selectedSvc.billingCycle || '');
                          setFormCost(selectedSvc.serviceCost || 0);
                          setFormTerms(selectedSvc.terms || '');
                          setFormPaymentTerms(selectedSvc.paymentTerms || '');
                          setFormAuthorizedPersonId(selectedSvc.authorizedPersonId || '');
                          setDynamicValues(selectedSvc.dynamicValues || {});
                          setIsDetailOpen(false);
                          setIsCreateOpen(true);
                        }} 
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/50 transition-all"
                      >
                        Edit Ticket
                      </button>
                    )}
                    {can('services', 'update_status') && (
                      <>
                        <button onClick={() => handleStatusChange('PENDING_CLIENT')} className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all">Awaiting Client</button>
                        <button onClick={() => handleStatusChange('COMPLETED')} className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all">Mark Complete</button>
                      </>
                    )}
                  </>
                )}
                {selectedSvc.status === 'PENDING_CLIENT' && can('services', 'update_status') && <button onClick={() => handleStatusChange('IN_PROGRESS')} className="px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 border border-sky-500/20 hover:bg-sky-500/20 transition-all">Resume</button>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportDocumentToPDF(selectedSvc, 'SERVICE', activeTenant)} className="px-3 py-2 rounded-xl text-xs font-bold border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 flex items-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"><Download size={12} /> Export PDF</button>
                <button onClick={() => exportDocumentToPDF(selectedSvc, 'SERVICE', activeTenant, 'download')} className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1.5"><Download size={12} /> Download PDF</button>
              </div>
            </div>
          )
        }
      >
        {selectedSvc && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={selectedSvc.status} size="md" />
              <span className="text-xs text-slate-400">Created {selectedSvc.createdAt}</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Users size={12} /> {selectedSvc.assignedTeam}</span>
            </div>

            {/* SLA countdown */}
            {(() => {
              const now = new Date();
              const deadline = new Date(selectedSvc.slaDeadline);
              const diffMs = deadline.getTime() - now.getTime();
              const diffDays = Math.ceil(diffMs / 86400000);
              const isExpired = diffMs < 0;
              const pct = selectedSvc.dynamicValues.completion_percentage || 0;
              return (
                <div className={`p-4 rounded-2xl border ${isExpired ? 'bg-rose-500/5 border-rose-500/15' : diffDays <= 3 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-zinc-100/50 dark:bg-zinc-900/50 border-zinc-200/40 dark:border-zinc-800/30'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">SLA Deadline</p>
                      <p className={`text-lg font-extrabold mt-0.5 ${isExpired ? 'text-rose-600' : 'text-slate-800 dark:text-zinc-100'}`}>
                        {selectedSvc.slaDeadline}
                      </p>
                    </div>
                    <span className={`text-sm font-extrabold ${isExpired ? 'text-rose-500' : diffDays <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {isExpired ? `${Math.abs(diffDays)}d OVERDUE` : `${diffDays}d remaining`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: activeTenant.brandingConfig.primary }} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-zinc-400">{pct}%</span>
                  </div>
                </div>
              );
            })()}

            {/* Description */}
            <div className="bg-zinc-100/30 dark:bg-zinc-900/20 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Description</span>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed whitespace-pre-line">{selectedSvc.description}</p>
            </div>

            {/* Service Specs */}
            {(selectedSvc.serviceLocation || selectedSvc.billingCycle || selectedSvc.serviceCost !== undefined || selectedSvc.terms || activeTenant.gstNumber || selectedSvc.authorizedPersonId || selectedSvc.paymentTerms) && (
              <div className="bg-zinc-100/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2.5">Service Specifications</span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {selectedSvc.serviceLocation && (
                    <div className="col-span-2">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Location / Address</p>
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 whitespace-pre-line">{selectedSvc.serviceLocation}</p>
                    </div>
                  )}
                  {activeTenant.gstNumber && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Provider GSTIN</p>
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 font-mono">{activeTenant.gstNumber}</p>
                    </div>
                  )}
                  {selectedSvc.billingCycle && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Billing Frequency</p>
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">{selectedSvc.billingCycle}</p>
                    </div>
                  )}
                  {selectedSvc.paymentTerms && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Payment Terms</p>
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">{selectedSvc.paymentTerms}</p>
                    </div>
                  )}
                  {selectedSvc.serviceCost !== undefined && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Rate / Cost</p>
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5">
                        {getCurrencySymbol(activeTenant.currency)}
                        {selectedSvc.serviceCost.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedSvc.terms && (
                    <div className="col-span-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-2">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Specific SLA Terms</p>
                      <p className="font-semibold text-slate-800 dark:text-zinc-200 mt-0.5 leading-relaxed italic">{selectedSvc.terms}</p>
                    </div>
                  )}
                  {selectedSvc.authorizedPersonId && (
                    <div className="col-span-2 border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3 mt-1">
                      <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px] mb-2">Authorized Signatory</p>
                      {(() => {
                        const person = activeTenant.authorizedPersons?.find(p => p.id === selectedSvc.authorizedPersonId);
                        if (!person) return <p className="font-semibold text-slate-500 italic mt-0.5">Assigned signatory not found in active settings</p>;
                        return (
                          <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/30 shadow-xs animate-in fade-in duration-250">
                            <div className="flex items-center gap-3">
                              {person.signatureUrl ? (
                                <div className="h-10 w-20 shrink-0 bg-white border border-zinc-200/50 rounded-xl p-1 flex items-center justify-center">
                                  <img src={person.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                                </div>
                              ) : (
                                <div className="h-10 w-20 shrink-0 bg-zinc-50 dark:bg-zinc-950 border border-dashed border-zinc-200/50 dark:border-zinc-800/40 rounded-xl flex items-center justify-center text-[8px] text-zinc-300 dark:text-zinc-700 font-mono">No Signature</div>
                              )}
                              <div>
                                <p className="font-bold text-slate-800 dark:text-zinc-200 text-xs">{person.name}</p>
                                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{person.designation}</p>
                              </div>
                            </div>
                            <span className="text-[9px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded-full">Authorized</span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dynamic Values */}
            {selectedSvc.dynamicValues && Object.keys(selectedSvc.dynamicValues).length > 0 && (
              <div className="bg-indigo-500/5 border border-indigo-500/15 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest block mb-2">Dynamic SLA Metadata</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(selectedSvc.dynamicValues).map(([key, val]) => {
                    if (key === 'completion_percentage') return null; // rendered in countdown bar
                    return (
                      <div key={key}>
                        <p className="text-[10px] text-indigo-400 uppercase tracking-wider">{key.replace(/_/g, ' ')}</p>
                        <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                          {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Timeline */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-3 flex items-center gap-1.5"><Activity size={12} /> Activity Timeline</span>
              <div className="space-y-3 mb-4">
                {selectedSvc.activities.map((act, idx) => (
                  <div key={act.id} className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">{activityIcon(act.type)}</div>
                      {idx < selectedSvc.activities.length - 1 && <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-800" />}
                    </div>
                    <div className="text-xs pb-1">
                      <p className="font-bold text-slate-700 dark:text-zinc-300">{act.content}</p>
                      <p className="text-slate-400 mt-0.5">{act.user} — {act.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add note */}
              {can('services', 'add_note') && (
                <div className="flex gap-2">
                  <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note or update..." onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} className="flex-1 rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none" />
                  <button onClick={handleAddNote} disabled={!newNote.trim()} className="px-3 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>Add Note</button>
                </div>
              )}
            </div>
          </div>
        )}
      </SlidePanel>
    </div>
  );
}
