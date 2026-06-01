import { TenantConnectionPool } from './prisma/tenant-connection-pool';
import { PrismaService } from './prisma/prisma.service';
import { tenantContextStorage } from './prisma/tenant-context';
import * as fs from 'fs';
import * as path from 'path';

async function runConcurrencySandbox() {
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🚀 ANTIGRAVITY ENTERPRISE SYSTEMS: PHASE 6 MULTI-USER CONCURRENCY SANDBOX');
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

  // Define paths for isolated concurrency test databases
  const prismaDir = path.resolve(process.cwd(), 'prisma');
  const wayneDbPath = path.join(prismaDir, 'dev-enterprise-enterprise-wayne.db');
  const luthorDbPath = path.join(prismaDir, 'dev-enterprise-enterprise-luthor.db');

  // Helper cleanups
  const cleanupTestDbs = () => {
    [wayneDbPath, luthorDbPath].forEach((dbPath) => {
      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
        } catch (err) {}
      }
    });
  };

  // Perform initial cleanup
  cleanupTestDbs();

  console.log('\x1b[33m%s\x1b[0m', '🔥 STEP 1: Bootstrapping Concurrency Pool and Services');
  const pool = new TenantConnectionPool();
  const prismaService = new PrismaService(pool);

  try {
    await prismaService.onModuleInit();
    console.log('  [Init] Core default database verified and connected.');

    const defaultTenant = await prismaService.tenant.findFirst();
    if (!defaultTenant) {
      throw new Error('Default tenant not found. Please ensure database is seeded.');
    }
    console.log(`  [Init] Baseline tenant resolved: ${defaultTenant.name} (${defaultTenant.id})`);

    // Define standard and enterprise contexts
    const standardCtx = {
      tenantId: defaultTenant.id,
      slug: defaultTenant.slug,
      plan: 'STARTUP' as const,
    };

    const wayneCtx = {
      tenantId: defaultTenant.id,
      slug: 'enterprise-wayne',
      plan: 'ENTERPRISE' as const,
    };

    const luthorCtx = {
      tenantId: defaultTenant.id,
      slug: 'enterprise-luthor',
      plan: 'ENTERPRISE' as const,
    };

    console.log('\n\x1b[33m%s\x1b[0m', '🔥 STEP 2: Dispatching 150 High-Concurrency Dynamic Transactions');
    console.log('  Simulating parallel writes/reads across three separate tenant segments...');

    const start = Date.now();
    const operations: Promise<any>[] = [];

    // Helper to generate distinct customer inputs
    const makeCustomerData = (index: number, suffix: string) => ({
      name: `Concurrent Client ${index} (${suffix})`,
      email: `client-${index}-${suffix}@concurrency-test.io`,
      billingAddress: { test: true },
      shippingAddress: { test: true },
    });

    // Populate parallel queue
    for (let i = 0; i < 50; i++) {
      // 1. Standard Tenant Write + Read
      operations.push(
        tenantContextStorage.run(standardCtx, async () => {
          const data = makeCustomerData(i, 'Standard');
          const created = await prismaService.customer.create({
            data: {
              ...data,
              tenantId: standardCtx.tenantId,
            },
          });
          const fetched = await prismaService.customer.findFirst({
            where: { email: data.email },
          });
          return { scope: 'standard', success: !!created && fetched?.email === data.email };
        })
      );

      // 2. Enterprise Wayne Tenant Write + Read
      operations.push(
        tenantContextStorage.run(wayneCtx, async () => {
          const data = makeCustomerData(i, 'Wayne');
          const created = await prismaService.customer.create({
            data: {
              ...data,
              tenantId: wayneCtx.tenantId,
            },
          });
          const fetched = await prismaService.customer.findFirst({
            where: { email: data.email },
          });
          return { scope: 'wayne', success: !!created && fetched?.email === data.email };
        })
      );

      // 3. Enterprise Luthor Tenant Write + Read
      operations.push(
        tenantContextStorage.run(luthorCtx, async () => {
          const data = makeCustomerData(i, 'Luthor');
          const created = await prismaService.customer.create({
            data: {
              ...data,
              tenantId: luthorCtx.tenantId,
            },
          });
          const fetched = await prismaService.customer.findFirst({
            where: { email: data.email },
          });
          return { scope: 'luthor', success: !!created && fetched?.email === data.email };
        })
      );
    }

    // Resolve all 150 operations in parallel
    const results = await Promise.all(operations);
    const duration = Date.now() - start;

    console.log(`  [Stats] Dispatched 150 operations in ${duration}ms (Avg: ${(duration / 150).toFixed(1)}ms per op)`);

    // Verify 100% operation success rate
    const failedOps = results.filter((r) => !r.success);
    assert(failedOps.length === 0, `All 150 concurrent transactions completed with 0 errors (Failures: ${failedOps.length})`);

    console.log('\n\x1b[33m%s\x1b[0m', '🔥 STEP 3: Validating Deep Relational Isolation Invariants');

    // Verify standard database only contains its own records
    let standardInvalid = 0;
    await tenantContextStorage.run(standardCtx, async () => {
      const customers = await prismaService.customer.findMany({
        where: { email: { contains: 'concurrency-test.io' } },
      });
      standardInvalid = customers.filter(c => !c.name.includes('(Standard)')).length;
      assert(customers.length === 50, `Standard Database contains exactly 50 concurrent test clients (Found: ${customers.length})`);
    });
    assert(standardInvalid === 0, `Invariance Checked: Zero enterprise data leaked into the Standard database`);

    // Verify Wayne isolated database only contains its own records
    let wayneInvalid = 0;
    await tenantContextStorage.run(wayneCtx, async () => {
      const customers = await prismaService.customer.findMany({
        where: { email: { contains: 'concurrency-test.io' } },
      });
      wayneInvalid = customers.filter(c => !c.name.includes('(Wayne)')).length;
      assert(customers.length === 50, `Wayne Enterprise DB contains exactly 50 isolated clients (Found: ${customers.length})`);
    });
    assert(wayneInvalid === 0, `Invariance Checked: Zero standard/other enterprise data leaked into Wayne DB`);

    // Verify Luthor isolated database only contains its own records
    let luthorInvalid = 0;
    await tenantContextStorage.run(luthorCtx, async () => {
      const customers = await prismaService.customer.findMany({
        where: { email: { contains: 'concurrency-test.io' } },
      });
      luthorInvalid = customers.filter(c => !c.name.includes('(Luthor)')).length;
      assert(customers.length === 50, `Luthor Enterprise DB contains exactly 50 isolated clients (Found: ${customers.length})`);
    });
    assert(luthorInvalid === 0, `Invariance Checked: Zero standard/other enterprise data leaked into Luthor DB`);

    // Cleanup standard concurrent test entries to keep standard DB clean
    console.log('\n  [Cleanup] Purging concurrent client test entries...');
    await tenantContextStorage.run(standardCtx, async () => {
      await prismaService.customer.deleteMany({
        where: { email: { contains: 'concurrency-test.io' } },
      });
    });

  } catch (err: any) {
    console.error(`  \x1b[31m✗ CRITICAL RUNTIME ERROR:\x1b[0m Concurrency runner aborted:`, err);
    failed++;
  } finally {
    // Tear down services and pools gracefully
    console.log('  Tearing down database clients and connection pools...');
    await prismaService.onModuleDestroy();
    await pool.onModuleDestroy();

    // Clean database files
    cleanupTestDbs();
  }

  // Print final test suite summary
  console.log('\n\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🏁 PHASE 6 CONCURRENCY TEST SUMMARY REPORT');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log(`  Total Assertion Assays Performed: ${passed + failed}`);
  console.log(`  Successful Pass Assays Count:     \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed/Breach Assays Count:       \x1b[31m${failed}\x1b[0m\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runConcurrencySandbox();
