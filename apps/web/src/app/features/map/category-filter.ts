import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ICategoryMeta, StreamCategory } from '@world-watcher/shared';

export interface ICategoryOption extends ICategoryMeta {
  readonly count: number;
}

/** Подписи категорий. Отдельный i18n-слой появится, когда добавим второй язык. */
const LABELS: Record<string, string> = {
  'category.mosque': 'Мечети',
  'category.madrasa': 'Медресе',
  'category.ziyarat': 'Зияраты',
  'category.city': 'Города',
  'category.bazaar': 'Базары',
  'category.nature': 'Природа',
  'category.mountain': 'Горы',
  'category.beach': 'Пляжи',
  'category.wildlife': 'Дикая природа',
  'category.airport': 'Аэропорты',
  'category.port': 'Порты',
  'category.railway': 'Железные дороги',
  'category.sport': 'Спорт',
  'category.space': 'Космос',
  'category.other': 'Другое',
};

@Component({
  selector: 'app-category-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chips">
      @for (option of options(); track option.id) {
        <button
          type="button"
          class="chip"
          [class.chip--active]="selected().includes(option.id)"
          [style.--chip-color]="option.color"
          (click)="categoryToggled.emit(option.id)"
        >
          {{ label(option) }}
          <span class="chip__count">{{ option.count }}</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.35rem 0.7rem;
        border: 1px solid color-mix(in srgb, var(--chip-color) 45%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--chip-color) 12%, transparent);
        color: #e8eaed;
        font: inherit;
        font-size: 0.8125rem;
        cursor: pointer;
        transition:
          background 0.15s ease,
          border-color 0.15s ease;
      }

      .chip:hover {
        background: color-mix(in srgb, var(--chip-color) 25%, transparent);
      }

      .chip--active {
        background: var(--chip-color);
        border-color: var(--chip-color);
        color: #0d0f11;
        font-weight: 600;
      }

      .chip__count {
        opacity: 0.75;
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class CategoryFilterComponent {
  readonly options = input.required<readonly ICategoryOption[]>();
  readonly selected = input.required<readonly StreamCategory[]>();
  readonly categoryToggled = output<StreamCategory>();

  label(option: ICategoryOption): string {
    return LABELS[option.labelKey] ?? option.id;
  }
}
