export interface ServiceActivity {
  id: string;
  timestamp: string;
  user: string;
  type: 'NOTE' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'ESCALATION';
  content: string;
}

export interface ServiceRecord {
  id: string;
  title: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_CLIENT' | 'COMPLETED' | 'BREACHED';
  slaDeadline: string;
  assignedTeam: string;
  activities: ServiceActivity[];
  dynamicValues: Record<string, any>;
  createdAt: string;
  serviceLocation?: string;
  billingCycle?: string;
  serviceCost?: number;
  terms?: string;
  authorizedPersonId?: string;
  paymentTerms?: string;
  pdfBase64?: string;
}

export const mockServices: ServiceRecord[] = [];

