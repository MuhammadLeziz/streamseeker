import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service';

/**
 * Global so that feature modules can inject `PrismaService` without importing
 * this module each time. There is exactly one database, so there is nothing to
 * gain from scoping it.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
