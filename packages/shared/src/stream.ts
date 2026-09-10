import type { StreamCategory } from './category.js';
import type { Region } from './region.js';

/**
 * Состояние YouTube-эфира. Проставляется фоновой проверкой на бэкенде,
 * фронтенд его только читает.
 *
 * Оригинальный сайт статусы не отслеживает, поэтому со временем часть точек
 * там ведёт на удалённые видео. У нас мёртвые эфиры отсеиваются автоматически.
 */
export const STREAM_STATUSES = ['live', 'offline', 'unavailable', 'unchecked'] as const;

export type StreamStatus = (typeof STREAM_STATUSES)[number];

export interface IGeoPoint {
  readonly lat: number;
  readonly lng: number;
}

export interface IStream {
  readonly id: string;
  readonly title: string;
  readonly description: string | null;
  /** ID видео на YouTube, 11 символов. */
  readonly youtubeVideoId: string;
  readonly category: StreamCategory;
  readonly location: IGeoPoint;
  readonly city: string | null;
  /** ISO 3166-1 alpha-2, в верхнем регистре. */
  readonly countryCode: string;
  /** Выводится из `countryCode`, в базе не хранится. */
  readonly regions: readonly Region[];
  /** IANA-таймзона, например `Asia/Riyadh` — нужна, чтобы показать местное время точки. */
  readonly timezone: string | null;
  readonly tags: readonly string[];
  readonly status: StreamStatus;
  /** ISO-8601, момент последней проверки статуса. */
  readonly lastCheckedAt: string | null;
  readonly viewerCount: number | null;
  /** Ручной приоритет в выдаче: чем больше, тем выше. */
  readonly featured: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Параметры запроса списка трансляций. */
export interface IStreamFilter {
  readonly categories?: readonly StreamCategory[];
  readonly regions?: readonly Region[];
  readonly countryCodes?: readonly string[];
  readonly statuses?: readonly StreamStatus[];
  /** Поиск по названию, городу и тегам. */
  readonly search?: string;
  /** Видимая область карты: юг, запад, север, восток. */
  readonly bounds?: IMapBounds;
}

export interface IMapBounds {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
}

export interface IStreamListResponse {
  readonly items: readonly IStream[];
  readonly total: number;
}

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function isValidYoutubeVideoId(value: string): boolean {
  return YOUTUBE_VIDEO_ID.test(value);
}

/**
 * Достаёт ID видео из любой формы ссылки YouTube: `watch?v=`, `youtu.be/`,
 * `embed/` и `live/`. Нужно, чтобы в админку можно было вставить URL целиком.
 */
export function extractYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (isValidYoutubeVideoId(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const candidate = url.pathname.slice(1);
    return isValidYoutubeVideoId(candidate) ? candidate : null;
  }

  if (host !== 'youtube.com' && host !== 'm.youtube.com' && host !== 'music.youtube.com') {
    return null;
  }

  const fromQuery = url.searchParams.get('v');
  if (fromQuery && isValidYoutubeVideoId(fromQuery)) {
    return fromQuery;
  }

  const match = /^\/(?:embed|live|shorts)\/([A-Za-z0-9_-]{11})$/.exec(url.pathname);
  return match?.[1] ?? null;
}
