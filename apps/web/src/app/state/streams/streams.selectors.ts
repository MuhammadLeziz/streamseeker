import { createSelector } from '@ngrx/store';
import { CATEGORY_META, STREAM_CATEGORIES } from '@world-watcher/shared';
import type { IStream, StreamCategory } from '@world-watcher/shared';

import { streamsAdapter, streamsFeature, type IStreamFilters } from './streams.reducer';

const { selectAll, selectEntities } = streamsAdapter.getSelectors();

export const { selectStreamsState, selectStatus, selectError, selectFilters, selectSelectedId } =
  streamsFeature;

export const selectAllStreams = createSelector(selectStreamsState, selectAll);
export const selectStreamEntities = createSelector(selectStreamsState, selectEntities);

export const selectIsLoading = createSelector(selectStatus, (status) => status === 'loading');

export const selectSelectedStream = createSelector(
  selectStreamEntities,
  selectSelectedId,
  (entities, id): IStream | null => (id ? (entities[id] ?? null) : null),
);

function matchesFilters(stream: IStream, filters: IStreamFilters): boolean {
  if (filters.liveOnly && stream.status !== 'live') {
    return false;
  }

  if (filters.categories.length > 0 && !filters.categories.includes(stream.category)) {
    return false;
  }

  // Regions combine with OR. Someone who ticks both CIS and Middle East
  // expects streams from either, not the intersection of the two.
  if (filters.regions.length > 0 && !filters.regions.some((r) => stream.regions.includes(r))) {
    return false;
  }

  const query = filters.search.trim().toLowerCase();
  if (query.length > 0 && !startsWithQuery(stream, query)) {
    return false;
  }

  return true;
}

/**
 * Search matches a prefix, not a substring anywhere in the record.
 *
 * Each searchable field is tested on its own with startsWith rather than
 * joining everything into one string, so typing "me" finds Mecca and Medina
 * instead of every stream whose description happens to contain those letters.
 *
 * The trade-off is deliberate: "haram" alone will not surface
 * "Masjid al-Haram", because the title does not start with it.
 */
function startsWithQuery(stream: IStream, query: string): boolean {
  const fields = [stream.title, stream.city ?? '', stream.countryCode, ...stream.tags];
  return fields.some((field) => field.toLowerCase().startsWith(query));
}

export const selectVisibleStreams = createSelector(
  selectAllStreams,
  selectFilters,
  (streams, filters) => streams.filter((stream) => matchesFilters(stream, filters)),
);

export const selectVisibleCount = createSelector(selectVisibleStreams, (streams) => streams.length);

export const selectLiveCount = createSelector(
  selectAllStreams,
  (streams) => streams.filter((stream) => stream.status === 'live').length,
);

/**
 * Per-category counts, taken over the whole catalogue rather than the filtered
 * list, so the number beside a checkbox does not react to its own selection.
 */
export const selectCategoryCounts = createSelector(selectAllStreams, (streams) => {
  const counts = Object.fromEntries(STREAM_CATEGORIES.map((category) => [category, 0])) as Record<
    StreamCategory,
    number
  >;

  for (const stream of streams) {
    counts[stream.category] += 1;
  }

  return counts;
});

/** Categories holding at least one stream, for the filter panel. */
export const selectAvailableCategories = createSelector(selectCategoryCounts, (counts) =>
  STREAM_CATEGORIES.filter((category) => counts[category] > 0).map((category) => ({
    ...CATEGORY_META[category],
    count: counts[category],
  })),
);
