import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProtectedModule } from './protected/protected.module';
import { CustomersModule } from './customers/customers.module';
import { ContactsModule } from './contacts/contacts.module';
import { OpportunitiesModule } from './opportunities/opportunities.module';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ProtectedModule,
    CustomersModule,
    ContactsModule,
    OpportunitiesModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
