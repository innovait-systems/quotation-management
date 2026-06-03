'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantStore, User, UserRole } from '../store/tenantStore';
import {
  Sparkles, ArrowRight, Lock, Mail, Building2, Eye, EyeOff,
  Check, AlertCircle, Crown, ShieldCheck, BadgeDollarSign,
  TrendingUp, Cog, ShieldAlert
} from 'lucide-react';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode; description: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    icon: <Crown size={14} />,
    description: 'Full system control across all tenants'
  },
  TENANT_ADMIN: {
    label: 'Tenant Admin',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    icon: <ShieldCheck size={14} />,
    description: 'Full workspace control, user management, and core configurations'
  },
  FINANCE: {
    label: 'Finance Staff',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: <BadgeDollarSign size={14} />,
    description: 'Invoices pipeline, payment capture, and financial reporting'
  },
  SALES: {
    label: 'Sales Executive',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: <TrendingUp size={14} />,
    description: 'Quotations generation, customer pipelines, and SOW contracts'
  },
  OPERATIONS: {
    label: 'Operations Staff',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    icon: <Cog size={14} />,
    description: 'Purchase orders, service ticket logs, and delivery SLAs'
  },
  VIEWER: {
    label: 'Guest Viewer',
    color: 'text-slate-500 dark:text-zinc-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
    icon: <Eye size={14} />,
    description: 'Read-only access across enabled SaaS modules'
  },
};

export default function WelcomePortalGate() {
  const { tenantsList, users, login, activeTenant } = useTenantStore();
  const router = useRouter();

  // Form states
  const [workspaceCode, setWorkspaceCode] = useState('innovait-systems');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMode, setLoginMode] = useState<'COMPANY' | 'SAAS_OWNER'>('COMPANY');
  
  // UX states
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCheatsheet, setShowCheatsheet] = useState(true);

  // Securely resolve active workspace by matching code/slug lookup
  const matchedTenant = tenantsList.find(
    t => t.slug.toLowerCase() === workspaceCode.trim().toLowerCase() ||
         t.id.toLowerCase() === workspaceCode.trim().toLowerCase()
  );

  // Sync active tenant visual style dynamically (fallback to store defaults)
  const currentSelectedTenant = loginMode === 'SAAS_OWNER'
    ? (tenantsList.find(t => t.id === 'tenant-innovait') || activeTenant)
    : (matchedTenant || activeTenant);
  const primaryBrandColor = currentSelectedTenant.brandingConfig.primary || '#6366f1';

  // Filter users registered in the active tenant to show in cheatsheet
  const activeTenantUsers = matchedTenant
    ? users.filter(u => u.tenantId === matchedTenant.id && u.isActive)
    : [];

  const cheatsheetUsers = loginMode === 'SAAS_OWNER'
    ? users.filter(u => u.role === 'SUPER_ADMIN')
    : activeTenantUsers.filter(u => u.role !== 'SUPER_ADMIN');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    if (loginMode === 'COMPANY' && !workspaceCode.trim()) return;

    setError(null);
    setIsLoading(true);

    const targetCode = loginMode === 'SAAS_OWNER' ? 'innovait-systems' : workspaceCode.trim();

    // Simulate network authentication speed
    setTimeout(async () => {
      const matched = tenantsList.find(
        t => t.slug.toLowerCase() === targetCode.toLowerCase() ||
             t.id.toLowerCase() === targetCode.toLowerCase()
      );

      if (!matched) {
        setError('Workspace Code is unrecognized. Please check your spelling or contact your administrator.');
        setIsLoading(false);
        return;
      }

      const success = await login(email.trim().toLowerCase(), matched.id, password);
      if (success) {
        // Apply success animation and redirect
        router.push('/dashboard');
      } else {
        setError(`Authentication failed. No active user profile matches "${email}" in the "${matched.name}" workspace.`);
        setIsLoading(false);
      }
    }, 800);
  };

  const handleQuickLogin = (selectedUser: User) => {
    const targetTenantId = loginMode === 'SAAS_OWNER' ? 'tenant-innovait' : (matchedTenant?.id);
    if (!targetTenantId) return;
    setError(null);
    setIsLoading(true);
    setEmail(selectedUser.email);
    setPassword('password');

    setTimeout(async () => {
      const success = await login(selectedUser.email, targetTenantId, selectedUser.password || 'password');
      if (success) {
        router.push('/dashboard');
      } else {
        setError('Fail-safe trigger: Could not log in using quick actions.');
        setIsLoading(false);
      }
    }, 450);
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row bg-zinc-50 font-sans dark:bg-zinc-950 relative overflow-hidden transition-colors duration-300">
      
      {/* Decorative ambient background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px]" />

      {/* LEFT PANEL: WELCOME & PLATFORM TELEMETRY */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 z-10 lg:max-w-2xl xl:max-w-3xl">
        <div className="flex items-center gap-3">
          <div 
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-black text-xl shadow-lg transition-transform duration-300 hover:rotate-12"
            style={{ backgroundColor: primaryBrandColor }}
          >
            Λ
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-950 via-primary to-indigo-600 bg-clip-text text-transparent dark:from-zinc-50 dark:to-zinc-400">
            Innovait Q2I
          </span>
        </div>

        <div className="space-y-6 my-auto py-12 lg:py-0">
          <span 
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border text-xs font-bold uppercase tracking-widest transition-colors duration-300"
            style={{ 
              color: primaryBrandColor,
              borderColor: `${primaryBrandColor}30`,
              backgroundColor: `${primaryBrandColor}10`
            }}
          >
            <Sparkles size={12} />
            <span>Secure Enterprise Metadata Gate</span>
          </span>
          
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-zinc-50 leading-tight">
            Consolidate your multi-tenant B2B operations.
          </h1>
          
          <p className="text-sm lg:text-base leading-relaxed text-slate-500 dark:text-zinc-400 max-w-lg">
            A secure gateway engineered with granular Role-Based Access Control (RBAC). Gain immediate real-time insight into quotations, billing pipelines, and SLA compliance metrics.
          </p>

          <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 dark:text-zinc-500 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Environment: Standalone Sandbox
            </span>
            <span>&bull;</span>
            <span>RLS Context: Enforced</span>
          </div>
        </div>

        <footer className="text-xs text-slate-400 dark:text-zinc-600 font-mono">
          Innovait Q2I B2B Framework Core &bull; Secure Protocol Locked
        </footer>
      </div>

      {/* RIGHT PANEL: INTERACTIVE LOGIN INTERFACE */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 z-10 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-3xl border-t lg:border-t-0 lg:border-l border-zinc-200/50 dark:border-zinc-800/30">
        <div className="w-full max-w-md space-y-8">
          
          {/* Main Glass Form */}
          <div className="glass-panel rounded-[32px] p-8 border border-zinc-200/70 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/80 shadow-2xl relative">
            
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Sign In</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">Access your B2B SaaS gateway</p>
            </div>

            {/* Dual login gateways toggle */}
            <div className="flex bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl mb-6 border border-zinc-200/50 dark:border-zinc-800/40">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('COMPANY');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginMode === 'COMPANY'
                    ? 'bg-white dark:bg-zinc-900 shadow-sm text-slate-800 dark:text-zinc-100 border border-zinc-250/20'
                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-zinc-300'
                }`}
              >
                <Building2 size={13} />
                <span>Company Portal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMode('SAAS_OWNER');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginMode === 'SAAS_OWNER'
                    ? 'bg-white dark:bg-zinc-900 shadow-sm text-slate-800 dark:text-zinc-100 border border-zinc-250/20'
                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-zinc-300'
                }`}
              >
                <Crown size={13} />
                <span>SaaS Owner</span>
              </button>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 animate-in fade-in duration-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Workspace Code Input (Secure typed lookup) */}
              {loginMode === 'COMPANY' && (
                <div className="space-y-1.5 animate-in fade-in duration-250">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Workspace Code</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={workspaceCode}
                      onChange={(e) => {
                        setWorkspaceCode(e.target.value);
                        setError(null);
                      }}
                      placeholder="e.g. innovait-systems"
                      className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Email Address</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="john.doe@company.com"
                    className="w-full rounded-xl pl-11 pr-4 py-3.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl pl-11 pr-11 py-3.5 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full h-13 rounded-2xl text-white font-bold transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50 mt-2"
                style={{ backgroundColor: primaryBrandColor }}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                    <span>Connecting Securely...</span>
                  </span>
                ) : (
                  <>
                    <span>Verify Credentials</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* PRE-SEEDED CREDENTIALS CHEATSHEET */}
          {showCheatsheet && (
            <div className="glass-card rounded-[28px] p-6 border border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/20 backdrop-blur-xl space-y-4 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-200/40 dark:border-zinc-800/20 pb-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
                  <ShieldAlert size={12} className="text-indigo-500" style={{ color: primaryBrandColor }} />
                  Demo Accounts Credentials
                </span>
                {matchedTenant && (
                  <span className="text-[9px] font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-slate-400">Password: password</span>
                )}
              </div>

              {loginMode === 'SAAS_OWNER' ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {cheatsheetUsers.map((user) => {
                    const roleConf = ROLE_CONFIG[user.role];
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleQuickLogin(user)}
                        disabled={isLoading}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/20 bg-white/70 dark:bg-zinc-950/20 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center shrink-0 rounded-lg text-[10px] font-black ${roleConf.bgColor} border ${roleConf.borderColor} ${roleConf.color}`}>
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate group-hover:text-slate-900 dark:group-hover:text-zinc-50">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-zinc-500 truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${roleConf.bgColor} ${roleConf.borderColor} ${roleConf.color}`}>
                            {roleConf.icon}
                            <span>System Admin</span>
                          </span>
                          <div className="h-5 w-5 rounded-md flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={10} className="text-slate-400" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : matchedTenant ? (
                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {cheatsheetUsers.map((user) => {
                    const roleConf = ROLE_CONFIG[user.role];
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleQuickLogin(user)}
                        disabled={isLoading}
                        className="flex items-center justify-between w-full p-2.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800/20 bg-white/70 dark:bg-zinc-950/20 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-left group cursor-pointer disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                          <div className={`flex h-7 w-7 shrink-0 items-center justify-center shrink-0 rounded-lg text-[10px] font-black ${roleConf.bgColor} border ${roleConf.borderColor} ${roleConf.color}`}>
                            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-zinc-200 truncate group-hover:text-slate-900 dark:group-hover:text-zinc-50">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-zinc-500 truncate">{user.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${roleConf.bgColor} ${roleConf.borderColor} ${roleConf.color}`}>
                            {roleConf.icon}
                            <span>{roleConf.label.split(' ')[1] || roleConf.label}</span>
                          </span>
                          <div className="h-5 w-5 rounded-md flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight size={10} className="text-slate-400" />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {cheatsheetUsers.length === 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 italic text-center py-2">
                      No mock user accounts registered under this workspace.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <Building2 size={24} className="mx-auto text-slate-400 dark:text-zinc-500 animate-pulse" />
                  <p className="text-xs font-bold text-slate-600 dark:text-zinc-300">Enter a valid Workspace Code</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-normal">
                    Please enter a correct organization code to view its pre-seeded demo accounts.
                    <br />
                    <span className="font-mono text-indigo-500 dark:text-indigo-400 mt-1.5 block">
                      Valid codes: "innovait-systems", "spacex-cloud", "wayne-enterprises", "tesla-motors"
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
}
