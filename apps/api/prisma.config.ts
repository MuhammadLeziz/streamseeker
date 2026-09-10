/**
 * Prisma 7 moved the connection URL out of schema.prisma: the schema now
 * describes only the shape of the data, and anything environment-specific
 * lives here.
 */
// Prisma 7 no longer reads .env by itself, and the CLI runs outside Nest, so
// nothing else would load it here.
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node --project tsconfig.json prisma/seed.ts',
  },
});
