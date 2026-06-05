'use client';

import React, { useState, useRef } from 'react';
import { useTenantStore, TenantBranding, AuthorizedPerson, defaultRolePermissions } from '../../../store/tenantStore';
import { useDashboardStore } from '../../../store/dashboardStore';
import { useCustomFieldsStore, EntityType, FieldType } from '../../../store/customFieldsStore';
import {
  Settings, Building2, Palette, Hash, Receipt, Bell, ShieldAlert, Globe,
  FileText, Save, RotateCcw, Check, ChevronRight, ToggleLeft, ToggleRight,
  Mail, MessageSquare, Clock, Lock, Eye, EyeOff, Printer, Trash2, Plus, RefreshCw,
  GripVertical, UploadCloud, Image, X, Users, Sun, Moon
} from 'lucide-react';

interface SettingToggle {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  icon: React.ReactNode;
  category: string;
}

export default function SettingsView() {
  const { activeTenant, toggleTenantFeature, updateTenantSettings, updateRolePermissions, resetNumberingSequence } = useTenantStore();
  const { setCurrentTab, theme, setTheme } = useDashboardStore();
  const { fields, addField, deleteField, toggleField, updateField } = useCustomFieldsStore();
  // Custom Fields Designer Form State
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('QUOTATION');
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>('TEXT');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldDefaultValue, setNewFieldDefaultValue] = useState('');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldFormula, setNewFieldFormula] = useState('');

  // Field Editing Form State
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editFieldLabel, setEditFieldLabel] = useState('');
  const [editFieldType, setEditFieldType] = useState<FieldType>('TEXT');
  const [editFieldRequired, setEditFieldRequired] = useState(false);
  const [editFieldOptions, setEditFieldOptions] = useState('');
  const [editFieldFormula, setEditFieldFormula] = useState('');

  // Organization Profile
  const [orgName, setOrgName] = useState(activeTenant.name);
  const [orgSlug, setOrgSlug] = useState(activeTenant.slug);
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST, UTC+5:30)');
  const [currency, setCurrency] = useState(activeTenant.currency);
  const [orgLogoUrl, setOrgLogoUrl] = useState(activeTenant.logoUrl || '');
  const [orgAddress, setOrgAddress] = useState(activeTenant.address || '');
  const [orgGstNumber, setOrgGstNumber] = useState(activeTenant.gstNumber || '');
  const [orgEmail, setOrgEmail] = useState(activeTenant.email || '');

  // Authorized Signatories
  const [authorizedPersons, setAuthorizedPersons] = useState<AuthorizedPerson[]>(activeTenant.authorizedPersons || []);
  const [newSigName, setNewSigName] = useState('');
  const [newSigDesignation, setNewSigDesignation] = useState('');
  const [newSigEmail, setNewSigEmail] = useState('');
  const [newSigPhone, setNewSigPhone] = useState('');
  const [newSigUrl, setNewSigUrl] = useState('');
  const sigFileInputRef = useRef<HTMLInputElement>(null);

  const handleAddSignatory = () => {
    if (!newSigName || !newSigDesignation) return;
    const newPerson: AuthorizedPerson = {
      id: `sig-${Date.now()}`,
      name: newSigName,
      designation: newSigDesignation,
      signatureUrl: newSigUrl || undefined,
      email: newSigEmail || undefined,
      phone: newSigPhone || undefined
    };
    setAuthorizedPersons(prev => [...prev, newPerson]);
    setNewSigName('');
    setNewSigDesignation('');
    setNewSigEmail('');
    setNewSigPhone('');
    setNewSigUrl('');
    if (sigFileInputRef.current) sigFileInputRef.current.value = '';
  };

  const handleDeleteSignatory = (id: string) => {
    setAuthorizedPersons(prev => prev.filter(p => p.id !== id));
  };

  const handleSigFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNewSigUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // File upload state & handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setOrgLogoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setOrgLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Branding
  const [primaryColor, setPrimaryColor] = useState(activeTenant.brandingConfig.primary);
  const [secondaryColor, setSecondaryColor] = useState(activeTenant.brandingConfig.secondary);

  // Document Numbering
  const [quoteFormat, setQuoteFormat] = useState(activeTenant.numberingFormats?.QUOTATION || 'QT-{YYYY}-{NNN}');
  const [poFormat, setPoFormat] = useState(activeTenant.numberingFormats?.PURCHASE_ORDER || 'PO-{YYYY}-{NNN}');
  const [invoiceFormat, setInvoiceFormat] = useState(activeTenant.numberingFormats?.INVOICE || 'INV-{YYYY}-{NNN}');
  const [serviceFormat, setServiceFormat] = useState(activeTenant.numberingFormats?.SERVICE || 'SVC-{YYYY}-{NNN}');

  React.useEffect(() => {
    setQuoteFormat(activeTenant.numberingFormats?.QUOTATION || 'QT-{YYYY}-{NNN}');
    setPoFormat(activeTenant.numberingFormats?.PURCHASE_ORDER || 'PO-{YYYY}-{NNN}');
    setInvoiceFormat(activeTenant.numberingFormats?.INVOICE || 'INV-{YYYY}-{NNN}');
    setServiceFormat(activeTenant.numberingFormats?.SERVICE || 'SVC-{YYYY}-{NNN}');
  }, [activeTenant.id, activeTenant.numberingFormats]);

  // Tax Config
  const [defaultTaxRate, setDefaultTaxRate] = useState(18);
  const [taxLabel, setTaxLabel] = useState('GST');
  const [taxIncluded, setTaxIncluded] = useState(false);

  // Feature Toggles mapped from Zustand store features
  const featureToggles: SettingToggle[] = [
    { id: 'email_notifications', label: 'Email Notifications', description: 'Send automated email alerts for quote approvals, overdue invoices, and SLA breaches.', enabled: activeTenant.features.email_notifications, icon: <Mail size={16} />, category: 'notifications' },
    { id: 'slack_integration', label: 'Slack Integration', description: 'Push real-time workflow notifications to configured Slack channels.', enabled: activeTenant.features.slack_integration, icon: <MessageSquare size={16} />, category: 'notifications' },
    { id: 'auto_reminders', label: 'Auto Payment Reminders', description: 'Automatically send payment reminders 3, 7, and 14 days before invoice due dates.', enabled: activeTenant.features.auto_reminders, icon: <Clock size={16} />, category: 'notifications' },
    { id: 'mfa_enforce', label: 'Enforce MFA', description: 'Require multi-factor authentication for all tenant users on login.', enabled: activeTenant.features.mfa_enforce, icon: <Lock size={16} />, category: 'security' },
    { id: 'ip_whitelist', label: 'IP Whitelisting', description: 'Restrict API access to pre-approved IP address ranges only.', enabled: activeTenant.features.ip_whitelist, icon: <ShieldAlert size={16} />, category: 'security' },
    { id: 'audit_trail', label: 'Full Audit Trail', description: 'Record granular state changes for all document create, update, and delete operations.', enabled: activeTenant.features.audit_trail, icon: <Eye size={16} />, category: 'security' },
    { id: 'auto_numbering', label: 'Auto Document Numbering', description: 'Automatically generate sequential document numbers using configured format patterns.', enabled: activeTenant.features.auto_numbering, icon: <Hash size={16} />, category: 'documents' },
    { id: 'pdf_watermark', label: 'Draft Watermark', description: 'Add a visible DRAFT watermark overlay on all non-finalized PDF exports.', enabled: activeTenant.features.pdf_watermark, icon: <FileText size={16} />, category: 'documents' },
    { id: 'esignature', label: 'E-Signature Capture', description: 'Enable digital signature fields on quotations and invoices for client approval.', enabled: activeTenant.features.esignature, icon: <Lock size={16} />, category: 'documents' },
    { id: 'auto_convert', label: 'Auto-Convert Approved Quotes', description: 'Automatically convert approved quotations into Purchase Orders or Invoices.', enabled: activeTenant.features.auto_convert, icon: <RotateCcw size={16} />, category: 'automation' },
    { id: 'formula_engine', label: 'Custom Formula Engine', description: 'Enable mathematical formula fields (e.g., subtotal * taxRate) in custom field definitions.', enabled: activeTenant.features.formula_engine, icon: <Hash size={16} />, category: 'automation' },
    { id: 'ai_copilot', label: 'AI Copilot Features', description: 'Enable AI-assisted document generation, T&C suggestions, and predictive analytics.', enabled: activeTenant.features.ai_copilot, icon: <Globe size={16} />, category: 'automation' },
  ];

  // Export Defaults
  const [pdfPageSize, setPdfPageSize] = useState('A4');
  const [pdfOrientation, setPdfOrientation] = useState('portrait');
  const [showPaymentQR, setShowPaymentQR] = useState(true);

  // Bank Details States
  const [bankAccountNo, setBankAccountNo] = useState(activeTenant.bankDetails?.accountNo || '');
  const [bankBeneficiaryName, setBankBeneficiaryName] = useState(activeTenant.bankDetails?.beneficiaryName || '');
  const [bankName, setBankName] = useState(activeTenant.bankDetails?.bankName || '');
  const [bankIfscCode, setBankIfscCode] = useState(activeTenant.bankDetails?.ifscCode || '');
  const [bankSwiftCode, setBankSwiftCode] = useState(activeTenant.bankDetails?.swiftCode || '');
  const [bankBranch, setBankBranch] = useState(activeTenant.bankDetails?.branch || '');

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeSection, setActiveSection] = useState('organization');

  const toggleFeature = (id: string) => {
    toggleTenantFeature(id as any);
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      // Apply profile & branding changes to tenant store
      updateTenantSettings({
        name: orgName,
        slug: orgSlug,
        currency: currency,
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
        logoUrl: orgLogoUrl,
        address: orgAddress,
        gstNumber: orgGstNumber,
        email: orgEmail,
        authorizedPersons: authorizedPersons,
        bankDetails: {
          accountNo: bankAccountNo,
          beneficiaryName: bankBeneficiaryName,
          bankName: bankName,
          ifscCode: bankIfscCode,
          swiftCode: bankSwiftCode,
          branch: bankBranch
        },
        numberingFormats: {
          QUOTATION: quoteFormat,
          PURCHASE_ORDER: poFormat,
          INVOICE: invoiceFormat,
          SERVICE: serviceFormat
        }
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
  };

  const handleAddCustomField = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName || !newFieldLabel) return;

    const cleanName = newFieldName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Prevent key conflicts with existing primary or dynamic fields
    const alreadyExists = fields.some(f => f.entityType === selectedEntity && f.name.toLowerCase() === cleanName);
    if (alreadyExists) {
      alert(`The unique key "${cleanName}" already exists for a primary or custom field in this module. Please use a different key.`);
      return;
    }

    addField({
      entityType: selectedEntity,
      name: cleanName,
      label: newFieldLabel,
      type: newFieldType,
      isRequired: newFieldRequired,
      defaultValue: newFieldDefaultValue || undefined,
      options: newFieldType === 'DROPDOWN' ? newFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
      formula: newFieldType === 'FORMULA' ? newFieldFormula : undefined,
      isActive: true
    });

    setNewFieldName('');
    setNewFieldLabel('');
    setNewFieldType('TEXT');
    setNewFieldRequired(false);
    setNewFieldDefaultValue('');
    setNewFieldOptions('');
    setNewFieldFormula('');
  };

  const sections = [
    { id: 'organization', label: 'Organization Profile', icon: <Building2 size={16} /> },
    { id: 'bank_details', label: 'Invoice Bank Accounts', icon: <Receipt size={16} /> },
    { id: 'branding', label: 'Branding & Theme', icon: <Palette size={16} /> },
    { id: 'numbering', label: 'Document Numbering', icon: <Hash size={16} /> },
    { id: 'tax', label: 'Tax Configuration', icon: <Receipt size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'security', label: 'Security & Access', icon: <ShieldAlert size={16} /> },
    { id: 'permissions', label: 'Roles & Permissions', icon: <ShieldAlert size={16} /> },
    { id: 'documents', label: 'Documents & Exports', icon: <FileText size={16} /> },
    { id: 'automation', label: 'Automation & AI', icon: <Globe size={16} /> },
    { id: 'custom_fields', label: 'Fields & Forms Configurator', icon: <Settings size={16} /> },
    { id: 'team', label: 'Team & Users →', icon: <Users size={16} /> },
  ];

  const renderToggleGroup = (category: string) => (
    <div className="space-y-3">
      {featureToggles.filter(t => t.category === category).map(toggle => (
        <div key={toggle.id} className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors">
          <div className="flex items-start gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${toggle.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-zinc-100 dark:bg-zinc-800 text-slate-400'}`}>
              {toggle.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{toggle.label}</p>
              <p className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 leading-relaxed">{toggle.description}</p>
            </div>
          </div>
          <button
            onClick={() => toggleFeature(toggle.id)}
            className="shrink-0 mt-1 transition-all duration-200"
          >
            {toggle.enabled ? (
              <ToggleRight size={28} className="text-emerald-500" />
            ) : (
              <ToggleLeft size={28} className="text-zinc-300 dark:text-zinc-600" />
            )}
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Settings</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">Configure workspace preferences, branding, document formats, security policies, and feature toggles.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-sm transition-all shadow-md ${
            saveStatus === 'saved'
              ? 'bg-emerald-500 text-white'
              : 'bg-zinc-900 text-white dark:bg-white dark:text-black hover:scale-[1.02]'
          } disabled:opacity-50`}
        >
          {saveStatus === 'saving' ? (
            <><RotateCcw size={14} className="animate-spin" /><span>Saving...</span></>
          ) : saveStatus === 'saved' ? (
            <><Check size={14} /><span>Saved!</span></>
          ) : (
            <><Save size={14} /><span>Save Changes</span></>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* SECTION NAVIGATION */}
        <div className="glass-card rounded-3xl p-4 border border-zinc-200/50 dark:border-zinc-800/40 h-fit lg:sticky lg:top-28">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 mb-3">Configuration Sections</p>
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => section.id === 'team' ? setCurrentTab('USERS') : setActiveSection(section.id)}
                className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  activeSection === section.id
                    ? 'bg-zinc-900/5 dark:bg-white/5 text-slate-900 dark:text-zinc-100'
                    : section.id === 'team'
                      ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5'
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20'
                }`}
              >
                <span className={activeSection === section.id ? '' : 'opacity-60'}>{section.icon}</span>
                <span>{section.label}</span>
                {activeSection === section.id && (
                  <ChevronRight size={12} className="ml-auto" style={{ color: activeTenant.brandingConfig.primary }} />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40">
            <button
              onClick={() => setCurrentTab('SUBSCRIPTIONS')}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
            >
              <Receipt size={14} />
              <span>Manage Subscription →</span>
            </button>
          </div>
        </div>

        {/* SETTINGS CONTENT AREA */}
        <div className="lg:col-span-3 space-y-6">

          {/* ORGANIZATION PROFILE */}
          {activeSection === 'organization' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Building2 size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Organization Profile</h3>
                  <p className="text-xs text-slate-400">Core identity and localization settings for your workspace.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Organization Name</label>
                  <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Workspace Slug</label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-r-0 border-zinc-200 dark:border-zinc-800 rounded-l-xl text-xs text-slate-400 font-mono">/org/</span>
                    <input type="text" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} className="flex-1 rounded-r-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-mono" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Default Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none">
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="AUD">AUD — Australian Dollar (A$)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none">
                    <option>Asia/Kolkata (IST, UTC+5:30)</option>
                    <option>America/New_York (EST, UTC-5)</option>
                    <option>America/Los_Angeles (PST, UTC-8)</option>
                    <option>Europe/London (GMT, UTC+0)</option>
                    <option>Europe/Berlin (CET, UTC+1)</option>
                    <option>Asia/Tokyo (JST, UTC+9)</option>
                    <option>Australia/Sydney (AEST, UTC+10)</option>
                  </select>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">GST Registration Number (GSTIN)</label>
                  <input
                    type="text"
                    value={orgGstNumber}
                    onChange={(e) => setOrgGstNumber(e.target.value.toUpperCase())}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-mono"
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Organization Dispatch Email</label>
                  <input
                    type="email"
                    value={orgEmail}
                    onChange={(e) => setOrgEmail(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold"
                    placeholder="e.g. billing@myorganization.com"
                  />
                </div>
                      <div className="space-y-2 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Company Brand Logo</label>
                  
                  {/* File Upload Zone & Live Preview Split */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Clickable Drag & Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
                        isDragging
                          ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 scale-[0.98]'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/70 hover:bg-zinc-50 dark:hover:bg-zinc-900/30'
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                      
                      <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full text-slate-400 dark:text-zinc-500 mb-3 transition-transform hover:scale-110">
                        <UploadCloud size={20} className="text-slate-500 dark:text-zinc-400" />
                      </div>
                      
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        Drag and drop image here, or <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse</span>
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                        Supports PNG, JPG, or SVG up to 2MB
                      </p>
                    </div>

                    {/* Live Preview & URL Config Box */}
                    <div className="flex flex-col justify-between border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 bg-zinc-50/50 dark:bg-zinc-900/10">
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest block">Logo Preview</span>
                        
                        {orgLogoUrl ? (
                          <div className="relative border border-zinc-200/50 dark:border-zinc-800/40 rounded-xl p-3 bg-white flex items-center justify-center h-20 shadow-xs max-w-[200px]">
                            <img src={orgLogoUrl} alt="Company Logo" className="max-h-full max-w-full object-contain" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveLogo();
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full transition-transform active:scale-95 shadow-sm"
                              title="Remove Logo"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ) : (
                          <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-white/50 dark:bg-zinc-900/5 flex flex-col items-center justify-center h-20 text-slate-300 dark:text-zinc-700">
                            <Image size={24} className="text-slate-300 dark:text-zinc-700 mb-1" />
                            <span className="text-[10px] font-medium">No Logo Configured</span>
                          </div>
                        )}
                      </div>

                      {/* Direct Input for Advanced Users */}
                      <div className="space-y-1 mt-3">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 block uppercase">Or use Direct Logo URL</label>
                        <input
                          type="text"
                          value={orgLogoUrl}
                          onChange={(e) => setOrgLogoUrl(e.target.value)}
                          className="w-full rounded-xl px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                          placeholder="e.g. https://example.com/logo.png"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                    This branding asset serves as the default logo for all generated document print views unless overridden.
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Global Company Address</label>
                  <textarea value={orgAddress} onChange={(e) => setOrgAddress(e.target.value)} rows={3} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 leading-relaxed" placeholder="Suite 100, Tech Towers, Silicon Valley, CA 94025" />
                  <p className="text-[10px] text-slate-400 mt-1">This organization address will print in the header section of exported PDFs by default.</p>
                </div>

                {/* Authorized Signatories Section */}
                <div className="sm:col-span-2 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-6 mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">Authorized Signatories</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Manage personnel authorized to sign documents, agreements, and support SLAs.</p>
                  </div>

                  {/* List of Signatories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {authorizedPersons.length === 0 ? (
                      <div className="md:col-span-2 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-slate-400 dark:text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/10">
                        <Users size={24} className="mx-auto mb-2 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-xs font-semibold">No signatories configured yet.</p>
                      </div>
                    ) : (
                      authorizedPersons.map(person => (
                        <div key={person.id} className="flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-900/15 border border-zinc-200/50 dark:border-zinc-800/30 rounded-2xl">
                          <div className="flex items-center gap-3">
                            {person.signatureUrl ? (
                              <div className="h-10 w-20 shrink-0 bg-white border border-zinc-200/50 rounded-xl p-1 flex items-center justify-center shadow-xs">
                                <img src={person.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
                              </div>
                            ) : (
                              <div className="h-10 w-20 shrink-0 bg-white border border-dashed border-zinc-200/50 rounded-xl flex items-center justify-center text-[8px] text-zinc-300 dark:text-zinc-700 font-mono">No Signature</div>
                            )}
                            <div>
                              <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">{person.name}</p>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{person.designation}</p>
                              {(person.email || person.phone) && (
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {person.email && <span>{person.email}</span>}
                                  {person.email && person.phone && <span className="mx-1">&bull;</span>}
                                  {person.phone && <span>{person.phone}</span>}
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteSignatory(person.id)}
                            className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                            title="Remove Signatory"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add New Signatory Mini-Form */}
                  <div className="border border-zinc-200/50 dark:border-zinc-800/40 rounded-2xl p-4 bg-zinc-50/30 dark:bg-zinc-900/5 space-y-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Add Authorized Signatory</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Signatory Full Name</label>
                        <input
                          type="text"
                          value={newSigName}
                          onChange={(e) => setNewSigName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Designation / Title</label>
                        <input
                          type="text"
                          value={newSigDesignation}
                          onChange={(e) => setNewSigDesignation(e.target.value)}
                          placeholder="e.g. Director of Operations"
                          className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Signatory Email (Optional)</label>
                        <input
                          type="email"
                          value={newSigEmail}
                          onChange={(e) => setNewSigEmail(e.target.value)}
                          placeholder="e.g. john@example.com"
                          className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500">Signatory Phone (Optional)</label>
                        <input
                          type="text"
                          value={newSigPhone}
                          onChange={(e) => setNewSigPhone(e.target.value)}
                          placeholder="e.g. +1 (555) 019-2834"
                          className="w-full rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-500">Digital Signature (Optional image upload)</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            ref={sigFileInputRef}
                            accept="image/*"
                            onChange={handleSigFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => sigFileInputRef.current?.click()}
                            className="px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                          >
                            <UploadCloud size={14} /> Upload Signature Image
                          </button>
                          {newSigUrl ? (
                            <div className="relative h-10 w-20 bg-white border border-zinc-200/50 rounded-xl p-1 flex items-center justify-center">
                              <img src={newSigUrl} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setNewSigUrl('')}
                                className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-500 text-white rounded-full hover:bg-rose-600 transition-colors"
                              >
                                <X size={8} />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No signature image chosen</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!newSigName || !newSigDesignation}
                      onClick={handleAddSignatory}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-zinc-900 dark:bg-white dark:text-black disabled:opacity-40 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Plus size={14} /> Add Signatory
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BANK DETAILS */}
          {activeSection === 'bank_details' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Receipt size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Invoice Bank Accounts</h3>
                  <p className="text-xs text-slate-400">Configure default payment credentials printed on generated tax invoices.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Beneficiary Name</label>
                  <input
                    type="text"
                    value={bankBeneficiaryName}
                    onChange={(e) => setBankBeneficiaryName(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                    placeholder="e.g. INNOVAIT SYSTEMS"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Bank Name</label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                    placeholder="e.g. HDFC Bank"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Account Number</label>
                  <input
                    type="text"
                    value={bankAccountNo}
                    onChange={(e) => setBankAccountNo(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono"
                    placeholder="e.g. A/c No : 50200012345678"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Branch Location</label>
                  <input
                    type="text"
                    value={bankBranch}
                    onChange={(e) => setBankBranch(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                    placeholder="e.g. Tirunelveli"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">IFSC Code</label>
                  <input
                    type="text"
                    value={bankIfscCode}
                    onChange={(e) => setBankIfscCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono uppercase"
                    placeholder="e.g. HDFC0000123"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Swift Code</label>
                  <input
                    type="text"
                    value={bankSwiftCode}
                    onChange={(e) => setBankSwiftCode(e.target.value.toUpperCase())}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono uppercase"
                    placeholder="e.g. HDFCINBBXXX"
                  />
                </div>
              </div>
            </div>
          )}

          {/* BRANDING */}
          {activeSection === 'branding' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Palette size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Branding & Theme</h3>
                  <p className="text-xs text-slate-400">Customize colors used across the dashboard, PDF exports, and email templates.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Primary Brand Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-14 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer" />
                    <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono uppercase" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Secondary Accent Color</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="h-10 w-14 rounded-lg border border-zinc-200 dark:border-zinc-800 cursor-pointer" />
                    <input type="text" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono uppercase" />
                  </div>
                </div>
              </div>
              
              {/* Default App Theme Option */}
              <div className="border-t border-zinc-200/50 dark:border-zinc-800/40 pt-6 mt-6 mb-6">
                <label className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-3">Default App Theme</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Light Theme Card */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-start gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative hover:scale-[1.01] ${
                      theme === 'light'
                        ? 'border-indigo-500 bg-white dark:bg-zinc-900 shadow-lg ring-2 ring-indigo-500/20'
                        : 'border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-50/50 dark:bg-zinc-900/10 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                    style={theme === 'light' ? { borderColor: activeTenant.brandingConfig.primary } : {}}
                  >
                    <div 
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${theme === 'light' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-slate-400'}`} 
                      style={theme === 'light' ? { backgroundColor: `${activeTenant.brandingConfig.primary}1a`, color: activeTenant.brandingConfig.primary } : {}}
                    >
                      <Sun size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        Light Theme
                        {theme === 'light' && (
                          <span 
                            className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" 
                            style={{ backgroundColor: activeTenant.brandingConfig.primary }} 
                          />
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 leading-relaxed">
                        Sleek, clean aesthetic for high-contrast visibility and document layout planning.
                      </p>
                    </div>
                  </button>

                  {/* Dark Theme Card */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-start gap-4 p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative hover:scale-[1.01] ${
                      theme === 'dark'
                        ? 'border-indigo-500 bg-white dark:bg-zinc-900 shadow-lg ring-2 ring-indigo-500/20'
                        : 'border-zinc-200/50 dark:border-zinc-800/30 bg-zinc-50/50 dark:bg-zinc-900/10 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                    style={theme === 'dark' ? { borderColor: activeTenant.brandingConfig.primary } : {}}
                  >
                    <div 
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${theme === 'dark' ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800 text-slate-400'}`} 
                      style={theme === 'dark' ? { backgroundColor: `${activeTenant.brandingConfig.primary}1a`, color: activeTenant.brandingConfig.primary } : {}}
                    >
                      <Moon size={20} />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        Dark Theme
                        {theme === 'dark' && (
                          <span 
                            className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" 
                            style={{ backgroundColor: activeTenant.brandingConfig.primary }} 
                          />
                        )}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1 leading-relaxed">
                        Deep rich dark-indigo canvas. Comfortable viewing during low-light sessions.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Live Theme Preview</p>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="h-12 w-12 rounded-2xl shadow-lg" style={{ backgroundColor: primaryColor }} />
                  <div className="h-12 w-12 rounded-2xl shadow-lg" style={{ backgroundColor: secondaryColor }} />
                  <div className="h-12 flex-1 rounded-2xl flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                    Gradient Preview
                  </div>
                  <button className="px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:scale-[1.02] transition-all" style={{ backgroundColor: primaryColor }}>
                    Sample Button
                  </button>
                  <span className="px-3 py-1 rounded-full text-xs font-bold border" style={{ color: primaryColor, borderColor: `${primaryColor}30`, backgroundColor: `${primaryColor}10` }}>
                    Sample Badge
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT NUMBERING */}
          {activeSection === 'numbering' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Hash size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Document Numbering Formats</h3>
                  <p className="text-xs text-slate-400">Configure auto-numbering patterns for each document type. Use {'{YYYY}'} for year, {'{NNN}'} for sequential number.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {[
                  { key: 'QUOTATION', label: 'Quotation Number Format', value: quoteFormat, setter: setQuoteFormat, preview: 'QT-2026-0045' },
                  { key: 'PURCHASE_ORDER', label: 'Purchase Order Format', value: poFormat, setter: setPoFormat, preview: 'PO-2026-0012' },
                  { key: 'INVOICE', label: 'Invoice Number Format', value: invoiceFormat, setter: setInvoiceFormat, preview: 'INV-2026-0089' },
                  { key: 'SERVICE', label: 'Service Ticket Format', value: serviceFormat, setter: setServiceFormat, preview: 'SVC-2026-0003' },
                ].map(field => {
                  const currentSeq = activeTenant.numberingSequences?.[field.key as 'QUOTATION' | 'PURCHASE_ORDER' | 'INVOICE' | 'SERVICE'] || 1;
                  return (
                    <div key={field.label} className="space-y-1.5 p-4 bg-zinc-50/50 dark:bg-zinc-900/10 border border-zinc-200/40 dark:border-zinc-800/30 rounded-2xl">
                      <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">{field.label}</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => field.setter(e.target.value)}
                          className="flex-1 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            resetNumberingSequence(field.key as any);
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center justify-center shrink-0 active:scale-95 cursor-pointer"
                          title="Reset Sequence to 1"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Preview: <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">{field.preview}</span></span>
                        <span>Next Sequence: <span className="font-mono font-bold text-indigo-500">{currentSeq}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAX CONFIGURATION */}
          {activeSection === 'tax' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Receipt size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Tax Configuration</h3>
                  <p className="text-xs text-slate-400">Set default tax rates and behavior for line item calculations across all documents.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Default Tax Rate (%)</label>
                  <input type="number" min={0} max={100} step={0.5} value={defaultTaxRate} onChange={(e) => setDefaultTaxRate(parseFloat(e.target.value) || 0)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Tax Label</label>
                  <select value={taxLabel} onChange={(e) => setTaxLabel(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none">
                    <option value="GST">GST (Goods & Services Tax)</option>
                    <option value="VAT">VAT (Value Added Tax)</option>
                    <option value="Sales Tax">Sales Tax</option>
                    <option value="Custom">Custom Label</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Tax Calculation</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button onClick={() => setTaxIncluded(!taxIncluded)} className="shrink-0">
                      {taxIncluded ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-zinc-300 dark:text-zinc-600" />}
                    </button>
                    <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{taxIncluded ? 'Tax-inclusive pricing' : 'Tax-exclusive pricing'}</span>
                  </div>
                </div>
              </div>
              {/* Tax Preview */}
              <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/30">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Calculation Preview</p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-400">Item Price</span><span className="font-bold">$1,000.00</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">{taxLabel} ({defaultTaxRate}%)</span><span className="font-bold">${(1000 * defaultTaxRate / 100).toFixed(2)}</span></div>
                  <div className="flex justify-between pt-1 border-t border-zinc-200/50 dark:border-zinc-800/30"><span className="font-extrabold text-slate-800 dark:text-zinc-100">Total</span><span className="font-extrabold">${(1000 + 1000 * defaultTaxRate / 100).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === 'notifications' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Bell size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Notifications</h3>
                  <p className="text-xs text-slate-400">Control how and when your team receives operational alerts and reminders.</p>
                </div>
              </div>
              {renderToggleGroup('notifications')}
            </div>
          )}

          {/* SECURITY */}
          {activeSection === 'security' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <ShieldAlert size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Security & Access Control</h3>
                  <p className="text-xs text-slate-400">Enforce authentication policies, compliance tracking, and access restrictions.</p>
                </div>
              </div>
              {renderToggleGroup('security')}
            </div>
          )}

          {/* ROLES & PERMISSIONS */}
          {activeSection === 'permissions' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <ShieldAlert size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Roles & Permissions Matrix</h3>
                  <p className="text-xs text-slate-400">Configure what actions each team role is authorized to perform. Tenant Admin and Super Admin permissions are locked to full access.</p>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-zinc-200/50 dark:border-zinc-800/30">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200/50 dark:border-zinc-800/30">
                      <th className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400">Resource / Action</th>
                      <th className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400 text-center">
                        <span className="block font-bold">Tenant Admin</span>
                        <span className="text-[10px] font-normal text-slate-400">(Locked)</span>
                      </th>
                      <th className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400 text-center">Finance Staff</th>
                      <th className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400 text-center">Sales Executive</th>
                      <th className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400 text-center">Operations Staff</th>
                      <th className="p-4 text-xs font-bold text-slate-500 dark:text-zinc-400 text-center">Guest Viewer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/30">
                    {/* QUOTATIONS RESOURCE */}
                    <tr className="bg-zinc-100/30 dark:bg-zinc-900/10 font-bold">
                      <td colSpan={6} className="p-3 text-xs uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        Quotations Management
                      </td>
                    </tr>
                    {(['create', 'edit', 'approve', 'convert', 'export'] as const).map(action => (
                      <tr key={`quotations-${action}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-zinc-300 capitalize">
                          {action.replace('_', ' ')} Quotation
                        </td>
                        {/* Tenant Admin (Always true/locked) */}
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={true} disabled={true} className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 opacity-60" />
                        </td>
                        {/* Finance */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).FINANCE.quotations[action]}
                            onChange={(e) => updateRolePermissions('FINANCE', 'quotations', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Sales */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).SALES.quotations[action]}
                            onChange={(e) => updateRolePermissions('SALES', 'quotations', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Operations */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).OPERATIONS.quotations[action]}
                            onChange={(e) => updateRolePermissions('OPERATIONS', 'quotations', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Viewer */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).VIEWER.quotations[action]}
                            onChange={(e) => updateRolePermissions('VIEWER', 'quotations', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}

                    {/* INVOICES RESOURCE */}
                    <tr className="bg-zinc-100/30 dark:bg-zinc-900/10 font-bold">
                      <td colSpan={6} className="p-3 text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Invoices Management
                      </td>
                    </tr>
                    {(['create', 'edit', 'send', 'record_payment'] as const).map(action => (
                      <tr key={`invoices-${action}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-zinc-300 capitalize">
                          {action.replace('_', ' ')}
                        </td>
                        {/* Tenant Admin (Always true/locked) */}
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={true} disabled={true} className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 opacity-60" />
                        </td>
                        {/* Finance */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).FINANCE.invoices[action]}
                            onChange={(e) => updateRolePermissions('FINANCE', 'invoices', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Sales */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).SALES.invoices[action]}
                            onChange={(e) => updateRolePermissions('SALES', 'invoices', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Operations */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).OPERATIONS.invoices[action]}
                            onChange={(e) => updateRolePermissions('OPERATIONS', 'invoices', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Viewer */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).VIEWER.invoices[action]}
                            onChange={(e) => updateRolePermissions('VIEWER', 'invoices', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}

                    {/* PURCHASE ORDERS RESOURCE */}
                    <tr className="bg-zinc-100/30 dark:bg-zinc-900/10 font-bold">
                      <td colSpan={6} className="p-3 text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        Purchase Orders Management
                      </td>
                    </tr>
                    {(['create', 'edit', 'approve', 'receive_goods'] as const).map(action => (
                      <tr key={`purchase_orders-${action}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-zinc-300 capitalize">
                          {action.replace('_', ' ')}
                        </td>
                        {/* Tenant Admin (Always true/locked) */}
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={true} disabled={true} className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 opacity-60" />
                        </td>
                        {/* Finance */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).FINANCE.purchase_orders[action]}
                            onChange={(e) => updateRolePermissions('FINANCE', 'purchase_orders', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Sales */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).SALES.purchase_orders[action]}
                            onChange={(e) => updateRolePermissions('SALES', 'purchase_orders', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Operations */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).OPERATIONS.purchase_orders[action]}
                            onChange={(e) => updateRolePermissions('OPERATIONS', 'purchase_orders', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Viewer */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).VIEWER.purchase_orders[action]}
                            onChange={(e) => updateRolePermissions('VIEWER', 'purchase_orders', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}

                    {/* SERVICES RESOURCE */}
                    <tr className="bg-zinc-100/30 dark:bg-zinc-900/10 font-bold">
                      <td colSpan={6} className="p-3 text-xs uppercase tracking-wider text-rose-600 dark:text-rose-400">
                        Services / Job Cards Management
                      </td>
                    </tr>
                    {(['create', 'edit', 'update_status', 'add_note'] as const).map(action => (
                      <tr key={`services-${action}`} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                        <td className="p-4 text-xs font-semibold text-slate-700 dark:text-zinc-300 capitalize">
                          {action.replace('_', ' ')}
                        </td>
                        {/* Tenant Admin (Always true/locked) */}
                        <td className="p-4 text-center">
                          <input type="checkbox" checked={true} disabled={true} className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 opacity-60" />
                        </td>
                        {/* Finance */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).FINANCE.services[action]}
                            onChange={(e) => updateRolePermissions('FINANCE', 'services', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Sales */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).SALES.services[action]}
                            onChange={(e) => updateRolePermissions('SALES', 'services', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Operations */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).OPERATIONS.services[action]}
                            onChange={(e) => updateRolePermissions('OPERATIONS', 'services', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                        {/* Viewer */}
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={!!(activeTenant.rolePermissions || defaultRolePermissions).VIEWER.services[action]}
                            onChange={(e) => updateRolePermissions('VIEWER', 'services', action, e.target.checked)}
                            className="rounded h-4 w-4 text-indigo-600 border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DOCUMENTS & EXPORTS */}
          {activeSection === 'documents' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <FileText size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Documents & Exports</h3>
                  <p className="text-xs text-slate-400">Configure PDF generation defaults and document-level feature flags.</p>
                </div>
              </div>
              {renderToggleGroup('documents')}

              <div className="mt-6 pt-6 border-t border-zinc-200/50 dark:border-zinc-800/40">
                <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-4">Export Defaults</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">PDF Page Size</label>
                    <select value={pdfPageSize} onChange={(e) => setPdfPageSize(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none">
                      <option value="A4">A4 (210 × 297 mm)</option>
                      <option value="Letter">Letter (8.5 × 11 in)</option>
                      <option value="Legal">Legal (8.5 × 14 in)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Orientation</label>
                    <select value={pdfOrientation} onChange={(e) => setPdfOrientation(e.target.value)} className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none">
                      <option value="portrait">Portrait</option>
                      <option value="landscape">Landscape</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-500 dark:text-zinc-400">Payment QR Code</label>
                    <div className="flex items-center gap-3 mt-1">
                      <button onClick={() => setShowPaymentQR(!showPaymentQR)} className="shrink-0">
                        {showPaymentQR ? <ToggleRight size={28} className="text-emerald-500" /> : <ToggleLeft size={28} className="text-zinc-300 dark:text-zinc-600" />}
                      </button>
                      <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">{showPaymentQR ? 'Show on invoices' : 'Hidden'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AUTOMATION & AI */}
          {activeSection === 'automation' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Globe size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Automation & AI</h3>
                  <p className="text-xs text-slate-400">Control workflow automations, formula evaluation engines, and AI copilot features.</p>
                </div>
              </div>
              {renderToggleGroup('automation')}
            </div>
          )}

          {/* CUSTOM FIELDS DESIGNER */}
          {activeSection === 'custom_fields' && (
            <div className="glass-card rounded-3xl p-6 border border-zinc-200/50 dark:border-zinc-800/40 animate-in fade-in duration-200">
              <div className="flex items-center gap-3 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
                <Settings size={18} style={{ color: activeTenant.brandingConfig.primary }} />
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Fields & Forms Configurator</h3>
                  <p className="text-xs text-slate-400">Manage field labels, types, requirements, and visibilities for static and dynamic fields across all modules.</p>
                </div>
              </div>

              {/* Entity Selector Tabs */}
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl mb-6">
                {(['QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'SERVICE'] as EntityType[]).map((entity) => (
                  <button
                    key={entity}
                    type="button"
                    onClick={() => {
                      setSelectedEntity(entity);
                      setEditingFieldId(null);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      selectedEntity === entity
                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-50 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-300'
                    }`}
                  >
                    {entity.replace('_', ' ')}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* List and manage custom fields */}
                <div className="xl:col-span-2 space-y-4">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active & Seeded Form Fields</p>
                  
                  <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                    {fields.filter(f => f.entityType === selectedEntity).length === 0 ? (
                      <p className="text-sm text-slate-400 italic text-center py-6">No fields defined yet for this service type.</p>
                    ) : (
                      fields.filter(f => f.entityType === selectedEntity).map(field => (
                        <div key={field.id} className="flex flex-col p-4 bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200/40 dark:border-zinc-800/30 rounded-2xl">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">{field.label}</span>
                                <span className="text-[9px] font-mono bg-zinc-200 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{field.type}</span>
                                {field.isStatic ? (
                                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded-full dark:text-indigo-400">Primary Field</span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded-full dark:text-emerald-400">Dynamic Field</span>
                                )}
                                {field.isRequired && <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest bg-rose-500/10 px-1.5 py-0.5 rounded-full">Required</span>}
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">Key: {field.name}</p>
                              {field.defaultValue && <p className="text-[10px] text-slate-400 mt-0.5">Default: {field.defaultValue}</p>}
                              {field.formula && <p className="text-[10px] text-indigo-500 font-mono mt-0.5">Formula: {field.formula}</p>}
                              {field.options && field.options.length > 0 && <p className="text-[10px] text-slate-400 mt-0.5">Options: {field.options.join(', ')}</p>}
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingFieldId === field.id) {
                                    setEditingFieldId(null);
                                  } else {
                                    setEditingFieldId(field.id);
                                    setEditFieldLabel(field.label);
                                    setEditFieldType(field.type);
                                    setEditFieldRequired(field.isRequired);
                                    setEditFieldOptions(field.options ? field.options.join(', ') : '');
                                    setEditFieldFormula(field.formula || '');
                                  }
                                }}
                                className="text-xs font-bold px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                              >
                                {editingFieldId === field.id ? 'Cancel' : 'Edit'}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => toggleField(field.id)}
                                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all ${
                                  field.isActive 
                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                    : 'bg-zinc-100 text-slate-400 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'
                                }`}
                              >
                                {field.isActive ? 'Active' : 'Inactive'}
                              </button>
                              
                              {!field.isStatic && (
                                <button
                                  type="button"
                                  onClick={() => deleteField(field.id)}
                                  className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1"
                                >
                                  <Trash2 size={12} />
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>

                          {/* INLINE EDIT FORM */}
                          {editingFieldId === field.id && (
                            <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/40 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-in slide-in-from-top-1 duration-200">
                              <div className="space-y-1.5">
                                <label className="font-bold text-slate-500">Field Label</label>
                                <input
                                  type="text"
                                  value={editFieldLabel}
                                  onChange={(e) => setEditFieldLabel(e.target.value)}
                                  className="w-full rounded-lg px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="font-bold text-slate-500">Input UI Type</label>
                                <select
                                  value={editFieldType}
                                  onChange={(e) => setEditFieldType(e.target.value as FieldType)}
                                  className="w-full rounded-lg px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-semibold text-slate-700 dark:text-zinc-300"
                                >
                                  <option value="TEXT">Short Text Input</option>
                                  <option value="NUMBER">Number Input</option>
                                  <option value="CURRENCY">Currency Input</option>
                                  <option value="DATE">Date Selection</option>
                                  <option value="DROPDOWN">Dropdown List Select</option>
                                  <option value="CHECKBOX">Checkbox Toggle</option>
                                  <option value="RICH_TEXT">Rich Text Area</option>
                                  <option value="TEXTAREA">Multiline Textarea</option>
                                  {!field.isStatic && <option value="FORMULA">Calculated Formula</option>}
                                </select>
                              </div>

                              {editFieldType === 'DROPDOWN' && (
                                <div className="space-y-1.5 sm:col-span-2">
                                  <label className="font-bold text-slate-500">Dropdown Options (Comma-separated)</label>
                                  <input
                                    type="text"
                                    value={editFieldOptions}
                                    onChange={(e) => setEditFieldOptions(e.target.value)}
                                    placeholder="Option A, Option B, Option C"
                                    className="w-full rounded-lg px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                                  />
                                </div>
                              )}

                              {editFieldType === 'FORMULA' && !field.isStatic && (
                                <div className="space-y-1.5 sm:col-span-2">
                                  <label className="font-bold text-slate-500">Mathematical Formula</label>
                                  <input
                                    type="text"
                                    value={editFieldFormula}
                                    onChange={(e) => setEditFieldFormula(e.target.value)}
                                    className="w-full rounded-lg px-2.5 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono"
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editFieldRequired}
                                  onChange={(e) => setEditFieldRequired(e.target.checked)}
                                  className="rounded h-4 w-4 text-indigo-600 border-gray-300"
                                  id={`edit-req-${field.id}`}
                                />
                                <label htmlFor={`edit-req-${field.id}`} className="font-bold text-slate-600 dark:text-zinc-400 cursor-pointer">Enforce Required</label>
                              </div>

                              <div className="flex justify-end gap-2 sm:col-span-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    updateField(field.id, {
                                      label: editFieldLabel,
                                      type: editFieldType,
                                      isRequired: editFieldRequired,
                                      options: editFieldType === 'DROPDOWN' ? editFieldOptions.split(',').map(o => o.trim()).filter(Boolean) : undefined,
                                      formula: editFieldType === 'FORMULA' ? editFieldFormula : undefined,
                                    });
                                    setEditingFieldId(null);
                                  }}
                                  className="px-3 py-2 rounded-xl text-white font-bold text-[10px]"
                                  style={{ backgroundColor: activeTenant.brandingConfig.primary }}
                                >
                                  Save Configurations
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add new field form */}
                <div className="bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/40 p-5 rounded-3xl h-fit">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Add Dynamic Custom Field</p>
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl mb-4 text-[10px] text-slate-500 dark:text-zinc-400 leading-relaxed font-semibold">
                    💡 <strong>Important Scope:</strong> Primary fields (e.g. contact name, billing terms, budget, SLA location) are built-in and can be activated or customized in the cards list above. Use this form to add user-defined dynamic custom fields.
                  </div>
                  <form onSubmit={handleAddCustomField} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500">Field Label</label>
                      <input 
                        type="text" 
                        value={newFieldLabel} 
                        onChange={(e) => { 
                          setNewFieldLabel(e.target.value); 
                          if(!newFieldName) setNewFieldName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')); 
                        }} 
                        placeholder="e.g. Warranty Months" 
                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none" 
                        required 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500">Field Unique Key</label>
                      <input 
                        type="text" 
                        value={newFieldName} 
                        onChange={(e) => setNewFieldName(e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())} 
                        placeholder="e.g. warranty_months" 
                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono" 
                        required 
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500">Field Type</label>
                      <select 
                        value={newFieldType} 
                        onChange={(e) => setNewFieldType(e.target.value as FieldType)} 
                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none"
                      >
                        <option value="TEXT">Short Text</option>
                        <option value="NUMBER">Number</option>
                        <option value="CURRENCY">Currency</option>
                        <option value="DATE">Date</option>
                        <option value="DROPDOWN">Dropdown List</option>
                        <option value="CHECKBOX">Checkbox Option</option>
                        <option value="RICH_TEXT">Rich Text Area</option>
                        <option value="FORMULA">Calculated Formula</option>
                      </select>
                    </div>

                    {newFieldType === 'DROPDOWN' && (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-500">Dropdown Options</label>
                        <input 
                          type="text" 
                          value={newFieldOptions} 
                          onChange={(e) => setNewFieldOptions(e.target.value)} 
                          placeholder="Option A, Option B, Option C" 
                          className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none" 
                          required 
                        />
                        <p className="text-[10px] text-slate-400">Comma-separated values.</p>
                      </div>
                    )}

                    {newFieldType === 'FORMULA' && (
                      <div className="space-y-1.5">
                        <label className="font-bold text-slate-500">Mathematical Formula</label>
                        <input 
                          type="text" 
                          value={newFieldFormula} 
                          onChange={(e) => setNewFieldFormula(e.target.value)} 
                          placeholder="e.g. subTotal * 0.05" 
                          className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none font-mono" 
                          required 
                        />
                        <p className="text-[10px] text-slate-400">Available variables: `subTotal`, `taxTotal`, `discountTotal` or other number keys.</p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-500">Default Value (Optional)</label>
                      <input 
                        type="text" 
                        value={newFieldDefaultValue} 
                        onChange={(e) => setNewFieldDefaultValue(e.target.value)} 
                        placeholder="e.g. 12" 
                        className="w-full rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none" 
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        checked={newFieldRequired} 
                        onChange={(e) => setNewFieldRequired(e.target.checked)} 
                        className="rounded h-4 w-4 text-indigo-600 border-gray-300" 
                        id="req" 
                      />
                      <label htmlFor="req" className="font-bold text-slate-600 dark:text-zinc-400 cursor-pointer">Enforce Required Constraint</label>
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-black font-bold text-xs hover:scale-[1.02] transition-all shadow-md mt-4 flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} />
                      <span>Create Dynamic Field</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
