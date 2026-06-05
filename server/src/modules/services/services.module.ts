import { Module } from '@nestjs/common';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MetadataModule } from '../metadata/metadata.module';

@Module({
  imports: [PrismaModule, MetadataModule],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
