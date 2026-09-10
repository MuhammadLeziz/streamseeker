import type { StreamCategory } from './category.js';
import type { Region } from './region.js';

/**
 * State of a YouTube stream. Written by the backend liveness check; the front
 * end only reads it.
 *
 * The original site tracks no status at all, so over time a share of its map
 * points lead to deleted videos. Here dead streams drop out on their own.
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
  /** YouTube video id, 11 characters. */
  readonly youtubeVideoId: string;
  readonly category: StreamCategory;
  readonly location: IGeoPoint;
  readonly city: string | null;
  /** ISO 3166-1 alpha-2, upper case. */
  readonly countryCode: string;
  /** Derived from `countryCode`, never stored. */
  readonly regions: readonly Region[];
  /** IANA time zone, e.g. `Asia/Riyadh`, used to show local time at the camera. */
  readonly timezone: string | null;
  readonly tags: readonly string[];
  readonly status: StreamStatus;
  /** ISO-8601 timestamp of the last liveness check. */
  readonly lastCheckedAt: string | null;
  readonly viewerCount: number | null;
  /** Manual promotion in listings. */
  readonly featured: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Query parameters for the stream list. */
export interface IStreamFilter {
  readonly categories?: readonly StreamCategory[];
  readonly regions?: readonly Region[];
  readonly countryCodes?: readonly string[];
  readonly statuses?: readonly StreamStatus[];
  /** Matches title, city and tags. */
  readonly search?: string;
  /** Visible map area: south, west, north, east. */
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
 * Pulls the video id out of any YouTube link shape: `watch?v=`, `youtu.be/`,
 * `embed/` and `live/`. Lets the admin form accept a pasted URL as it is.
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
