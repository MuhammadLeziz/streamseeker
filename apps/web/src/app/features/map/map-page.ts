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
import type { StreamCategory } from '@streamseeker/shared';

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
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class MapPageComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly hud = viewChild<ElementRef<HTMLElement>>('hud');

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
   * Whether the results panel is showing.
   *
   * This is interface state and nothing else. It used to be derived partly from
   * the filters, which forced closing the panel to clear them — otherwise a
   * panel dismissed with a category still on reopened by itself. Now that a
   * click on the map closes it, that coupling would throw away a search every
   * time the reader looked at the map, so the two are separate: the panel hides
   * and the filters stay, with the toggle lit to say so.
   */
  readonly panelOpen = signal(false);

  ngOnInit(): void {
    this.store.dispatch(StreamsPageActions.opened());
  }

  onSearch(event: Event): void {
    const search = (event.target as HTMLInputElement).value;
    this.panelOpen.set(true);
    this.store.dispatch(StreamsPageActions.searchChanged({ search }));
  }

  onSearchFocus(): void {
    this.panelOpen.set(true);
  }

  onPanelToggled(): void {
    if (this.panelOpen()) {
      this.closePanel();
      return;
    }
    this.panelOpen.set(true);
    this.searchInput()?.nativeElement.focus();
  }

  /**
   * A press on the map puts the panel away, which is what reaching past it to
   * the map means.
   *
   * The player is exempt: it is a window of its own, and dragging it or closing
   * it is not a request to dismiss anything else. `pointerdown` rather than
   * `click` so the panel is gone before the map starts panning under it.
   */
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.panelOpen()) {
      return;
    }

    const target = event.target;
    const hud = this.hud()?.nativeElement;
    if (!(target instanceof Node) || hud?.contains(target)) {
      return;
    }

    if (target instanceof Element && target.closest('app-stream-player')) {
      return;
    }

    this.closePanel();
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
    this.panelOpen.set(true);
    this.store.dispatch(StreamsPageActions.filtersReset());
  }

  private closePanel(): void {
    this.panelOpen.set(false);
    this.searchInput()?.nativeElement.blur();
  }
}
