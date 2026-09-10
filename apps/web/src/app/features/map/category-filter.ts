import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ICategoryMeta, StreamCategory } from '@world-watcher/shared';

export interface ICategoryOption extends ICategoryMeta {
  readonly count: number;
}

/**
 * Английские подписи категорий. Ключи приходят из shared, чтобы бэкенд и фронт
 * не разъезжались; сам перевод живёт здесь, потому что это слой представления.
 *
 * "Shrines" вместо кальки "Ziyarat": для англоязычного читателя это понятное
 * слово, а идентификатор категории в данных остаётся ziyarat.
 */
const LABELS: Record<string, string> = {
  'category.mosque': 'Mosques',
  'category.madrasa': 'Madrasas',
  'category.ziyarat': 'Shrines',
  'category.city': 'Cities',
  'category.bazaar': 'Bazaars',
  'category.nature': 'Nature',
  'category.mountain': 'Mountains',
  'category.beach': 'Beaches',
  'category.wildlife': 'Wildlife',
  'category.airport': 'Airports',
  'category.port': 'Ports',
  'category.railway': 'Railways',
  'category.sport': 'Sports',
  'category.space': 'Space',
  'category.other': 'Other',
};

export function categoryLabel(meta: ICategoryMeta): string {
  return LABELS[meta.labelKey] ?? meta.id;
}

@Component({
  selector: 'app-category-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="list">
      @for (option of options(); track option.id) {
        @let active = selected().includes(option.id);
        <li>
          <button
            type="button"
            class="row"
            [class.row--active]="active"
            [attr.aria-pressed]="active"
            (click)="categoryToggled.emit(option.id)"
          >
            <span class="row__dot" [style.background]="option.color"></span>
            <span class="row__label">{{ label(option) }}</span>
            <span class="row__count">{{ option.count }}</span>
          </button>
        </li>
      }
    </ul>
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
        align-items: center;
        gap: 0.625rem;
        inline-size: 100%;
        padding: 0.4rem 0.5rem;
        border: 0;
        border-radius: var(--radius);
        background: transparent;
        color: var(--text-secondary);
        font: inherit;
        font-size: 0.8125rem;
        text-align: start;
        cursor: pointer;
        transition:
          background var(--transition),
          color var(--transition);
      }

      .row:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
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
        color: var(--text-primary);
      }

      .row__dot {
        inline-size: 0.5rem;
        block-size: 0.5rem;
        border-radius: 50%;
        flex: none;
      }

      .row--active .row__dot {
        box-shadow: 0 0 0 3px color-mix(in srgb, currentcolor 18%, transparent);
      }

      .row__label {
        flex: 1;
        min-inline-size: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .row__count {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .row--active .row__count {
        color: var(--accent);
      }
    `,
  ],
})
export class CategoryFilterComponent {
  readonly options = input.required<readonly ICategoryOption[]>();
  readonly selected = input.required<readonly StreamCategory[]>();
  readonly categoryToggled = output<StreamCategory>();

  label(option: ICategoryOption): string {
    return categoryLabel(option);
  }
}
