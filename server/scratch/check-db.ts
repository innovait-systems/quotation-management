import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const tenants = await prisma.tenant.findMany();
    console.log('--- TENANTS IN DATABASE ---');
    console.log(tenants);
    console.log('---------------------------');
  } catch (error: any) {
    console.error('Error querying database:', error.message || error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
