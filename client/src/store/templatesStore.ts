import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TemplateEntityType = 'QUOTATION' | 'PURCHASE_ORDER' | 'INVOICE' | 'SERVICE';

export interface TemplateConfig {
  headerAlign: 'left' | 'center' | 'right';
  fontFamily: 'Plus Jakarta Sans' | 'Inter' | 'Roboto' | 'Outfit';
  borderStyle: 'thin' | 'accent' | 'dotted' | 'none';
  accentColor: string;
  watermarkText: string;
  footerTerms: string;
  showCustomFields: boolean;
  showQrCode: boolean;
  showSignature: boolean;
  showDetailsBox: boolean;
  showBillingAddress: boolean;
  showStatus: boolean;
  logoUrl?: string;          // Company Logo override
  companyAddress?: string;   // Company Address override
  blockWidths?: Record<string, 'full' | 'half' | 'third'>;
  blockStyles?: Record<string, 'plain' | 'card'>;
  spacerHeights?: Record<string, 'none' | 'small' | 'medium' | 'large' | 'xl'>;
  hiddenBlocks?: Record<string, boolean>;
  lineItemColumns?: { key: string; label: string; type: 'text' | 'number' }[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  entityType: TemplateEntityType;
  layoutOrder: string[];
  config: TemplateConfig;
}

interface TemplatesState {
  templates: DocumentTemplate[];
  activeTemplateIds: Record<TemplateEntityType, string>;
  createTemplate: (name: string, entityType: TemplateEntityType, config?: Partial<TemplateConfig>) => string;
  updateTemplate: (id: string, updates: Partial<Omit<DocumentTemplate, 'config'>> & { config?: Partial<TemplateConfig> }) => void;
  deleteTemplate: (id: string) => void;
  setDefaultTemplate: (entityType: TemplateEntityType, id: string) => void;
  resetTemplate: (entityType: TemplateEntityType) => void;
  getTemplate: (idOrType: string) => DocumentTemplate;
}

const defaultConfigs: Record<TemplateEntityType, TemplateConfig> = {
  QUOTATION: {
    headerAlign: 'left',
    fontFamily: 'Plus Jakarta Sans',
    borderStyle: 'thin',
    accentColor: '#6366f1',
    watermarkText: 'PROPOSAL',
    footerTerms: 'This quotation is subject to our standard service level agreements and terms of service. Valid for 30 days from issue date.',
    showCustomFields: true,
    showQrCode: false,
    showSignature: true,
    showDetailsBox: true,
    showBillingAddress: true,
    showStatus: true,
    lineItemColumns: [],
  },
  PURCHASE_ORDER: {
    headerAlign: 'left',
    fontFamily: 'Plus Jakarta Sans',
    borderStyle: 'thin',
    accentColor: '#8b5cf6',
    watermarkText: 'DRAFT PO',
    footerTerms: 'Please acknowledge receipt of this purchase order and confirm shipping details within 48 hours.',
    showCustomFields: true,
    showQrCode: false,
    showSignature: true,
    showDetailsBox: true,
    showBillingAddress: true,
    showStatus: true,
    lineItemColumns: [],
  },
  INVOICE: {
    headerAlign: 'right',
    fontFamily: 'Outfit',
    borderStyle: 'accent',
    accentColor: '#10b981',
    watermarkText: 'UNPAID',
    footerTerms: 'Thank you for your business! Please make payments to the designated bank account or scan the QR code within 30 days.',
    showCustomFields: true,
    showQrCode: true,
    showSignature: true,
    showDetailsBox: true,
    showBillingAddress: true,
    showStatus: true,
    lineItemColumns: [],
  },
  SERVICE: {
    headerAlign: 'center',
    fontFamily: 'Inter',
    borderStyle: 'dotted',
    accentColor: '#0ea5e9',
    watermarkText: 'ACTIVE SLA',
    footerTerms: 'Deliverables tracking is logged under ISO-27001 SOC2 auditing protocols. Critical milestones are flagged dynamically.',
    showCustomFields: true,
    showQrCode: false,
    showSignature: false,
    showDetailsBox: true,
    showBillingAddress: true,
    showStatus: true,
    lineItemColumns: [],
  },
};

const defaultLayout: string[] = [
  'brand_logo',
  'org_details',
  'doc_title',
  'company_details',
  'customer_details',
  'details_box',
  'main_table',
  'custom_fields',
  'upi_qr',
  'signatures',
  'footer_terms',
  'spacer'
];

const seedTemplates: DocumentTemplate[] = [
  {
    id: 'quote-dev-support',
    name: 'Development Support Theme',
    entityType: 'QUOTATION',
    layoutOrder: ['brand_logo', 'org_details', 'doc_title', 'company_details', 'customer_details', 'details_box', 'main_table', 'custom_fields', 'signatures', 'footer_terms', 'spacer'],
    config: {
      ...defaultConfigs.QUOTATION,
      fontFamily: 'Plus Jakarta Sans',
      accentColor: '#6366f1',
    }
  },
  {
    id: 'quote-doc-remediation',
    name: 'Document Remediation Theme',
    entityType: 'QUOTATION',
    layoutOrder: ['brand_logo', 'org_details', 'doc_title', 'company_details', 'customer_details', 'details_box', 'main_table', 'custom_fields', 'footer_terms', 'spacer'], // no signature
    config: {
      ...defaultConfigs.QUOTATION,
      fontFamily: 'Outfit',
      accentColor: '#10b981',
      watermarkText: 'QUOTATION',
      footerTerms: 'This document remediation proposal is subject to detailed page analysis. Pricing is based on unit measurements and file size.',
      showSignature: false,
    }
  },
  {
    id: 'po-supplier',
    name: 'Supplier Procurement Theme',
    entityType: 'PURCHASE_ORDER',
    layoutOrder: ['brand_logo', 'org_details', 'doc_title', 'company_details', 'customer_details', 'details_box', 'main_table', 'custom_fields', 'signatures', 'footer_terms', 'spacer'],
    config: {
      ...defaultConfigs.PURCHASE_ORDER,
      fontFamily: 'Plus Jakarta Sans',
      accentColor: '#8b5cf6',
    }
  },
  {
    id: 'invoice-standard',
    name: 'Standard Billing Theme',
    entityType: 'INVOICE',
    layoutOrder: ['brand_logo', 'org_details', 'doc_title', 'company_details', 'customer_details', 'details_box', 'main_table', 'custom_fields', 'upi_qr', 'signatures', 'footer_terms', 'spacer'],
    config: {
      ...defaultConfigs.INVOICE,
      fontFamily: 'Outfit',
      accentColor: '#10b981',
    }
  },
  {
    id: 'service-sla',
    name: 'SLA Deliverables Theme',
    entityType: 'SERVICE',
    layoutOrder: ['brand_logo', 'org_details', 'doc_title', 'company_details', 'customer_details', 'details_box', 'main_table', 'custom_fields', 'footer_terms', 'spacer'],
    config: {
      ...defaultConfigs.SERVICE,
      fontFamily: 'Inter',
      accentColor: '#0ea5e9',
    }
  }
];

export const useTemplatesStore = create<TemplatesState>()(
  persist(
    (set, get) => ({
      templates: seedTemplates,
      activeTemplateIds: {
        QUOTATION: 'quote-dev-support',
        PURCHASE_ORDER: 'po-supplier',
        INVOICE: 'invoice-standard',
        SERVICE: 'service-sla',
      },

      createTemplate: (name, entityType, config) => {
        const id = `${entityType.toLowerCase()}-${Date.now()}`;
        const newTpl: DocumentTemplate = {
          id,
          name,
          entityType,
          layoutOrder: entityType === 'INVOICE' 
            ? [...defaultLayout] 
            : defaultLayout.filter(b => b !== 'upi_qr' && (entityType !== 'SERVICE' || b !== 'signatures')),
          config: {
            ...defaultConfigs[entityType],
            ...config,
          }
        };
        set((state) => ({
          templates: [...state.templates, newTpl]
        }));
        return id;
      },

      updateTemplate: (id, updates) => set((state) => {
        const updated = state.templates.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              ...updates,
              config: {
                ...t.config,
                ...(updates.config || {})
              }
            };
          }
          return t;
        });
        return { templates: updated };
      }),

      deleteTemplate: (id) => set((state) => {
        const templates = state.templates.filter((t) => t.id !== id);
        // Adjust activeTemplateIds if the deleted one was active
        const activeTemplateIds = { ...state.activeTemplateIds };
        Object.entries(activeTemplateIds).forEach(([entityType, activeId]) => {
          if (activeId === id) {
            const fallback = templates.find((t) => t.entityType === entityType);
            if (fallback) {
              activeTemplateIds[entityType as TemplateEntityType] = fallback.id;
            }
          }
        });
        return { templates, activeTemplateIds };
      }),

      setDefaultTemplate: (entityType, id) => set((state) => ({
        activeTemplateIds: {
          ...state.activeTemplateIds,
          [entityType]: id,
        }
      })),

      resetTemplate: (entityType) => set((state) => {
        // Find seeded template of this type
        const seeded = seedTemplates.find(t => t.entityType === entityType);
        if (!seeded) return {};
        const templates = state.templates.map(t => {
          if (t.entityType === entityType) {
            const foundSeeded = seedTemplates.find(st => st.id === t.id);
            if (foundSeeded) {
              return { ...foundSeeded };
            }
            // For custom ones, revert config to defaultConfigs
            return {
              ...t,
              config: { ...defaultConfigs[entityType] },
              layoutOrder: entityType === 'INVOICE' 
                ? [...defaultLayout] 
                : defaultLayout.filter(b => b !== 'upi_qr' && (entityType !== 'SERVICE' || b !== 'signatures'))
            };
          }
          return t;
        });
        return { templates };
      }),

      getTemplate: (idOrType) => {
        const state = get();
        // 1. If it matches a TemplateEntityType, fetch the active one
        if (['QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'SERVICE'].includes(idOrType)) {
          const type = idOrType as TemplateEntityType;
          const activeId = state.activeTemplateIds[type];
          const activeTemplate = state.templates.find(t => t.id === activeId);
          if (activeTemplate) return activeTemplate;
          const firstOfType = state.templates.find(t => t.entityType === type);
          if (firstOfType) return firstOfType;
        }
        // 2. Fetch by ID
        const template = state.templates.find(t => t.id === idOrType);
        if (template) return template;

        // 3. absolute fallbacks
        const fallbackId = state.activeTemplateIds['QUOTATION'];
        const fallbackTemplate = state.templates.find(t => t.id === fallbackId);
        if (fallbackTemplate) return fallbackTemplate;

        return state.templates[0];
      }
    }),
    {
      name: 'quotation-templates-storage-v2',
    }
  )
);
