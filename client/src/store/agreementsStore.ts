import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  addAgreement: (
    agreement: Omit<Agreement, 'id' | 'createdAt' | 'updatedAt' | 'versions'>,
    initialVersion: Omit<AgreementVersion, 'id' | 'uploadedAt' | 'uploadedBy'>
  ) => void;
  addDocumentVersion: (
    agreementId: string,
    newVersion: Omit<AgreementVersion, 'id' | 'uploadedAt' | 'uploadedBy'>
  ) => void;
  updateAgreementStatus: (agreementId: string, status: Agreement['status']) => void;
  deleteAgreement: (agreementId: string) => void;
  getAgreementsForTenant: (tenantId: string) => Agreement[];
}

const seedAgreements: Agreement[] = [];

export const useAgreementsStore = create<AgreementsState>()(
  persist(
    (set, get) => ({
      agreements: seedAgreements,

      addAgreement: (agreement, initialVersion) => set((state) => {
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const newVersionObj: AgreementVersion = {
          ...initialVersion,
          id: `ver-${Date.now()}-1`,
          uploadedBy: 'Rajesh S. (You)',
          uploadedAt: timestamp
        };

        const newAgr: Agreement = {
          ...agreement,
          id: `agr-${Date.now()}`,
          createdAt: new Date().toISOString().slice(0, 10),
          updatedAt: new Date().toISOString().slice(0, 10),
          versions: [newVersionObj]
        };

        return {
          agreements: [newAgr, ...state.agreements]
        };
      }),

      addDocumentVersion: (agreementId, newVersion) => set((state) => {
        const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
        const newVersionObj: AgreementVersion = {
          ...newVersion,
          id: `ver-${Date.now()}-2`,
          uploadedBy: 'Rajesh S. (You)',
          uploadedAt: timestamp
        };

        return {
          agreements: state.agreements.map((a) => {
            if (a.id !== agreementId) return a;
            return {
              ...a,
              updatedAt: new Date().toISOString().slice(0, 10),
              versions: [...a.versions, newVersionObj] // Newest version goes at the end of the history
            };
          })
        };
      }),

      updateAgreementStatus: (agreementId, status) => set((state) => ({
        agreements: state.agreements.map((a) =>
          a.id === agreementId ? { ...a, status, updatedAt: new Date().toISOString().slice(0, 10) } : a
        )
      })),

      deleteAgreement: (agreementId) => set((state) => ({
        agreements: state.agreements.filter((a) => a.id !== agreementId)
      })),

      getAgreementsForTenant: (tenantId) => {
        return get().agreements.filter((a) => a.tenantId === tenantId);
      }
    }),
    {
      name: 'antigravity-agreements-storage',
    }
  )
);
