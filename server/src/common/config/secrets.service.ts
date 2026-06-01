import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecretsService implements OnModuleInit {
  private readonly logger = new Logger(SecretsService.name);
  private client: SecretsManagerClient | null = null;
  
  // Layer 1: Active in-memory cache
  private activeCache: Record<string, string> = {};
  private cacheExpiry = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minutes TTL

  // Layer 2: Persistent stale / fallback cache (in case of AWS rate limit or network error)
  private staleBackupCache: Record<string, string> = {};

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const secretName = this.config.get<string>('AWS_SECRET_NAME');
    const region = this.config.get<string>('AWS_REGION', 'us-east-1');
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');

    if (secretName && nodeEnv === 'production') {
      this.logger.log(`Initializing AWS Secrets Manager Client in region: ${region} for secret: ${secretName}`);
      this.client = new SecretsManagerClient({ region });
    } else {
      this.logger.log('SecretsService fallback: Utilizing standard local environment config (.env).');
    }
  }

  /**
   * Retrieves a secret value by key.
   * Leverages a double-layer memory cache:
   * - Layer 1: Active Cache (checks if TTL is valid)
   * - Layer 2: Stale/Backup Cache (falls back if AWS request fails / throttled after TTL)
   * - Final Fallback: ConfigService (.env variables)
   */
  async getSecret(key: string): Promise<string> {
    const now = Date.now();

    // 1. If in development or AWS Client is not configured, resolve from .env
    if (!this.client) {
      return this.config.get<string>(key) || '';
    }

    // 2. Layer 1 Check: Active cache lookup (if still within TTL)
    if (this.activeCache[key] !== undefined && now < this.cacheExpiry) {
      return this.activeCache[key];
    }

    // 3. TTL Expired or Cache Miss: Fetch updated secrets from AWS Secrets Manager
    try {
      this.logger.log(`Cache miss or expired TTL for secret key "${key}". Contacting AWS Secrets Manager...`);
      const secretName = this.config.get<string>('AWS_SECRET_NAME');
      const command = new GetSecretValueCommand({ SecretId: secretName });
      
      const response = await this.client.send(command);
      
      if (response.SecretString) {
        const parsed = JSON.parse(response.SecretString);
        
        // Update Layer 1 Cache and update TTL expiry
        this.activeCache = parsed;
        this.cacheExpiry = now + this.CACHE_TTL_MS;
        
        // Update Layer 2 Cache (stale/backup cache)
        this.staleBackupCache = { ...parsed };
        
        this.logger.log('Successfully refreshed secrets cache from AWS Secrets Manager.');
        return this.activeCache[key] || '';
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to retrieve secrets from AWS Secrets Manager: ${err.message || err}. ` +
        `Initiating Layer 2 dynamic fallback...`
      );

      // Layer 2 Fallback: serve stale value from persistent backup cache
      if (this.staleBackupCache[key] !== undefined) {
        this.logger.warn(`Serving stale backup cache value for key "${key}" to prevent service interruption.`);
        return this.staleBackupCache[key];
      }
    }

    // 4. Final Fallback: Retrieve from local .env variables
    this.logger.warn(`Final fallback: Fetching key "${key}" from local environment variables.`);
    return this.config.get<string>(key) || '';
  }
}
