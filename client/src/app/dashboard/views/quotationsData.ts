import { LineItem } from '../../../components/ui/LineItemEditor';

export interface QuotationRecord {
  id: string;
  quoteNumber: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  validUntil: string;
  version: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED' | 'CLOSED';
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  currency: string;
  terms: string;
  lines: LineItem[];
  customColumns?: { key: string; label: string; type: 'text' | 'number' }[];
  dynamicValues: Record<string, any>;
  revisions: { version: number; changedBy: string; timestamp: string; note: string }[];
  createdAt: string;
  templateId?: string;
  customerAddress?: string;
  authorizedPersonId?: string;
  paymentTerms?: string;
}

export const mockQuotations: QuotationRecord[] = [];
