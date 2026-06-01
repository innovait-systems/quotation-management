'use client';

import React, { useState, useMemo } from 'react';
import { useTenantStore, User, UserRole } from '../../../store/tenantStore';
import {
  Users, Plus, Pencil, Trash2, X, Check, Search, Shield,
  ShieldCheck, BadgeDollarSign, TrendingUp, Cog, Eye,
  UserPlus, RotateCcw, ChevronDown, Mail, Crown, AlertTriangle
} from 'lucide-react';

const ROLE_CONFIG: Record<UserRole, { label: string; color: string; bgColor: string; borderColor: string; icon: React.ReactNode; description: string }> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/20',
    icon: <Crown size={14} />,
    description: 'Full system access across all tenants'
  },
  TENANT_ADMIN: {
    label: 'Tenant Admin',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    icon: <ShieldCheck size={14} />,
    description: 'Full workspace access, user management, settings'
  },
  FINANCE: {
    label: 'Finance Staff',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: <BadgeDollarSign size={14} />,
    description: 'Invoices, payments, financial reports'
  },
  SALES: {
    label: 'Sales Executive',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: <TrendingUp size={14} />,
    description: 'Quotations, customers, agreements'
  },
  OPERATIONS: {
    label: 'Operations Staff',
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/20',
    icon: <Cog size={14} />,
    description: 'Purchase orders, services, delivery tracking'
  },
  VIEWER: {
    label: 'Guest Viewer',
    color: 'text-slate-500 dark:text-zinc-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
    icon: <Eye size={14} />,
    description: 'Read-only access to permitted modules'
  },
};

const ALL_ROLES: UserRole[] = ['SUPER_ADMIN', 'TENANT_ADMIN', 'FINANCE', 'SALES', 'OPERATIONS', 'VIEWER'];

export default function UsersView() {
  const { activeTenant, currentUser, activeRole, users, addUser, updateUser, deleteUser, switchUser } = useTenantStore();

  // Filter users for the current tenant
  const tenantUsers = useMemo(() => 
    users.filter(u => u.tenantId === activeTenant.id),
    [users, activeTenant.id]
  );

  // Email Invitation Simulation States
  const [invitedUser, setInvitedUser] = useState<User | null>(null);
  const [isEmailPreviewOpen, setIsEmailPreviewOpen] = useState(false);

  const canManageUsers = activeRole === 'SUPER_ADMIN' || activeRole === 'TENANT_ADMIN';

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create form states
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('VIEWER');

  // Edit form states
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('VIEWER');

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return tenantUsers;
    const q = searchQuery.toLowerCase();
    return tenantUsers.filter(u =>
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      ROLE_CONFIG[u.role].label.toLowerCase().includes(q)
    );
  }, [tenantUsers, searchQuery]);

  // Role stats
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const u of tenantUsers) {
      stats[u.role] = (stats[u.role] || 0) + 1;
    }
    return stats;
  }, [tenantUsers]);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirstName.trim() || !newLastName.trim() || !newEmail.trim()) return;

    // Check for email collision within tenant
    const emailExists = users.some(u => u.email.toLowerCase() === newEmail.toLowerCase().trim());
    if (emailExists) {
      showFeedback('error', `Email "${newEmail}" is already registered.`);
      return;
    }

    const userData = {
      tenantId: activeTenant.id,
      firstName: newFirstName.trim(),
      lastName: newLastName.trim(),
      email: newEmail.trim().toLowerCase(),
      role: newRole,
    };

    addUser(userData);

    // Retrieve newly created user to fetch their generated ID
    const newlyAddedUser = useTenantStore.getState().users.find(
      u => u.email.toLowerCase() === userData.email && u.tenantId === activeTenant.id
    );

    if (newlyAddedUser) {
      setInvitedUser(newlyAddedUser);
      setIsEmailPreviewOpen(true);
    }

    showFeedback('success', `Invitation email automatically sent to ${userData.email}.`);
    resetCreateForm();
    setIsCreateModalOpen(false);
  };

  const resetCreateForm = () => {
    setNewFirstName('');
    setNewLastName('');
    setNewEmail('');
    setNewRole('VIEWER');
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditFirstName(user.firstName);
    setEditLastName(user.lastName);
    setEditEmail(user.email);
    setEditRole(user.role);
    setIsEditModalOpen(true);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !editFirstName.trim() || !editLastName.trim() || !editEmail.trim()) return;

    // Check email collision (excluding current user)
    const emailExists = users.some(u => u.id !== selectedUser.id && u.email.toLowerCase() === editEmail.toLowerCase().trim());
    if (emailExists) {
      showFeedback('error', `Email "${editEmail}" is already taken by another user.`);
      return;
    }

    updateUser(selectedUser.id, {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      email: editEmail.trim().toLowerCase(),
      role: editRole,
    });

    showFeedback('success', `User ${editFirstName} ${editLastName} updated successfully.`);
    setIsEditModalOpen(false);
    setSelectedUser(null);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    if (selectedUser.id === currentUser.id) {
      showFeedback('error', 'Cannot delete the currently active user.');
      setIsDeleteModalOpen(false);
      return;
    }
    deleteUser(selectedUser.id);
    showFeedback('success', `User ${selectedUser.firstName} ${selectedUser.lastName} removed.`);
    setIsDeleteModalOpen(false);
    setSelectedUser(null);
  };

  const toggleUserActive = (user: User) => {
    if (user.id === currentUser.id) {
      showFeedback('error', 'Cannot deactivate the currently active user.');
      return;
    }
    updateUser(user.id, { isActive: !user.isActive });
    showFeedback('success', `User ${user.firstName} ${user.isActive ? 'deactivated' : 'activated'}.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Team & Roles</h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
            Manage workspace users, assign RBAC roles, and control access for <span className="font-semibold text-slate-700 dark:text-zinc-200">{activeTenant.name}</span>.
          </p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => { resetCreateForm(); setIsCreateModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-sm shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Mail size={16} />
            <span>Invite User</span>
          </button>
        )}
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg animate-in slide-in-from-top-2 duration-200 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400'
        }`}>
          {feedback.type === 'success' ? <Check size={16} /> : <AlertTriangle size={16} />}
          {feedback.message}
        </div>
      )}

      {/* ROLE STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {ALL_ROLES.map(role => {
          const config = ROLE_CONFIG[role];
          const count = roleStats[role] || 0;
          return (
            <div
              key={role}
              className={`relative overflow-hidden rounded-2xl border ${config.borderColor} ${config.bgColor} p-4 transition-all hover:scale-[1.02]`}
            >
              <div className={`flex items-center gap-2 ${config.color} mb-2`}>
                {config.icon}
                <span className="text-xs font-bold uppercase tracking-wider">{config.label}</span>
              </div>
              <p className="text-2xl font-black text-slate-900 dark:text-zinc-50">{count}</p>
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">{count === 1 ? 'member' : 'members'}</p>
            </div>
          );
        })}
      </div>

      {/* SEARCH BAR */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name, email, or role..."
          className="w-full rounded-2xl pl-11 pr-4 py-3 text-sm bg-white dark:bg-zinc-900/50 border border-zinc-200/60 dark:border-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium text-slate-700 dark:text-zinc-300 placeholder:text-slate-400 dark:placeholder:text-zinc-500"
        />
      </div>

      {/* USER TABLE */}
      <div className="rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl overflow-hidden shadow-xl">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200/40 dark:border-zinc-800/30">
          <div className="col-span-4 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">User</div>
          <div className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Role</div>
          <div className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Status</div>
          <div className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 hidden md:block">Joined</div>
          <div className="col-span-2 text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 text-right">Actions</div>
        </div>

        {/* Table Body */}
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 text-slate-400 dark:text-zinc-500 mb-4">
              <Users size={28} />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-zinc-300">No users found</p>
            <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
              {searchQuery ? 'Try adjusting your search query.' : 'Add your first team member to get started.'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user, index) => {
            const roleConf = ROLE_CONFIG[user.role];
            const isCurrentUser = user.id === currentUser.id;
            const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
            return (
              <div
                key={user.id}
                className={`grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 ${
                  index < filteredUsers.length - 1 ? 'border-b border-zinc-200/30 dark:border-zinc-800/20' : ''
                } ${isCurrentUser ? 'bg-indigo-50/30 dark:bg-indigo-500/5' : ''}`}
              >
                {/* User Info */}
                <div className="col-span-4 flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${roleConf.bgColor} border ${roleConf.borderColor} ${roleConf.color} font-bold text-sm`}>
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      {isCurrentUser && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Mail size={10} className="text-slate-400 dark:text-zinc-500 shrink-0" />
                      <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="col-span-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold ${roleConf.bgColor} border ${roleConf.borderColor} ${roleConf.color}`}>
                    {roleConf.icon}
                    <span className="hidden sm:inline">{roleConf.label}</span>
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <button
                    onClick={() => canManageUsers && !isCurrentUser && toggleUserActive(user)}
                    disabled={!canManageUsers || isCurrentUser}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${
                      user.isActive
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-zinc-500/10 border border-zinc-500/20 text-zinc-500 dark:text-zinc-400'
                    } ${canManageUsers && !isCurrentUser ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                    {user.isActive ? 'Active' : 'Inactive'}
                  </button>
                </div>

                {/* Joined Date */}
                <div className="col-span-2 hidden md:block">
                  <p className="text-xs text-slate-400 dark:text-zinc-500">
                    {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-end gap-2">
                  {canManageUsers && (
                    <>
                      <button
                        onClick={() => openEditModal(user)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-indigo-600 dark:text-zinc-500 dark:hover:text-indigo-400 transition-all cursor-pointer"
                        title="Edit user"
                      >
                        <Pencil size={14} />
                      </button>
                      {!isCurrentUser && (
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-600 dark:text-zinc-500 dark:hover:text-rose-400 transition-all cursor-pointer"
                          title="Delete user"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* RBAC PERMISSIONS MATRIX */}
      {!canManageUsers && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-bold text-amber-700 dark:text-amber-300">Read-Only Access</p>
              <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">
                Your current role ({ROLE_CONFIG[activeRole].label}) does not have permission to create, edit, or delete users. Contact your Tenant Admin for access changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  CREATE USER MODAL                                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl bg-white/90 p-8 shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 dark:bg-zinc-900/90 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Mail size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Invite New User</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Send workspace login instructions to a new member</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">First Name</label>
                  <input
                    type="text"
                    required
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Last Name</label>
                  <input
                    type="text"
                    required
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                />
              </div>

              {/* Role Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">RBAC Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map(role => {
                    const config = ROLE_CONFIG[role];
                    const isSelected = newRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setNewRole(role)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? `${config.bgColor} ${config.borderColor} ${config.color} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ${config.borderColor}`
                            : 'border-zinc-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                        }`}
                      >
                        {config.icon}
                        <div>
                          <p className="leading-tight">{config.label}</p>
                          <p className={`text-[10px] font-medium mt-0.5 leading-tight ${isSelected ? 'opacity-80' : 'text-slate-400 dark:text-zinc-500'}`}>
                            {config.description}
                          </p>
                        </div>
                        {isSelected && <Check size={14} className="ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-5 mt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Send Invitation Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  EDIT USER MODAL                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEditModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-lg rounded-3xl bg-white/90 p-8 shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 dark:bg-zinc-900/90 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                  <Pencil size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50">Edit User</h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Modify profile and role for {selectedUser.firstName} {selectedUser.lastName}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-700 dark:text-zinc-300"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">RBAC Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_ROLES.map(role => {
                    const config = ROLE_CONFIG[role];
                    const isSelected = editRole === role;
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setEditRole(role)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-xs font-bold transition-all border cursor-pointer ${
                          isSelected
                            ? `${config.bgColor} ${config.borderColor} ${config.color} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ${config.borderColor}`
                            : 'border-zinc-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/30'
                        }`}
                      >
                        {config.icon}
                        <p className="leading-tight">{config.label}</p>
                        {isSelected && <Check size={14} className="ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-5 mt-4">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-sm font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  DELETE CONFIRMATION MODAL                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isDeleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-panel w-full max-w-md rounded-3xl bg-white/90 p-8 shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 dark:bg-zinc-900/90 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 mb-4">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-50 mb-2">Delete User</h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mb-6">
                Are you sure you want to permanently remove <span className="font-bold text-slate-700 dark:text-zinc-200">{selectedUser.firstName} {selectedUser.lastName}</span> from this workspace? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => { setIsDeleteModalOpen(false); setSelectedUser(null); }}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm font-bold text-slate-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-bold shadow-md hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  SIMULATED EMAIL OUTBOX MODAL                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isEmailPreviewOpen && invitedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 dark:bg-black/70 backdrop-blur-md animate-in fade-in duration-200 text-slate-800 dark:text-zinc-200">
          <div className="glass-panel w-full max-w-2xl rounded-3xl bg-zinc-50 dark:bg-zinc-950 p-6 shadow-2xl border border-zinc-200/80 dark:border-zinc-800/80 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            {/* Outbox Header */}
            <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <Mail size={18} />
                </div>
                <div className="text-left">
                  <h2 className="text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                    Simulated SMTP Mail Delivery
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Dispatched</span>
                  </h2>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Mock server outbox log: 1 message successfully delivered via virtual MX route</p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailPreviewOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-slate-400 hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Email Envelope Fields */}
            <div className="rounded-2xl border border-zinc-200/50 bg-white/70 dark:border-zinc-800/50 dark:bg-zinc-900/70 p-4 text-xs space-y-2 mb-4 font-mono text-left">
              <div className="flex"><span className="w-16 font-bold text-slate-400">From:</span><span className="text-slate-600 dark:text-zinc-300">no-reply@{activeTenant.slug}.innovait-systems.com</span></div>
              <div className="flex"><span className="w-16 font-bold text-slate-400">To:</span><span className="text-indigo-600 dark:text-indigo-400 font-bold">{invitedUser.email}</span></div>
              <div className="flex"><span className="w-16 font-bold text-slate-400">Subject:</span><span className="text-slate-800 dark:text-zinc-100 font-bold text-left">Welcome to the {activeTenant.name} workspace!</span></div>
            </div>

            {/* Simulated HTML Email Body Viewport */}
            <div className="rounded-2xl border border-zinc-200 bg-white dark:border-zinc-900 dark:bg-zinc-900/30 overflow-hidden shadow-inner p-8 text-slate-700 dark:text-zinc-300">
              <div className="max-w-md mx-auto space-y-6">
                
                {/* Email Tenant Brand Header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-800/50 pb-4 justify-center sm:justify-start">
                  {activeTenant.logoUrl ? (
                    <img src={activeTenant.logoUrl} alt="Logo" className="h-8 max-w-[120px] object-contain rounded" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white uppercase shrink-0" style={{ backgroundColor: activeTenant.brandingConfig.primary }}>
                      {activeTenant.name.charAt(0)}
                    </div>
                  )}
                  <span className="text-sm font-black text-slate-800 dark:text-zinc-100 tracking-tight">{activeTenant.name}</span>
                </div>

                {/* Email Greeting */}
                <div className="space-y-3 text-left">
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
                    Welcome to the team, {invitedUser.firstName}!
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
                    You have been invited by <span className="font-semibold text-slate-800 dark:text-zinc-200">{currentUser.firstName} {currentUser.lastName}</span> to join the <span className="font-semibold text-slate-800 dark:text-zinc-200">{activeTenant.name}</span> workspace.
                  </p>
                </div>

                {/* Account Details Box */}
                <div className="rounded-2xl bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800/60 p-4 text-xs space-y-2 text-left">
                  <div className="flex justify-between"><span className="text-slate-400">Your Assigned Role:</span><span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px]">{ROLE_CONFIG[invitedUser.role].label}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Login Username ID:</span><span className="font-bold text-slate-800 dark:text-zinc-200 font-mono">{invitedUser.email}</span></div>
                </div>

                {/* CTA Accept Link */}
                <div className="text-center py-2">
                  <button
                    onClick={() => {
                      switchUser(invitedUser.id);
                      setIsEmailPreviewOpen(false);
                      showFeedback('success', `Invitation accepted! Successfully logged in as ${invitedUser.firstName} (${ROLE_CONFIG[invitedUser.role].label}).`);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.03] active:scale-[0.97] transition-all cursor-pointer w-full justify-center sm:w-auto"
                    style={{ backgroundColor: activeTenant.brandingConfig.primary || '#6366f1' }}
                  >
                    <span>Accept Invitation & Log In</span>
                    <Check size={14} />
                  </button>
                </div>

                {/* Manual instructions */}
                <div className="text-[11px] leading-relaxed text-slate-400 dark:text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/40 pt-4 space-y-2 text-left">
                  <p className="font-bold uppercase tracking-wider text-[9px]">Manual Sign In Instructions</p>
                  <p>
                    If the button above does not work, copy and paste this link in your browser:
                    <br />
                    <span className="text-indigo-500 dark:text-indigo-400 font-mono break-all underline cursor-pointer" onClick={() => {
                      switchUser(invitedUser.id);
                      setIsEmailPreviewOpen(false);
                      showFeedback('success', `Invitation accepted! Successfully logged in as ${invitedUser.firstName} (${ROLE_CONFIG[invitedUser.role].label}).`);
                    }}>
                      http://localhost:3000/auth/invite-accept?token=invite_{invitedUser.id}
                    </span>
                  </p>
                  <p>To sign in manually, navigate to the main login portal, select the organization slug <strong>{activeTenant.slug}</strong>, and enter your email address <strong>{invitedUser.email}</strong>.</p>
                </div>
              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-zinc-200/50 dark:border-zinc-800/40 pt-4 mt-5 gap-4">
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 max-w-full sm:max-w-[55%] leading-tight text-left">
                * Note: This is an interactive virtual outbox simulating SMTP email delivery. The Accept button automatically performs invitation token resolution and changes the active session for testing.
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsEmailPreviewOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition-all cursor-pointer"
                >
                  Close Outbox
                </button>
                <button
                  type="button"
                  onClick={() => {
                    switchUser(invitedUser.id);
                    setIsEmailPreviewOpen(false);
                    showFeedback('success', `Invitation accepted! Successfully logged in as ${invitedUser.firstName} (${ROLE_CONFIG[invitedUser.role].label}).`);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  Accept & Log In
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
