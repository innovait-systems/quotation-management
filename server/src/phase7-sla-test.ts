import { TenantConnectionPool } from './prisma/tenant-connection-pool';
import { PrismaService } from './prisma/prisma.service';
import { tenantContextStorage } from './prisma/tenant-context';
import { ServicesService } from './modules/services/services.service';
import { ServiceStatus, EntityType, FieldType } from '@prisma/client';
import { NotFoundException } from '@nestjs/common';

async function runPhase7SlaTests() {
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🚀 ANTIGRAVITY ENTERPRISE SYSTEMS: PHASE 7 SLA TRACKING & MONITORING TEST');
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

  const pool = new TenantConnectionPool();
  const prismaService = new PrismaService(pool);
  const servicesService = new ServicesService(prismaService);

  try {
    console.log('⚡ Initializing Database connection context...');
    await prismaService.onModuleInit();

    // 1. Resolve Active Default Tenant
    const defaultTenant = await prismaService.tenant.findFirst();
    if (!defaultTenant) {
      throw new Error('Default Tenant not found. Please run seed script first.');
    }
    console.log(`  Resolved Active Standard Tenant: ${defaultTenant.name} (${defaultTenant.id})`);

    const tenantContext = {
      tenantId: defaultTenant.id,
      slug: defaultTenant.slug,
      plan: defaultTenant.plan,
    };

    // 2. Resolve/Create Customer under standard tenant
    let customer = await prismaService.customer.findFirst({
      where: { tenantId: defaultTenant.id },
    });
    if (!customer) {
      console.log('  Creating mock customer for SLA testing...');
      customer = await prismaService.customer.create({
        data: {
          tenantId: defaultTenant.id,
          name: 'Acme Laboratories',
          email: 'support@acme.org',
          companyName: 'Acme Corp',
          billingAddress: {},
          shippingAddress: {},
        },
      });
    }
    console.log(`  Resolved Customer Context: ${customer.name} (${customer.id})`);

    // 3. Create active Custom Fields to verify Metadata Schema Snapshot
    console.log('⚡ Generating active Custom Fields for Service entity...');
    const customField = await prismaService.customField.create({
      data: {
        tenantId: defaultTenant.id,
        entityType: EntityType.SERVICE,
        name: 'sla_severity',
        label: 'SLA Severity Tier',
        type: FieldType.TEXT,
        isRequired: true,
        isActive: true,
      },
    });
    assert(customField.id !== undefined, 'Created Custom Field for SLA Metadata Schema test');

    // =========================================================================
    // TEST 1: Service Ticket Creation & Custom Fields Metadata Schema Snapshots
    // =========================================================================
    console.log('\n\x1b[33m%s\x1b[0m', '🔥 TEST 1: Service Ticket Creation & Metadata Schema Snapshotting');
    
    let createdServiceId = '';
    
    await tenantContextStorage.run(tenantContext, async () => {
      const ticket = await servicesService.createService(defaultTenant.id, {
        customerId: customer!.id,
        title: 'Critical DB Cluster Outage',
        description: 'Primary PostgreSQL cluster is unresponsive to connection pools.',
        slaHours: 0, // 0 Hours SLA to trigger immediate breach during query
        dynamicValues: {
          sla_severity: 'P1 - Blocked',
        },
      });

      createdServiceId = ticket.id;

      assert(ticket.title === 'Critical DB Cluster Outage', 'Created Service Ticket successfully');
      assert(ticket.status === ServiceStatus.OPEN, 'Initial status set to OPEN');
      assert(ticket.dynamicValues !== null, 'Dynamic Custom Field values stored correctly');
      
      const activities = ticket.activities as any[];
      assert(activities.length === 1, 'Initial activity entry created inside logs chain');
      assert(activities[0].action === 'CREATED', 'First activity marked as CREATED');

      const metaSchema = ticket.metadataSchema as any[];
      assert(metaSchema.length >= 1, 'Locked dynamic field metadata Schema successfully');
      assert(metaSchema.some(f => f.name === 'sla_severity'), 'Metadata snapshot contains sla_severity configuration');
    });

    // =========================================================================
    // TEST 2: Real-time SLA Breach Watchdog Evaluation
    // =========================================================================
    console.log('\n\x1b[33m%s\x1b[0m', '🔥 TEST 2: Dynamic Watchdog Inline SLA Breach Transition');
    
    await tenantContextStorage.run(tenantContext, async () => {
      // Fetch ticket using getServiceWithSlaCheck
      const evaluated = await servicesService.getServiceWithSlaCheck(defaultTenant.id, createdServiceId);

      assert(evaluated.status === ServiceStatus.BREACHED, 'Watchdog detected deadline breach and transitioned status to BREACHED');
      
      const activities = evaluated.activities as any[];
      assert(activities.length === 2, 'Logged status transition activity to chronological chain');
      assert(activities[1].action === 'STATUS_CHANGE', 'Status change marked correctly as STATUS_CHANGE');
      assert(activities[1].user === 'SLA Watchdog', 'Transition actor registered as SLA Watchdog');

      // Verify state was persisted in db
      const dbRecord = await prismaService.service.findUnique({
        where: { id: createdServiceId },
      });
      assert(dbRecord?.status === ServiceStatus.BREACHED, 'Verified BREACHED status persisted to the database store');
    });

    // =========================================================================
    // TEST 3: Watchdog Idempotence & Non-Redundant Logs
    // =========================================================================
    console.log('\n\x1b[33m%s\x1b[0m', '🔥 TEST 3: Idempotent SLA Watchdog Checks');

    await tenantContextStorage.run(tenantContext, async () => {
      // Re-fetch the breached ticket
      const reEvaluated = await servicesService.getServiceWithSlaCheck(defaultTenant.id, createdServiceId);
      
      assert(reEvaluated.status === ServiceStatus.BREACHED, 'Status remains BREACHED on consecutive queries');
      const activities = reEvaluated.activities as any[];
      assert(activities.length === 2, 'No duplicate activities written to the activities log chain');
    });

    // =========================================================================
    // TEST 4: Multi-Tenant Data Isolation Enforcement
    // =========================================================================
    console.log('\n\x1b[33m%s\x1b[0m', '🔥 TEST 4: Multi-Tenant TenantGuard Isolation Clearance');

    const fakeTenantId = '00000000-0000-0000-0000-000000000000';
    let isolationPassed = false;
    try {
      await servicesService.getServiceWithSlaCheck(fakeTenantId, createdServiceId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        isolationPassed = true;
      }
    }
    assert(isolationPassed, 'Strict Tenancy Isolation: Throws NotFoundException when retrieving service ticket under incorrect tenantId');

    // =========================================================================
    // CLEANUP
    // =========================================================================
    console.log('\n⚡ Cleaning up database artifacts...');
    await prismaService.service.delete({
      where: { id: createdServiceId },
    });
    await prismaService.customField.delete({
      where: { id: customField.id },
    });
    console.log('  Test artifacts deleted successfully.');

  } catch (err: any) {
    console.error(`  \x1b[31m✗ ERROR:\x1b[0m SLA Module tests encountered a fatal exception: ${err.message || err}`);
    failed++;
  } finally {
    await prismaService.onModuleDestroy();
    await pool.onModuleDestroy();
  }

  // =========================================================================
  // OVERALL RATIO RESULTS
  // =========================================================================
  console.log('\n\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🏁 PHASE 7 EXECUTIVE SLA MONITORING TEST SUMMARY REPORT');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log(`  Total Assertion Assays Performed: ${passed + failed}`);
  console.log(`  Successful Pass Assays Count:     \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed/Breach Assays Count:       \x1b[31m${failed}\x1b[0m`);

  if (failed === 0) {
    console.log('\n  \x1b[42m\x1b[30m STATUS: 100% SUCCESS - ALL SLA BREED ENGINES & TENANCY ISOLATIONS SECURED \x1b[0m\n');
  } else {
    console.log('\n  \x1b[41m\x1b[30m STATUS: FAILURES DETECTED IN SLA MONITORING ENGINE \x1b[0m\n');
    process.exit(1);
  }
}

runPhase7SlaTests();
