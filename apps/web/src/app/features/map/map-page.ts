import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
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
import { StreamMapComponent } from './stream-map';
import { StreamPlayerComponent } from './stream-player';

@Component({
  selector: 'app-map-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CategoryFilterComponent, StreamMapComponent, StreamPlayerComponent],
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

  ngOnInit(): void {
    this.store.dispatch(StreamsPageActions.opened());
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
