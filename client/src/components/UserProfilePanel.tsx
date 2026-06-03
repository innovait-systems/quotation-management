'use client';

import React, { useState, useEffect } from 'react';
import SlidePanel from './ui/SlidePanel';
import { useTenantStore } from '../store/tenantStore';
import { useDashboardStore } from '../store/dashboardStore';
import { 
  User, 
  Lock, 
  Palette, 
  Check, 
  AlertCircle, 
  UserCheck, 
  KeyRound, 
  Sun, 
  Moon,
  Laptop
} from 'lucide-react';

interface UserProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

export default function UserProfilePanel({ open, onClose }: UserProfilePanelProps) {
  const { currentUser, updateUser } = useTenantStore();
  const { theme, setTheme } = useDashboardStore();

  // Profile Details Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Active section inside panel: 'profile' | 'password' | 'theme'
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'theme'>('profile');

  // Initialize fields on open
  useEffect(() => {
    if (open && currentUser) {
      setFirstName(currentUser.firstName);
      setLastName(currentUser.lastName);
      setEmail(currentUser.email.toLowerCase());
      setProfileSuccess(false);
      setProfileError(null);
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess(false);
      setPasswordError(null);
    }
  }, [open, currentUser]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setProfileError('All profile fields are required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setProfileError('Please enter a valid email address.');
      return;
    }

    try {
      updateUser(currentUser.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError('Failed to update profile settings.');
    }
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    // Verify current password
    const userPass = currentUser.password || 'password';
    if (currentPassword !== userPass) {
      setPasswordError('The current password you entered is incorrect.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Confirm password does not match the new password.');
      return;
    }

    try {
      updateUser(currentUser.id, {
        password: newPassword,
      });
      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError('Failed to update password.');
    }
  };

  return (
    <SlidePanel
      open={open}
      onClose={onClose}
      title="User Profile Settings"
      subtitle="Manage your personal credentials, workspace theme, and account password."
      width="max-w-md"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-px">
          {[
            { id: 'profile', label: 'My Info', icon: <User size={14} /> },
            { id: 'password', label: 'Security', icon: <Lock size={14} /> },
            { id: 'theme', label: 'Theme', icon: <Palette size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Profile Information Form */}
        {activeTab === 'profile' && (
          <form onSubmit={handleUpdateProfile} className="space-y-4 animate-in fade-in duration-200">
            {profileSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={16} />
                <span>Profile updated successfully!</span>
              </div>
            )}

            {profileError && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} />
                <span>{profileError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="email@company.com"
                className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold lowercase"
              />
              <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                Your email ID is automatically normalized to lowercase for authentication safety.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Account Access Role</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-500 dark:text-zinc-400">
                <UserCheck size={14} className="text-indigo-500" />
                <span>{currentUser.role} (System Managed)</span>
              </div>
              <p className="text-[9px] text-slate-400 dark:text-zinc-500">
                Contact your Super Admin to adjust your security clearance permissions.
              </p>
            </div>

            <button
              type="submit"
              className="flex justify-center items-center w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-white rounded-xl text-sm font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer mt-4"
            >
              Save Profile Changes
            </button>
          </form>
        )}

        {/* Tab 2: Change Password Form */}
        {activeTab === 'password' && (
          <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in duration-200">
            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={16} />
                <span>Password changed successfully!</span>
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                <AlertCircle size={16} className="shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Current Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold"
                />
              </div>
              <p className="text-[9px] text-slate-400 dark:text-zinc-500">
                Verify your current authentication credentials. Default account password is <span className="font-mono">password</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Confirm New Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 font-semibold"
                />
              </div>
            </div>

            <button
              type="submit"
              className="flex justify-center items-center w-full h-11 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-100 text-white rounded-xl text-sm font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer mt-4"
            >
              Update Password
            </button>
          </form>
        )}

        {/* Tab 3: Themes Preference Option */}
        {activeTab === 'theme' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-2">Select Visual Theme</span>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Light Mode Selector Card */}
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                  theme === 'light'
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className={`p-3 rounded-full mb-3 transition-colors ${
                  theme === 'light' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-zinc-100 dark:bg-zinc-900 text-slate-400 group-hover:text-slate-600'
                }`}>
                  <Sun size={20} />
                </div>
                <span className="text-xs font-bold">Light Theme</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Soft lights, clear borders</span>
              </button>

              {/* Dark Mode Selector Card */}
              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98] ${
                  theme === 'dark'
                    ? 'border-indigo-500 bg-indigo-500/5 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className={`p-3 rounded-full mb-3 transition-colors ${
                  theme === 'dark' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-900 text-slate-400 group-hover:text-zinc-300'
                }`}>
                  <Moon size={20} />
                </div>
                <span className="text-xs font-bold">Dark Theme</span>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">Deep space, rich contrast</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 dark:text-zinc-500 leading-relaxed mt-4">
              Your UI preference applies in real-time across the client portal, and is saved in your local workspace sandbox storage.
            </p>
          </div>
        )}
      </div>
    </SlidePanel>
  );
}
