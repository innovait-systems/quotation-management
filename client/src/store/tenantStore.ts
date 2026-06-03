import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '../utils/apiClient';

export interface TenantBranding {
  primary: string;
  secondary: string;
}

export interface TenantFeatures {
  email_notifications: boolean;
  slack_integration: boolean;
  auto_reminders: boolean;
  mfa_enforce: boolean;
  ip_whitelist: boolean;
  audit_trail: boolean;
  auto_numbering: boolean;
  pdf_watermark: boolean;
  esignature: boolean;
  auto_convert: boolean;
  formula_engine: boolean;
  ai_copilot: boolean;
}

export interface AuthorizedPerson {
  id: string;
  name: string;
  designation: string;
  signatureUrl?: string;
  email?: string;
  phone?: string;
}

export interface BankDetails {
  accountNo: string;
  beneficiaryName: string;
  bankName: string;
  ifscCode: string;
  swiftCode: string;
  branch: string;
}

export interface RolePermissionConfig {
  quotations: {
    create: boolean;
    edit: boolean;
    approve: boolean;
    convert: boolean;
    export: boolean;
  };
  invoices: {
    create: boolean;
    edit: boolean;
    send: boolean;
    record_payment: boolean;
  };
  purchase_orders: {
    create: boolean;
    edit: boolean;
    approve: boolean;
    receive_goods: boolean;
  };
  services: {
    create: boolean;
    edit: boolean;
    update_status: boolean;
    add_note: boolean;
  };
}

export type Resource = 'quotations' | 'invoices' | 'purchase_orders' | 'services';

export const defaultRolePermissions: Record<UserRole, RolePermissionConfig> = {
  SUPER_ADMIN: {
    quotations: { create: true, edit: true, approve: true, convert: true, export: true },
    invoices: { create: true, edit: true, send: true, record_payment: true },
    purchase_orders: { create: true, edit: true, approve: true, receive_goods: true },
    services: { create: true, edit: true, update_status: true, add_note: true },
  },
  TENANT_ADMIN: {
    quotations: { create: true, edit: true, approve: true, convert: true, export: true },
    invoices: { create: true, edit: true, send: true, record_payment: true },
    purchase_orders: { create: true, edit: true, approve: true, receive_goods: true },
    services: { create: true, edit: true, update_status: true, add_note: true },
  },
  FINANCE: {
    quotations: { create: false, edit: false, approve: false, convert: false, export: true },
    invoices: { create: true, edit: true, send: true, record_payment: true },
    purchase_orders: { create: true, edit: true, approve: true, receive_goods: true },
    services: { create: false, edit: false, update_status: false, add_note: true },
  },
  SALES: {
    quotations: { create: true, edit: true, approve: false, convert: true, export: true },
    invoices: { create: false, edit: false, send: false, record_payment: false },
    purchase_orders: { create: false, edit: false, approve: false, receive_goods: false },
    services: { create: true, edit: true, update_status: true, add_note: true },
  },
  OPERATIONS: {
    quotations: { create: false, edit: false, approve: false, convert: false, export: true },
    invoices: { create: false, edit: false, send: false, record_payment: false },
    purchase_orders: { create: false, edit: false, approve: false, receive_goods: true },
    services: { create: true, edit: true, update_status: true, add_note: true },
  },
  VIEWER: {
    quotations: { create: false, edit: false, approve: false, convert: false, export: false },
    invoices: { create: false, edit: false, send: false, record_payment: false },
    purchase_orders: { create: false, edit: false, approve: false, receive_goods: false },
    services: { create: false, edit: false, update_status: false, add_note: false },
  },
};

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'STARTUP' | 'BUSINESS' | 'ENTERPRISE';
  currency: string;
  brandingConfig: TenantBranding;
  features: TenantFeatures;
  logoUrl?: string;
  address?: string;
  gstNumber?: string;
  email?: string;
  authorizedPersons?: AuthorizedPerson[];
  bankDetails?: BankDetails;
  rolePermissions?: Record<UserRole, RolePermissionConfig>;
}

export type UserRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'FINANCE' | 'SALES' | 'OPERATIONS' | 'VIEWER';

export interface User {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  password?: string;
}

export interface SubscriptionPlanItem {
  id: string;
  key: string;
  name: string;
  priceMonthly: number;
  priceAnnually: number;
  maxCustomFields: number;
  maxMonthlyExports: number;
  maxAiTokens: string;
  maxWorkflowRuns: number;
  description: string;
  features: string[];
}

interface TenantState {
  subscriptionPlans: SubscriptionPlanItem[];
  addSubscriptionPlan: (plan: Omit<SubscriptionPlanItem, 'id'>) => void;
  updateSubscriptionPlan: (planId: string, updates: Partial<SubscriptionPlanItem>) => void;
  deleteSubscriptionPlan: (planId: string) => void;
  activeTenant: Tenant;
  tenantsList: Tenant[];
  currentUser: User;
  activeRole: UserRole;
  users: User[];
  isAuthenticated: boolean;
  login: (email: string, tenantId: string, password?: string) => Promise<boolean>;
  logout: () => void;
  setActiveTenant: (tenantId: string) => void;
  toggleTenantFeature: (featureId: keyof TenantFeatures) => void;
  updateTenantSettings: (updates: {
    name?: string;
    slug?: string;
    currency?: string;
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    address?: string;
    gstNumber?: string;
    email?: string;
    authorizedPersons?: AuthorizedPerson[];
    bankDetails?: BankDetails;
  }) => void;
  addTenant: (tenant: Omit<Tenant, 'features'>) => void;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => void;
  deleteTenant: (tenantId: string) => void;
  updateRolePermissions: (role: UserRole, resource: Resource, action: string, value: boolean) => void;
  // User CRUD
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => void;
  updateUser: (userId: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'role' | 'isActive' | 'password'>>) => void;
  deleteUser: (userId: string) => void;
  switchUser: (userId: string) => void;
  getUsersForTenant: (tenantId: string) => User[];
}


const defaultFeatures: TenantFeatures = {
  email_notifications: true,
  slack_integration: false,
  auto_reminders: true,
  mfa_enforce: false,
  ip_whitelist: false,
  audit_trail: true,
  auto_numbering: true,
  pdf_watermark: true,
  esignature: false,
  auto_convert: false,
  formula_engine: true,
  ai_copilot: true,
};

const defaultTenantId = 'tenant-innovait';

const createDefaultUsers = (tenantId: string): User[] => {
  // If default administrative tenant, seed the SUPER_ADMIN
  if (tenantId === defaultTenantId) {
    return [
      {
        id: `user-${tenantId}-owner`,
        tenantId,
        firstName: 'InnovaIT',
        lastName: 'Owner',
        email: 'it@innovait-systems.com',
        role: 'SUPER_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        password: 'password',
      },
      {
        id: `user-${tenantId}-admin`,
        tenantId,
        firstName: 'InnovaIT',
        lastName: 'Admin',
        email: 'admin@innovait-systems.com',
        role: 'TENANT_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        password: 'password',
      },
      {
        id: `user-${tenantId}-finance`,
        tenantId,
        firstName: 'InnovaIT',
        lastName: 'Finance',
        email: 'finance@innovait-systems.com',
        role: 'FINANCE',
        isActive: true,
        createdAt: new Date().toISOString(),
        password: 'password',
      }
    ];
  }

  // For other tenants, seed the typical company roles
  const slug = tenantId.replace('tenant-', '');
  return [
    {
      id: `user-${tenantId}-admin`,
      tenantId,
      firstName: 'Company',
      lastName: 'Admin',
      email: `admin@${slug}.com`,
      role: 'TENANT_ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: 'password',
    },
    {
      id: `user-${tenantId}-finance`,
      tenantId,
      firstName: 'Company',
      lastName: 'Finance',
      email: `finance@${slug}.com`,
      role: 'FINANCE',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: 'password',
    },
    {
      id: `user-${tenantId}-sales`,
      tenantId,
      firstName: 'Company',
      lastName: 'Sales',
      email: `sales@${slug}.com`,
      role: 'SALES',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: 'password',
    },
    {
      id: `user-${tenantId}-ops`,
      tenantId,
      firstName: 'Company',
      lastName: 'Ops',
      email: `ops@${slug}.com`,
      role: 'OPERATIONS',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: 'password',
    },
    {
      id: `user-${tenantId}-viewer`,
      tenantId,
      firstName: 'Company',
      lastName: 'Viewer',
      email: `viewer@${slug}.com`,
      role: 'VIEWER',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: 'password',
    }
  ];
};

const mockTenants: Tenant[] = [
  {
    id: defaultTenantId,
    name: 'InnovaIT Systems',
    slug: 'innovait-systems',
    plan: 'ENTERPRISE',
    currency: 'USD',
    brandingConfig: { primary: '#6366f1', secondary: '#0f172a' },
    features: { ...defaultFeatures },
    logoUrl: '',
    address: '',
    authorizedPersons: [],
    bankDetails: {
      accountNo: '',
      beneficiaryName: '',
      bankName: '',
      ifscCode: '',
      swiftCode: '',
      branch: ''
    },
    rolePermissions: { ...defaultRolePermissions }
  },
  {
    id: 'tenant-spacex',
    name: 'SpaceX Cloud Labs',
    slug: 'spacex-cloud',
    plan: 'BUSINESS',
    currency: 'USD',
    brandingConfig: { primary: '#005288', secondary: '#0f172a' },
    features: { ...defaultFeatures },
    logoUrl: '',
    address: '',
    authorizedPersons: [],
    bankDetails: {
      accountNo: '',
      beneficiaryName: '',
      bankName: '',
      ifscCode: '',
      swiftCode: '',
      branch: ''
    },
    rolePermissions: { ...defaultRolePermissions }
  },
  {
    id: 'tenant-wayne',
    name: 'Wayne Enterprises',
    slug: 'wayne-enterprises',
    plan: 'ENTERPRISE',
    currency: 'USD',
    brandingConfig: { primary: '#1e293b', secondary: '#0f172a' },
    features: { ...defaultFeatures },
    logoUrl: '',
    address: '',
    authorizedPersons: [],
    bankDetails: {
      accountNo: '',
      beneficiaryName: '',
      bankName: '',
      ifscCode: '',
      swiftCode: '',
      branch: ''
    },
    rolePermissions: { ...defaultRolePermissions }
  }
];

const defaultUsersList = [
  ...createDefaultUsers(defaultTenantId),
  ...createDefaultUsers('tenant-spacex'),
  ...createDefaultUsers('tenant-wayne')
];
const defaultAdminUser = defaultUsersList[0];

export const defaultSubscriptionPlans: SubscriptionPlanItem[] = [
  {
    id: 'plan-free',
    key: 'FREE',
    name: 'Starter Sandbox',
    priceMonthly: 0,
    priceAnnually: 0,
    maxCustomFields: 5,
    maxMonthlyExports: 10,
    maxAiTokens: '50k',
    maxWorkflowRuns: 100,
    description: 'Ideal for baseline B2B sandboxing & testing.',
    features: ['Max 5 custom fields', '10 PDF monthly exports', 'Default brand presets']
  },
  {
    id: 'plan-startup',
    key: 'STARTUP',
    name: 'Growth Startup',
    priceMonthly: 99,
    priceAnnually: 79,
    maxCustomFields: 15,
    maxMonthlyExports: 50,
    maxAiTokens: '200k',
    maxWorkflowRuns: 500,
    description: 'For growing companies with custom styling.',
    features: ['Max 15 custom fields', '50 PDF/Excel exports', 'Custom branding layout', '200k monthly AI tokens']
  },
  {
    id: 'plan-business',
    key: 'BUSINESS',
    name: 'Enterprise Lite',
    priceMonthly: 199,
    priceAnnually: 159,
    maxCustomFields: 50,
    maxMonthlyExports: 250,
    maxAiTokens: '1M',
    maxWorkflowRuns: 2500,
    description: 'Advanced integrations, PDF templates & AI copilot.',
    features: ['Max 50 custom fields', '250 exports / formulas', 'Automated custom rules', '1M monthly AI tokens']
  },
  {
    id: 'plan-enterprise',
    key: 'ENTERPRISE',
    name: 'Unlimited Corp',
    priceMonthly: 499,
    priceAnnually: 399,
    maxCustomFields: 999,
    maxMonthlyExports: 9999,
    maxAiTokens: '100M',
    maxWorkflowRuns: 99999,
    description: 'Full enterprise capacity with SOC2 audits & compliance logs.',
    features: ['Unlimited custom properties', 'Unlimited PDF / Excel reports', 'Cryptographic SOC2 Audits', '100M custom AI tokens']
  }
];

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      subscriptionPlans: defaultSubscriptionPlans,
      activeTenant: mockTenants[0],
      tenantsList: mockTenants,
      currentUser: defaultAdminUser,
      activeRole: defaultAdminUser.role,
      users: defaultUsersList,
      isAuthenticated: false,

      login: async (email, tenantId, password) => {
        try {
          const res = await apiRequest('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              passwordHash: password || 'password',
              tenantSlug: tenantId,
            }),
          });
          
          if (res.accessToken) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('innovait-auth-token', res.accessToken);
            }
            
            const tenantWithFeatures = {
              ...res.tenant,
              brandingConfig: res.tenant.brandingConfig || { primary: '#6366f1', secondary: '#0f172a' },
              features: res.tenant.features || defaultFeatures,
              rolePermissions: res.tenant.rolePermissions || defaultRolePermissions,
            };

            set({
              currentUser: res.user,
              activeRole: res.user.role,
              activeTenant: tenantWithFeatures,
              isAuthenticated: true,
            });
            return true;
          }
          return false;
        } catch (err) {
          console.error('Login error:', err);
          return false;
        }
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('innovait-auth-token');
        }
        set({ isAuthenticated: false });
      },

      setActiveTenant: (tenantId) => set((state) => {
        const tenant = state.tenantsList.find((t) => t.id === tenantId);
        if (!tenant) return {};
        
        // Find the first user belonging to the new tenant, or create default seeded users
        const tenantUsers = state.users.filter(u => u.tenantId === tenantId);
        const newWorkspaceUsers = tenantUsers.length > 0 
          ? [] 
          : createDefaultUsers(tenantId);
        const newCurrentUser = tenantUsers.length > 0 
          ? tenantUsers[0] 
          : newWorkspaceUsers[0];
        
        const updatedUsers = tenantUsers.length > 0 
          ? state.users 
          : [...state.users, ...newWorkspaceUsers];

        return { 
          activeTenant: tenant, 
          currentUser: newCurrentUser,
          activeRole: newCurrentUser.role,
          users: updatedUsers,
        };
      }),

      toggleTenantFeature: (featureId) => set((state) => {
        const updatedFeatures = {
          ...state.activeTenant.features,
          [featureId]: !state.activeTenant.features[featureId]
        };
        const updatedTenant = {
          ...state.activeTenant,
          features: updatedFeatures
        };
        return {
          activeTenant: updatedTenant,
          tenantsList: state.tenantsList.map(t => t.id === state.activeTenant.id ? updatedTenant : t)
        };
      }),

      updateTenantSettings: (updates) => set((state) => {
        const updatedTenant = {
          ...state.activeTenant,
          name: updates.name ?? state.activeTenant.name,
          slug: updates.slug ?? state.activeTenant.slug,
          currency: updates.currency ?? state.activeTenant.currency,
          logoUrl: updates.logoUrl !== undefined ? updates.logoUrl : state.activeTenant.logoUrl,
          address: updates.address !== undefined ? updates.address : state.activeTenant.address,
          gstNumber: updates.gstNumber !== undefined ? updates.gstNumber : state.activeTenant.gstNumber,
          email: updates.email !== undefined ? updates.email : state.activeTenant.email,
          authorizedPersons: updates.authorizedPersons !== undefined ? updates.authorizedPersons : state.activeTenant.authorizedPersons,
          bankDetails: updates.bankDetails !== undefined ? updates.bankDetails : state.activeTenant.bankDetails,
          brandingConfig: {
            primary: updates.primaryColor ?? state.activeTenant.brandingConfig.primary,
            secondary: updates.secondaryColor ?? state.activeTenant.brandingConfig.secondary,
          }
        };
        return {
          activeTenant: updatedTenant,
          tenantsList: state.tenantsList.map(t => t.id === state.activeTenant.id ? updatedTenant : t)
        };
      }),

      addTenant: (newTenantData) => set((state) => {
        const newTenant: Tenant = {
          ...newTenantData,
          features: { ...defaultFeatures },
          rolePermissions: { ...defaultRolePermissions }
        };
        // Auto-provision default seeded users for the new workspace
        const newWorkspaceUsers = createDefaultUsers(newTenant.id);
        
        // If the current logged-in user is SUPER_ADMIN, preserve their session!
        if (state.currentUser && state.currentUser.role === 'SUPER_ADMIN') {
          return {
            tenantsList: [...state.tenantsList, newTenant],
            users: [...state.users, ...newWorkspaceUsers]
          };
        }

        const adminUser = newWorkspaceUsers[0];
        return {
          tenantsList: [...state.tenantsList, newTenant],
          activeTenant: newTenant,
          users: [...state.users, ...newWorkspaceUsers],
          currentUser: adminUser,
          activeRole: adminUser.role,
          isAuthenticated: true,
        };
      }),

      updateTenant: (tenantId, updates) => set((state) => {
        const updatedList = state.tenantsList.map(t => {
          if (t.id === tenantId) {
            return {
              ...t,
              ...updates,
              brandingConfig: updates.brandingConfig 
                ? { ...t.brandingConfig, ...updates.brandingConfig }
                : t.brandingConfig,
              features: updates.features
                ? { ...t.features, ...updates.features }
                : t.features,
            };
          }
          return t;
        });
        const activeChanged = state.activeTenant.id === tenantId;
        const updatedActive = activeChanged 
          ? updatedList.find(t => t.id === tenantId) || state.activeTenant
          : state.activeTenant;
        return {
          tenantsList: updatedList,
          activeTenant: updatedActive
        };
      }),

      deleteTenant: (tenantId) => set((state) => {
        if (state.tenantsList.length <= 1) return {};
        const updatedList = state.tenantsList.filter(t => t.id !== tenantId);
        const finalUsers = state.users.filter(u => u.tenantId !== tenantId);
        
        if (state.activeTenant.id === tenantId) {
          const nextActive = updatedList[0];
          const tenantUsers = finalUsers.filter(u => u.tenantId === nextActive.id);
          const newWorkspaceUsers = tenantUsers.length > 0 ? [] : createDefaultUsers(nextActive.id);
          const nextUser = tenantUsers.length > 0 ? tenantUsers[0] : newWorkspaceUsers[0];
          const updatedUsers = tenantUsers.length > 0 ? finalUsers : [...finalUsers, ...newWorkspaceUsers];
          
          return {
            tenantsList: updatedList,
            activeTenant: nextActive,
            currentUser: nextUser,
            activeRole: nextUser.role,
            users: updatedUsers
          };
        }
        
        return {
          tenantsList: updatedList,
          users: finalUsers
        };
      }),

      updateRolePermissions: (role, resource, action, value) => set((state) => {
        const currentPermissions = state.activeTenant.rolePermissions || defaultRolePermissions;
        const updatedRolePermissions = {
          ...currentPermissions,
          [role]: {
            ...currentPermissions[role],
            [resource]: {
              ...currentPermissions[role][resource],
              [action]: value
            }
          }
        };

        const updatedTenant = {
          ...state.activeTenant,
          rolePermissions: updatedRolePermissions
        };

        return {
          activeTenant: updatedTenant,
          tenantsList: state.tenantsList.map(t => t.id === state.activeTenant.id ? updatedTenant : t)
        };
      }),

      // ── User CRUD ──────────────────────────────────────────────

      addUser: (userData) => set((state) => {
        const newUser: User = {
          ...userData,
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        return {
          users: [...state.users, newUser],
        };
      }),

      updateUser: (userId, updates) => set((state) => {
        const updatedUsers = state.users.map(u => 
          u.id === userId ? { ...u, ...updates } : u
        );
        // If we're updating the current user, reflect changes immediately
        const updatedCurrentUser = state.currentUser.id === userId
          ? { ...state.currentUser, ...updates }
          : state.currentUser;
        return {
          users: updatedUsers,
          currentUser: updatedCurrentUser,
          activeRole: updatedCurrentUser.role,
        };
      }),

      deleteUser: (userId) => set((state) => {
        // Prevent deleting the currently active user
        if (state.currentUser.id === userId) return {};
        return {
          users: state.users.filter(u => u.id !== userId),
        };
      }),

      switchUser: (userId) => set((state) => {
        const user = state.users.find(u => u.id === userId);
        if (!user || !user.isActive) return {};
        return {
          currentUser: user,
          activeRole: user.role,
        };
      }),

      addSubscriptionPlan: (planData) => set((state) => {
        const newPlan: SubscriptionPlanItem = {
          ...planData,
          id: `plan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        };
        return {
          subscriptionPlans: [...state.subscriptionPlans, newPlan]
        };
      }),

      updateSubscriptionPlan: (planId, updates) => set((state) => ({
        subscriptionPlans: state.subscriptionPlans.map(p => p.id === planId ? { ...p, ...updates } : p)
      })),

      deleteSubscriptionPlan: (planId) => set((state) => ({
        subscriptionPlans: state.subscriptionPlans.filter(p => p.id !== planId)
      })),

      getUsersForTenant: (tenantId) => {
        return get().users.filter(u => u.tenantId === tenantId);
      },
    }),

    {
      name: 'quotation-tenant-storage-v6',
    }
  )
);
