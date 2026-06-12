import { create } from 'zustand';
import { apiRequest } from '../utils/apiClient';
import { QuotationRecord } from '../app/dashboard/views/quotationsData';
import { InvoiceRecord } from '../app/dashboard/views/invoicesData';
import { PurchaseOrderRecord } from '../app/dashboard/views/purchaseOrdersData';
import { ServiceRecord } from '../app/dashboard/views/servicesData';

interface DocumentState {
  quotes: QuotationRecord[];
  invoices: InvoiceRecord[];
  orders: PurchaseOrderRecord[];
  services: ServiceRecord[];
  
  fetchDocuments: (tenantId: string) => Promise<void>;
  
  // Quotation Actions
  addQuotation: (quote: QuotationRecord) => Promise<void>;
  updateQuotation: (quote: QuotationRecord) => Promise<void>;
  deleteQuotation: (id: string) => Promise<void>;
  
  // Invoice Actions
  addInvoice: (invoice: InvoiceRecord) => Promise<void>;
  updateInvoice: (invoice: InvoiceRecord) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  
  // PO Actions
  addPurchaseOrder: (po: PurchaseOrderRecord) => Promise<void>;
  updatePurchaseOrder: (po: PurchaseOrderRecord) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  
  // Service Actions
  addService: (newSvc: ServiceRecord) => Promise<void>;
  updateService: (updatedSvc: ServiceRecord) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>()((set, get) => ({
  quotes: [],
  invoices: [],
  orders: [],
  services: [],
  
  fetchDocuments: async (tenantId) => {
    try {
      const quotesData = await apiRequest('/api/v1/quotations', { headers: { 'x-tenant-id': tenantId } });
      const invoicesData = await apiRequest('/api/v1/invoices', { headers: { 'x-tenant-id': tenantId } });
      const poData = await apiRequest('/api/v1/purchase-orders', { headers: { 'x-tenant-id': tenantId } });
      const servicesData = await apiRequest('/api/v1/services', { headers: { 'x-tenant-id': tenantId } });

      set({
        quotes: quotesData || [],
        invoices: invoicesData || [],
        orders: poData || [],
        services: servicesData || [],
      });
    } catch (err) {
      console.error('Failed to fetch operational documents:', err);
    }
  },
  
  addQuotation: async (newQuote) => {
    try {
      const res = await apiRequest('/api/v1/quotations', {
        method: 'POST',
        headers: { 'x-tenant-id': newQuote.tenantId },
        body: JSON.stringify(newQuote),
      });
      set((state) => ({ quotes: [res, ...state.quotes] }));
    } catch (err) {
      console.error('Failed to add quotation:', err);
    }
  },

  updateQuotation: async (updatedQuote) => {
    try {
      await apiRequest(`/api/v1/quotations/${updatedQuote.id}`, {
        method: 'POST', // The endpoint can be POST/PUT
        headers: { 'x-tenant-id': updatedQuote.tenantId },
        body: JSON.stringify(updatedQuote),
      });
      set((state) => ({
        quotes: state.quotes.map((q) => q.id === updatedQuote.id ? updatedQuote : q)
      }));
    } catch (err) {
      console.error('Failed to update quotation:', err);
    }
  },

  deleteQuotation: async (id) => {
    const tenantId = get().quotes.find(q => q.id === id)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/quotations/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      set((state) => ({
        quotes: state.quotes.filter((q) => q.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete quotation:', err);
    }
  },
  
  addInvoice: async (newInvoice) => {
    try {
      const res = await apiRequest('/api/v1/invoices', {
        method: 'POST',
        headers: { 'x-tenant-id': newInvoice.tenantId },
        body: JSON.stringify(newInvoice),
      });
      set((state) => ({ invoices: [res, ...state.invoices] }));
    } catch (err) {
      console.error('Failed to add invoice:', err);
    }
  },

  updateInvoice: async (updatedInvoice) => {
    try {
      set((state) => ({
        invoices: state.invoices.map((i) => i.id === updatedInvoice.id ? updatedInvoice : i)
      }));
    } catch (err) {
      console.error('Failed to update invoice:', err);
    }
  },

  deleteInvoice: async (id) => {
    const tenantId = get().invoices.find(i => i.id === id)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/invoices/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      set((state) => ({
        invoices: state.invoices.filter((i) => i.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete invoice:', err);
    }
  },
  
  addPurchaseOrder: async (newPO) => {
    try {
      const res = await apiRequest('/api/v1/purchase-orders', {
        method: 'POST',
        headers: { 'x-tenant-id': newPO.tenantId },
        body: JSON.stringify(newPO),
      });
      set((state) => ({ orders: [res, ...state.orders] }));
    } catch (err) {
      console.error('Failed to add PO:', err);
    }
  },

  updatePurchaseOrder: async (updatedPO) => {
    try {
      set((state) => ({
        orders: state.orders.map((o) => o.id === updatedPO.id ? updatedPO : o)
      }));
    } catch (err) {
      console.error('Failed to update PO:', err);
    }
  },

  deletePurchaseOrder: async (id) => {
    const tenantId = get().orders.find(o => o.id === id)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/purchase-orders/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      set((state) => ({
        orders: state.orders.filter((o) => o.id !== id)
      }));
    } catch (err) {
      console.error('Failed to delete PO:', err);
    }
  },
  
  addService: async (newSvc) => {
    try {
      const res = await apiRequest('/api/v1/services', {
        method: 'POST',
        headers: { 'x-tenant-id': newSvc.tenantId },
        body: JSON.stringify(newSvc),
      });
      set((state) => ({ services: [res, ...state.services] }));
    } catch (err) {
      console.error('Failed to add service:', err);
    }
  },

  updateService: async (updatedSvc) => {
    try {
      set((state) => ({
        services: state.services.map((s) => s.id === updatedSvc.id ? updatedSvc : s)
      }));
    } catch (err) {
      console.error('Failed to update service:', err);
    }
  }
}));

