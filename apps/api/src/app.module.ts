import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { StreamsModule } from './streams/streams.module';

@Module({
  imports: [
    // Global so `ConfigService` can be injected anywhere without re-importing
    // this module. Prisma 7 stopped reading .env on its own, so this is now the
    // only thing that loads it for the running application.
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StreamsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
