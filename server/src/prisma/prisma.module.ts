import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantConnectionPool } from './tenant-connection-pool';

@Global()
@Module({
  providers: [TenantConnectionPool, PrismaService],
  exports: [TenantConnectionPool, PrismaService],
})
export class PrismaModule {}

