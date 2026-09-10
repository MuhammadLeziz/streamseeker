import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import type { IStream } from '@world-watcher/shared';

@Component({
  selector: 'app-stream-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let current = stream();
    @if (current) {
      <section class="player">
        <header class="player__head">
          <div>
            <h2 class="player__title">{{ current.title }}</h2>
            <p class="player__place">{{ current.city }} · {{ current.countryCode }}</p>
          </div>
          <button type="button" class="player__close" aria-label="Закрыть" (click)="closed.emit()">
            ✕
          </button>
        </header>

        <div class="player__frame">
          <iframe
            [src]="embedUrl()"
            title="Прямая трансляция"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>

        @if (current.description) {
          <p class="player__description">{{ current.description }}</p>
        }
      </section>
    }
  `,
  styles: [
    `
      .player {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        background: #16191d;
        border-block-start: 1px solid #2a2f36;
      }

      .player__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
      }

      .player__title {
        margin: 0;
        font-size: 1rem;
        color: #f1f3f5;
      }

      .player__place {
        margin: 0.15rem 0 0;
        font-size: 0.8125rem;
        color: #9aa4ae;
      }

      .player__close {
        border: 0;
        background: transparent;
        color: #9aa4ae;
        font-size: 1rem;
        cursor: pointer;
        line-height: 1;
        padding: 0.25rem;
      }

      .player__close:hover {
        color: #f1f3f5;
      }

      .player__frame {
        position: relative;
        inline-size: 100%;
        aspect-ratio: 16 / 9;
        border-radius: 0.5rem;
        overflow: hidden;
        background: #000;
      }

      .player__frame iframe {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        border: 0;
      }

      .player__description {
        margin: 0;
        font-size: 0.8125rem;
        line-height: 1.5;
        color: #9aa4ae;
      }
    `,
  ],
})
export class StreamPlayerComponent {
  readonly stream = input.required<IStream | null>();
  readonly closed = output<void>();

  private readonly sanitizer = inject(DomSanitizer);

  /**
   * URL плеера приходится пропускать через DomSanitizer: Angular по умолчанию
   * блокирует внешние src у iframe. Домен здесь всегда наш собственный литерал,
   * подставляется только videoId, поэтому обход безопасен.
   */
  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const current = this.stream();
    if (!current) {
      return null;
    }

    const url = `https://www.youtube-nocookie.com/embed/${current.youtubeVideoId}?autoplay=1&mute=1`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
