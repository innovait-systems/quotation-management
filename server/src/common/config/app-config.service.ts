import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

@Injectable()
export class AppConfigService {
  private readonly logger = new Logger(AppConfigService.name);
  private secretsCache: Record<string, string> = {};
  private isLoaded = false;

  constructor(private readonly configService: ConfigService) {}

  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const secretArn = this.configService.get<string>('AWS_SECRET_NAME');

    if (nodeEnv === 'production' && secretArn) {
      this.logger.log(`Production detected. Loading AWS secrets from: ${secretArn}`);
      try {
        const client = new SecretsManagerClient({
          region: this.configService.get<string>('AWS_REGION', 'us-east-1'),
        });
        const command = new GetSecretValueCommand({ SecretId: secretArn });
        const response = await client.send(command);

        if (response.SecretString) {
          this.secretsCache = JSON.parse(response.SecretString);
          this.logger.log('Successfully loaded and cached AWS secrets.');
        } else {
          this.logger.warn('AWS Secrets Manager returned empty secret string.');
        }
      } catch (error) {
        this.logger.error('Failed to load secrets from AWS Secrets Manager', error);
        throw error;
      }
    } else {
      this.logger.log('Local environment detected. Relying on local .env variables.');
    }

    this.isLoaded = true;
  }

  get<T = string>(key: string, defaultValue?: T): T {
    // 1. Check AWS secret cache first
    if (key in this.secretsCache) {
      const val = this.secretsCache[key];
      return val as unknown as T;
    }
    // 2. Fall back to standard process.env / Nest config
    return this.configService.get<T>(key, defaultValue as unknown as T);
  }
}
