import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ICategoryMeta, StreamCategory } from '@streamseeker/shared';

export interface ICategoryOption extends ICategoryMeta {
  readonly count: number;
}

/**
 * Category labels. Keys come from shared so the backend and the front end
 * cannot drift apart; the wording itself belongs to the view layer.
 *
 * "Shrines" rather than a transliterated "Ziyarat": the English word carries
 * meaning for an English reader, while the category id in the data is
 * unchanged.
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
    <ul class="chips">
      @for (option of options(); track option.id) {
        @let active = selected().includes(option.id);
        <li>
          <button
            type="button"
            class="chip"
            [class.chip--active]="active"
            [attr.aria-pressed]="active"
            (click)="categoryToggled.emit(option.id)"
          >
            <span class="chip__dot" [style.background]="option.color"></span>
            <span class="chip__label">{{ label(option) }}</span>
            <span class="chip__count">{{ option.count }}</span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      :host {
        display: block;
        min-inline-size: 0;
        flex: 1;
      }

      /* Wraps rather than scrolls.

         This was one scrolling row with the scrollbar hidden and a fade at the
         trailing edge, which was fine while four categories fitted. At ten it
         stopped working: a container that overflows only horizontally does not
         respond to a mouse wheel at all, and with the scrollbar hidden there
         was nothing left to drag either. The chips past the fold were simply
         unreachable on a desktop.

         Wrapping needs no gesture and no affordance. The catalogue can reach
         fifteen categories, which is three rows in a panel that has the height
         to spare. */
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.375rem;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .chip {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.55rem;
        border: 1px solid var(--line);
        border-radius: var(--radius);
        background: var(--bg-raised);
        color: var(--text-secondary);
        font: inherit;
        font-size: 0.75rem;
        white-space: nowrap;
        cursor: pointer;
        transition:
          background var(--transition),
          border-color var(--transition),
          color var(--transition);
      }

      .chip:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .chip:active {
        transform: scale(0.98);
      }

      .chip:focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
      }

      .chip--active {
        background: var(--accent-soft);
        border-color: color-mix(in srgb, var(--accent) 45%, transparent);
        color: var(--text-primary);
      }

      .chip__dot {
        inline-size: 0.4375rem;
        block-size: 0.4375rem;
        border-radius: 50%;
        flex: none;
      }

      .chip--active .chip__dot {
        box-shadow: 0 0 0 3px color-mix(in srgb, currentcolor 18%, transparent);
      }

      .chip__count {
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
      }

      .chip--active .chip__count {
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
