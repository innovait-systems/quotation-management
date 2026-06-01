import { PrismaClient, UserRole, EntityType, Prisma } from '@prisma/client';
import { GovernanceService } from './modules/governance/governance.service';
import { AuthService } from './modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from './common/config/app-config.service';
import { ConfigService } from '@nestjs/config';

const prisma = new PrismaClient();
const governanceService = new GovernanceService(prisma as any);

// Mock config for dynamic token parsing
const configService = new ConfigService({
  JWT_SECRET: 'supersecretenterprisekey_antigravity_2026',
  NODE_ENV: 'development',
});
const appConfigService = new AppConfigService(configService);
const jwtService = new JwtService({
  secret: 'supersecretenterprisekey_antigravity_2026',
});
const authService = new AuthService(prisma as any, appConfigService, jwtService);

async function runLiveDemoWalkthrough() {
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '⚡ ANTIGRAVITY PLATFORM: LIVE END-TO-END TRANSACTIONAL DEMO');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================\n');

  const tenantSlug = 'tesla-motors';
  const adminEmail = 'elon@tesla.com';
  const rawPassword = 'SecureTesla2026!';

  try {
    // -------------------------------------------------------------------------
    // STEP 1: DATABASE SANITIZATION
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 1: Clearing Previous Sandbox Instances for Tesla Motors...');
    const existingTenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (existingTenant) {
      await prisma.quotation.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.customer.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.user.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.template.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.tenantQuota.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.tenant.delete({ where: { id: existingTenant.id } });
      console.log('  [Cleaned] Leftover "tesla-motors" records successfully deleted.');
    } else {
      console.log('  [Ready] Sandbox environment is fully sanitized and clean.');
    }
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 2: TENANT ONBOARDING
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 2: Onboarding B2B Tenant (Tesla Motors Corp)...');
    
    const tenantPayload = {
      name: 'Tesla Motors Corporation',
      slug: tenantSlug,
      currency: 'USD',
      timezone: 'America/Los_Angeles',
    };

    const tenant = await governanceService.createTenant(tenantPayload);
    console.log('\x1b[32m%s\x1b[0m', '  ✓ Tenant Successfully Provisioned in SQLite!');
    console.log(`    UUID:     [${tenant.id}]`);
    console.log(`    Slug:     \x1b[34m[${tenant.slug}]\x1b[0m`);
    console.log(`    Currency: \x1b[35m[${tenant.currency}]\x1b[0m`);
    console.log(`    Plan:     \x1b[32m[${tenant.plan}]\x1b[0m`);
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 3: SEED PREMIUM VISUAL TEMPLATES
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 3: Seeding Premium A4 Handlebars Visual Templates...');

    const sharedHtmlLayout = `
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap');
            body {
              font-family: 'Outfit', sans-serif;
              color: #334155;
              margin: 0;
              padding: 30px;
              line-height: 1.5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              border-bottom: 3px solid #6366f1;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .title {
              color: #6366f1;
              font-size: 28px;
              font-weight: 800;
              margin: 0;
            }
            .meta-table {
              width: 100%;
              margin-bottom: 30px;
            }
            .meta-table td {
              vertical-align: top;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .items-table th {
              background-color: #0f172a;
              color: #ffffff;
              text-align: left;
              padding: 12px 10px;
              font-size: 14px;
              font-weight: 600;
            }
            .items-table td {
              padding: 14px 10px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
            }
            .totals-section {
              display: flex;
              justify-content: flex-end;
              margin-bottom: 40px;
            }
            .totals-table {
              width: 300px;
              border-collapse: collapse;
            }
            .totals-table td {
              padding: 8px 10px;
              font-size: 14px;
            }
            .grand-total {
              font-weight: 800;
              color: #6366f1;
              font-size: 18px;
              border-top: 2px solid #6366f1;
              padding-top: 10px;
            }
            .terms {
              background-color: #f8fafc;
              border-left: 4px solid #6366f1;
              padding: 15px;
              font-size: 12px;
              border-radius: 4px;
              margin-top: 40px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">{{tenant.name}}</div>
              <div style="font-size: 12px; margin-top: 5px; color: #64748b; font-weight: 500;">PLATFORM ENTERPRISE WORKSPACE</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: 0.5px;">{{#if isQuotation}}QUOTATION{{else}}INVOICE{{/if}}</div>
              <div style="font-size: 14px; font-weight: 700; margin-top: 5px; color: #6366f1;">#{{documentNumber}}</div>
            </div>
          </div>

          <table class="meta-table">
            <tr>
              <td style="width: 50%;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px;">Prepared For:</div>
                <div style="font-size: 16px; font-weight: 700; color: #0f172a;">{{customer.name}}</div>
                <div style="font-size: 14px; color: #475569; margin-top: 3px; font-weight: 500;">{{customer.companyName}}</div>
                <div style="font-size: 13px; color: #64748b; margin-top: 2px;">{{customer.email}}</div>
              </td>
              <td style="width: 50%; text-align: right;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 6px; letter-spacing: 0.5px;">Document Details:</div>
                <div style="font-size: 13px; color: #334155;"><strong>Date Created:</strong> {{formatDate createdAt}}</div>
                <div style="font-size: 13px; color: #334155;"><strong>Valid Until:</strong> {{formatDate validUntil}}</div>
                <div style="font-size: 13px; color: #334155;"><strong>Currency:</strong> {{tenant.currency}}</div>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 55%;">Item Description</th>
                <th style="width: 10%; text-align: right;">Qty</th>
                <th style="width: 15%; text-align: right;">Unit Price</th>
                <th style="width: 20%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              {{#each lines}}
                <tr>
                  <td style="font-weight: 500; color: #0f172a;">{{description}}</td>
                  <td style="text-align: right; color: #475569;">{{quantity}}</td>
                  <td style="text-align: right; color: #475569;">{{formatCurrency unitPrice ../tenant.currency}}</td>
                  <td style="text-align: right; font-weight: 700; color: #0f172a;">{{formatCurrency total ../tenant.currency}}</td>
                </tr>
              {{/each}}
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td style="color: #475569; font-weight: 500;">Subtotal:</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">{{formatCurrency subTotal tenant.currency}}</td>
              </tr>
              <tr>
                <td style="color: #475569; font-weight: 500;">Tax Total (10%):</td>
                <td style="text-align: right; font-weight: 600; color: #0f172a;">{{formatCurrency taxTotal tenant.currency}}</td>
              </tr>
              <tr class="grand-total">
                <td>Grand Total:</td>
                <td style="text-align: right;">{{formatCurrency grandTotal tenant.currency}}</td>
              </tr>
            </table>
          </div>

          {{#if terms}}
            <div class="terms">
              <div style="font-weight: 700; margin-bottom: 5px; color: #0f172a; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Terms & Conditions</div>
              <div style="color: #475569;">{{terms}}</div>
            </div>
          {{/if}}
        </body>
      </html>
    `;

    // Seed QUOTATION template
    const quoteTemplate = await prisma.template.create({
      data: {
        tenantId: tenant.id,
        name: 'Standard Visual Quotation A4',
        entityType: EntityType.QUOTATION,
        dataSchema: {},
        layoutConfig: {
          pageSize: 'A4',
          margins: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
          orientation: 'portrait'
        },
        themeConfig: {
          primaryHex: '#6366f1',
          secondaryHex: '#0f172a',
          textColor: '#334155'
        },
        htmlMarkup: sharedHtmlLayout
      }
    });
    console.log(`  ✓ Seeded template: \x1b[32m"${quoteTemplate.name}"\x1b[0m (${quoteTemplate.entityType})`);

    // Seed INVOICE template
    const invoiceTemplate = await prisma.template.create({
      data: {
        tenantId: tenant.id,
        name: 'Standard Visual Invoice A4',
        entityType: EntityType.INVOICE,
        dataSchema: {},
        layoutConfig: {
          pageSize: 'A4',
          margins: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
          orientation: 'portrait'
        },
        themeConfig: {
          primaryHex: '#6366f1',
          secondaryHex: '#0f172a',
          textColor: '#334155'
        },
        htmlMarkup: sharedHtmlLayout
      }
    });
    console.log(`  ✓ Seeded template: \x1b[32m"${invoiceTemplate.name}"\x1b[0m (${invoiceTemplate.entityType})`);
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 4: SECURE USER PROVISIONING
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 4: Creating Secure Administrator (Elon Musk)...');

    const userPayload = {
      tenantSlugOrId: tenantSlug,
      email: adminEmail,
      passwordRaw: rawPassword,
      firstName: 'Elon',
      lastName: 'Musk',
      role: 'TENANT_ADMIN',
    };

    const user = await governanceService.createUser(userPayload);
    console.log('\x1b[32m%s\x1b[0m', '  ✓ Secure User Created successfully!');
    console.log(`    UUID:        [${user.id}]`);
    console.log(`    Email:       \x1b[32m${user.email}\x1b[0m`);
    console.log(`    Access Role: \x1b[35m[${user.role}]\x1b[0m`);
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 5: ONBOARD A REAL B2B CUSTOMER
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 5: Onboarding B2B Corporate Client (SpaceX)...');

    const customer = await prisma.customer.create({
      data: {
        tenantId: tenant.id,
        name: 'SpaceX Exploration Technologies',
        companyName: 'SpaceX LLC',
        email: 'billing@spacex.com',
        phone: '+1 (310) 363-6000',
        billingAddress: {
          street: 'Rocket Road 1',
          city: 'Hawthorne',
          state: 'CA',
          country: 'USA'
        },
        shippingAddress: {
          street: 'Rocket Road 1',
          city: 'Hawthorne',
          state: 'CA',
          country: 'USA'
        }
      }
    });

    console.log('\x1b[32m%s\x1b[0m', '  ✓ Customer Registered inside SQLite database!');
    console.log(`    Customer UUID: [${customer.id}]`);
    console.log(`    Company Name:  \x1b[34m[${customer.name} (${customer.companyName})]\x1b[0m`);
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 6: GENERATE ACTUAL TRANSACTIONAL QUOTATION
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 6: Generating Commercial Quotation for SpaceX...');

    const subTotal = new Prisma.Decimal(125000.00);
    const taxTotal = new Prisma.Decimal(12500.00); // 10% VAT
    const grandTotal = subTotal.plus(taxTotal);

    const quotation = await prisma.quotation.create({
      data: {
        tenantId: tenant.id,
        customerId: customer.id,
        creatorId: user.id,
        quoteNumber: 'QT-2026-Tesla001',
        version: 1,
        status: 'DRAFT',
        subTotal,
        taxTotal,
        discountTotal: new Prisma.Decimal(0),
        grandTotal,
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days valid
        terms: 'Tesla Megapack Grid Utility Storage Quotation. Valid for 30 days. Includes commissioning.',
        dynamicValues: {},
        metadataSchema: {},
        lines: {
          create: [
            {
              description: 'Tesla Megapack Utility Grid Storage Container (3MWh Array)',
              quantity: new Prisma.Decimal(1),
              unitPrice: new Prisma.Decimal(125000),
              taxRate: new Prisma.Decimal(10),
              discount: new Prisma.Decimal(0),
              total: new Prisma.Decimal(137500)
            }
          ]
        }
      },
      include: {
        lines: true
      }
    });

    console.log('\x1b[32m%s\x1b[0m', '  ✓ Commercial Quotation Persisted in Database successfully!');
    console.log(`    Quote Number: \x1b[34m[${quotation.quoteNumber}]\x1b[0m`);
    console.log(`    Grand Total:  \x1b[35m[${quotation.grandTotal.toString()} ${tenant.currency}]\x1b[0m`);
    console.log(`    Line Item:    - ${quotation.lines[0].description} x ${quotation.lines[0].quantity.toString()}`);
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 7: AUTHENTICATE JWT TOKEN
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 7: Simulating Authorization Handshake & Fetching JWT Token...');

    const loginPayload = {
      email: adminEmail,
      passwordHash: rawPassword,
      tenantSlug: tenantSlug,
    };

    const authResult: any = await authService.login(loginPayload);
    console.log('\x1b[32m%s\x1b[0m', '  ✓ Authentication Handshake Completed successfully!');
    console.log(`    Authorized Tenant Context:  \x1b[34m[${authResult.tenant.name}]\x1b[0m`);
    console.log(`    Generated Secure JWT Token:`);
    console.log(`      \x1b[36m${authResult.accessToken.substring(0, 50)}...\x1b[0m`);
    console.log('----------------------------------------------------');

    // -------------------------------------------------------------------------
    // STEP 8: POWERSHELL VERIFICATION DRILL
    // -------------------------------------------------------------------------
    console.log('\x1b[33m%s\x1b[0m', '👉 STEP 8: Copy-and-Paste PowerShell E2E Verification Command');
    console.log('  Execute this native PowerShell command to query the Quotations endpoint inside Docker');
    console.log('  using Elon\'s actual JWT Authorization Token:\n');

    console.log('  COPY AND PASTE THIS POWERSHELL COMMAND:\n');
    console.log('\x1b[36m%s\x1b[0m', `  $token = "${authResult.accessToken}"`);
    console.log('\x1b[36m%s\x1b[0m', `  Invoke-RestMethod -Uri "http://localhost:3001/api/v1/quotations" \\`);
    console.log(`    -Method Get \\`);
    console.log(`    -Headers @{ "Authorization" = "Bearer $token"; "x-tenant-id" = "${tenantSlug}" }\n`);

    console.log('\x1b[35m%s\x1b[0m', '========================================================================');
    console.log('\x1b[32m%s\x1b[0m', '🎉 DEMO SUCCESS: FULL TRANSACTIONAL LIFECYCLE SEEDED SUCCESSFULLY!');
    console.log('\x1b[35m%s\x1b[0m', '========================================================================');

  } catch (error: any) {
    console.error('Demo walkthrough execution crashed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runLiveDemoWalkthrough();
