/**
 * Loads data/streams.seed.json into the database.
 *
 * The same file already feeds scripts/build-catalogue.mjs, which writes the
 * static JSON the front end reads today. Both readers stay for now: the hand
 * curated file is the source of truth, the database is one consumer of it, and
 * the static build is the other until the front end is pointed at the API.
 *
 * Seeding is idempotent. Entries are matched on their YouTube video id, so
 * running it twice updates rather than duplicates, and the liveness fields the
 * backend owns are left alone on rows that already exist.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { isStreamCategory } from '@streamseeker/shared';
import type { StreamCategory } from '@streamseeker/shared';

interface ISeedStream {
  youtubeVideoId: string;
  title: string;
  description?: string;
  category: string;
  location: { lat: number; lng: number };
  city?: string;
  countryCode: string;
  timezone?: string;
  tags?: string[];
  featured?: boolean;
  sourceChannel?: string;
}

const SEED_FILE = resolve(__dirname, '../../../data/streams.seed.json');

const prisma = new PrismaClient();

function readSeed(): ISeedStream[] {
  const { streams } = JSON.parse(readFileSync(SEED_FILE, 'utf8')) as { streams: ISeedStream[] };
  const seen = new Set<string>();

  streams.forEach((entry, index) => {
    if (!isStreamCategory(entry.category)) {
      throw new Error(`Unknown category "${entry.category}" in entry #${index + 1}`);
    }
    if (seen.has(entry.youtubeVideoId)) {
      throw new Error(`Duplicate videoId ${entry.youtubeVideoId} in entry #${index + 1}`);
    }
    seen.add(entry.youtubeVideoId);
  });

  return streams;
}

async function main(): Promise<void> {
  const streams = readSeed();

  for (const entry of streams) {
    const tags = entry.tags ?? [];
    const fields = {
      title: entry.title,
      description: entry.description ?? null,
      category: entry.category as StreamCategory,
      lat: entry.location.lat,
      lng: entry.location.lng,
      city: entry.city ?? null,
      countryCode: entry.countryCode.toUpperCase(),
      timezone: entry.timezone ?? null,
      featured: Boolean(entry.featured),
      sourceChannel: entry.sourceChannel ?? null,
    };

    await prisma.stream.upsert({
      where: { youtubeVideoId: entry.youtubeVideoId },
      create: {
        youtubeVideoId: entry.youtubeVideoId,
        ...fields,
        tags: { create: tags.map((value) => ({ value })) },
      },
      update: {
        ...fields,
        // Tags are replaced wholesale rather than diffed. The seed file is the
        // authority on them, and a removed tag has to actually disappear.
        tags: { deleteMany: {}, create: tags.map((value) => ({ value })) },
      },
    });
  }

  const total = await prisma.stream.count();
  console.log(`Seeded ${streams.length} streams from the catalogue; ${total} rows in total.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
