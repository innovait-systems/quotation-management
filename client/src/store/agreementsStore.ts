import { create } from 'zustand';
import { apiRequest } from '../utils/apiClient';

export interface AgreementVersion {
  id: string;
  versionLabel: string;      // User-defined, e.g. "v1.0.0", "v1.1-draft"
  changeDescription: string; // User-defined changelog description
  fileName: string;          // Mock filename
  fileSize: string;          // Mock filesize
  uploadedBy: string;        // Mock uploader, e.g. "Rajesh S."
  uploadedAt: string;        // Time stamp
}

export interface Agreement {
  id: string;
  tenantId: string;
  title: string;
  documentType: 'Agreement' | 'SLA Contract' | 'SOW Draft' | 'Tax Invoice' | 'Other';
  customerId: string;        // Associated customer ID
  customerName: string;      // Associated customer contact name
  customerCompany: string;   // Associated customer company name
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  versions: AgreementVersion[];
}

interface AgreementsState {
  agreements: Agreement[];
  fetchAgreements: (tenantId: string) => Promise<void>;
  addAgreement: (
    agreement: Omit<Agreement, 'id' | 'createdAt' | 'updatedAt' | 'versions'>,
    initialVersion: Omit<AgreementVersion, 'id' | 'uploadedAt' | 'uploadedBy'>
  ) => Promise<void>;
  addDocumentVersion: (
    agreementId: string,
    newVersion: Omit<AgreementVersion, 'id' | 'uploadedAt' | 'uploadedBy'>
  ) => Promise<void>;
  updateAgreementStatus: (agreementId: string, status: Agreement['status']) => Promise<void>;
  deleteAgreement: (agreementId: string) => Promise<void>;
  getAgreementsForTenant: (tenantId: string) => Agreement[];
}

export const useAgreementsStore = create<AgreementsState>()((set, get) => ({
  agreements: [],

  fetchAgreements: async (tenantId) => {
    try {
      const data = await apiRequest(`/api/v1/agreements`, {
        headers: { 'x-tenant-id': tenantId },
      });
      set({ agreements: data });
    } catch (err) {
      console.error('Failed to fetch agreements:', err);
    }
  },

  addAgreement: async (agreement, initialVersion) => {
    try {
      const newAgr = await apiRequest(`/api/v1/agreements`, {
        method: 'POST',
        headers: { 'x-tenant-id': agreement.tenantId },
        body: JSON.stringify({
          ...agreement,
          initialVersion,
        }),
      });
      set((state) => ({
        agreements: [newAgr, ...state.agreements],
      }));
    } catch (err) {
      console.error('Failed to add agreement:', err);
    }
  },

  addDocumentVersion: async (agreementId, newVersion) => {
    const tenantId = get().agreements.find(a => a.id === agreementId)?.tenantId || '';
    try {
      const savedVersion = await apiRequest(`/api/v1/agreements/${agreementId}/versions`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify(newVersion),
      });
      set((state) => ({
        agreements: state.agreements.map((a) => {
          if (a.id !== agreementId) return a;
          return {
            ...a,
            updatedAt: new Date().toISOString().slice(0, 10),
            versions: [...a.versions, savedVersion],
          };
        }),
      }));
    } catch (err) {
      console.error('Failed to add agreement version:', err);
    }
  },

  updateAgreementStatus: async (agreementId, status) => {
    const tenantId = get().agreements.find(a => a.id === agreementId)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/agreements/${agreementId}`, {
        method: 'PUT',
        headers: { 'x-tenant-id': tenantId },
        body: JSON.stringify({ status }),
      });
      set((state) => ({
        agreements: state.agreements.map((a) =>
          a.id === agreementId ? { ...a, status, updatedAt: new Date().toISOString().slice(0, 10) } : a
        ),
      }));
    } catch (err) {
      console.error('Failed to update agreement status:', err);
    }
  },

  deleteAgreement: async (agreementId) => {
    const tenantId = get().agreements.find(a => a.id === agreementId)?.tenantId || '';
    try {
      await apiRequest(`/api/v1/agreements/${agreementId}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': tenantId },
      });
      set((state) => ({
        agreements: state.agreements.filter((a) => a.id !== agreementId),
      }));
    } catch (err) {
      console.error('Failed to delete agreement:', err);
    }
  },

  getAgreementsForTenant: (tenantId) => {
    return get().agreements.filter((a) => a.tenantId === tenantId);
  },
}));

