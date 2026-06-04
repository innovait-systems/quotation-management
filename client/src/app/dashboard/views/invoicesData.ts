import { LineItem } from '../../../components/ui/LineItemEditor';

export interface PaymentRecord {
  id: string;
  amount: number;
  method: string;
  reference: string;
  recordedAt: string;
  recordedBy: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  quotationRef: string | null;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
  subTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  balanceDue: number;
  currency: string;
  lines: LineItem[];
  customColumns?: { key: string; label: string; type: 'text' | 'number' }[];
  payments: PaymentRecord[];
  dynamicValues: Record<string, any>;
  createdAt: string;
  templateId?: string;
  customerAddress?: string;
  authorizedPersonId?: string;
  pdfBase64?: string;
}

export const mockInvoices: InvoiceRecord[] = [];

