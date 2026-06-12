import { create } from 'zustand';
import { apiRequest } from '../utils/apiClient';
import { useTenantStore } from './tenantStore';


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
  fetchTemplates: (tenantId: string) => Promise<void>;
  createTemplate: (name: string, entityType: TemplateEntityType, config?: Partial<TemplateConfig>, tenantId?: string) => Promise<string>;
  updateTemplate: (id: string, updates: Partial<Omit<DocumentTemplate, 'config'>> & { config?: Partial<TemplateConfig> }, tenantId?: string) => Promise<void>;
  deleteTemplate: (id: string, tenantId?: string) => Promise<void>;
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

export const useTemplatesStore = create<TemplatesState>()((set, get) => ({
  templates: [],
  activeTemplateIds: {
    QUOTATION: 'quote-dev-support',
    PURCHASE_ORDER: 'po-supplier',
    INVOICE: 'invoice-standard',
    SERVICE: 'service-sla',
  },

  fetchTemplates: async (tenantId) => {
    try {
      let data = await apiRequest(`/api/v1/templates`, {
        headers: { 'x-tenant-id': tenantId },
      });
      
      if (!data || data.length === 0) {
        const types: TemplateEntityType[] = ['QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'SERVICE'];
        const names = {
          QUOTATION: 'Default Quotation Theme',
          PURCHASE_ORDER: 'Default PO Theme',
          INVOICE: 'Default Invoice Theme',
          SERVICE: 'Default Service SLA Theme'
        };
        for (const type of types) {
          await get().createTemplate(names[type], type, {}, tenantId);
        }
        data = await apiRequest(`/api/v1/templates`, {
          headers: { 'x-tenant-id': tenantId },
        });
      }

      const mapped = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        entityType: t.entityType as TemplateEntityType,
        layoutOrder: t.layoutConfig?.layoutOrder || [...defaultLayout],
        config: t.themeConfig || { ...defaultConfigs[t.entityType as TemplateEntityType] },
      }));

      set({ templates: mapped });

      // Automatically set activeTemplateIds based on first available of each type
      const activeIds = { ...get().activeTemplateIds };
      ['QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'SERVICE'].forEach((type) => {
        const first = mapped.find((t: any) => t.entityType === type);
        if (first) {
          activeIds[type as TemplateEntityType] = first.id;
        }
      });
      set({ activeTemplateIds: activeIds });
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  },

  createTemplate: async (name, entityType, config, tenantId) => {
    const activeTenantId = tenantId || useTenantStore.getState().activeTenant?.id || '';
    try {
      const newTplObj = {
        name,
        entityType,
        layoutConfig: { layoutOrder: entityType === 'INVOICE' 
          ? [...defaultLayout] 
          : defaultLayout.filter(b => b !== 'upi_qr' && (entityType !== 'SERVICE' || b !== 'signatures'))
        },
        themeConfig: {
          ...defaultConfigs[entityType],
          ...config,
        },
        htmlMarkup: '<h1>Template Placeholder</h1>',
      };

      const res = await apiRequest(`/api/v1/templates`, {
        method: 'POST',
        headers: { 'x-tenant-id': activeTenantId },
        body: JSON.stringify(newTplObj),
      });

      const mapped: DocumentTemplate = {
        id: res.id,
        name: res.name,
        entityType: res.entityType as TemplateEntityType,
        layoutOrder: res.layoutConfig?.layoutOrder || [],
        config: res.themeConfig || {},
      };

      set((state) => ({
        templates: [...state.templates, mapped],
      }));

      return res.id;
    } catch (err) {
      console.error('Failed to create template:', err);
      return '';
    }
  },

  updateTemplate: async (id, updates, tenantId) => {
    const activeTenantId = tenantId || useTenantStore.getState().activeTenant?.id || '';
    try {
      await apiRequest(`/api/v1/templates/${id}`, {
        method: 'PUT',
        headers: { 'x-tenant-id': activeTenantId },
        body: JSON.stringify({
          name: updates.name,
          entityType: updates.entityType,
          layoutConfig: updates.layoutOrder ? { layoutOrder: updates.layoutOrder } : undefined,
          themeConfig: updates.config,
        }),
      });

      set((state) => ({
        templates: state.templates.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              ...updates,
              config: {
                ...t.config,
                ...(updates.config || {}),
              },
            };
          }
          return t;
        }),
      }));
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  },

  deleteTemplate: async (id, tenantId) => {
    const activeTenantId = tenantId || useTenantStore.getState().activeTenant?.id || '';
    try {
      await apiRequest(`/api/v1/templates/${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': activeTenantId },
      });

      const templates = get().templates.filter((t) => t.id !== id);
      const activeTemplateIds = { ...get().activeTemplateIds };
      Object.entries(activeTemplateIds).forEach(([entityType, activeId]) => {
        if (activeId === id) {
          const fallback = templates.find((t) => t.entityType === entityType);
          if (fallback) {
            activeTemplateIds[entityType as TemplateEntityType] = fallback.id;
          }
        }
      });
      set({ templates, activeTemplateIds });
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  },

  setDefaultTemplate: (entityType, id) => set((state) => ({
    activeTemplateIds: {
      ...state.activeTemplateIds,
      [entityType]: id,
    }
  })),

  resetTemplate: (entityType) => {
    // Client-only reset fallback
    set((state) => {
      const templates = state.templates.map((t) => {
        if (t.entityType === entityType) {
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
    });
  },

  getTemplate: (idOrType) => {
    const state = get();
    if (['QUOTATION', 'PURCHASE_ORDER', 'INVOICE', 'SERVICE'].includes(idOrType)) {
      const type = idOrType as TemplateEntityType;
      const activeId = state.activeTemplateIds[type];
      const activeTemplate = state.templates.find(t => t.id === activeId);
      if (activeTemplate) return activeTemplate;
      const firstOfType = state.templates.find(t => t.entityType === type);
      if (firstOfType) return firstOfType;
    }
    const template = state.templates.find(t => t.id === idOrType);
    if (template) return template;

    // Fallbacks
    return {
      id: 'fallback',
      name: 'Default Fallback Theme',
      entityType: 'QUOTATION',
      layoutOrder: [...defaultLayout],
      config: { ...defaultConfigs.QUOTATION },
    };
  }
}));

