/**
 * Turns data/streams.seed.json into a static catalogue for the front end.
 *
 * A stand-in for the backend: until apps/api exists, Angular reads the JSON
 * straight from public/. Once NestJS lands this moves into the Prisma seeder
 * and the response shape stays the same, so the front end needs no change.
 *
 * With `--check` it also asks YouTube about every entry before writing. See
 * `checkEmbeddable` below for what that does and does not prove.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isStreamCategory, regionsOfCountry } from '../packages/shared/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'data/streams.seed.json');
const target = resolve(root, 'apps/web/public/streams.json');

const check = process.argv.includes('--check');

/** Politeness towards a free endpoint we are not authenticated against. */
const CHECK_CONCURRENCY = 4;
const CHECK_TIMEOUT_MS = 10_000;

/**
 * Asks YouTube whether a video exists and may be embedded.
 *
 * oembed needs no API key, which is the whole reason this is possible at all.
 * What it answers is narrow: 200 means the video is there and embedding is
 * allowed, 401 means the owner has forbidden embedding, 404 means it is gone.
 * It says nothing about whether a live stream is live *now* — that needs the
 * Data API and a key.
 *
 * So a pass leaves the status alone rather than claiming `live`, and only a
 * failure is recorded. The negative is the useful half anyway: a curated map
 * rots by accumulating dead points, and this is what catches them. It already
 * has — a St Petersburg camera that looked perfect in search results turned out
 * to return 401, and would have been a black rectangle on the map.
 */
async function checkEmbeddable(videoId) {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    `https://www.youtube.com/watch?v=${videoId}`,
  )}&format=json`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    if (response.ok) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: response.status === 401 ? 'embedding not allowed' : `HTTP ${response.status}`,
    };
  } catch (error) {
    // A network failure is not evidence about the video, so it must not be
    // recorded as one. It fails the run instead.
    return { ok: false, unreachable: true, reason: error.message };
  }
}

/** Runs `worker` over `items` a few at a time rather than all at once. */
async function mapWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

const { streams } = JSON.parse(readFileSync(source, 'utf8'));
const now = new Date().toISOString();
const seenIds = new Set();

const items = streams.map((raw, index) => {
  if (!isStreamCategory(raw.category)) {
    throw new Error(`Unknown category "${raw.category}" in entry #${index + 1}`);
  }
  if (seenIds.has(raw.youtubeVideoId)) {
    throw new Error(`Duplicate videoId ${raw.youtubeVideoId} in entry #${index + 1}`);
  }
  seenIds.add(raw.youtubeVideoId);

  const regions = regionsOfCountry(raw.countryCode);
  if (regions.length === 0) {
    // Not fatal — the map still draws the pin — but a country nothing maps to
    // is invisible to every region filter, which is always a mistake in the
    // data rather than a decision.
    console.warn(`  ! ${raw.countryCode} belongs to no region: ${raw.title}`);
  }

  return {
    id: raw.youtubeVideoId,
    title: raw.title,
    description: raw.description ?? null,
    youtubeVideoId: raw.youtubeVideoId,
    category: raw.category,
    location: raw.location,
    city: raw.city ?? null,
    countryCode: raw.countryCode.toUpperCase(),
    regions,
    timezone: raw.timezone ?? null,
    tags: raw.tags ?? [],
    // Real liveness is the backend cron's job and needs an API key. --check
    // can only ever downgrade this to `unavailable`.
    status: 'unchecked',
    lastCheckedAt: null,
    viewerCount: null,
    featured: Boolean(raw.featured),
    createdAt: now,
    updatedAt: now,
  };
});

if (check) {
  console.log(`Checking ${items.length} streams against YouTube...`);

  const results = await mapWithLimit(items, CHECK_CONCURRENCY, (item) =>
    checkEmbeddable(item.youtubeVideoId),
  );

  const dead = [];
  const unreachable = [];

  results.forEach((result, index) => {
    const item = items[index];
    if (result.ok) {
      item.lastCheckedAt = now;
      return;
    }
    if (result.unreachable) {
      unreachable.push(`${item.youtubeVideoId} ${item.title}: ${result.reason}`);
      return;
    }

    item.status = 'unavailable';
    item.lastCheckedAt = now;
    dead.push(`${item.youtubeVideoId} ${item.title}: ${result.reason}`);
  });

  if (unreachable.length > 0) {
    console.error('Could not reach YouTube for:');
    unreachable.forEach((line) => console.error(`  ${line}`));
    console.error(
      'Nothing was marked unavailable on the strength of a failed request. ' +
        'If this machine reaches the internet through a proxy, run the check ' +
        'as `npm run check:catalogue`, which passes --use-env-proxy to Node.',
    );
    process.exit(2);
  }

  if (dead.length > 0) {
    console.error(`${dead.length} stream(s) cannot be embedded:`);
    dead.forEach((line) => console.error(`  ${line}`));
  } else {
    console.log('All streams exist and allow embedding.');
  }
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ items, total: items.length }, null, 2) + '\n');

console.log(`Catalogue built: ${items.length} streams -> ${target}`);

// Only after the catalogue is written: a dead entry is still worth having on
// disk marked `unavailable`, and the non-zero exit is for whoever is curating.
if (check && items.some((item) => item.status === 'unavailable')) {
  process.exit(1);
}
