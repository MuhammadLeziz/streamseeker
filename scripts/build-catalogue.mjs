/**
 * Собирает data/streams.seed.json в статический каталог для фронтенда.
 *
 * Временная замена бэкенду: пока нет apps/api, Angular забирает готовый
 * JSON из public/. Когда появится NestJS, скрипт уедет в сидер Prisma,
 * а формат ответа останется тем же — фронт менять не придётся.
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
    throw new Error(`Неизвестная категория "${raw.category}" у записи #${index + 1}`);
  }
  if (seenIds.has(raw.youtubeVideoId)) {
    throw new Error(`Дубликат videoId ${raw.youtubeVideoId} у записи #${index + 1}`);
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
    // Статус проставит бэкенд, когда появится проверка живости.
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

console.log(`Каталог собран: ${items.length} трансляций -> ${target}`);
