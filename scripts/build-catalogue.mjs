/**
 * Turns data/streams.seed.json into a static catalogue for the front end.
 *
 * A stand-in for the backend: until apps/api exists, Angular reads the JSON
 * straight from public/. Once NestJS lands this moves into the Prisma seeder
 * and the response shape stays the same, so the front end needs no change.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isStreamCategory, regionsOfCountry } from '../packages/shared/dist/index.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'data/streams.seed.json');
const target = resolve(root, 'apps/web/public/streams.json');

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

  return {
    id: raw.youtubeVideoId,
    title: raw.title,
    description: raw.description ?? null,
    youtubeVideoId: raw.youtubeVideoId,
    category: raw.category,
    location: raw.location,
    city: raw.city ?? null,
    countryCode: raw.countryCode.toUpperCase(),
    regions: regionsOfCountry(raw.countryCode),
    timezone: raw.timezone ?? null,
    tags: raw.tags ?? [],
    // Status is filled in by the backend once the liveness check exists.
    status: 'unchecked',
    lastCheckedAt: null,
    viewerCount: null,
    featured: Boolean(raw.featured),
    createdAt: now,
    updatedAt: now,
  };
});

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify({ items, total: items.length }, null, 2) + '\n');

console.log(`Catalogue built: ${items.length} streams -> ${target}`);
