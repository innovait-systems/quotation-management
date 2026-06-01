import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { SecretsService } from './secrets.service';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [
    SecretsService,
    {
      provide: AppConfigService,
      useFactory: async (configService: ConfigService) => {
        const appConfig = new AppConfigService(configService);
        await appConfig.initialize();
        return appConfig;
      },
      inject: [ConfigService],
    },
  ],
  exports: [AppConfigService, SecretsService],
})
export class AppConfigModule {}
