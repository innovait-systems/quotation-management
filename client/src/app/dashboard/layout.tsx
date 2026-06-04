'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore } from '../../store/tenantStore';
import UserProfilePanel from '../../components/UserProfilePanel';
import { useDashboardStore, DashboardTab } from '../../store/dashboardStore';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingBag, 
  CreditCard, 
  Wrench, 
  Settings, 
  ChevronDown, 
  ShieldAlert, 
  Activity, 
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  UserCheck,
  UserCog,
  Building2,
  BellRing,
  Sparkles,
  ShieldCheck,
  Wallet,
  Printer,
  Users,
  Files,
  Sun,
  Moon,
  X,
  Check,
  CheckCheck,
  Inbox,
  AlertCircle,
  Info,
  UserPlus,
  Trash2
} from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';


interface SidebarItem {
  tab: DashboardTab;
  label: string;
  icon: any;
  roles: string[];
}

const sidebarItems: SidebarItem[] = [
  { tab: 'DASHBOARD', label: 'Dashboard Hub', icon: LayoutDashboard, roles: ['TENANT_ADMIN', 'FINANCE', 'SALES', 'OPERATIONS', 'VIEWER'] },
  { tab: 'QUOTATIONS', label: 'Quotations', icon: FileText, roles: ['TENANT_ADMIN', 'SALES', 'VIEWER'] },
  { tab: 'PURCHASE_ORDERS', label: 'Purchase Orders', icon: ShoppingBag, roles: ['TENANT_ADMIN', 'OPERATIONS', 'VIEWER'] },
  { tab: 'INVOICES', label: 'Invoices Pipeline', icon: CreditCard, roles: ['TENANT_ADMIN', 'FINANCE', 'VIEWER'] },
  // Next Phase: { tab: 'SERVICES', label: 'Service SLAs', icon: Wrench, roles: ['TENANT_ADMIN', 'OPERATIONS', 'VIEWER'] },
  { tab: 'AGREEMENTS', label: 'Agreements & Docs', icon: Files, roles: ['TENANT_ADMIN', 'SALES', 'FINANCE', 'OPERATIONS', 'VIEWER'] },
  { tab: 'CUSTOMERS', label: 'Customers', icon: Users, roles: ['TENANT_ADMIN', 'SALES', 'FINANCE', 'VIEWER'] },
  { tab: 'TEMPLATES', label: 'Document Templates', icon: Printer, roles: ['TENANT_ADMIN'] },
  // Next Phase: { tab: 'AI_COPILOT', label: 'AI Workspace', icon: Sparkles, roles: ['TENANT_ADMIN', 'SALES'] },
  // Next Phase: { tab: 'COMPLIANCE', label: 'SOC2 Ledger', icon: ShieldCheck, roles: ['TENANT_ADMIN'] },
  { tab: 'COMPANIES', label: 'Organizations', icon: Building2, roles: ['SUPER_ADMIN'] },
  { tab: 'SAAS_SUBSCRIPTIONS', label: 'Subscriptions', icon: Wallet, roles: ['SUPER_ADMIN'] },
  { tab: 'USERS', label: 'Team & Roles', icon: UserCog, roles: ['TENANT_ADMIN'] },
  { tab: 'SETTINGS', label: 'Settings', icon: Settings, roles: ['TENANT_ADMIN'] },
  { tab: 'SUBSCRIPTIONS', label: 'Subscriptions', icon: Wallet, roles: ['TENANT_ADMIN'] }
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Tenant Admin',
  FINANCE: 'Finance Staff',
  SALES: 'Sales Executive',
  OPERATIONS: 'Operations Staff',
  VIEWER: 'Guest Viewer',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { activeTenant, tenantsList, currentUser, activeRole, users, setActiveTenant, switchUser, addTenant, isAuthenticated, logout } = useTenantStore();
  const { currentTab, setCurrentTab, sidebarCollapsed, toggleSidebar, theme, toggleTheme, setTheme } = useDashboardStore();
  const router = useRouter();
  
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifFilter, setNotifFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const orgDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const { 
    notifications, 
    markAsRead, 
    markAllAsRead, 
    clearAll, 
    deleteNotification 
  } = useNotificationStore();

  const formatTimeAgo = (isoString: string) => {
    const now = new Date();
    const date = new Date(isoString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getNotificationIcon = (module: string, type: string) => {
    switch (module) {
      case 'QUOTATIONS':
        return <FileText className="text-indigo-500" size={16} />;
      case 'INVOICES':
        return <CreditCard className="text-emerald-500" size={16} />;
      case 'PURCHASE_ORDERS':
        return <ShoppingBag className="text-amber-500" size={16} />;
      case 'SERVICES':
        return <Wrench className="text-sky-500" size={16} />;
      case 'USERS':
        return <UserPlus className="text-pink-500" size={16} />;
      case 'SYSTEM':
      default:
        if (type === 'alert' || type === 'warning') {
          return <AlertCircle className="text-rose-500" size={16} />;
        }
        return <Info className="text-slate-500 dark:text-zinc-400" size={16} />;
    }
  };

  const handleNotificationClick = (n: any) => {
    markAsRead(n.id);
    setNotifDropdownOpen(false);
    
    const targetTabMap: Record<string, DashboardTab> = {
      QUOTATIONS: 'QUOTATIONS',
      INVOICES: 'INVOICES',
      PURCHASE_ORDERS: 'PURCHASE_ORDERS',
      SERVICES: 'SERVICES',
      USERS: 'USERS',
      SYSTEM: activeRole === 'SUPER_ADMIN' ? 'COMPANIES' : 'SETTINGS',
    };

    const targetTab = targetTabMap[n.module];
    if (targetTab) {
      const allowedItem = sidebarItems.find(item => item.tab === targetTab && item.roles.includes(activeRole));
      if (allowedItem) {
        setCurrentTab(targetTab);
      }
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotifDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Auth Guard: Block access if not authenticated (after hydration)
  React.useEffect(() => {
    if (!isMounted) return;

    if (!isAuthenticated) {
      setIsAuthChecking(true);
      router.push('/');
    } else {
      setIsAuthChecking(false);
    }
  }, [isMounted, isAuthenticated, router]);

  // Role-Based Redirection Guard: Ensure active tab is allowed for the user's role
  React.useEffect(() => {
    if (!isMounted || !isAuthenticated) return;

    const isTabAllowed = sidebarItems.find(item => item.tab === currentTab && item.roles.includes(activeRole));
    if (!isTabAllowed) {
      // Find the first allowed tab for this role
      const firstAllowedItem = sidebarItems.find(item => item.roles.includes(activeRole));
      if (firstAllowedItem) {
        setCurrentTab(firstAllowedItem.tab);
      }
    }
  }, [isMounted, isAuthenticated, activeRole, currentTab, setCurrentTab]);

  // Filter users for the current workspace
  const tenantUsers = users.filter(u => u.tenantId === activeTenant.id && u.isActive);

  // Tenant Modal states
  const [isNewTenantModalOpen, setIsNewTenantModalOpen] = useState(false);
  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantSlug, setNewTenantSlug] = useState('');
  const [newTenantPlan, setNewTenantPlan] = useState<'FREE' | 'STARTUP' | 'BUSINESS' | 'ENTERPRISE'>('FREE');
  const [newTenantPrimary, setNewTenantPrimary] = useState('#6366f1');
  const [newTenantSecondary, setNewTenantSecondary] = useState('#4f46e5');

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewTenantName(val);
    setNewTenantSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    );
  };

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantSlug) return;
    
    addTenant({
      id: `tenant-${Date.now()}`,
      name: newTenantName,
      slug: newTenantSlug,
      plan: newTenantPlan,
      currency: 'USD',
      brandingConfig: {
        primary: newTenantPrimary,
        secondary: newTenantSecondary
      },
      authorizedPersons: [],
      bankDetails: {
        accountNo: '',
        beneficiaryName: '',
        bankName: '',
        ifscCode: '',
        swiftCode: '',
        branch: ''
      }
    });
    
    // Reset Form
    setNewTenantName('');
    setNewTenantSlug('');
    setNewTenantPlan('FREE');
    setNewTenantPrimary('#6366f1');
    setNewTenantSecondary('#4f46e5');
    setIsNewTenantModalOpen(false);
  };


  // Load saved theme preference on initial mount on client side
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('quotation-theme-preference');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, [setTheme]);

  // Sync state store theme dynamically with HTML document body classes
  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Filter navigation items dynamically based on mock role clearance and active tenant features!
  const allowedItems = sidebarItems.filter(item => {
    if (!item.roles.includes(activeRole)) return false;
    if (item.tab === 'AI_COPILOT' && !activeTenant.features.ai_copilot) return false;
    if (item.tab === 'COMPLIANCE' && !activeTenant.features.audit_trail) return false;
    return true;
  });

  if (isAuthChecking || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans text-slate-900 dark:text-zinc-50 relative overflow-hidden">
        {/* Ambient glow backgrounds */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" />
        
        <div className="text-center space-y-6 z-10 p-6 max-w-sm glass-panel rounded-[32px] p-8 border border-zinc-200/50 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/70">
          <div 
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-white font-black text-2xl shadow-xl mx-auto animate-bounce"
            style={{ backgroundColor: activeTenant.brandingConfig.primary }}
          >
            Λ
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-extrabold tracking-tight text-slate-800 dark:text-zinc-100 flex items-center justify-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping" style={{ backgroundColor: activeTenant.brandingConfig.primary }} />
              Securing Session...
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed">
              Verifying B2B TenantGuard metadata credentials. Preparing workspace resources.
            </p>
          </div>
          {/* Subtle loading loader */}
          <div className="h-1 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto overflow-hidden relative">
            <div 
              className="absolute h-full w-8 rounded-full"
              style={{ 
                background: `linear-gradient(90deg, transparent, ${activeTenant.brandingConfig.primary}, transparent)`,
                animation: 'shimmer 1.5s infinite linear' 
              }}
            />
          </div>
        </div>

        {/* Shimmer custom animation rules */}
        <style jsx global>{`
          @keyframes shimmer {
            0% { left: -50%; }
            100% { left: 150%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 font-sans text-slate-900 transition-colors duration-300 dark:bg-zinc-950 dark:text-zinc-50">
      
      {/* 1. SIDEBAR PANEL */}
      <aside 
        className={`glass-panel fixed bottom-4 top-4 left-4 z-30 flex flex-col rounded-3xl transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* LOGO & BRAND HEADER */}
        <div className="flex h-20 items-center justify-between px-6 border-b border-zinc-200/50 dark:border-zinc-800/40">
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white font-black text-xl shadow-md transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: activeTenant.brandingConfig.primary }}
            >
              Λ
            </div>
            {!sidebarCollapsed && (
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-950 via-primary to-indigo-600 bg-clip-text text-transparent dark:from-zinc-50 dark:to-zinc-400">
                Innovait Q2I
              </span>
            )}
          </div>
          
          <button 
            onClick={toggleSidebar}
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-500 hover:text-primary dark:text-zinc-400"
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* SIDEBAR NAVIGATION ITEMS */}
        <nav className="flex-1 space-y-1 px-4 py-6 overflow-y-auto">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => setCurrentTab(item.tab)}
                className={`group flex w-full items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-zinc-900/5 dark:bg-white/5 font-semibold' 
                    : 'text-slate-500 hover:text-slate-900 hover:bg-zinc-200/40 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/20'
                }`}
              >
                {/* Active Sidebar Indicator Glow Indicator */}
                {isActive && (
                  <div 
                    className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full shadow-lg"
                    style={{ backgroundColor: activeTenant.brandingConfig.primary }}
                  />
                )}
                
                <Icon 
                  className={`shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'scale-105' : ''
                  }`} 
                  style={{ color: isActive ? activeTenant.brandingConfig.primary : undefined }}
                />
                
                {!sidebarCollapsed && (
                  <span className="truncate">{item.label}</span>
                )}
              </button>
            );
          })}
          
          {/* Sign Out Button in Sidebar */}
          <button
            onClick={logout}
            className="group flex w-full items-center gap-4 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 relative text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 dark:hover:bg-rose-500/5 mt-4 border border-dashed border-rose-500/20 cursor-pointer"
          >
            <ShieldAlert className="shrink-0 transition-transform duration-200 group-hover:scale-105" size={18} />
            {!sidebarCollapsed && (
              <span className="truncate font-bold">Sign Out</span>
            )}
          </button>
        </nav>

        {/* FOOTER INFO (TENANT SLUG & SUBSCRIPTION) */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-zinc-200/50 dark:border-zinc-800/40 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 size={16} className="text-slate-400 dark:text-zinc-500 shrink-0" />
              <div className="text-xs min-w-0 flex-1">
                <p className="font-semibold text-slate-650 dark:text-zinc-400 uppercase tracking-widest text-[9px]">Workspace Slug</p>
                <p className="text-slate-400 dark:text-zinc-500 truncate">/org/{activeTenant.slug}</p>
              </div>
            </div>
            {activeRole !== 'SUPER_ADMIN' && (
              <div className="flex items-center gap-3">
                <Wallet size={16} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-slate-650 dark:text-zinc-400 uppercase tracking-widest text-[9px]">Subscription</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-slate-705 dark:text-zinc-300">{activeTenant.plan}</span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                      ({activeTenant.plan === 'FREE' ? '$0' : activeTenant.plan === 'STARTUP' ? '$99' : activeTenant.plan === 'BUSINESS' ? '$199' : '$499'}/mo)
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </aside>

      {/* 2. MAIN HUB WORKSPACE CONTENT */}
      <div 
        className={`flex flex-col flex-1 min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'sm:pl-28' : 'sm:pl-80'
        }`}
      >
        {/* TOP GLASS HEADER NAVBAR */}
        <header className="glass-panel sticky top-4 left-4 right-4 z-20 flex h-20 items-center justify-between px-6 rounded-3xl mx-4 mt-4 shadow-sm border border-zinc-200/50 dark:border-zinc-800/40">
          
          {/* LEFT: WORKSPACE TENANT INTERACTIVE SWITCHER */}
          <div className="relative" ref={orgDropdownRef}>
            <button 
              onClick={() => {
                setOrgDropdownOpen(!orgDropdownOpen);
                setUserDropdownOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-zinc-200/40 dark:border-zinc-800/30 transition-all text-left"
            >
              <div 
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white font-bold text-sm shrink-0"
                style={{ backgroundColor: activeTenant.brandingConfig.primary }}
              >
                {activeTenant.name.charAt(0)}
              </div>
              <div className="hidden md:block">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Active Tenant</p>
                <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{activeTenant.name}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 dark:text-zinc-500" />
            </button>

            {/* Tenant switcher dropdown */}
            {orgDropdownOpen && (
              <div className="absolute left-0 mt-3 w-64 rounded-3xl border border-zinc-200/60 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/95 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Switch SaaS Organization</p>
                {tenantsList.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => {
                      setActiveTenant(tenant.id);
                      setOrgDropdownOpen(false);
                    }}
                    className={`flex w-full items-center gap-3 px-4 py-3 rounded-2xl text-left text-sm font-semibold transition-all ${
                      tenant.id === activeTenant.id
                        ? 'bg-zinc-900/5 dark:bg-white/5 text-primary'
                        : 'text-slate-600 hover:bg-zinc-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50'
                    }`}
                  >
                    <div 
                      className="flex h-6 w-6 items-center justify-center rounded bg-primary text-white font-bold text-xs"
                      style={{ backgroundColor: tenant.brandingConfig.primary }}
                    >
                      {tenant.name.charAt(0)}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-bold">{tenant.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-widest">{tenant.plan} Plan</p>
                    </div>
                  </button>
                ))}
                
                <div className="border-t border-zinc-200/50 dark:border-zinc-800/40 my-2 pt-2">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(false);
                      setIsNewTenantModalOpen(true);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 rounded-2xl text-left text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-zinc-100 hover:text-slate-900 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50 transition-all cursor-pointer"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-transparent text-slate-400 dark:text-zinc-500 font-bold text-xs">
                      <Plus size={14} />
                    </div>
                    <div className="flex-1 truncate">
                      <p className="font-bold text-indigo-500 dark:text-indigo-400">Add Workspace</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: USER ACCOUNT SWITCHER & AVATAR */}
          <div className="flex items-center gap-4">
            
            {/* USER ACCOUNT SWITCHER */}
            <div className="relative" ref={userDropdownRef}>
              <button 
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setOrgDropdownOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-semibold tracking-wide hover:bg-indigo-500/15 transition-all cursor-pointer"
              >
                <UserCheck size={14} />
                <span className="hidden sm:inline">{ROLE_LABELS[activeRole] || activeRole}</span>
                <ChevronDown size={12} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-3xl border border-zinc-200/60 bg-white/95 p-2 shadow-2xl backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/95 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {/* Current Active User Profile Card */}
                  <div className="px-3 py-2.5 mb-1.5 border-b border-zinc-200/50 dark:border-zinc-800/40 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white font-bold text-xs">
                        {`${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-slate-800 dark:text-zinc-100 text-xs truncate">
                          {currentUser.firstName} {currentUser.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate font-medium lowercase">
                          {currentUser.email.toLowerCase()}
                        </p>
                        <div className="inline-flex mt-1 items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {ROLE_LABELS[activeRole] || activeRole}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile Settings Action */}
                  <div className="px-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40 mb-2">
                    <button
                      onClick={() => {
                        setIsProfileOpen(true);
                        setUserDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 rounded-2xl text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-zinc-100 hover:text-slate-900 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50 transition-all cursor-pointer"
                    >
                      <UserCog size={14} className="text-indigo-500" />
                      <span>Profile Settings</span>
                    </button>
                  </div>

                  {/* Subscription Details Menu Item */}
                  {activeRole !== 'SUPER_ADMIN' && (
                    <div className="px-2 pb-2 border-b border-zinc-200/50 dark:border-zinc-800/40 mb-2">
                      <button
                        onClick={() => {
                          setCurrentTab('SUBSCRIPTIONS');
                          setUserDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2 rounded-2xl text-left text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-zinc-100 hover:text-slate-900 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50 transition-all cursor-pointer"
                      >
                        <Wallet size={14} className="text-emerald-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="truncate">SaaS Subscription</span>
                            <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0 ml-1">
                              {activeTenant.plan}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-450 dark:text-zinc-500 font-normal mt-0.5">
                            Rate: {activeTenant.plan === 'FREE' ? '$0' : activeTenant.plan === 'STARTUP' ? '$99' : activeTenant.plan === 'BUSINESS' ? '$199' : '$499'}/mo
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Switch User Account section (Admin Only) */}
                  {(activeRole === 'TENANT_ADMIN' || activeRole === 'SUPER_ADMIN') ? (
                    <>
                      <p className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Switch User Account</p>
                      {tenantUsers.map((user) => {
                        const isActive = user.id === currentUser.id;
                        const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              switchUser(user.id);
                              setUserDropdownOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-2xl text-left text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-600 hover:bg-zinc-100 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50'
                            } cursor-pointer`}
                          >
                            <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${
                              isActive 
                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                            }`}>
                              {initials}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{user.firstName} {user.lastName}</p>
                              <p className={`text-[10px] font-medium mt-0.5 ${
                                isActive ? 'text-indigo-500/70' : 'text-slate-400 dark:text-zinc-500'
                              }`}>{ROLE_LABELS[user.role] || user.role}</p>
                            </div>
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />}
                          </button>
                        );
                      })}
                      {tenantUsers.length === 0 && (
                        <p className="px-4 py-3 text-xs text-slate-400 dark:text-zinc-500 text-center">No users in this workspace.</p>
                      )}
                    </>
                  ) : null}

                  <div className="border-t border-zinc-200/50 dark:border-zinc-800/40 my-2 pt-2">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2 rounded-2xl text-left text-xs font-semibold text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/5 transition-all cursor-pointer"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                        <ShieldAlert size={14} />
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-bold">Sign Out of Workspace</p>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* THEME TOGGLE SWITCHER */}
            <button 
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* NOTIFICATIONS BELL & DROPDOWN */}
            <div className="relative flex" ref={notifDropdownRef}>
              <button 
                onClick={() => {
                  setNotifDropdownOpen(!notifDropdownOpen);
                  setOrgDropdownOpen(false);
                  setUserDropdownOpen(false);
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-500 hover:text-primary dark:text-zinc-400 dark:hover:text-zinc-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                title="Notifications"
              >
                <BellRing size={16} />
                {notifications.filter(n => n.tenantId === activeTenant.id && !n.isRead).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[8px] font-black text-white ring-2 ring-white dark:ring-zinc-900 animate-pulse">
                    {notifications.filter(n => n.tenantId === activeTenant.id && !n.isRead).length}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-12 w-80 sm:w-96 rounded-3xl border border-zinc-200/60 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-zinc-800/60 dark:bg-zinc-900/95 animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                  {/* Dropdown Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-200/50 dark:border-zinc-800/40 mb-3">
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-zinc-50">Notifications</h3>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                        {notifications.filter(n => n.tenantId === activeTenant.id && !n.isRead).length} unread alerts
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAllAsRead(activeTenant.id)}
                        className="p-1 rounded-md text-[10px] font-bold text-indigo-500 hover:bg-indigo-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark all as read"
                      >
                        <CheckCheck size={12} />
                        <span className="hidden sm:inline">Read all</span>
                      </button>
                      <button
                        onClick={() => clearAll(activeTenant.id)}
                        className="p-1 rounded-md text-[10px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Clear all"
                      >
                        <Trash2 size={12} />
                        <span className="hidden sm:inline">Clear</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex gap-2 mb-3 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200/30 dark:border-zinc-800/30">
                    <button
                      onClick={() => setNotifFilter('ALL')}
                      className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        notifFilter === 'ALL'
                          ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-zinc-200/20'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setNotifFilter('UNREAD')}
                      className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        notifFilter === 'UNREAD'
                          ? 'bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm border border-zinc-200/20'
                          : 'text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300'
                      }`}
                    >
                      Unread ({notifications.filter(n => n.tenantId === activeTenant.id && !n.isRead).length})
                    </button>
                  </div>

                  {/* Notifications List */}
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {notifications
                      .filter(n => n.tenantId === activeTenant.id && (notifFilter === 'ALL' || !n.isRead))
                      .map((n) => {
                        return (
                          <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`flex items-start gap-3 p-3 rounded-2xl border transition-all cursor-pointer relative group text-left ${
                              n.isRead
                                ? 'border-zinc-100 dark:border-zinc-800/40 bg-zinc-50/30 dark:bg-zinc-900/10 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/20'
                                : 'border-indigo-500/25 bg-indigo-500/5 dark:bg-indigo-500/5 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/10 shadow-sm'
                            }`}
                          >
                            {/* Unread indicator dot */}
                            {!n.isRead && (
                              <span className="absolute top-3.5 right-3 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            )}

                            {/* Icon */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-150/50 dark:bg-zinc-800/50 border border-zinc-200/20 dark:border-zinc-800/20 mt-0.5">
                              {getNotificationIcon(n.module, n.type)}
                            </div>

                            {/* Text Content */}
                            <div className="min-w-0 flex-1 pr-4">
                              <p className={`text-xs font-bold leading-normal truncate ${
                                n.isRead ? 'text-slate-700 dark:text-zinc-300' : 'text-slate-900 dark:text-zinc-50'
                              }`}>
                                {n.title}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5 leading-normal">
                                {n.message}
                              </p>
                              <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-550 mt-1 block">
                                {formatTimeAgo(n.createdAt)}
                              </span>
                            </div>

                            {/* Actions on Hover */}
                            <div 
                              className="absolute right-2.5 bottom-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {!n.isRead && (
                                <button
                                  onClick={() => markAsRead(n.id)}
                                  className="h-5 w-5 rounded-md flex items-center justify-center bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 transition-all cursor-pointer"
                                  title="Mark as read"
                                >
                                  <Check size={10} />
                                </button>
                              )}
                              <button
                                onClick={() => deleteNotification(n.id)}
                                className="h-5 w-5 rounded-md flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all cursor-pointer"
                                title="Remove"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                    {/* Empty State */}
                    {notifications.filter(n => n.tenantId === activeTenant.id && (notifFilter === 'ALL' || !n.isRead)).length === 0 && (
                      <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-zinc-500">
                        <Inbox size={24} className="mb-2 text-slate-350 dark:text-zinc-650 animate-bounce" />
                        <p className="text-xs font-bold">Inbox is clear</p>
                        <p className="text-[10px] mt-0.5">No new alerts to display.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SEPARATOR */}
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800/60" />

            {/* ACTIVE USER DETAILS BUTTON */}
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 px-3 py-1.5 rounded-2xl hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 border border-transparent hover:border-zinc-200/40 dark:hover:border-zinc-800/30 transition-all text-left cursor-pointer hover:scale-102 active:scale-98"
              title="Open Profile Settings"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm">
                {`${currentUser.firstName.charAt(0)}${currentUser.lastName.charAt(0)}`.toUpperCase()}
              </div>
              <div className="hidden lg:block leading-tight">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-800 dark:text-zinc-200">{currentUser.firstName} {currentUser.lastName}</p>
                  {activeRole !== 'SUPER_ADMIN' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 shrink-0">
                      {activeTenant.plan}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-zinc-500 lowercase tracking-wider">{currentUser.email.toLowerCase()}</p>
              </div>
            </button>

          </div>
        </header>

        {/* 3. DYNAMIC CHILD CANVAS BODY */}
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* 4. PREMIUM GLASSMORPHIC WORKSPACE REGISTRATION MODAL */}
      {isNewTenantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl bg-white/90 p-8 shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 dark:bg-zinc-900/90 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-black text-lg shadow-md"
                  style={{ backgroundColor: newTenantPrimary }}
                >
                  {(newTenantName.charAt(0) || 'N').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Create New Workspace</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Spin up a new secure multi-tenant B2B environment.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewTenantModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-6">
              {/* Workspace Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Workspace Name</label>
                <input 
                  type="text"
                  required
                  value={newTenantName}
                  onChange={handleNameChange}
                  placeholder="e.g. SpaceX Logistics"
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                />
              </div>

              {/* Workspace URL Slug Input (Live Generated) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Workspace URL Slug</label>
                <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                  <span className="bg-zinc-100 dark:bg-zinc-900 px-3.5 py-3 text-xs font-semibold text-slate-400 dark:text-zinc-500 flex items-center border-r border-zinc-200 dark:border-zinc-800">
                    /org/
                  </span>
                  <input 
                    type="text"
                    required
                    value={newTenantSlug}
                    onChange={(e) => setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                    placeholder="spacex-logistics"
                    className="flex-1 px-4 py-3 text-sm focus:outline-none font-mono text-slate-700 dark:text-zinc-300 bg-transparent"
                  />
                </div>
              </div>

              {/* Workspace plan Tier Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">SaaS Plan Tier</label>
                <select
                  value={newTenantPlan}
                  onChange={(e) => setNewTenantPlan(e.target.value as any)}
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                >
                  <option value="FREE">FREE Plan (Default Limits)</option>
                  <option value="STARTUP">STARTUP Plan (SLA Contracts Enabled)</option>
                  <option value="BUSINESS">BUSINESS Plan (AI features & PDF Exporter)</option>
                  <option value="ENTERPRISE">ENTERPRISE Plan (SOC2 Compliance Ledger)</option>
                </select>
              </div>

              {/* Branding Visual Color Picker Grid */}
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Workspace Brand Grid</label>
                <div className="grid grid-cols-6 gap-3">
                  {[
                    { primary: '#6366f1', secondary: '#4f46e5', name: 'Indigo' },
                    { primary: '#10b981', secondary: '#059669', name: 'Emerald' },
                    { primary: '#8b5cf6', secondary: '#7c3aed', name: 'Violet' },
                    { primary: '#f43f5e', secondary: '#e11d48', name: 'Rose' },
                    { primary: '#f59e0b', secondary: '#d97706', name: 'Amber' },
                    { primary: '#0f172a', secondary: '#020617', name: 'Slate' }
                  ].map((color) => {
                    const isSelected = newTenantPrimary === color.primary;
                    return (
                      <button
                        key={color.name}
                        type="button"
                        onClick={() => {
                          setNewTenantPrimary(color.primary);
                          setNewTenantSecondary(color.secondary);
                        }}
                        className={`group flex h-10 w-full rounded-xl overflow-hidden relative cursor-pointer hover:scale-105 active:scale-95 transition-all border ${
                          isSelected 
                            ? 'border-indigo-500 scale-105 ring-2 ring-indigo-500/20' 
                            : 'border-zinc-200 dark:border-zinc-800'
                        }`}
                        title={color.name}
                      >
                        <div className="w-1/2 h-full" style={{ backgroundColor: color.primary }} />
                        <div className="w-1/2 h-full" style={{ backgroundColor: color.secondary }} />
                        {isSelected && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <Check size={14} className="text-white drop-shadow" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsNewTenantModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-bold shadow-md hover:scale-[1.02] active:scale-98 transition-all cursor-pointer"
                  style={{ backgroundColor: newTenantPrimary }}
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* USER PROFILE SETTINGS PANEL */}
      <UserProfilePanel open={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
}

