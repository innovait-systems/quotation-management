import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextPayload } from './tenant-context';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TenantConnectionPool implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionPool.name);
  private readonly clients = new Map<string, PrismaClient>();
  private readonly baseDatabaseUrl = process.env.DATABASE_URL;

  getTenantClient(context: TenantContextPayload | undefined): PrismaClient | null {
    if (!context) {
      return null;
    }

    const { slug, plan } = context;

    // Standard/Startup/Business plans route to the default shared pool (resolved outside)
    if (plan !== 'ENTERPRISE') {
      return null;
    }

    // Cached enterprise client check
    if (this.clients.has(slug)) {
      return this.clients.get(slug)!;
    }

    const isPg = this.baseDatabaseUrl?.startsWith('postgres') || this.baseDatabaseUrl?.startsWith('postgresql');

    if (isPg) {
      // In PostgreSQL (Supabase/Vercel production), we can deploy under shared database column-level filtering
      // or dynamic separate PostgreSQL schemas.
      const mode = process.env.MULTITENANT_MODE || 'shared';
      if (mode === 'shared') {
        this.logger.log(`PostgreSQL shared database mode active for ENTERPRISE tenant: "${slug}". Routing queries to the main shared database pool.`);
        return null; // Returning null falls back to main client
      }

      this.logger.log(`Spinning up dedicated database connection pool for PostgreSQL ENTERPRISE tenant: "${slug}"`);

      let tenantUrl = this.baseDatabaseUrl!;
      try {
        const urlObj = new URL(this.baseDatabaseUrl!);
        urlObj.searchParams.set('schema', `enterprise_${slug}`);
        tenantUrl = urlObj.toString();
      } catch (err) {
        this.logger.error(`Failed to parse base DATABASE_URL for Postgres schema tenant routing`, err);
      }

      const client = new PrismaClient({
        datasources: {
          db: {
            url: tenantUrl,
          },
        },
        log: [
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'info' },
          { emit: 'stdout', level: 'warn' },
        ],
      });

      client.$connect()
        .then(() => this.logger.log(`Successfully connected dedicated database pool for PostgreSQL ENTERPRISE tenant: "${slug}" (schema: enterprise_${slug})`))
        .catch((err) => this.logger.error(`Failed to establish connection for PostgreSQL ENTERPRISE tenant: "${slug}"`, err));

      this.clients.set(slug, client);
      return client;
    }

    // SQLite local dev fallback (remains unchanged and fully functional)
    this.logger.log(`Spinning up dedicated database connection pool for ENTERPRISE tenant: "${slug}"`);

    const prismaDir = path.resolve(process.cwd(), 'prisma');
    const defaultDbPath = path.join(prismaDir, 'dev.db');
    const enterpriseDbPath = path.join(prismaDir, `dev-enterprise-${slug}.db`);

    if (!fs.existsSync(enterpriseDbPath)) {
      this.logger.log(`Creating isolated database for enterprise tenant: ${enterpriseDbPath}`);
      try {
        if (fs.existsSync(defaultDbPath)) {
          fs.copyFileSync(defaultDbPath, enterpriseDbPath);
          this.logger.log(`Successfully bootstrapped isolated database for ${slug}.`);
        } else {
          this.logger.warn(`Default database file dev.db not found at ${defaultDbPath}. A brand new SQLite file will be created by Prisma.`);
        }
      } catch (err) {
        this.logger.error(`Failed to copy dev.db to isolated enterprise database for ${slug}`, err);
      }
    }

    const client = new PrismaClient({
      datasources: {
        db: {
          url: `file:./dev-enterprise-${slug}.db`,
        },
      },
      log: [
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
      ],
    });

    client.$connect()
      .then(() => this.logger.log(`Successfully connected dedicated database pool for ENTERPRISE tenant: "${slug}"`))
      .catch((err) => this.logger.error(`Failed to establish connection for ENTERPRISE tenant: "${slug}"`, err));

    this.clients.set(slug, client);
    return client;
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting all active enterprise client database pools...');
    for (const [slug, client] of this.clients.entries()) {
      try {
        await client.$disconnect();
        this.logger.log(`Disconnected client database pool for ${slug}.`);
      } catch (err) {
        this.logger.error(`Error disconnecting client database pool for ${slug}`, err);
      }
    }
    this.clients.clear();
  }
}
