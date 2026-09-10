import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import type { StreamCategory } from '@manara/shared';

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
  // Bound on the document rather than on the layout element: Escape has to
  // work while the pointer is on the map, and the map is not focusable.
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class MapPageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

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

  /**
   * Held open by the reader rather than by the filters: focusing the search
   * field or pressing the toggle sets it, and it survives an empty query so
   * that clearing the text does not yank the list away mid-typing.
   */
  private readonly panelHeldOpen = signal(false);

  /** The panel is a result, not a container: it appears when there is one. */
  readonly panelOpen = computed(() => this.panelHeldOpen() || this.hasFilters());

  ngOnInit(): void {
    this.store.dispatch(StreamsPageActions.opened());
  }

  onSearch(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    this.panelHeldOpen.set(true);
    this.store.dispatch(StreamsPageActions.searchChanged({ search }));
  }

  onSearchFocus(): void {
    this.panelHeldOpen.set(true);
  }

  onPanelToggled(): void {
    if (this.panelOpen()) {
      this.closePanel();
      return;
    }
    this.panelHeldOpen.set(true);
    this.searchInput()?.nativeElement.focus();
  }

  /**
   * Escape unwinds one layer at a time: the player first, because it covers
   * the most, and the panel only once the player is gone.
   */
  onEscape(): void {
    if (this.selected()) {
      this.onPlayerClosed();
      return;
    }
    if (this.panelOpen()) {
      this.closePanel();
    }
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

  /** Clears the query but leaves the panel up: the reader is still looking. */
  onFiltersReset(): void {
    this.panelHeldOpen.set(true);
    this.store.dispatch(StreamsPageActions.filtersReset());
  }

  /**
   * Closing has to clear the filters too. `panelOpen` is derived partly from
   * them, so a panel dismissed while a category was still on would reopen on
   * the next change detection and read as a broken toggle.
   */
  private closePanel(): void {
    this.panelHeldOpen.set(false);
    this.searchInput()?.nativeElement.blur();
    this.store.dispatch(StreamsPageActions.filtersReset());
  }
}
