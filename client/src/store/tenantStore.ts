import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiRequest } from '../utils/apiClient';
import { useNotificationStore } from './notificationStore';

const normalizeBrandingConfig = (config: any): TenantBranding => {
  if (!config) return { primary: '#6366f1', secondary: '#0f172a' };
  return {
    primary: config.primary || config.primaryColor || '#6366f1',
    secondary: config.secondary || config.secondaryColor || '#0f172a',
  };
};

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
  numberingFormats?: {
    QUOTATION?: string;
    PURCHASE_ORDER?: string;
    INVOICE?: string;
    SERVICE?: string;
  };
  numberingSequences?: {
    QUOTATION?: number;
    PURCHASE_ORDER?: number;
    INVOICE?: number;
    SERVICE?: number;
  };
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
  isSaaSAdminSession: boolean;
  login: (email: string, tenantId: string, password?: string, isSaaSGateway?: boolean) => Promise<boolean>;
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
    numberingFormats?: {
      QUOTATION?: string;
      PURCHASE_ORDER?: string;
      INVOICE?: string;
      SERVICE?: string;
    };
    numberingSequences?: {
      QUOTATION?: number;
      PURCHASE_ORDER?: number;
      INVOICE?: number;
      SERVICE?: number;
    };
  }) => void;
  incrementAndGetNextNumber: (entityType: 'QUOTATION' | 'INVOICE' | 'PURCHASE_ORDER' | 'SERVICE') => string;
  resetNumberingSequence: (entityType: 'QUOTATION' | 'INVOICE' | 'PURCHASE_ORDER' | 'SERVICE') => void;
  addTenant: (tenant: Omit<Tenant, 'features'>, adminPassword?: string) => Promise<void>;
  updateTenant: (tenantId: string, updates: Partial<Tenant>) => void;
  deleteTenant: (tenantId: string) => void;
  updateRolePermissions: (role: UserRole, resource: Resource, action: string, value: boolean) => void;
  // User CRUD
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => Promise<void>;
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

const createDefaultUsers = (tenantId: string, slug?: string, adminPassword?: string): User[] => {
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
        password: 'InnovaITSecure2026!',
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
  const actualSlug = slug || tenantId.replace('tenant-', '');
  const pass = adminPassword || 'password';
  return [
    {
      id: `user-${tenantId}-admin`,
      tenantId,
      firstName: 'Company',
      lastName: 'Admin',
      email: `admin@${actualSlug}.com`,
      role: 'TENANT_ADMIN',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: pass,
    },
    {
      id: `user-${tenantId}-finance`,
      tenantId,
      firstName: 'Company',
      lastName: 'Finance',
      email: `finance@${actualSlug}.com`,
      role: 'FINANCE',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: pass,
    },
    {
      id: `user-${tenantId}-sales`,
      tenantId,
      firstName: 'Company',
      lastName: 'Sales',
      email: `sales@${actualSlug}.com`,
      role: 'SALES',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: pass,
    },
    {
      id: `user-${tenantId}-ops`,
      tenantId,
      firstName: 'Company',
      lastName: 'Ops',
      email: `ops@${actualSlug}.com`,
      role: 'OPERATIONS',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: pass,
    },
    {
      id: `user-${tenantId}-viewer`,
      tenantId,
      firstName: 'Company',
      lastName: 'Viewer',
      email: `viewer@${actualSlug}.com`,
      role: 'VIEWER',
      isActive: true,
      createdAt: new Date().toISOString(),
      password: pass,
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
    rolePermissions: { ...defaultRolePermissions },
    numberingFormats: {
      QUOTATION: 'QT-{YYYY}-{NNN}',
      PURCHASE_ORDER: 'PO-{YYYY}-{NNN}',
      INVOICE: 'INV-{YYYY}-{NNN}',
      SERVICE: 'SVC-{YYYY}-{NNN}'
    },
    numberingSequences: {
      QUOTATION: 1,
      PURCHASE_ORDER: 1,
      INVOICE: 1,
      SERVICE: 1
    }
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
    rolePermissions: { ...defaultRolePermissions },
    numberingFormats: {
      QUOTATION: 'QT-{YYYY}-{NNN}',
      PURCHASE_ORDER: 'PO-{YYYY}-{NNN}',
      INVOICE: 'INV-{YYYY}-{NNN}',
      SERVICE: 'SVC-{YYYY}-{NNN}'
    },
    numberingSequences: {
      QUOTATION: 1,
      PURCHASE_ORDER: 1,
      INVOICE: 1,
      SERVICE: 1
    }
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
    rolePermissions: { ...defaultRolePermissions },
    numberingFormats: {
      QUOTATION: 'QT-{YYYY}-{NNN}',
      PURCHASE_ORDER: 'PO-{YYYY}-{NNN}',
      INVOICE: 'INV-{YYYY}-{NNN}',
      SERVICE: 'SVC-{YYYY}-{NNN}'
    },
    numberingSequences: {
      QUOTATION: 1,
      PURCHASE_ORDER: 1,
      INVOICE: 1,
      SERVICE: 1
    }
  }
];

const defaultUsersList = [
  ...createDefaultUsers(defaultTenantId),
  ...createDefaultUsers('tenant-spacex', 'spacex-cloud'),
  ...createDefaultUsers('tenant-wayne', 'wayne-enterprises')
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
      isSaaSAdminSession: false,

      login: async (email, tenantId, password, isSaaSGateway) => {
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
            // Guard: Block SAAS Owner email from Company portal login context
            if (!isSaaSGateway && res.user.email.toLowerCase() === 'it@innovait-systems.com') {
              console.warn('Login blocked: SaaS Owner email cannot be used in Company portal context.');
              return false;
            }

            if (typeof window !== 'undefined') {
              localStorage.setItem('innovait-auth-token', res.accessToken);
            }
            
            const rawBranding = res.tenant.brandingConfig || {};
            const tenantWithFeatures = {
              ...res.tenant,
              brandingConfig: normalizeBrandingConfig(rawBranding),
              features: rawBranding.features || res.tenant.features || defaultFeatures,
              rolePermissions: rawBranding.rolePermissions || res.tenant.rolePermissions || defaultRolePermissions,
              address: rawBranding.address || res.tenant.address || '',
              gstNumber: rawBranding.gstNumber || res.tenant.gstNumber || '',
              email: rawBranding.email || res.tenant.email || '',
              logoUrl: res.tenant.logoUrl || rawBranding.logoUrl || '',
              authorizedPersons: rawBranding.authorizedPersons || res.tenant.authorizedPersons || [],
              bankDetails: rawBranding.bankDetails || res.tenant.bankDetails || {
                accountNo: '',
                beneficiaryName: '',
                bankName: '',
                ifscCode: '',
                swiftCode: '',
                branch: ''
              },
              numberingSequences: rawBranding.numberingSequences || (res.tenant.numberingFormats ? res.tenant.numberingFormats.sequences : null) || {
                QUOTATION: 1,
                PURCHASE_ORDER: 1,
                INVOICE: 1,
                SERVICE: 1
              }
            };

            const resolvedRole = (res.user.role === 'SUPER_ADMIN' && res.user.email.toLowerCase() !== 'it@innovait-systems.com')
              ? 'TENANT_ADMIN'
              : res.user.role;

            const activeSessionRole = (res.user.email.toLowerCase() === 'it@innovait-systems.com')
              ? (isSaaSGateway ? 'SUPER_ADMIN' : 'TENANT_ADMIN')
              : resolvedRole;

            set({
              currentUser: {
                ...res.user,
                role: activeSessionRole
              },
              activeRole: activeSessionRole,
              activeTenant: tenantWithFeatures,
              isAuthenticated: true,
              isSaaSAdminSession: !!isSaaSGateway,
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
        set({ isAuthenticated: false, isSaaSAdminSession: false });
      },

      setActiveTenant: (tenantId) => set((state) => {
        const tenant = state.tenantsList.find((t) => t.id === tenantId);
        if (!tenant) return {};
        
        // Find the first user belonging to the new tenant, or create default seeded users
        const tenantUsers = state.users.filter(u => u.tenantId === tenantId);
        const newWorkspaceUsers = tenantUsers.length > 0 
          ? [] 
          : createDefaultUsers(tenantId, tenant.slug);
        const newCurrentUser = tenantUsers.length > 0 
          ? tenantUsers[0] 
          : newWorkspaceUsers[0];
        
        const updatedUsers = tenantUsers.length > 0 
          ? state.users 
          : [...state.users, ...newWorkspaceUsers];

        const resolvedRole = (newCurrentUser.role === 'SUPER_ADMIN' && newCurrentUser.email.toLowerCase() !== 'it@innovait-systems.com')
          ? 'TENANT_ADMIN'
          : newCurrentUser.role;

        return { 
          activeTenant: tenant, 
          currentUser: {
            ...newCurrentUser,
            role: resolvedRole
          },
          activeRole: resolvedRole,
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

      updateTenantSettings: async (updates) => {
        try {
          const bodyPayload = {
            name: updates.name,
            slug: updates.slug,
            currency: updates.currency,
            logoUrl: updates.logoUrl,
            brandingConfig: (updates.primaryColor || updates.secondaryColor) ? {
              primary: updates.primaryColor,
              secondary: updates.secondaryColor,
            } : undefined,
            address: updates.address,
            gstNumber: updates.gstNumber,
            email: updates.email,
            authorizedPersons: updates.authorizedPersons,
            bankDetails: updates.bankDetails,
            numberingFormats: updates.numberingFormats,
            features: get().activeTenant.features,
            rolePermissions: get().activeTenant.rolePermissions,
          };

          const activeTenantId = get().activeTenant.id;
          await apiRequest('/api/v1/metadata/tenant-profile', {
            method: 'POST',
            headers: {
              'x-tenant-id': activeTenantId
            },
            body: JSON.stringify(bodyPayload)
          });

          set((state) => {
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
              },
              numberingFormats: updates.numberingFormats !== undefined
                ? { ...state.activeTenant.numberingFormats, ...updates.numberingFormats }
                : state.activeTenant.numberingFormats,
              numberingSequences: updates.numberingSequences !== undefined
                ? { ...state.activeTenant.numberingSequences, ...updates.numberingSequences }
                : state.activeTenant.numberingSequences,
            };
            return {
              activeTenant: updatedTenant,
              tenantsList: state.tenantsList.map(t => t.id === state.activeTenant.id ? updatedTenant : t)
            };
          });
        } catch (err) {
          console.error('Error updating tenant settings:', err);
          alert(`Failed to save settings: ${err instanceof Error ? err.message : err}`);
        }
      },

      incrementAndGetNextNumber: (entityType) => {
        let result = '';
        set((state) => {
          const formats = state.activeTenant.numberingFormats || {
            QUOTATION: 'QT-{YYYY}-{NNN}',
            PURCHASE_ORDER: 'PO-{YYYY}-{NNN}',
            INVOICE: 'INV-{YYYY}-{NNN}',
            SERVICE: 'SVC-{YYYY}-{NNN}'
          };
          const sequences = state.activeTenant.numberingSequences || {
            QUOTATION: 1,
            PURCHASE_ORDER: 1,
            INVOICE: 1,
            SERVICE: 1
          };
          const currentSeq = sequences[entityType] || 1;
          const pattern = formats[entityType] || `${entityType.substring(0, 3)}-{YYYY}-{NNN}`;

          const now = new Date();
          const year = now.getFullYear().toString();
          let formatted = pattern.replace(/{YYYY}/g, year);
          const nMatch = pattern.match(/{N+}/);
          if (nMatch) {
            const fullMatch = nMatch[0];
            const nLength = fullMatch.length - 2;
            const padded = currentSeq.toString().padStart(nLength, '0');
            formatted = formatted.replace(fullMatch, padded);
          }

          result = formatted;

          const updatedSequences = {
            ...sequences,
            [entityType]: currentSeq + 1
          };
          const updatedTenant = {
            ...state.activeTenant,
            numberingSequences: updatedSequences,
            numberingFormats: formats
          };

          return {
            activeTenant: updatedTenant,
            tenantsList: state.tenantsList.map(t => t.id === state.activeTenant.id ? updatedTenant : t)
          };
        });
        return result;
      },

      resetNumberingSequence: (entityType) => set((state) => {
        const sequences = state.activeTenant.numberingSequences || {
          QUOTATION: 1,
          PURCHASE_ORDER: 1,
          INVOICE: 1,
          SERVICE: 1
        };
        const updatedSequences = {
          ...sequences,
          [entityType]: 1
        };
        const updatedTenant = {
          ...state.activeTenant,
          numberingSequences: updatedSequences
        };
        return {
          activeTenant: updatedTenant,
          tenantsList: state.tenantsList.map(t => t.id === state.activeTenant.id ? updatedTenant : t)
        };
      }),

      addTenant: async (newTenantData, adminPassword) => {
        try {
          // Call the backend API to create the tenant in PostgreSQL database
          const tenantRes = await apiRequest('/api/v1/governance/tenants', {
            method: 'POST',
            headers: {
              'x-system-admin-key': 'antigravity_master_sysadmin_secret_2026'
            },
            body: JSON.stringify({
              name: newTenantData.name,
              slug: newTenantData.slug,
              currency: newTenantData.currency || 'USD'
            })
          });

          // Create standard users in the database
          const defaultAdminPassword = adminPassword || 'password';
          const defaultAdminEmail = `admin@${newTenantData.slug}.com`;
          
          await apiRequest('/api/v1/governance/users', {
            method: 'POST',
            headers: {
              'x-system-admin-key': 'antigravity_master_sysadmin_secret_2026'
            },
            body: JSON.stringify({
              tenantSlugOrId: tenantRes.id,
              email: defaultAdminEmail,
              passwordRaw: defaultAdminPassword,
              firstName: 'Company',
              lastName: 'Admin',
              role: 'TENANT_ADMIN'
            })
          });

          const roles = ['FINANCE', 'SALES', 'OPERATIONS', 'VIEWER'];
          const labels = ['Finance', 'Sales', 'Ops', 'Viewer'];
          for (let i = 0; i < roles.length; i++) {
            await apiRequest('/api/v1/governance/users', {
              method: 'POST',
              headers: {
                'x-system-admin-key': 'antigravity_master_sysadmin_secret_2026'
              },
              body: JSON.stringify({
                tenantSlugOrId: tenantRes.id,
                email: `${roles[i].toLowerCase()}@${newTenantData.slug}.com`,
                passwordRaw: defaultAdminPassword,
                firstName: 'Company',
                lastName: labels[i],
                role: roles[i]
              })
            });
          }

          const rawBranding = tenantRes.brandingConfig || {};
          const updatedTenant = {
            ...tenantRes,
            brandingConfig: normalizeBrandingConfig(rawBranding),
            features: rawBranding.features || tenantRes.features || defaultFeatures,
            rolePermissions: rawBranding.rolePermissions || tenantRes.rolePermissions || defaultRolePermissions,
            address: rawBranding.address || tenantRes.address || '',
            gstNumber: rawBranding.gstNumber || tenantRes.gstNumber || '',
            email: rawBranding.email || tenantRes.email || '',
            logoUrl: tenantRes.logoUrl || rawBranding.logoUrl || '',
            authorizedPersons: rawBranding.authorizedPersons || tenantRes.authorizedPersons || [],
            bankDetails: rawBranding.bankDetails || tenantRes.bankDetails || {
              accountNo: '',
              beneficiaryName: '',
              bankName: '',
              ifscCode: '',
              swiftCode: '',
              branch: ''
            },
            numberingSequences: rawBranding.numberingSequences || (tenantRes.numberingFormats ? tenantRes.numberingFormats.sequences : null) || {
              QUOTATION: 1,
              PURCHASE_ORDER: 1,
              INVOICE: 1,
              SERVICE: 1
            }
          };

          const newWorkspaceUsers = createDefaultUsers(tenantRes.id, tenantRes.slug, defaultAdminPassword);

          set((state) => {
            const list = [...state.tenantsList, updatedTenant];
            const updatedUsers = [...state.users, ...newWorkspaceUsers];
            
            // If the current logged-in user is SUPER_ADMIN, preserve their session!
            if (state.currentUser && state.currentUser.role === 'SUPER_ADMIN') {
              return {
                tenantsList: list,
                users: updatedUsers
              };
            }

            const adminUser = newWorkspaceUsers[0];
            return {
              tenantsList: list,
              activeTenant: updatedTenant,
              users: updatedUsers,
              currentUser: adminUser,
              activeRole: adminUser.role,
              isAuthenticated: true,
            };
          });

          // Dispatch notification
          useNotificationStore.getState().addNotification(
            'New Company Onboarded',
            `Provisioned B2B workspace tenant sandbox: ${tenantRes.name}`,
            'success',
            'SYSTEM',
            'global-saas'
          );

        } catch (err) {
          console.error('Error adding tenant:', err);
          alert(`Failed to onboard company workspace: ${err instanceof Error ? err.message : err}`);
        }
      },

      updateTenant: async (tenantId, updates) => {
        try {
          // Call the backend API to update the tenant in PostgreSQL database
          await apiRequest(`/api/v1/governance/tenants/${tenantId}`, {
            method: 'POST',
            headers: {
              'x-system-admin-key': 'antigravity_master_sysadmin_secret_2026'
            },
            body: JSON.stringify(updates)
          });
          
          set((state) => {
            const updatedList = state.tenantsList.map(t => {
              if (t.id === tenantId) {
                return {
                  ...t,
                  ...updates,
                  brandingConfig: normalizeBrandingConfig(updates.brandingConfig || t.brandingConfig),
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
          });
        } catch (err) {
          console.error('Error updating tenant:', err);
          alert(`Failed to update company: ${err instanceof Error ? err.message : err}`);
        }
      },

      deleteTenant: (tenantId) => set((state) => {
        if (state.tenantsList.length <= 1) return {};
        const deletedTenant = state.tenantsList.find(t => t.id === tenantId);
        const updatedList = state.tenantsList.filter(t => t.id !== tenantId);
        const finalUsers = state.users.filter(u => u.tenantId !== tenantId);
        
        // Dispatch alert notification
        if (deletedTenant) {
          useNotificationStore.getState().addNotification(
            'Workspace Deleted',
            `Workspace tenant sandbox removed: ${deletedTenant.name}`,
            'alert',
            'SYSTEM',
            'global-saas'
          );
        }

        if (state.activeTenant.id === tenantId) {
          const nextActive = updatedList[0];
          const tenantUsers = finalUsers.filter(u => u.tenantId === nextActive.id);
          const newWorkspaceUsers = tenantUsers.length > 0 ? [] : createDefaultUsers(nextActive.id);
          const nextUser = tenantUsers.length > 0 ? tenantUsers[0] : newWorkspaceUsers[0];
          const updatedUsers = tenantUsers.length > 0 ? finalUsers : [...finalUsers, ...newWorkspaceUsers];
          
          const resolvedRole = (nextUser.role === 'SUPER_ADMIN' && nextUser.email.toLowerCase() !== 'it@innovait-systems.com')
            ? 'TENANT_ADMIN'
            : nextUser.role;

          return {
            tenantsList: updatedList,
            activeTenant: nextActive,
            currentUser: {
              ...nextUser,
              role: resolvedRole
            },
            activeRole: resolvedRole,
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

      addUser: async (userData) => {
        try {
          // Call the backend API to create the user in PostgreSQL database
          const userRes = await apiRequest('/api/v1/governance/users', {
            method: 'POST',
            headers: {
              'x-system-admin-key': 'antigravity_master_sysadmin_secret_2026'
            },
            body: JSON.stringify({
              tenantSlugOrId: userData.tenantId,
              email: userData.email,
              passwordRaw: userData.password || 'password',
              firstName: userData.firstName,
              lastName: userData.lastName,
              role: userData.role
            })
          });

          // Add to local state list
          const newUser: User = {
            id: userRes.id,
            tenantId: userRes.tenantId,
            firstName: userRes.firstName,
            lastName: userRes.lastName,
            email: userRes.email,
            role: userRes.role,
            isActive: userRes.isActive,
            createdAt: userRes.createdAt,
            password: userData.password || 'password'
          };

          set((state) => ({
            users: [...state.users, newUser],
          }));

          // Dispatch success notification
          useNotificationStore.getState().addNotification(
            'New Team Member Invited',
            `New user account provisioned: ${newUser.firstName} ${newUser.lastName} (${newUser.role})`,
            'success',
            'USERS',
            newUser.tenantId
          );

        } catch (err) {
          console.error('Error adding user:', err);
          alert(`Failed to create user: ${err instanceof Error ? err.message : err}`);
        }
      },

      updateUser: (userId, updates) => set((state) => {
        const updatedUsers = state.users.map(u => 
          u.id === userId ? { ...u, ...updates } : u
        );
        // If we're updating the current user, reflect changes immediately
        const updatedCurrentUser = state.currentUser.id === userId
          ? { ...state.currentUser, ...updates }
          : state.currentUser;
        const resolvedRole = (updatedCurrentUser.role === 'SUPER_ADMIN' && updatedCurrentUser.email.toLowerCase() !== 'it@innovait-systems.com')
          ? 'TENANT_ADMIN'
          : updatedCurrentUser.role;

        return {
          users: updatedUsers,
          currentUser: {
            ...updatedCurrentUser,
            role: resolvedRole
          },
          activeRole: resolvedRole,
        };
      }),

      deleteUser: (userId) => set((state) => {
        // Prevent deleting the currently active user
        if (state.currentUser.id === userId) return {};
        const deletedUser = state.users.find(u => u.id === userId);
        if (deletedUser) {
          // Dispatch alert notification
          useNotificationStore.getState().addNotification(
            'User Access Removed',
            `User account deleted: ${deletedUser.firstName} ${deletedUser.lastName}`,
            'alert',
            'USERS',
            deletedUser.tenantId
          );
        }
        return {
          users: state.users.filter(u => u.id !== userId),
        };
      }),

      switchUser: (userId) => set((state) => {
        const user = state.users.find(u => u.id === userId);
        if (!user || !user.isActive) return {};
        const resolvedRole = (user.role === 'SUPER_ADMIN' && user.email.toLowerCase() !== 'it@innovait-systems.com')
          ? 'TENANT_ADMIN'
          : user.role;
        return {
          currentUser: {
            ...user,
            role: resolvedRole
          },
          activeRole: resolvedRole,
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
