export interface POLineItem {
  id: string;
  description: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  taxRate: number;
  total: number;
  [key: string]: any;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  tenantId: string;
  supplierId: string;
  supplierName: string;
  supplierCompany: string;
  quotationId: string | null;
  quotationRef: string | null;
  status: 'OPEN' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  subTotal: number;
  taxTotal: number;
  grandTotal: number;
  currency: string;
  deliveryTerms: string;
  lines: POLineItem[];
  customColumns?: { key: string; label: string; type: 'text' | 'number' }[];
  dynamicValues: Record<string, any>;
  createdAt: string;
  templateId?: string;
  customerAddress?: string;
  authorizedPersonId?: string;
}

function calcPOLineTotal(qty: number, price: number, tax: number): number {
  const sub = qty * price;
  return Math.round((sub + sub * tax / 100) * 100) / 100;
}

export const mockPurchaseOrders: PurchaseOrderRecord[] = [];

