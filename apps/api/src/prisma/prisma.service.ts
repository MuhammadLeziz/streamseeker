import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

/**
 * The Prisma client as an injectable singleton.
 *
 * Prisma 7 talks to the database through a driver adapter rather than its own
 * Rust engine, so the connection string is handed to `PrismaPg` here instead of
 * being read out of schema.prisma.
 *
 * The point of `onModuleInit` here is to fail at startup, where a wrong
 * `DATABASE_URL` is obvious, rather than on the first request of the day.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();

    // The pg pool opens connections lazily, so $connect on its own proves
    // nothing: the server boots happily with no database behind it. One
    // trivial query is what actually settles the question.
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
