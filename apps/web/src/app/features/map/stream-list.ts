import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CATEGORY_META } from '@world-watcher/shared';
import type { IStream } from '@world-watcher/shared';

import { categoryLabel } from './category-filter';

@Component({
  selector: 'app-stream-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <ul class="list" aria-hidden="true">
        @for (row of skeletonRows; track row) {
          <li class="skeleton">
            <span class="skeleton__dot"></span>
            <span class="skeleton__lines">
              <span class="skeleton__line"></span>
              <span class="skeleton__line skeleton__line--short"></span>
            </span>
          </li>
        }
      </ul>
    } @else if (streams().length === 0) {
      <p class="empty">
        Nothing matches these filters. Clear a category or widen the search to see the map fill up
        again.
      </p>
    } @else {
      <ul class="list">
        @for (stream of streams(); track stream.id) {
          <li>
            <button
              type="button"
              class="row"
              [class.row--active]="stream.id === selectedId()"
              (click)="streamSelected.emit(stream.id)"
            >
              <span class="row__dot" [style.background]="color(stream)"></span>
              <span class="row__body">
                <span class="row__title">{{ stream.title }}</span>
                <span class="row__meta">
                  {{ stream.city }}<span class="row__sep">/</span>{{ category(stream) }}
                </span>
              </span>
            </button>
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      .list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .row {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
        inline-size: 100%;
        padding: 0.5rem;
        border: 0;
        border-radius: var(--radius);
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
        transition: background var(--transition);
      }

      .row:hover {
        background: var(--bg-hover);
      }

      .row:active {
        transform: scale(0.99);
      }

      .row:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: -2px;
      }

      .row--active {
        background: var(--accent-soft);
      }

      .row__dot {
        inline-size: 0.5rem;
        block-size: 0.5rem;
        margin-block-start: 0.3rem;
        border-radius: 50%;
        flex: none;
      }

      .row__body {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-inline-size: 0;
      }

      .row__title {
        font-size: 0.8125rem;
        line-height: 1.35;
        color: var(--text-primary);
      }

      .row__meta {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--text-muted);
      }

      .row__sep {
        padding-inline: 0.4em;
        opacity: 0.5;
      }

      .empty {
        margin: 0;
        padding: 0.5rem;
        font-size: 0.75rem;
        line-height: 1.55;
        color: var(--text-muted);
        max-inline-size: 34ch;
      }

      /* The skeleton mirrors the real row geometry so the list does not
         jump when data arrives. */
      .skeleton {
        display: flex;
        align-items: flex-start;
        gap: 0.625rem;
        padding: 0.5rem;
      }

      .skeleton__dot {
        inline-size: 0.5rem;
        block-size: 0.5rem;
        margin-block-start: 0.3rem;
        border-radius: 50%;
        flex: none;
        background: var(--bg-hover);
      }

      .skeleton__lines {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        inline-size: 100%;
      }

      .skeleton__line {
        block-size: 0.5rem;
        border-radius: 2px;
        background: var(--bg-hover);
        animation: pulse 1.4s ease-in-out infinite;
      }

      .skeleton__line--short {
        inline-size: 45%;
      }

      @keyframes pulse {
        50% {
          opacity: 0.45;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .skeleton__line {
          animation: none;
        }
      }
    `,
  ],
})
export class StreamListComponent {
  readonly streams = input.required<readonly IStream[]>();
  readonly selectedId = input<string | null>(null);
  readonly loading = input(false);
  readonly streamSelected = output<string>();

  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  color(stream: IStream): string {
    return CATEGORY_META[stream.category].color;
  }

  category(stream: IStream): string {
    return categoryLabel(CATEGORY_META[stream.category]);
  }
}
