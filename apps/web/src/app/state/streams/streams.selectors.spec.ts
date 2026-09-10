import type { IStream } from '@world-watcher/shared';

import { selectVisibleStreams } from './streams.selectors';
import { streamsAdapter, type IStreamsState } from './streams.reducer';

function makeStream(overrides: Partial<IStream> & Pick<IStream, 'id' | 'title'>): IStream {
  return {
    description: null,
    youtubeVideoId: overrides.id,
    category: 'mosque',
    location: { lat: 0, lng: 0 },
    city: null,
    countryCode: 'SA',
    regions: ['middle-east'],
    timezone: null,
    tags: [],
    status: 'unchecked',
    lastCheckedAt: null,
    viewerCount: null,
    featured: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const haram = makeStream({
  id: 'a',
  title: 'Masjid al-Haram',
  city: 'Mecca',
  tags: ['kaaba'],
});

const nabawi = makeStream({
  id: 'b',
  title: 'Masjid an-Nabawi',
  city: 'Medina',
  tags: ['ziyarat'],
});

function stateWith(search: string): IStreamsState {
  return streamsAdapter.setAll([haram, nabawi], {
    ...streamsAdapter.getInitialState(),
    status: 'loaded',
    error: null,
    filters: { categories: [], regions: [], search, liveOnly: false },
    selectedId: null,
  });
}

function visibleTitles(search: string): string[] {
  return selectVisibleStreams
    .projector([haram, nabawi], stateWith(search).filters)
    .map((stream) => stream.title);
}

describe('stream search', () => {
  it('returns everything when the query is empty', () => {
    expect(visibleTitles('')).toEqual(['Masjid al-Haram', 'Masjid an-Nabawi']);
  });

  it('matches a city by prefix', () => {
    expect(visibleTitles('mec')).toEqual(['Masjid al-Haram']);
  });

  it('keeps both cities that share a prefix', () => {
    expect(visibleTitles('me')).toEqual(['Masjid al-Haram', 'Masjid an-Nabawi']);
  });

  it('matches a tag by prefix', () => {
    expect(visibleTitles('kaa')).toEqual(['Masjid al-Haram']);
  });

  it('ignores case and surrounding spaces', () => {
    expect(visibleTitles('  MEDI ')).toEqual(['Masjid an-Nabawi']);
  });

  it('does not match in the middle of a field', () => {
    expect(visibleTitles('haram')).toEqual([]);
  });
});
