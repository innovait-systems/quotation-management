import { create } from 'zustand';
import { apiRequest } from '../utils/apiClient';

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
  fetchCustomers: (tenantId: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomersForTenant: (tenantId: string) => Customer[];
}

export const useCustomersStore = create<CustomersState>()((set, get) => ({
  customers: [],

  fetchCustomers: async (tenantId) => {
    try {
      const data = await apiRequest(`/api/v1/customers`, {
        headers: { 'x-tenant-id': tenantId },
      });
      set({ customers: data });
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  },

  addCustomer: async (customer) => {
    try {
      const newCust = await apiRequest(`/api/v1/customers`, {
        method: 'POST',
        headers: { 'x-tenant-id': customer.tenantId },
        body: JSON.stringify(customer),
      });
      // Re-map backend output companyName to frontend company
      const mappedCust: Customer = {
        id: newCust.id,
        tenantId: newCust.tenantId,
        name: newCust.name,
        company: newCust.companyName || '',
        email: newCust.email,
        phone: newCust.phone || '',
        address: newCust.billingAddress?.address || '',
        currency: 'USD',
        paymentTerms: 'Net 30',
        createdAt: new Date(newCust.createdAt).toISOString().slice(0, 10),
      };
      set((state) => ({
        customers: [...state.customers, mappedCust],
      }));
    } catch (err) {
      console.error('Failed to add customer:', err);
    }
  },

  updateCustomer: async (id, updates) => {
    const tenantId = updates.tenantId || get().customers.find(c => c.id === id)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/customers/${id}`, {
        method: 'PUT',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify(updates),
      });
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      }));
    } catch (err) {
      console.error('Failed to update customer:', err);
    }
  },

  deleteCustomer: async (id) => {
    const tenantId = get().customers.find(c => c.id === id)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/customers/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
      }));
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  },

  getCustomersForTenant: (tenantId) => {
    return get().customers.filter((c) => c.tenantId === tenantId);
  },
}));

