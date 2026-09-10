import { $Enums } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { STREAM_CATEGORIES, STREAM_STATUSES, regionsOfCountry } from '@world-watcher/shared';
import type { IStream } from '@world-watcher/shared';

/** A stream row with its tags joined, which is the only shape we ever read. */
export type StreamRow = Prisma.StreamGetPayload<{ include: { tags: true } }>;

/**
 * schema.prisma and packages/shared each hold their own copy of the category
 * and status lists, because Prisma generates PostgreSQL enum types and cannot
 * read TypeScript. Checking them against each other at import time turns a
 * silent drift into a startup failure with a name in it.
 */
function assertEnumsAgree(
  name: string,
  prismaValues: string[],
  sharedValues: readonly string[],
): void {
  const missing = sharedValues.filter((value) => !prismaValues.includes(value));
  const extra = prismaValues.filter((value) => !sharedValues.includes(value));

  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${name} has drifted between schema.prisma and packages/shared. ` +
        `Missing from Prisma: [${missing.join(', ')}]. Missing from shared: [${extra.join(', ')}].`,
    );
  }
}

assertEnumsAgree('StreamCategory', Object.values($Enums.StreamCategory), STREAM_CATEGORIES);
assertEnumsAgree('StreamStatus', Object.values($Enums.StreamStatus), STREAM_STATUSES);

/**
 * Turns a database row into the shape the front end already reads.
 *
 * `regions` is computed here rather than stored. Whether a country counts as
 * CIS or as part of the Muslim world is a fact about the country, so keeping it
 * in the row would mean rewriting every row of a country to correct one list.
 */
export function toStream(row: StreamRow): IStream {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    youtubeVideoId: row.youtubeVideoId,
    category: row.category,
    location: { lat: row.lat, lng: row.lng },
    city: row.city,
    countryCode: row.countryCode,
    regions: regionsOfCountry(row.countryCode),
    timezone: row.timezone,
    tags: row.tags.map((tag) => tag.value),
    status: row.status,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    viewerCount: row.viewerCount,
    featured: row.featured,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
