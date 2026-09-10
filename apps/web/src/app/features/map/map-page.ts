import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import type { StreamCategory } from '@world-watcher/shared';

import { StreamsPageActions } from '../../state/streams/streams.actions';
import {
  selectAvailableCategories,
  selectError,
  selectFilters,
  selectIsLoading,
  selectSelectedStream,
  selectVisibleCount,
  selectVisibleStreams,
} from '../../state/streams/streams.selectors';
import { CategoryFilterComponent } from './category-filter';
import { StreamListComponent } from './stream-list';
import { StreamMapComponent } from './stream-map';
import { StreamPlayerComponent } from './stream-player';

@Component({
  selector: 'app-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CategoryFilterComponent,
    StreamListComponent,
    StreamMapComponent,
    StreamPlayerComponent,
  ],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPageComponent implements OnInit {
  private readonly store = inject(Store);

  readonly streams = this.store.selectSignal(selectVisibleStreams);
  readonly categories = this.store.selectSignal(selectAvailableCategories);
  readonly filters = this.store.selectSignal(selectFilters);
  readonly selected = this.store.selectSignal(selectSelectedStream);
  readonly visibleCount = this.store.selectSignal(selectVisibleCount);
  readonly loading = this.store.selectSignal(selectIsLoading);
  readonly error = this.store.selectSignal(selectError);

  readonly hasFilters = computed(() => {
    const filters = this.filters();
    return filters.categories.length > 0 || filters.search.trim().length > 0;
  });

  ngOnInit(): void {
    this.store.dispatch(StreamsPageActions.opened());
  }

  onSearch(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    this.store.dispatch(StreamsPageActions.searchChanged({ search }));
  }

  onCategoryToggled(category: StreamCategory): void {
    this.store.dispatch(StreamsPageActions.categoryToggled({ category }));
  }

  onStreamSelected(streamId: string): void {
    this.store.dispatch(StreamsPageActions.streamSelected({ streamId }));
  }

  onPlayerClosed(): void {
    this.store.dispatch(StreamsPageActions.streamSelected({ streamId: null }));
  }

  onFiltersReset(): void {
    this.store.dispatch(StreamsPageActions.filtersReset());
  }
}
