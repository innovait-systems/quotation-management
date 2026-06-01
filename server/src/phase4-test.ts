import { AiService } from './modules/ai/ai.service';
import { BillingService } from './modules/billing/billing.service';
import { ComplianceService } from './modules/compliance/compliance.service';
import { EntityType, SubscriptionPlan } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

// =========================================================================
// MOCK PRISMA SERVICE (IN-MEMORY FOR HIGH-RELIABILITY SANDBOX RUNS)
// =========================================================================
class MockPrismaService {
  tenants: any[] = [];
  tenantQuotas: any[] = [];
  auditLogs: any[] = [];

  constructor() {
    // Initialize Master Tenant
    this.tenants.push({
      id: 'tenant-antigravity',
      name: 'Antigravity Solutions',
      slug: 'antigravity',
      plan: SubscriptionPlan.FREE,
      brandingConfig: { primary: '#6366f1' },
    });

    // Initialize baseline free quota configuration
    this.tenantQuotas.push({
      id: 'quota-free-1',
      tenantId: 'tenant-antigravity',
      maxCustomFields: 5,
      maxMonthlyExports: 10,
      maxAiTokens: 50000,
      maxStorageBytes: BigInt(500 * 1024 * 1024), // 500MB
      maxWorkflowRuns: 100,
      usedCustomFields: 0,
      usedMonthlyExports: 0,
      usedAiTokens: 0,
      usedStorageBytes: BigInt(0),
      usedWorkflowRuns: 0,
      quotaResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  // Mock Tenant repository
  tenant = {
    update: async ({ where, data }: any) => {
      const tenant = this.tenants.find(t => t.id === where.id);
      if (!tenant) throw new Error(`Tenant ${where.id} not found`);
      Object.assign(tenant, data);
      return tenant;
    }
  };

  // Mock TenantQuota repository
  tenantQuota = {
    findUnique: async ({ where }: any) => {
      return this.tenantQuotas.find(q => q.tenantId === where.tenantId) || null;
    },
    create: async ({ data }: any) => {
      const newQuota = {
        id: `quota-${Date.now()}`,
        usedCustomFields: 0,
        usedMonthlyExports: 0,
        usedAiTokens: 0,
        usedStorageBytes: BigInt(0),
        usedWorkflowRuns: 0,
        ...data,
      };
      this.tenantQuotas.push(newQuota);
      return newQuota;
    },
    update: async ({ where, data }: any) => {
      const q = this.tenantQuotas.find(quota => quota.tenantId === where.tenantId);
      if (!q) throw new Error("Quota config not found");

      for (const key of Object.keys(data)) {
        if (data[key] && typeof data[key] === 'object' && data[key].increment !== undefined) {
          q[key] = (q[key] || 0) + data[key].increment;
        } else {
          q[key] = data[key];
        }
      }
      return q;
    },
    upsert: async ({ where, update, create }: any) => {
      let q = this.tenantQuotas.find(quota => quota.tenantId === where.tenantId);
      if (q) {
        Object.assign(q, update);
      } else {
        q = {
          id: `quota-${Date.now()}`,
          tenantId: where.tenantId,
          usedCustomFields: 0,
          usedMonthlyExports: 0,
          usedAiTokens: 0,
          usedStorageBytes: BigInt(0),
          usedWorkflowRuns: 0,
          ...create,
        };
        this.tenantQuotas.push(q);
      }
      return q;
    }
  };

  // Mock AuditLog repository
  auditLog = {
    findFirst: async ({ where, orderBy }: any) => {
      let filtered = [...this.auditLogs];
      if (where?.tenantId) {
        filtered = filtered.filter(l => l.tenantId === where.tenantId);
      }
      // The last one pushed in array is chronologically the latest
      return filtered[filtered.length - 1] || null;
    },
    findMany: async ({ where, orderBy, take, skip }: any) => {
      let filtered = [...this.auditLogs];
      if (where?.tenantId) {
        filtered = filtered.filter(l => l.tenantId === where.tenantId);
      }
      
      const sortOrder = orderBy?.createdAt || 'desc';
      if (sortOrder === 'desc') {
        filtered.reverse();
      }
      // if 'asc', keep the natural chronological insertion order

      let res = filtered;
      if (skip !== undefined) res = res.slice(skip);
      if (take !== undefined) res = res.slice(0, take);
      return res;
    },
    count: async ({ where }: any) => {
      let filtered = [...this.auditLogs];
      if (where?.tenantId) {
        filtered = filtered.filter(l => l.tenantId === where.tenantId);
      }
      return filtered.length;
    },
    create: async ({ data }: any) => {
      const newLog = {
        id: `audit-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        createdAt: new Date(),
        ...data,
      };
      this.auditLogs.push(newLog);
      return newLog;
    }
  };

  // transaction wrapper support
  async $transaction(arg: any) {
    if (typeof arg === 'function') {
      return arg(this);
    } else if (Array.isArray(arg)) {
      const results = [];
      for (const op of arg) {
        results.push(await op);
      }
      return results;
    }
  }
}

// =========================================================================
// RUN TEST RUNNER
// =========================================================================
async function runPhase4Tests() {
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🚀 ANTIGRAVITY ENTERPRISE SYSTEMS: PHASE 4 INTEGRATION TEST SUITE');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  \x1b[32m✓ PASSED:\x1b[0m ${message}`);
      passed++;
    } else {
      console.error(`  \x1b[31m✗ FAILED:\x1b[0m ${message}`);
      failed++;
    }
  }

  // =========================================================================
  // TEST 1: AI Prompt Template Generation
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TEST 1: AI Copilot Prompt Template Compilation');
  try {
    const aiService = new AiService();
    const tenantId = 'tenant-antigravity';

    // 1.1 Software SOW Template Generation
    console.log('  Generating blueprint for Offshore Software SOW Prompt...');
    const sowBlueprint = await aiService.generateTemplateFromPrompt(
      tenantId,
      'Create an offshore software dev contract with sprints count, resource dropdown, and 10% SLA penalty calculations.',
      'QUOTATION'
    );
    
    assert(sowBlueprint.name === 'offshore_software_sow', 'Identified offshore software SOW blueprint template');
    assert(sowBlueprint.fields.length >= 5, 'Generated correct number of custom fields');
    
    const penaltyField = sowBlueprint.fields.find(f => f.name === 'sla_breach_penalty');
    assert(penaltyField !== undefined && penaltyField.type === 'FORMULA', 'Created calculated custom formula field for SLA penalty');
    assert(penaltyField?.formula === 'subTotal * 0.10', 'Correct formula mapping rule executed');
    assert(sowBlueprint.suggestedBranding.primary === '#6366f1', 'AI recommended Indigo branding theme');

    // 1.2 Logistics PO Template Generation
    console.log('  Generating blueprint for Logistics & Shipping PO Prompt...');
    const logisticsBlueprint = await aiService.generateTemplateFromPrompt(
      tenantId,
      'Build a delivery template for bulk freight shipping including DHL options and zones.',
      'PURCHASE_ORDER'
    );
    assert(logisticsBlueprint.name === 'logistics_freight_po', 'Identified logistics blueprint template');
    assert(logisticsBlueprint.fields.some(f => f.name === 'shipping_carrier'), 'Created dropdown option list for shipping carriers');
    assert(logisticsBlueprint.suggestedBranding.primary === '#0ea5e9', 'AI recommended Sky blue branding theme');

    // 1.3 General Corporate Consulting Template Generation
    console.log('  Generating blueprint for Corporate Advisory consulting SOW...');
    const corporateBlueprint = await aiService.generateTemplateFromPrompt(
      tenantId,
      'Standard business corporate consulting contract.',
      'QUOTATION'
    );
    assert(corporateBlueprint.name === 'corporate_consulting_sow', 'Fell back to corporate consulting template structure');
    assert(corporateBlueprint.fields.some(f => f.name === 'consulting_hours'), 'Created numeric consultant hourly bounds field');

  } catch (err: any) {
    console.error(`  \x1b[31m✗ ERROR:\x1b[0m AI Template test threw error: ${err.message}`);
    failed++;
  }
  console.log();

  // =========================================================================
  // TEST 2: Tenant Subscription limits and Billing quota enforcement
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TEST 2: Billing & Subscription Multi-Tier Quota Enforcement');
  try {
    const mockPrisma = new MockPrismaService() as any;
    const billingService = new BillingService(mockPrisma);
    const tenantId = 'tenant-antigravity';

    // 2.1 Retrieve Baseline limits
    const quota = await billingService.getTenantQuota(tenantId);
    assert(quota.maxCustomFields === 5, 'Retrieved active FREE plan limits (Max 5 custom fields)');
    assert(quota.usedCustomFields === 0, 'Used custom fields initial count is 0');

    // 2.2 Increment allowance within threshold
    console.log('  Incrementing active custom fields metadata count (5 fields)...');
    await billingService.checkQuotaAllowance(tenantId, 'fields', 5);
    const updatedQuota = await billingService.getTenantQuota(tenantId);
    assert(updatedQuota.usedCustomFields === 5, 'Successfully recorded 5 custom fields within allowance bounds');

    // 2.3 Exceed FREE tier threshold limits (Must throw BadRequestException)
    console.log('  Requesting 6th custom field (Should trigger quota overflow protection)...');
    let exceeded = false;
    try {
      await billingService.checkQuotaAllowance(tenantId, 'fields', 1);
    } catch (err) {
      if (err instanceof BadRequestException) {
        exceeded = true;
        console.log(`  \x1b[32m✓ CATCH:\x1b[0m Threw expected limit error: "${err.message}"`);
        passed++;
      } else {
        console.error('  \x1b[31m✗ CATCH:\x1b[0m Threw unexpected exception type:', err);
        failed++;
      }
    }
    assert(exceeded, 'Prevented creation: Atomic limit gatekeeper successfully blocked quota violation');

    // 2.4 Transaction-Safe Subscription Upgrade (FREE -> STARTUP)
    console.log('  Upgrading tenant subscription tier to STARTUP plan...');
    await billingService.upgradeSubscriptionPlan(tenantId, SubscriptionPlan.STARTUP);
    
    const startupTenant = mockPrisma.tenants.find((t: any) => t.id === tenantId);
    assert(startupTenant.plan === SubscriptionPlan.STARTUP, 'Updated organization profile database record to STARTUP tier');

    const startupQuota = await billingService.getTenantQuota(tenantId);
    assert(startupQuota.maxCustomFields === 15, 'Expanded custom field threshold boundaries to 15 fields');
    assert(startupQuota.maxMonthlyExports === 50, 'Expanded document exports capacity to 50 exports');

    // 2.5 Re-validate allowance on the new tier bounds
    console.log('  Retrying creation of the 6th custom field under upgraded context...');
    let successUpgrade = false;
    try {
      await billingService.checkQuotaAllowance(tenantId, 'fields', 1);
      successUpgrade = true;
    } catch (err) {
      console.error('  Failed to allow creation after plan upgrade', err);
    }
    assert(successUpgrade, 'Organization successfully created additional fields after expanding subscription tier limit');
    
    const finalQuota = await billingService.getTenantQuota(tenantId);
    assert(finalQuota.usedCustomFields === 6, 'Custom fields counter verified at 6 items total');

  } catch (err: any) {
    console.error(`  \x1b[31m✗ ERROR:\x1b[0m Billing quota test threw error: ${err.message}`);
    failed++;
  }
  console.log();

  // =========================================================================
  // TEST 3: Cryptographically Signed Compliance Audit Log Chains
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TEST 3: Cryptographic Audit Ledger & Simulating Integrity Tampering');
  try {
    const mockPrisma = new MockPrismaService() as any;
    const complianceService = new ComplianceService(mockPrisma);
    const tenantId = 'tenant-antigravity';

    // 3.1 Insert sequential, chained audit log logs
    console.log('  Appending multiple chronological audit entries into ledger...');
    const entry1 = await complianceService.createAuditEntry({
      tenantId,
      action: 'CREATE_DRAFT_QUOTATION',
      entityType: EntityType.QUOTATION,
      entityId: 'QT-2026-8801',
      oldState: null,
      newState: { subTotal: 1500, taxRate: 18, status: 'DRAFT' },
    });

    const entry2 = await complianceService.createAuditEntry({
      tenantId,
      action: 'CONVERT_QUOTE_TO_PO',
      entityType: EntityType.PURCHASE_ORDER,
      entityId: 'PO-2026-8008',
      oldState: { status: 'APPROVED' },
      newState: { status: 'OPEN', subTotal: 1500, dynamicValues: { priority: 'MEDIUM' } },
    });

    const entry3 = await complianceService.createAuditEntry({
      tenantId,
      action: 'RECORD_DELIVERY_RECEIPT',
      entityType: EntityType.PURCHASE_ORDER,
      entityId: 'PO-2026-8008',
      oldState: { quantityReceived: 0, status: 'OPEN' },
      newState: { quantityReceived: 6, status: 'PARTIALLY_RECEIVED' },
    });

    assert(mockPrisma.auditLogs.length === 3, 'Persisted 3 sequentially linked operational logs');
    assert(entry1.signature !== entry2.signature, 'Generated distinct signature hashes');

    // 3.2 Verify sequential chronological blockchain integrity
    console.log('  Executing cryptographic signature chain audits validation checks...');
    const verificationBefore = await complianceService.verifyChainIntegrity(tenantId);
    assert(verificationBefore.isValid === true, 'Ledger validation complete: Cryptographic chain is 100% SECURE and AUTHENTIC');

    // 3.3 DELIBERATE BREACH SIMULATION: TAMPER WITH DATABASE STATE
    console.log('  \x1b[31m[Simulating Malicious Tampering]\x1b[0m Modifying intermediate state data in persistent logs...');
    // Manually tamper with the state values in entry2 without recomputing the SHA-256 block hash!
    const targetLogIndex = mockPrisma.auditLogs.findIndex((l: any) => l.action === 'CONVERT_QUOTE_TO_PO');
    assert(targetLogIndex !== -1, 'Identified intermediate target PO log entry in memory database');
    
    // Maliciously alter the subTotal in newState to steal money or change agreements!
    mockPrisma.auditLogs[targetLogIndex].newState = { status: 'OPEN', subTotal: 999999, dynamicValues: { priority: 'MEDIUM' } };
    console.log('  Intermediate entry state altered in background: changed PO subtotal from $1,500 to $999,999.');

    // 3.4 Execute verification again and verify the breach is successfully caught at the exact block!
    console.log('  Re-evaluating cryptographic chain signatures...');
    const verificationAfter = await complianceService.verifyChainIntegrity(tenantId);
    
    assert(verificationAfter.isValid === false, 'Tamper Detection System flagged an integrity breach!');
    assert(verificationAfter.breachedIndex === targetLogIndex, `Perfect block trace: Breach successfully isolated at ledger index ${verificationAfter.breachedIndex}`);

  } catch (err: any) {
    console.error(`  \x1b[31m✗ ERROR:\x1b[0m Compliance ledger test threw error: ${err.message}`);
    failed++;
  }
  console.log();

  // =========================================================================
  // OVERALL RATIO RESULTS
  // =========================================================================
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🏁 PHASE 4 EXECUTIVE TEST SUMMARY REPORT');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log(`  Total Assertion Assays Performed: ${passed + failed}`);
  console.log(`  Successful Pass Assays Count:     \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed/Breach Assays Count:       \x1b[31m${failed}\x1b[0m`);
  
  if (failed === 0) {
    console.log('\n  \x1b[42m\x1b[30m STATUS: 100% COMPLIANT - ALL METRICS AND Ledgers VERIFIED \x1b[0m\n');
  } else {
    console.log('\n  \x1b[41m\x1b[30m STATUS: FAILURES DETECTED IN INTEGRATION ASSAYS \x1b[0m\n');
    process.exit(1);
  }
}

runPhase4Tests();
