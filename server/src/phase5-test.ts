import { SecretsService } from './common/config/secrets.service';
import { TenantConnectionPool } from './prisma/tenant-connection-pool';
import { PrismaService } from './prisma/prisma.service';
import { tenantContextStorage } from './prisma/tenant-context';

import { ConfigService } from '@nestjs/config';
import { SubscriptionPlan, TenantStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// =========================================================================
// MOCK SECRETS MANAGER CLIENT STATE
// =========================================================================
let awsRequestCount = 0;
let awsShouldFail = false;

// =========================================================================
// RUN PHASE 5 TEST SUITE
// =========================================================================
async function runPhase5Tests() {

  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🚀 ANTIGRAVITY ENTERPRISE SYSTEMS: PHASE 5 SCALE-OUT OPERATION TEST SUITE');
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
  // TEST 1: AWS Secrets Manager Double-Layer Caching with 5-Minute TTL
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TEST 1: AWS Secrets Vault Dynamic Caching & Stale-Backup Fallbacks');
  try {
    // 1.1 Development Sandbox Fallback (.env values)
    console.log('  1.1 Initializing SecretsService in DEVELOPMENT mode...');
    const mockDevConfig = new ConfigService({
      NODE_ENV: 'development',
      DATABASE_URL: 'file:./dev.db',
      SUPER_SECURED_API_TOKEN: 'local_env_developer_key',
    });
    const secretsDev = new SecretsService(mockDevConfig);
    await secretsDev.onModuleInit();

    const devToken = await secretsDev.getSecret('SUPER_SECURED_API_TOKEN');
    assert(devToken === 'local_env_developer_key', 'Resolved local .env fallback key in development mode');

    // 1.2 Production AWS Secrets Caching (Layer 1)
    console.log('  1.2 Initializing SecretsService in PRODUCTION mode (AWS Secrets Manager)...');
    const mockProdConfig = new ConfigService({
      NODE_ENV: 'production',
      AWS_SECRET_NAME: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:prod-quotation-secret',
      AWS_REGION: 'us-east-1',
    });
    const secretsProd = new SecretsService(mockProdConfig);
    await secretsProd.onModuleInit();

    // Inject manual client stub for pure standalone non-Jest execution
    (secretsProd as any).client = {
      send: async (command: any) => {
        awsRequestCount++;
        if (awsShouldFail) {
          throw new Error('AWS Secrets Manager service unavailable (Throttled/Network error)');
        }
        return {
          SecretString: JSON.stringify({
            SUPER_SECURED_API_TOKEN: 'live_aws_vault_token_998877',
            PAYMENT_GATEWAY_KEY: 'live_payment_gateway_hash_abc123',
          }),
        };
      }
    };

    awsRequestCount = 0;

    awsShouldFail = false;

    // First request: Cache Miss
    console.log('    Request 1: Resolving payment key (Cache Miss, fetching from AWS)...');
    const prodVal1 = await secretsProd.getSecret('PAYMENT_GATEWAY_KEY');
    assert(prodVal1 === 'live_payment_gateway_hash_abc123', 'Successfully fetched production key from simulated AWS Vault');
    assert(awsRequestCount === 1, 'Verified AWS API network request was dispatched exactly once');

    // Second request: Cache Hit within TTL
    console.log('    Request 2: Re-resolving payment key (Cache Hit)...');
    const prodVal2 = await secretsProd.getSecret('PAYMENT_GATEWAY_KEY');
    assert(prodVal2 === 'live_payment_gateway_hash_abc123', 'Served correct cached credential');
    assert(awsRequestCount === 1, 'Prevented lookup throttling: Served from Layer 1 active memory cache (0 network requests)');

    // 1.3 Simulate TTL Expiry & Active Refresh
    console.log('    Request 3: Simulating 5-minute TTL Expiry...');
    // Artificially age the cache expiry back to 0
    (secretsProd as any).cacheExpiry = 0;
    const prodVal3 = await secretsProd.getSecret('PAYMENT_GATEWAY_KEY');
    assert(prodVal3 === 'live_payment_gateway_hash_abc123', 'Refreshed active credential successfully');
    assert(awsRequestCount === 2, 'Verified new network request was made to refresh expired credentials');

    // 1.4 Layer 2: Stale/Backup Resiliency Cache
    console.log('  1.3 Simulating AWS connection failure/throttling during refresh...');
    // Artificially age cache and set AWS Secrets Manager to fail
    (secretsProd as any).cacheExpiry = 0;
    awsShouldFail = true;

    console.log('    Request 4: Resolving credentials during AWS outage...');
    const prodVal4 = await secretsProd.getSecret('SUPER_SECURED_API_TOKEN');
    assert(prodVal4 === 'live_aws_vault_token_998877', 'Resolved key successfully during simulated AWS network failure');
    assert(
      (secretsProd as any).staleBackupCache.SUPER_SECURED_API_TOKEN === 'live_aws_vault_token_998877',
      'High Availability verified: Served from Layer 2 Stale/Backup memory cache, maintaining 100% uptime!'
    );

  } catch (err: any) {
    console.error(`  \x1b[31m✗ ERROR:\x1b[0m SecretsService tests encountered an issue: ${err.message || err}`);
    failed++;
  }
  console.log();

  // =========================================================================
  // TEST 2: Dynamic Multi-Tenant Database Sharding Router
  // =========================================================================
  console.log('\x1b[33m%s\x1b[0m', '🔥 TEST 2: Multi-Tenant Connection Gateway & DB Isolation (Sharding)');
  try {
    console.log('  Initializing TenantConnectionPool...');
    const pool = new TenantConnectionPool();
    const prismaService = new PrismaService(pool);

    // 2.1 Bootstrapping test metadata in default database
    console.log('  Making sure base database is ready...');
    await prismaService.onModuleInit();

    // Clean up previous test database files
    const prismaDir = path.resolve(process.cwd(), 'prisma');
    const testEnterpriseDbPath = path.join(prismaDir, 'dev-enterprise-stark-corp.db');
    if (fs.existsSync(testEnterpriseDbPath)) {
      try {
        fs.unlinkSync(testEnterpriseDbPath);
        console.log('  Cleaned up stale enterprise test database.');
      } catch (err) {}
    }

    // Clean up stale test data from the shared database to ensure absolute test isolation!
    await prismaService.customer.deleteMany({
      where: {
        email: { in: ['partner@antigravity.com', 'tony@stark.com'] }
      }
    });
    console.log('  Cleaned up stale test customers in standard database.');

    // 2.2 Standard Tenant Routing Verification
    console.log('  2.2 Standard Tenant request: routing to Shared Database Pool...');
    const dbTenant = await prismaService.tenant.findFirst();
    if (!dbTenant) {
      throw new Error('Database not seeded! Please run database seed first.');
    }
    console.log(`    Resolved active standard tenant: ${dbTenant.name} (${dbTenant.slug})`);

    const standardContext = {
      tenantId: dbTenant.id,
      slug: dbTenant.slug,
      plan: 'STARTUP',
    };

    let resolvedClient = pool.getTenantClient(standardContext);
    assert(resolvedClient === null, 'Standard/Startup/Business tenants correctly bypass isolation (routed to shared default pool)');

    // 2.3 Enterprise Tenant Routing Verification
    console.log('  2.3 Enterprise Tenant request: routing to Dedicated Database...');
    const enterpriseContext = {
      tenantId: dbTenant.id,
      slug: 'stark-corp',
      plan: 'ENTERPRISE',
    };

    // Trigger router connection lookup
    const enterpriseClient = pool.getTenantClient(enterpriseContext);
    assert(enterpriseClient !== null, 'Enterprise routing successful: Spinned up dedicated connection instance');
    assert(fs.existsSync(testEnterpriseDbPath), 'Isolated file database (dev-enterprise-stark-corp.db) created dynamically on disk');

    // 2.4 Data Isolation Check
    console.log('  2.4 Verifying perfect transaction isolation across database files...');
    
    // Switch request scope context to Standard Tenant
    console.log('    Writing to STANDARD database context...');
    let createInStandard = false;
    let standardTenantCount = 0;
    
    await tenantContextStorage.run(standardContext, async () => {
      // Create standard customer
      const existingStandardCustomers = await prismaService.customer.findMany();
      standardTenantCount = existingStandardCustomers.length;
      
      const newCustomer = await prismaService.customer.create({
        data: {
          tenantId: dbTenant.id,
          name: 'Antigravity Local Partner',
          email: 'partner@antigravity.com',
          billingAddress: {},
          shippingAddress: {},
        },
      });
      assert(newCustomer.name === 'Antigravity Local Partner', 'Customer added to standard database');
      createInStandard = true;
    });

    assert(createInStandard, 'Successfully completed database writes inside standard tenant scope');

    // Switch request scope context to Enterprise Tenant
    console.log('    Writing to ENTERPRISE isolated database context...');
    let createInEnterprise = false;
    let enterpriseCustomerCount = 0;

    await tenantContextStorage.run(enterpriseContext, async () => {
      // Enterprise customer
      const newEnterpriseCust = await prismaService.customer.create({
        data: {
          tenantId: dbTenant.id,
          name: 'Iron Man Engineering',
          email: 'tony@stark.com',
          billingAddress: {},
          shippingAddress: {},
        },
      });
      assert(newEnterpriseCust.name === 'Iron Man Engineering', 'Customer added to dedicated enterprise database');
      createInEnterprise = true;

      
      const enterpriseCusts = await prismaService.customer.findMany();
      enterpriseCustomerCount = enterpriseCusts.length;
    });

    assert(createInEnterprise, 'Successfully completed database writes inside enterprise tenant scope');

    // Check isolation bounds
    console.log('    Confirming cross-database isolation invariants...');
    
    // In standard database, customer count should be standardTenantCount + 1
    await tenantContextStorage.run(standardContext, async () => {
      const standardCustomers = await prismaService.customer.findMany({
        where: { email: 'tony@stark.com' }
      });
      assert(standardCustomers.length === 0, 'Invariance checked: Enterprise data is NOT present in standard database.');
    });

    // In enterprise database, standard customer should not be present
    await tenantContextStorage.run(enterpriseContext, async () => {
      const standardCustomers = await prismaService.customer.findMany({
        where: { email: 'partner@antigravity.com' }
      });
      assert(standardCustomers.length === 0, 'Invariance checked: Standard data is NOT present in enterprise database.');
    });

    console.log('  Disconnecting databases...');
    await prismaService.onModuleDestroy();
    await pool.onModuleDestroy();

    // Cleanup enterprise test DB file to keep working tree clean
    if (fs.existsSync(testEnterpriseDbPath)) {
      try {
        fs.unlinkSync(testEnterpriseDbPath);
        console.log('  Cleaned up temporary enterprise test database.');
      } catch (err) {}
    }

  } catch (err: any) {
    console.error(`  \x1b[31m✗ ERROR:\x1b[0m Sharding tests encountered an issue: ${err.message || err}`);
    failed++;
  }
  console.log();

  // =========================================================================
  // OVERALL RATIO RESULTS
  // =========================================================================
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🏁 PHASE 5 EXECUTIVE TEST SUMMARY REPORT');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log(`  Total Assertion Assays Performed: ${passed + failed}`);
  console.log(`  Successful Pass Assays Count:     \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed/Breach Assays Count:       \x1b[31m${failed}\x1b[0m`);

  if (failed === 0) {
    console.log('\n  \x1b[42m\x1b[30m STATUS: 100% SUCCESS - ALL HIGH-AVAILABILITY & SHARDING POLICIES VERIFIED \x1b[0m\n');
  } else {
    console.log('\n  \x1b[41m\x1b[30m STATUS: FAILURES DETECTED IN SCALE-OUT ASSAYS \x1b[0m\n');
    process.exit(1);
  }
}

// Mock system environment variables & run
process.env.NODE_ENV = 'production';
runPhase5Tests();
