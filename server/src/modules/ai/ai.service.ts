import { Injectable, Logger } from '@nestjs/common';

export interface GeneratedAiTemplate {
  entityType: string;
  name: string;
  label: string;
  description: string;
  fields: Array<{
    name: string;
    label: string;
    type: string;
    isRequired: boolean;
    defaultValue?: string;
    options?: string[];
    formula?: string;
    visibilityRule?: { when: string; equals: any };
  }>;
  termsAndConditions: string;
  suggestedBranding: {
    primary: string;
    secondary: string;
    fontFamily: string;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  async generateTemplateFromPrompt(tenantId: string, prompt: string, entityType: string): Promise<GeneratedAiTemplate> {
    this.logger.log(`Generating AI layout blueprint for Tenant ${tenantId} using prompt: "${prompt}"`);

    const normalizedPrompt = prompt.toLowerCase();

    // High-fidelity structured blueprints matching user keywords!
    if (normalizedPrompt.includes('sow') || normalizedPrompt.includes('software') || normalizedPrompt.includes('dev')) {
      return {
        entityType,
        name: 'offshore_software_sow',
        label: 'Offshore Software Dev Contract',
        description: 'AI-generated Statement of Work (SOW) layout with Sprint sizing, timezone filters, and SLA penalty math formulas.',
        fields: [
          {
            name: 'planned_sprints',
            label: 'Estimated Sprints Count',
            type: 'NUMBER',
            isRequired: true,
            defaultValue: '6'
          },
          {
            name: 'resource_role',
            label: 'Primary Resource Level',
            type: 'DROPDOWN',
            isRequired: true,
            options: ['Lead Architect', 'Senior Engineer', 'Mid-Level Engineer', 'UI/UX Designer']
          },
          {
            name: 'client_timezone',
            label: 'Core Timezone Matching',
            type: 'DROPDOWN',
            isRequired: false,
            options: ['EST (UTC-5)', 'GMT (UTC+0)', 'IST (UTC+5.5)', 'AEST (UTC+10)']
          },
          {
            name: 'include_warranty',
            label: 'Include Post-Launch SLA Warranty',
            type: 'CHECKBOX',
            isRequired: false,
            defaultValue: 'true'
          },
          {
            name: 'warranty_months',
            label: 'Warranty Period (Months)',
            type: 'NUMBER',
            isRequired: false,
            defaultValue: '12',
            visibilityRule: { when: 'include_warranty', equals: true }
          },
          {
            name: 'sla_breach_penalty',
            label: 'SLA Deviation Penalty Fee',
            type: 'FORMULA',
            isRequired: false,
            formula: 'subTotal * 0.10'
          }
        ],
        termsAndConditions: 'All sprint deliverables are subject to a 7-day client UAT review cycle. Late delivery outside pre-agreed milestones will incur dynamic SLA deviation penalties.',
        suggestedBranding: {
          primary: '#6366f1',
          secondary: '#8b5cf6',
          fontFamily: 'Outfit'
        }
      };
    } else if (normalizedPrompt.includes('delivery') || normalizedPrompt.includes('logistics') || normalizedPrompt.includes('hardware')) {
      return {
        entityType,
        name: 'logistics_freight_po',
        label: 'Hardware Procurement & Logistics',
        description: 'Procurement invoice layout optimized for bulk hardware with shipping zones and expediting fees.',
        fields: [
          {
            name: 'shipping_carrier',
            label: 'Approved Freight Carrier',
            type: 'DROPDOWN',
            isRequired: true,
            options: ['FedEx Cargo', 'DHL Global Forwarding', 'UPS Freight', 'Maersk Ocean']
          },
          {
            name: 'delivery_zone',
            label: 'Target Destination Zone',
            type: 'DROPDOWN',
            isRequired: true,
            options: ['Zone-A (Domestic)', 'Zone-B (APAC)', 'Zone-C (EMEA)', 'Zone-D (Americas)']
          },
          {
            name: 'is_expedited',
            label: 'Request Expedited Shipment (24h)',
            type: 'CHECKBOX',
            isRequired: false,
            defaultValue: 'false'
          },
          {
            name: 'expedite_cost',
            label: 'Expediting Delivery Fee',
            type: 'NUMBER',
            isRequired: false,
            defaultValue: '500',
            visibilityRule: { when: 'is_expedited', equals: true }
          },
          {
            name: 'freight_insurance_fee',
            label: 'Freight Insurance Coverage',
            type: 'FORMULA',
            isRequired: false,
            formula: 'subTotal * 0.02'
          }
        ],
        termsAndConditions: 'Freight insurance is automatically calculated based on the aggregate value. Shipping carrier must deliver cargo to the specified target destination zone within SLA time boundaries.',
        suggestedBranding: {
          primary: '#0ea5e9',
          secondary: '#38bdf8',
          fontFamily: 'Inter'
        }
      };
    } else {
      // General Corporate consulting template
      return {
        entityType,
        name: 'corporate_consulting_sow',
        label: 'Corporate Advisory Services SOW',
        description: 'Standard consulting service template with travel allocations, advisory tiers, and retainer fee formulas.',
        fields: [
          {
            name: 'consulting_hours',
            label: 'Allocated Consulting Hours',
            type: 'NUMBER',
            isRequired: true,
            defaultValue: '40'
          },
          {
            name: 'advisory_tier',
            label: 'Strategic Advisory Tier',
            type: 'DROPDOWN',
            isRequired: true,
            options: ['Executive Partner', 'Senior Principal', 'Management Consultant']
          },
          {
            name: 'reimburse_travel',
            label: 'Enable Travel Reimbursements',
            type: 'CHECKBOX',
            isRequired: false,
            defaultValue: 'false'
          },
          {
            name: 'travel_allowance',
            label: 'Daily Travel Retainer',
            type: 'NUMBER',
            isRequired: false,
            defaultValue: '150',
            visibilityRule: { when: 'reimburse_travel', equals: true }
          },
          {
            name: 'retainer_setup_cost',
            label: 'Platform Retainer Setup',
            type: 'FORMULA',
            isRequired: false,
            formula: 'subTotal * 0.05 + 250'
          }
        ],
        termsAndConditions: 'Travel expenses are audited in accordance with corporate advisory compliance guidelines. Advisory invoices are compiled monthly in arrears and are due net 15 days.',
        suggestedBranding: {
          primary: '#f43f5e',
          secondary: '#fb7185',
          fontFamily: 'Outfit'
        }
      };
    }
  }
}
