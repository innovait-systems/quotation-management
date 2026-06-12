import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './common/config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { FormulaModule } from './common/formula/formula.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { AuthModule } from './modules/auth/auth.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ExportsModule } from './modules/exports/exports.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { AiModule } from './modules/ai/ai.module';
import { BillingModule } from './modules/billing/billing.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { ServicesModule } from './modules/services/services.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AgreementsModule } from './modules/agreements/agreements.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { TenantContextMiddleware } from './prisma/tenant-context.middleware';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpCacheInterceptor } from './common/interceptors/http-cache.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    FormulaModule,
    MetadataModule,
    AuthModule,
    QuotationsModule,
    InvoicesModule,
    ExportsModule,
    PurchaseOrdersModule,
    AiModule,
    BillingModule,
    ComplianceModule,
    ServicesModule,
    GovernanceModule,
    CustomersModule,
    AgreementsModule,
    TemplatesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor,
    },
  ],
  exports: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }
}




