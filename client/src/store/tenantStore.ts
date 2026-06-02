import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
}

interface TenantState {
  activeTenant: Tenant;
  tenantsList: Tenant[];
  currentUser: User;
  activeRole: UserRole;
  users: User[];
  isAuthenticated: boolean;
  login: (email: string, tenantId: string) => boolean;
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
  updateRolePermissions: (role: UserRole, resource: Resource, action: string, value: boolean) => void;
  // User CRUD
  addUser: (user: Omit<User, 'id' | 'createdAt' | 'isActive'>) => void;
  updateUser: (userId: string, updates: Partial<Pick<User, 'firstName' | 'lastName' | 'email' | 'role' | 'isActive'>>) => void;
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

const createDefaultUsers = (tenantId: string): User[] => [
  {
    id: `user-${tenantId}-admin`,
    tenantId,
    firstName: 'InnovaIT',
    lastName: 'Owner',
    email: 'it@innovait-systems.com',
    role: 'SUPER_ADMIN',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: `user-${tenantId}-finance`,
    tenantId,
    firstName: 'Michael',
    lastName: 'Burry',
    email: 'finance@workspace.com',
    role: 'FINANCE',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: `user-${tenantId}-sales`,
    tenantId,
    firstName: 'Jordan',
    lastName: 'Belfort',
    email: 'sales@workspace.com',
    role: 'SALES',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: `user-${tenantId}-operations`,
    tenantId,
    firstName: 'Marcus',
    lastName: 'Aurelius',
    email: 'operations@workspace.com',
    role: 'OPERATIONS',
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: `user-${tenantId}-viewer`,
    tenantId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'viewer@workspace.com',
    role: 'VIEWER',
    isActive: true,
    createdAt: new Date().toISOString(),
  }
];

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
      accountNo: '50200012345678',
      beneficiaryName: 'INNOVAIT SYSTEMS',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0000123',
      swiftCode: 'HDFCINBBXXX',
      branch: 'Tirunelveli'
    },
    rolePermissions: { ...defaultRolePermissions }
  }
];

const defaultUsersList = createDefaultUsers(defaultTenantId);
const defaultAdminUser = defaultUsersList[0];

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      activeTenant: mockTenants[0],
      tenantsList: mockTenants,
      currentUser: defaultAdminUser,
      activeRole: defaultAdminUser.role,
      users: defaultUsersList,
      isAuthenticated: false,

      login: (email, tenantId) => {
        const state = get();
        const user = state.users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase().trim() && u.tenantId === tenantId && u.isActive
        );
        const tenant = state.tenantsList.find((t) => t.id === tenantId);
        if (user && tenant) {
          set({
            currentUser: user,
            activeRole: user.role,
            activeTenant: tenant,
            isAuthenticated: true,
          });
          return true;
        }
        return false;
      },

      logout: () => set({ isAuthenticated: false }),

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

      getUsersForTenant: (tenantId) => {
        return get().users.filter(u => u.tenantId === tenantId);
      },
    }),

    {
      name: 'quotation-tenant-storage',
    }
  )
);
