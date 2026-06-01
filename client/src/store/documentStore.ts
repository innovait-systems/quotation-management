import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { QuotationRecord } from '../app/dashboard/views/quotationsData';
import { InvoiceRecord } from '../app/dashboard/views/invoicesData';
import { PurchaseOrderRecord } from '../app/dashboard/views/purchaseOrdersData';
import { ServiceRecord } from '../app/dashboard/views/servicesData';

interface DocumentState {
  quotes: QuotationRecord[];
  invoices: InvoiceRecord[];
  orders: PurchaseOrderRecord[];
  services: ServiceRecord[];
  
  // Quotation Actions
  addQuotation: (quote: QuotationRecord) => void;
  updateQuotation: (quote: QuotationRecord) => void;
  
  // Invoice Actions
  addInvoice: (invoice: InvoiceRecord) => void;
  updateInvoice: (invoice: InvoiceRecord) => void;
  
  // PO Actions
  addPurchaseOrder: (po: PurchaseOrderRecord) => void;
  updatePurchaseOrder: (po: PurchaseOrderRecord) => void;
  
  // Service Actions
  addService: (service: ServiceRecord) => void;
  updateService: (service: ServiceRecord) => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set) => ({
      quotes: [],
      invoices: [],
      orders: [],
      services: [],
      
      addQuotation: (newQuote) => set((state) => ({ quotes: [newQuote, ...state.quotes] })),
      updateQuotation: (updatedQuote) => set((state) => ({
        quotes: state.quotes.map((q) => q.id === updatedQuote.id ? updatedQuote : q)
      })),
      
      addInvoice: (newInvoice) => set((state) => ({ invoices: [newInvoice, ...state.invoices] })),
      updateInvoice: (updatedInvoice) => set((state) => ({
        invoices: state.invoices.map((i) => i.id === updatedInvoice.id ? updatedInvoice : i)
      })),
      
      addPurchaseOrder: (newPO) => set((state) => ({ orders: [newPO, ...state.orders] })),
      updatePurchaseOrder: (updatedPO) => set((state) => ({
        orders: state.orders.map((o) => o.id === updatedPO.id ? updatedPO : o)
      })),
      
      addService: (newSvc) => set((state) => ({ services: [newSvc, ...state.services] })),
      updateService: (updatedSvc) => set((state) => ({
        services: state.services.map((s) => s.id === updatedSvc.id ? updatedSvc : s)
      }))
    }),
    {
      name: 'quotation-documents-storage'
    }
  )
);
