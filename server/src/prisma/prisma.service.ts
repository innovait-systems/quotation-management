import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantConnectionPool } from './tenant-connection-pool';
import { tenantContextStorage } from './tenant-context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly connectionPool: TenantConnectionPool;

  constructor(connectionPool: TenantConnectionPool) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./dev.db',
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
    this.connectionPool = connectionPool;

    // Delete the environment variable permanently from process.env in a robust, case-insensitive way on Windows
    Object.keys(process.env).forEach(key => {
      if (key.toUpperCase() === 'DATABASE_URL') {
        delete process.env[key];
      }
    });

    // Return a Proxy that wraps PrismaService to dynamically route queries to standard/enterprise pools
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        // 1. Resolve current tenant store context from AsyncLocalStorage
        const context = tenantContextStorage.getStore();
        
        // 2. If an enterprise tenant is active, delegate query to enterprise database pool
        if (context && context.plan === 'ENTERPRISE') {
          const tenantClient = this.connectionPool.getTenantClient(context);
          if (tenantClient) {
            const value = Reflect.get(tenantClient, prop);
            if (typeof value === 'function') {
              return value.bind(tenantClient);
            }
            return value;
          }
        }

        // 3. Otherwise, fall back to standard connection (this instance)
        const value = Reflect.get(target, prop, receiver);
        if (typeof value === 'function') {
          return value.bind(target);
        }
        return value;
      },
    });
  }

  async onModuleInit() {
    this.logger.log('Database connecting...');
    try {
      await this.$connect();
      this.logger.log('Database connection successfully established.');
    } catch (error) {
      this.logger.error('Failed to establish database connection on startup', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    this.logger.log('Database disconnecting...');
    await this.$disconnect();
  }
}

