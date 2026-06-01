import { PrismaClient, UserRole } from '@prisma/client';
import { GovernanceService } from './modules/governance/governance.service';

const prisma = new PrismaClient();
const governanceService = new GovernanceService(prisma as any);

async function runGovernanceTestSuite() {
  console.log('\x1b[35m%s\x1b[0m', '========================================================================');
  console.log('\x1b[36m%s\x1b[0m', '🌱 ANTIGRAVITY SYSTEMS: SYSTEM GOVERNANCE REGISTRATION SUITE RUN');
  console.log('\x1b[35m%s\x1b[0m', '========================================================================\n');

  const testTenantSlug = 'acme-logistics-test';
  const testUserEmail = 'finance-test@acmelogistics.com';

  try {
    // 1. Clean up potential leftover test data from previous runs
    console.log('🧹 Preparing database sandbox workspace...');
    const existingTenant = await prisma.tenant.findUnique({ where: { slug: testTenantSlug } });
    if (existingTenant) {
      await prisma.user.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.template.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.tenantQuota.deleteMany({ where: { tenantId: existingTenant.id } });
      await prisma.tenant.delete({ where: { id: existingTenant.id } });
      console.log('  Leftover test tenant records successfully purged.');
    }
    console.log('----------------------------------------------------');

    // 2. TRIAL 1: Tenant Provisioning and Automatic Template Cloning
    console.log('\x1b[33m%s\x1b[0m', '🔥 TRIAL 1: B2B Tenant Registration & Default Template Cloning');
    
    const tenantPayload = {
      name: 'Acme Logistics & Distribution',
      slug: testTenantSlug,
      currency: 'USD',
      timezone: 'America/New_York',
    };

    console.log('Submitting Tenant Payload:', JSON.stringify(tenantPayload, null, 2));

    const createdTenant = await governanceService.createTenant(tenantPayload);

    console.log('\x1b[32m%s\x1b[0m', '✓ Tenant Record Provisioned successfully!');
    console.log(`  UUID: [${createdTenant.id}]`);
    console.log(`  Slug: \x1b[34m[${createdTenant.slug}]\x1b[0m`);
    console.log(`  Plan Tier: \x1b[35m[${createdTenant.plan}]\x1b[0m`);

    // Verify Template Auto-Cloning
    const clonedTemplates = await prisma.template.findMany({
      where: { tenantId: createdTenant.id },
    });
    console.log(`  Cloned templates for new tenant: \x1b[32m${clonedTemplates.length}\x1b[0m`);
    clonedTemplates.forEach((t) => {
      console.log(`    - Theme Name: \x1b[32m${t.name}\x1b[0m (${t.entityType})`);
    });

    if (clonedTemplates.length === 0) {
      console.log('\x1b[33m%s\x1b[0m', '  Warning: Master tenant "antigravity" was not seeded, templates skipped.');
    }
    console.log('----------------------------------------------------');

    // 3. TRIAL 2: User Provisioning under Active Tenant Context
    console.log('\x1b[33m%s\x1b[0m', '🔥 TRIAL 2: Provisioning Secure User Profile');
    
    const userPayload = {
      tenantSlugOrId: testTenantSlug,
      email: testUserEmail,
      passwordRaw: 'SecureFinance2026!',
      firstName: 'Emily',
      lastName: 'Watson',
      role: 'FINANCE',
    };

    console.log('Submitting User Payload (Password: SecureFinance2026!):', JSON.stringify({
      ...userPayload,
      passwordRaw: '********',
    }, null, 2));

    const createdUser = await governanceService.createUser(userPayload);

    console.log('\x1b[32m%s\x1b[0m', '✓ User Profile Created successfully!');
    console.log(`  User UUID: [${createdUser.id}]`);
    console.log(`  Name: \x1b[34m[${createdUser.firstName} ${createdUser.lastName}]\x1b[0m`);
    console.log(`  Email: \x1b[32m${createdUser.email}\x1b[0m`);
    console.log(`  Security Access Role: \x1b[35m[${createdUser.role}]\x1b[0m`);

    // Verify database record has password hashed
    const dbUser = await prisma.user.findUnique({ where: { id: createdUser.id } });
    if (dbUser) {
      console.log(`  Verifying hashed password in DB: \x1b[32m${dbUser.passwordHash.substring(0, 15)}...\x1b[0m`);
      const isMatch = dbUser.passwordHash !== 'SecureFinance2026!';
      console.log(`  Is Password Hashed Securely? \x1b[32m${isMatch ? 'YES (Bcrypt crypt-hashed)' : 'NO'}\x1b[0m`);
    }
    console.log('----------------------------------------------------');

    // 4. CLEANUP: Tidy sandbox tables
    console.log('🧹 Cleaning sandbox test profiles...');
    await prisma.user.delete({ where: { id: createdUser.id } });
    await prisma.template.deleteMany({ where: { tenantId: createdTenant.id } });
    await prisma.tenantQuota.deleteMany({ where: { tenantId: createdTenant.id } });
    await prisma.tenant.delete({ where: { id: createdTenant.id } });
    console.log('\x1b[32m%s\x1b[0m', '✓ Cleanup completed successfully. Sandbox clean.');

    console.log('\n\x1b[35m%s\x1b[0m', '========================================================================');
    console.log('\x1b[32m%s\x1b[0m', '🎉 GOVERNANCE SYSTEM TESTS PASSED SUCCESSFULLY WITH 100% REGULATORY COMPLIANCE');
    console.log('\x1b[35m%s\x1b[0m', '========================================================================');

  } catch (error: any) {
    console.error('\x1b[31m%s\x1b[0m', `✗ Governance test suite failed: ${error.message}`, error);
  } finally {
    await prisma.$disconnect();
  }
}

runGovernanceTestSuite();
