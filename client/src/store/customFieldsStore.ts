import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FieldType = 'TEXT' | 'NUMBER' | 'CURRENCY' | 'DATE' | 'DROPDOWN' | 'CHECKBOX' | 'RICH_TEXT' | 'FORMULA' | 'TEXTAREA';
export type EntityType = 'QUOTATION' | 'PURCHASE_ORDER' | 'INVOICE' | 'SERVICE';

export interface CustomFieldDefinition {
  id: string;
  entityType: EntityType;
  name: string;        // internal key (e.g. 'customerName', 'warranty_months')
  label: string;       // display label (e.g. 'Contact Name', 'Warranty Period')
  type: FieldType;
  isRequired: boolean;
  isStatic: boolean;   // true = built-in primary field, false = user-defined custom field
  isActive: boolean;   // customizable active state (show/hide)
  defaultValue?: string;
  options?: string[];   // for DROPDOWN types
  formula?: string;     // for FORMULA types
  sortOrder: number;
  createdAt: string;
}

interface CustomFieldsState {
  fields: CustomFieldDefinition[];
  addField: (field: Omit<CustomFieldDefinition, 'id' | 'createdAt' | 'sortOrder' | 'isStatic'>) => void;
  updateField: (id: string, updates: Partial<CustomFieldDefinition>) => void;
  deleteField: (id: string) => void;
  toggleField: (id: string) => void;
  getFieldsForEntity: (entityType: EntityType) => CustomFieldDefinition[];
  getActiveFieldsForEntity: (entityType: EntityType) => CustomFieldDefinition[];
}

const seedFields: CustomFieldDefinition[] = [
  // 1. QUOTATION Primary & Custom Fields
  {
    id: 'pri-q-name', entityType: 'QUOTATION', name: 'customerName', label: 'Contact Name',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 1, createdAt: '2026-05-10'
  },
  {
    id: 'pri-q-company', entityType: 'QUOTATION', name: 'customerCompany', label: 'Company Name',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 2, createdAt: '2026-05-10'
  },
  {
    id: 'pri-q-address', entityType: 'QUOTATION', name: 'customerAddress', label: 'Customer Address',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: true, sortOrder: 3, createdAt: '2026-05-10'
  },
  {
    id: 'pri-q-valid', entityType: 'QUOTATION', name: 'validUntil', label: 'Valid Until',
    type: 'DATE', isRequired: false, isStatic: true, isActive: true, sortOrder: 4, createdAt: '2026-05-10'
  },
  {
    id: 'pri-q-terms', entityType: 'QUOTATION', name: 'terms', label: 'Terms & Conditions',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: true, sortOrder: 5, createdAt: '2026-05-10'
  },
  {
    id: 'pri-q-payment-terms', entityType: 'QUOTATION', name: 'paymentTerms', label: 'Payment Terms',
    type: 'DROPDOWN', isRequired: false, isStatic: true, isActive: true, options: ['Net 15', 'Net 30', 'Net 45', 'Net 60'], sortOrder: 6, createdAt: '2026-05-23'
  },
  {
    id: 'cf-q1', entityType: 'QUOTATION', name: 'warranty_months', label: 'Warranty Period (Months)',
    type: 'NUMBER', isRequired: false, isStatic: false, defaultValue: '12', isActive: true, sortOrder: 7, createdAt: '2026-05-10'
  },
  {
    id: 'cf-q2', entityType: 'QUOTATION', name: 'priority', label: 'Priority Level',
    type: 'DROPDOWN', isRequired: true, isStatic: false, options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    defaultValue: 'MEDIUM', isActive: true, sortOrder: 8, createdAt: '2026-05-10'
  },
  {
    id: 'cf-q3', entityType: 'QUOTATION', name: 'include_warranty', label: 'Include Warranty?',
    type: 'CHECKBOX', isRequired: false, isStatic: false, defaultValue: 'false', isActive: true, sortOrder: 9, createdAt: '2026-05-12'
  },

  // 2. INVOICE Primary & Custom Fields
  {
    id: 'pri-i-name', entityType: 'INVOICE', name: 'customerName', label: 'Contact Name',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 1, createdAt: '2026-05-10'
  },
  {
    id: 'pri-i-company', entityType: 'INVOICE', name: 'customerCompany', label: 'Company Name',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 2, createdAt: '2026-05-10'
  },
  {
    id: 'pri-i-address', entityType: 'INVOICE', name: 'customerAddress', label: 'Customer Address',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: true, sortOrder: 3, createdAt: '2026-05-10'
  },
  {
    id: 'pri-i-due', entityType: 'INVOICE', name: 'dueDate', label: 'Due Date',
    type: 'DATE', isRequired: false, isStatic: true, isActive: true, sortOrder: 4, createdAt: '2026-05-10'
  },
  {
    id: 'cf-inv1', entityType: 'INVOICE', name: 'payment_terms', label: 'Payment Terms',
    type: 'DROPDOWN', isRequired: true, isStatic: false, options: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt', 'Milestone 50/50'],
    defaultValue: 'Net 30', isActive: true, sortOrder: 5, createdAt: '2026-05-10'
  },
  {
    id: 'cf-inv2', entityType: 'INVOICE', name: 'purchase_order_ref', label: 'Purchase Order Reference',
    type: 'TEXT', isRequired: false, isStatic: false, isActive: true, sortOrder: 6, createdAt: '2026-05-10'
  },

  // 3. PURCHASE_ORDER Primary & Custom Fields
  {
    id: 'pri-po-name', entityType: 'PURCHASE_ORDER', name: 'supplierName', label: 'Supplier Contact',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 1, createdAt: '2026-05-10'
  },
  {
    id: 'pri-po-company', entityType: 'PURCHASE_ORDER', name: 'supplierCompany', label: 'Supplier Company',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 2, createdAt: '2026-05-10'
  },
  {
    id: 'pri-po-address', entityType: 'PURCHASE_ORDER', name: 'customerAddress', label: 'Vendor Address',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: true, sortOrder: 3, createdAt: '2026-05-10'
  },
  {
    id: 'pri-po-delivery', entityType: 'PURCHASE_ORDER', name: 'deliveryTerms', label: 'Delivery Terms',
    type: 'TEXT', isRequired: false, isStatic: true, isActive: true, sortOrder: 4, createdAt: '2026-05-10'
  },
  {
    id: 'cf-po1', entityType: 'PURCHASE_ORDER', name: 'shipping_carrier', label: 'Shipping Carrier',
    type: 'DROPDOWN', isRequired: false, isStatic: false, options: ['FedEx Cargo', 'DHL Global Forwarding', 'UPS Freight', 'Maersk Line', 'Custom'],
    isActive: true, sortOrder: 5, createdAt: '2026-05-10'
  },
  {
    id: 'cf-po2', entityType: 'PURCHASE_ORDER', name: 'lead_time_days', label: 'Lead Time (Days)',
    type: 'NUMBER', isRequired: false, isStatic: false, defaultValue: '7', isActive: true, sortOrder: 6, createdAt: '2026-05-10'
  },

  // 4. SERVICE Primary & Custom Fields
  {
    id: 'pri-s-title', entityType: 'SERVICE', name: 'title', label: 'Service Title',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 1, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-name', entityType: 'SERVICE', name: 'customerName', label: 'Client Contact',
    type: 'TEXT', isRequired: false, isStatic: true, isActive: true, sortOrder: 2, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-company', entityType: 'SERVICE', name: 'customerCompany', label: 'Client Company',
    type: 'TEXT', isRequired: true, isStatic: true, isActive: true, sortOrder: 3, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-desc', entityType: 'SERVICE', name: 'description', label: 'Service Description',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: true, sortOrder: 4, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-deadline', entityType: 'SERVICE', name: 'slaDeadline', label: 'SLA Deadline',
    type: 'DATE', isRequired: false, isStatic: true, isActive: true, sortOrder: 5, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-team', entityType: 'SERVICE', name: 'assignedTeam', label: 'Assigned Team',
    type: 'TEXT', isRequired: false, isStatic: true, isActive: true, sortOrder: 6, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-location', entityType: 'SERVICE', name: 'serviceLocation', label: 'Service Location',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: false, sortOrder: 7, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-cycle', entityType: 'SERVICE', name: 'billingCycle', label: 'Billing Frequency',
    type: 'DROPDOWN', isRequired: false, isStatic: true, isActive: false, options: ['One-time', 'Hourly', 'Weekly', 'Monthly', 'Quarterly', 'Annually'], sortOrder: 8, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-cost', entityType: 'SERVICE', name: 'serviceCost', label: 'Service Rate / Cost',
    type: 'NUMBER', isRequired: false, isStatic: true, isActive: false, sortOrder: 9, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-terms', entityType: 'SERVICE', name: 'terms', label: 'SLA Terms & Conditions',
    type: 'TEXTAREA', isRequired: false, isStatic: true, isActive: false, sortOrder: 10, createdAt: '2026-05-10'
  },
  {
    id: 'pri-s-payment-terms', entityType: 'SERVICE', name: 'paymentTerms', label: 'Payment Terms',
    type: 'DROPDOWN', isRequired: false, isStatic: true, isActive: true, options: ['Net 15', 'Net 30', 'Net 45', 'Net 60'], sortOrder: 11, createdAt: '2026-05-23'
  },
  {
    id: 'cf-s1', entityType: 'SERVICE', name: 'priority', label: 'SLA Priority',
    type: 'DROPDOWN', isRequired: true, isStatic: false, options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    defaultValue: 'MEDIUM', isActive: true, sortOrder: 12, createdAt: '2026-05-10'
  },
  {
    id: 'cf-s2', entityType: 'SERVICE', name: 'estimated_hours', label: 'Estimated Completion (Hours)',
    type: 'NUMBER', isRequired: false, isStatic: false, defaultValue: '0', isActive: true, sortOrder: 13, createdAt: '2026-05-10'
  }
];

export const useCustomFieldsStore = create<CustomFieldsState>()(
  persist(
    (set, get) => ({
      fields: seedFields,

      addField: (field) => set((state) => ({
        fields: [
          ...state.fields,
          {
            ...field,
            id: `cf-${Date.now()}`,
            isStatic: false,
            sortOrder: state.fields.filter(f => f.entityType === field.entityType).length + 1,
            createdAt: new Date().toISOString().slice(0, 10),
          },
        ],
      })),

      updateField: (id, updates) => set((state) => ({
        fields: state.fields.map(f => f.id === id ? { ...f, ...updates } : f),
      })),

      deleteField: (id) => set((state) => ({
        fields: state.fields.filter(f => f.id !== id || f.isStatic), // static fields cannot be deleted
      })),

      toggleField: (id) => set((state) => ({
        fields: state.fields.map(f => f.id === id ? { ...f, isActive: !f.isActive } : f),
      })),

      getFieldsForEntity: (entityType) => get().fields
        .filter(f => f.entityType === entityType)
        .sort((a, b) => a.sortOrder - b.sortOrder),

      getActiveFieldsForEntity: (entityType) => get().fields
        .filter(f => f.entityType === entityType && f.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }),
    {
      name: 'quotation-custom-fields-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          const missing = seedFields.filter(sf => !state.fields.some(f => f.id === sf.id));
          if (missing.length > 0) {
            state.fields = [...state.fields, ...missing].sort((a, b) => a.sortOrder - b.sortOrder);
          }
        }
      }
    }
  )
);
