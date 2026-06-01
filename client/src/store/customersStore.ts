import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Customer {
  id: string;
  tenantId: string;
  name: string;          // Contact Name (e.g. Marcus Chen)
  company: string;       // Company Name (e.g. Acme Supply Corp)
  email: string;
  phone: string;
  address: string;
  currency: 'USD' | 'EUR' | 'GBP' | string;
  paymentTerms: 'Net 15' | 'Net 30' | 'Net 45' | 'Due on Receipt' | 'Milestone 50/50' | string;
  notes?: string;
  quotationsEmail?: string;
  poEmail?: string;
  invoicesEmail?: string;
  createdAt: string;
}

interface CustomersState {
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => void;
  updateCustomer: (id: string, updates: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomersForTenant: (tenantId: string) => Customer[];
}

const seedCustomers: Customer[] = [];

export const useCustomersStore = create<CustomersState>()(
  persist(
    (set, get) => ({
      customers: seedCustomers,

      addCustomer: (customer) => set((state) => ({
        customers: [
          ...state.customers,
          {
            ...customer,
            id: `cust-${Date.now()}`,
            createdAt: new Date().toISOString().slice(0, 10)
          }
        ]
      })),

      updateCustomer: (id, updates) => set((state) => ({
        customers: state.customers.map((c) => c.id === id ? { ...c, ...updates } : c)
      })),

      deleteCustomer: (id) => set((state) => ({
        customers: state.customers.filter((c) => c.id !== id)
      })),

      getCustomersForTenant: (tenantId) => {
        return get().customers.filter((c) => c.tenantId === tenantId);
      }
    }),
    {
      name: 'quotation-customers-storage',
    }
  )
);
