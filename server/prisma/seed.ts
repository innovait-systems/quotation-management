import { PrismaClient, SubscriptionPlan, TenantStatus, UserRole, EntityType, FieldType, TriggerEvent } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding operations...');

  // 1. Create Master Tenant (Required for system configuration & template cloning)
  const masterTenant = await prisma.tenant.upsert({
    where: { slug: 'antigravity' },
    update: {},
    create: {
      name: 'Antigravity Solutions Master',
      slug: 'antigravity',
      logoUrl: 'https://cdn.antigravity.com/logos/antigravity_core.png',
      brandingConfig: {
        primaryColor: '#6366f1',
        secondaryColor: '#0f172a',
        fontFamily: 'Outfit',
        watermarkText: 'ANTIGRAVITY ORIGINAL',
        customCss: '.doc-header { font-weight: 700; border-bottom: 2px solid #6366f1; }'
      },
      currency: 'USD',
      timezone: 'UTC',
      taxConfig: {
        taxBrackets: [
          { name: 'Standard GST', percentage: 18.0 },
          { name: 'Reduced VAT', percentage: 5.0 },
          { name: 'Zero Rated', percentage: 0.0 }
        ]
      },
      numberingFormats: {
        QUOTATION: 'QT-{YYYY}-{NNNN}',
        INVOICE: 'INV-{YYYY}-{NNNN}',
        PURCHASE_ORDER: 'PO-{YYYY}-{NNNN}'
      },
      plan: SubscriptionPlan.BUSINESS,
      status: TenantStatus.ACTIVE
    }
  });
  console.log(`✅ Master Tenant initialized: ${masterTenant.name} (${masterTenant.id})`);

  // 2. Create InnovaIT Systems Tenant (Production Workspace)
  const innovaitTenant = await prisma.tenant.upsert({
    where: { slug: 'innovait-systems' },
    update: {},
    create: {
      id: 'tenant-innovait',
      name: 'InnovaIT Systems',
      slug: 'innovait-systems',
      logoUrl: '',
      brandingConfig: {
        primaryColor: '#6366f1',
        secondaryColor: '#0f172a',
        fontFamily: 'Outfit',
        watermarkText: 'INNOVAIT ORIGINAL',
        customCss: ''
      },
      currency: 'USD',
      timezone: 'UTC',
      taxConfig: {
        taxBrackets: [
          { name: 'Standard GST', percentage: 18.0 },
          { name: 'Reduced VAT', percentage: 5.0 },
          { name: 'Zero Rated', percentage: 0.0 }
        ]
      },
      numberingFormats: {
        QUOTATION: 'QT-{YYYY}-{NNNN}',
        INVOICE: 'INV-{YYYY}-{NNNN}',
        PURCHASE_ORDER: 'PO-{YYYY}-{NNNN}'
      },
      plan: SubscriptionPlan.ENTERPRISE,
      status: TenantStatus.ACTIVE
    }
  });
  console.log(`✅ Production Tenant initialized: ${innovaitTenant.name} (${innovaitTenant.id})`);

  // 3. Create SpaceX Cloud Labs Tenant
  const spacexTenant = await prisma.tenant.upsert({
    where: { slug: 'spacex-cloud' },
    update: {},
    create: {
      id: 'tenant-spacex',
      name: 'SpaceX Cloud Labs',
      slug: 'spacex-cloud',
      logoUrl: '',
      brandingConfig: {
        primaryColor: '#005288',
        secondaryColor: '#0f172a',
        fontFamily: 'Outfit',
        watermarkText: 'SPACEX ORIGINAL',
        customCss: ''
      },
      currency: 'USD',
      timezone: 'UTC',
      taxConfig: {
        taxBrackets: [
          { name: 'Standard GST', percentage: 18.0 },
          { name: 'Zero Rated', percentage: 0.0 }
        ]
      },
      numberingFormats: {
        QUOTATION: 'QT-{YYYY}-{NNNN}',
        INVOICE: 'INV-{YYYY}-{NNNN}',
        PURCHASE_ORDER: 'PO-{YYYY}-{NNNN}'
      },
      plan: SubscriptionPlan.BUSINESS,
      status: TenantStatus.ACTIVE
    }
  });
  console.log(`✅ SpaceX Tenant initialized: ${spacexTenant.name} (${spacexTenant.id})`);

  // 4. Create Wayne Enterprises Tenant
  const wayneTenant = await prisma.tenant.upsert({
    where: { slug: 'wayne-enterprises' },
    update: {},
    create: {
      id: 'tenant-wayne',
      name: 'Wayne Enterprises',
      slug: 'wayne-enterprises',
      logoUrl: '',
      brandingConfig: {
        primaryColor: '#1e293b',
        secondaryColor: '#0f172a',
        fontFamily: 'Outfit',
        watermarkText: 'WAYNE ORIGINAL',
        customCss: ''
      },
      currency: 'USD',
      timezone: 'UTC',
      taxConfig: {
        taxBrackets: [
          { name: 'Standard GST', percentage: 18.0 },
          { name: 'Zero Rated', percentage: 0.0 }
        ]
      },
      numberingFormats: {
        QUOTATION: 'QT-{YYYY}-{NNNN}',
        INVOICE: 'INV-{YYYY}-{NNNN}',
        PURCHASE_ORDER: 'PO-{YYYY}-{NNNN}'
      },
      plan: SubscriptionPlan.ENTERPRISE,
      status: TenantStatus.ACTIVE
    }
  });
  console.log(`✅ Wayne Tenant initialized: ${wayneTenant.name} (${wayneTenant.id})`);

  const salt = await bcrypt.genSalt(10);

  const defaultPasswordHash = await bcrypt.hash('password', salt);

  // 3. Seed Users
  // Seed admin for Master Tenant
  const masterAdmin = await prisma.user.upsert({
    where: { email: 'admin@antigravity.com' },
    update: {},
    create: {
      tenantId: masterTenant.id,
      email: 'admin@antigravity.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Rajesh',
      lastName: 'S.',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      mfaEnabled: false
    }
  });
  console.log(`✅ Master Admin seeded: ${masterAdmin.email}`);

  // Seed owner for InnovaIT Systems Tenant
  const innovaitAdmin = await prisma.user.upsert({
    where: { email: 'it@innovait-systems.com' },
    update: {},
    create: {
      tenantId: innovaitTenant.id,
      email: 'it@innovait-systems.com',
      passwordHash: defaultPasswordHash,
      firstName: 'InnovaIT',
      lastName: 'Owner',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      mfaEnabled: false
    }
  });
  console.log(`✅ Platform Owner seeded: ${innovaitAdmin.email}`);

  // Seed SpaceX Admin explicitly
  const spacexAdmin = await prisma.user.upsert({
    where: { email: 'admin@spacex-cloud.com' },
    update: {},
    create: {
      id: `user-${spacexTenant.id}-admin`,
      tenantId: spacexTenant.id,
      email: 'admin@spacex-cloud.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Company',
      lastName: 'Admin',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      mfaEnabled: false
    }
  });

  // Seed Wayne Admin explicitly
  const wayneAdmin = await prisma.user.upsert({
    where: { email: 'admin@wayne-enterprises.com' },
    update: {},
    create: {
      id: `user-${wayneTenant.id}-admin`,
      tenantId: wayneTenant.id,
      email: 'admin@wayne-enterprises.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Company',
      lastName: 'Admin',
      role: UserRole.TENANT_ADMIN,
      isActive: true,
      mfaEnabled: false
    }
  });

  const seedOtherTenantUsers = async (tenantId: string, slug: string) => {
    const roles: UserRole[] = [UserRole.FINANCE, UserRole.SALES, UserRole.OPERATIONS, UserRole.VIEWER];
    const roleLabels = ['Finance', 'Sales', 'Ops', 'Viewer'];
    
    for (let i = 0; i < roles.length; i++) {
      const role = roles[i];
      const label = roleLabels[i];
      const email = `${role.toLowerCase()}@${slug}.com`;
      
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          id: `user-${tenantId}-${role.toLowerCase()}`,
          tenantId,
          email,
          passwordHash: defaultPasswordHash,
          firstName: 'Company',
          lastName: label,
          role,
          isActive: true,
          mfaEnabled: false
        }
      });
    }
  };

  await seedOtherTenantUsers(spacexTenant.id, 'spacex-cloud');
  await seedOtherTenantUsers(wayneTenant.id, 'wayne-enterprises');
  console.log('✅ Demo Company standard users seeded.');

  // Seed all tenants' metadata and templates inside a clean loop
  const tenants = [masterTenant, innovaitTenant, spacexTenant, wayneTenant];
  const admins = [masterAdmin, innovaitAdmin, spacexAdmin, wayneAdmin];

  for (let idx = 0; idx < tenants.length; idx++) {
    const t = tenants[idx];
    const admin = admins[idx];

    // Seeding Quotas
    await prisma.tenantQuota.upsert({
      where: { tenantId: t.id },
      update: {},
      create: {
        tenantId: t.id,
        maxCustomFields: 25,
        maxMonthlyExports: 2000,
        maxAiTokens: 1000000,
        maxStorageBytes: 10737418240, // 10GB
        maxWorkflowRuns: 500,
        quotaResetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      }
    });

    // Seeding Custom Fields
    const field1 = await prisma.customField.create({
      data: {
        tenantId: t.id,
        entityType: EntityType.QUOTATION,
        name: 'warranty_months',
        label: 'Warranty Period (Months)',
        type: FieldType.NUMBER,
        schemaVersion: 1,
        isRequired: true,
        defaultValue: '12',
        validationRules: { min: 0, max: 120 },
        sortOrder: 1
      }
    });

    const field2 = await prisma.customField.create({
      data: {
        tenantId: t.id,
        entityType: EntityType.SERVICE,
        name: 'sla_breach_penalty',
        label: 'SLA Failure Penalty ($)',
        type: FieldType.FORMULA,
        schemaVersion: 1,
        isRequired: false,
        formula: 'subTotal * 0.05', // 5% Penalty of original quote subtotal
        sortOrder: 2
      }
    });

    const field3 = await prisma.customField.create({
      data: {
        tenantId: t.id,
        entityType: EntityType.SERVICE,
        name: 'kt_completed',
        label: 'Knowledge Transfer Done',
        type: FieldType.CHECKBOX,
        schemaVersion: 1,
        isRequired: false,
        defaultValue: 'false',
        sortOrder: 3
      }
    });

    // Seeding templates
    const standardInvoiceTemplate = await prisma.template.create({
      data: {
        tenantId: t.id,
        name: 'Standard Clean Invoice A4',
        entityType: EntityType.INVOICE,
        version: 1,
        
        dataSchema: {
          properties: {
            invoiceNumber: { type: 'string' },
            issueDate: { type: 'string', format: 'date' },
            dueDate: { type: 'string', format: 'date' },
            subTotal: { type: 'number' },
            taxTotal: { type: 'number' },
            grandTotal: { type: 'number' },
            lines: {
              type: 'array',
              items: {
                description: { type: 'string' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
                total: { type: 'number' }
              }
            }
          }
        },

        layoutConfig: {
          pageSize: 'A4',
          orientation: 'portrait',
          margins: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
          sections: {
            header: { height: '40mm', columns: 2 },
            meta: { height: '30mm', columns: 3 },
            linesTable: { showBorders: true, headerBackground: '#f1f5f9' },
            footer: { height: '20mm', displayPageNumber: true }
          }
        },

        themeConfig: {
          fontFamily: 'Outfit',
          primaryHex: '#6366f1',
          secondaryHex: '#0f172a',
          textColor: '#334155',
          tableHeaderTextColor: '#1e293b',
          watermarkText: 'COPY',
          showQrCode: true
        },

        htmlMarkup: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: '{{theme.fontFamily}}', sans-serif; color: {{theme.textColor}}; margin: 0; padding: 0; }
              .invoice-box { padding: 30px; border: 1px solid #eee; }
              .header-table { width: 100%; border-collapse: collapse; }
              .primary-highlight { color: {{theme.primaryHex}}; }
              .lines-table { width: 100%; margin-top: 30px; border-collapse: collapse; }
              .lines-table th { background: {{layout.sections.linesTable.headerBackground}}; color: {{theme.tableHeaderTextColor}}; padding: 10px; text-align: left; }
              .lines-table td { padding: 10px; border-bottom: 1px solid #f1f5f9; }
              .total-panel { width: 40%; margin-left: auto; margin-top: 30px; }
              .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
              .grand-total { font-weight: bold; border-top: 2px solid {{theme.primaryHex}}; padding-top: 10px; color: {{theme.primaryHex}}; }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <table class="header-table">
                <tr>
                  <td><h1 class="primary-highlight">{{tenant.name}}</h1></td>
                  <td style="text-align: right;"><h2>INVOICE</h2></td>
                </tr>
                <tr>
                  <td>Bill To: <strong>{{customer.name}}</strong><br>{{customer.email}}</td>
                  <td style="text-align: right;">
                    Invoice #: <strong>{{invoiceNumber}}</strong><br>
                    Date: {{issueDate}}<br>
                    Due: {{dueDate}}
                  </td>
                </tr>
              </table>

              <table class="lines-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Rate</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {{#each lines}}
                  <tr>
                    <td>{{description}}</td>
                    <td>{{quantity}}</td>
                    <td>{{unitPrice}}</td>
                    <td>{{total}}</td>
                  </tr>
                  {{/each}}
                </tbody>
              </table>

              <div class="total-panel">
                <div class="total-row"><span>Subtotal:</span><span>{{subTotal}}</span></div>
                <div class="total-row"><span>Taxes:</span><span>{{taxTotal}}</span></div>
                <div class="total-row grand-total"><span>Grand Total:</span><span>{{grandTotal}}</span></div>
              </div>
            </div>
          </body>
          </html>
        `
      }
    });

    // Seeding Approval schemes
    const highValueApproval = await prisma.approvalTemplate.create({
      data: {
        tenantId: t.id,
        name: 'High-Value Operations Approval Scheme',
        entityType: EntityType.QUOTATION,
        criteria: {
          grandTotal: { gte: 10000.00 }
        },
        isActive: true,
        steps: {
          create: [
            {
              stepSequence: 1,
              assignedRole: UserRole.FINANCE,
              escalationTimeout: 1440,
              escalationRules: { action: 'ALERT_ADMIN' }
            },
            {
              stepSequence: 2,
              assignedUserId: admin.id,
              escalationTimeout: 2880,
              escalationRules: { action: 'AUTO_REJECT' }
            }
          ]
        }
      }
    });

    // Seeding automation rules
    await prisma.workflowRule.create({
      data: {
        tenantId: t.id,
        name: 'Overdue Payment Alerts System',
        entityType: EntityType.INVOICE,
        triggerEvent: TriggerEvent.ON_DUE_DATE_WARNING,
        version: 1,
        isActive: true,
        conditions: {
          status: 'SENT',
          daysPastDue: { gte: 7 }
        },
        actions: [
          { type: 'SEND_NOTIFICATION_ALERT', channel: 'EMAIL', template: 'overdue_invoice_remind' },
          { type: 'UPDATE_DOCUMENT_STATUS', newStatus: 'OVERDUE' },
          { type: 'TRIGGER_AUDIT_LOG_ENTRY', logMessage: 'Invoice has been automatically marked as OVERDUE.' }
        ]
      }
    });
  }

  console.log('✅ Dynamic metadata fields, templates, approvals, and workflow rules initialized for both tenants.');
  console.log('🎉 Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error executing database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
