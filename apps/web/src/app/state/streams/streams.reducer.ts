import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { createFeature, createReducer, on } from '@ngrx/store';
import type { Region, IStream, StreamCategory } from '@manara/shared';

import { StreamsApiActions, StreamsPageActions } from './streams.actions';

export type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface IStreamFilters {
  readonly categories: readonly StreamCategory[];
  readonly regions: readonly Region[];
  readonly search: string;
  readonly liveOnly: boolean;
}

export interface IStreamsState extends EntityState<IStream> {
  readonly status: LoadStatus;
  readonly error: string | null;
  readonly filters: IStreamFilters;
  readonly selectedId: string | null;
}

// No selectId: IStream already has an id field and NgRx picks it up.
export const streamsAdapter = createEntityAdapter<IStream>({
  sortComparer: (a, b) => a.title.localeCompare(b.title),
});

const EMPTY_FILTERS: IStreamFilters = {
  categories: [],
  regions: [],
  search: '',
  liveOnly: false,
};

const initialState: IStreamsState = streamsAdapter.getInitialState({
  status: 'idle',
  error: null,
  filters: EMPTY_FILTERS,
  selectedId: null,
});

/** Adds a value to the list, or removes it when already present. */
function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export const streamsFeature = createFeature({
  name: 'streams',
  reducer: createReducer(
    initialState,

    on(StreamsPageActions.opened, (state): IStreamsState => ({
      ...state,
      status: 'loading',
      error: null,
    })),

    on(StreamsApiActions.loadSucceeded, (state, { streams }): IStreamsState =>
      streamsAdapter.setAll(streams, { ...state, status: 'loaded', error: null }),
    ),

    on(StreamsApiActions.loadFailed, (state, { error }): IStreamsState => ({
      ...state,
      status: 'error',
      error,
    })),

    on(StreamsPageActions.categoryToggled, (state, { category }): IStreamsState => ({
      ...state,
      filters: { ...state.filters, categories: toggle(state.filters.categories, category) },
    })),

    on(StreamsPageActions.regionToggled, (state, { region }): IStreamsState => ({
      ...state,
      filters: { ...state.filters, regions: toggle(state.filters.regions, region) },
    })),

    on(StreamsPageActions.searchChanged, (state, { search }): IStreamsState => ({
      ...state,
      filters: { ...state.filters, search },
    })),

    on(StreamsPageActions.liveOnlyToggled, (state): IStreamsState => ({
      ...state,
      filters: { ...state.filters, liveOnly: !state.filters.liveOnly },
    })),

    on(StreamsPageActions.filtersReset, (state): IStreamsState => ({
      ...state,
      filters: EMPTY_FILTERS,
    })),

    on(StreamsPageActions.streamSelected, (state, { streamId }): IStreamsState => ({
      ...state,
      selectedId: streamId,
    })),
  ),
});
