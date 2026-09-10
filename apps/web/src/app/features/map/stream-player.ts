import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
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
          <div class="player__meta">
            <h2 class="player__title">{{ current.title }}</h2>
            <p class="player__place">
              {{ current.city }}<span class="player__sep">/</span>{{ current.countryCode }}
            </p>
          </div>
          <button type="button" class="icon-button" aria-label="Close" (click)="closed.emit()">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div class="player__frame">
          <iframe
            #frame
            [src]="embedUrl()"
            title="Live stream"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowfullscreen
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>

          <button
            type="button"
            class="sound"
            [attr.aria-pressed]="!muted()"
            (click)="toggleSound()"
          >
            {{ muted() ? 'Unmute' : 'Mute' }}
          </button>
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
        gap: 0.625rem;
        padding: 0.875rem 1rem 1rem;
        border-block-start: 1px solid var(--line);
        background: var(--bg-panel);
      }

      .player__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
      }

      .player__meta {
        min-inline-size: 0;
      }

      .player__title {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.35;
        color: var(--text-primary);
      }

      .player__place {
        margin: 0.2rem 0 0;
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--text-muted);
      }

      .player__sep {
        padding-inline: 0.4em;
        opacity: 0.5;
      }

      .icon-button {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: 1.75rem;
        block-size: 1.75rem;
        border: 0;
        border-radius: var(--radius);
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition:
          background var(--transition),
          color var(--transition);
      }

      .icon-button:hover {
        background: var(--bg-hover);
        color: var(--text-primary);
      }

      .icon-button svg {
        inline-size: 0.875rem;
        block-size: 0.875rem;
        stroke: currentcolor;
        stroke-width: 1.5;
        stroke-linecap: round;
        fill: none;
      }

      .player__frame {
        position: relative;
        inline-size: 100%;
        aspect-ratio: 16 / 9;
        border-radius: var(--radius);
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

      .sound {
        position: absolute;
        inset-block-end: 0.5rem;
        inset-inline-start: 0.5rem;
        padding: 0.25rem 0.55rem;
        border: 1px solid color-mix(in srgb, white 20%, transparent);
        border-radius: var(--radius);
        background: color-mix(in srgb, black 65%, transparent);
        backdrop-filter: blur(6px);
        color: #fff;
        font: inherit;
        font-size: 0.6875rem;
        cursor: pointer;
        transition: background var(--transition);
      }

      .sound:hover {
        background: color-mix(in srgb, black 80%, transparent);
      }

      .sound[aria-pressed='true'] {
        border-color: var(--accent);
        color: var(--accent);
      }

      .player__description {
        margin: 0;
        font-size: 0.75rem;
        line-height: 1.55;
        color: var(--text-secondary);
      }
    `,
  ],
})
export class StreamPlayerComponent {
  readonly stream = input.required<IStream | null>();
  readonly closed = output<void>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly document = inject(DOCUMENT);
  private readonly frame = viewChild<ElementRef<HTMLIFrameElement>>('frame');

  /**
   * Плеер всегда стартует без звука — иначе браузер целиком блокирует
   * автозапуск. Раньше звуком управляла родная кнопка YouTube, и она
   * рассинхронизировалась: иконка показывала «звук включён», а поток
   * оставался приглушённым, пока не ткнёшь дважды. Теперь состояние держим
   * у себя и меняем его через IFrame API, так что иконка плеера и наша
   * кнопка всегда согласованы.
   */
  readonly muted = signal(true);

  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const current = this.stream();
    if (!current) {
      return null;
    }

    const origin = this.document.defaultView?.location.origin ?? '';
    const params = new URLSearchParams({
      autoplay: '1',
      mute: '1',
      playsinline: '1',
      rel: '0',
      // enablejsapi открывает postMessage-канал, через который мы снимаем mute.
      enablejsapi: '1',
      origin,
    });

    const url = `https://www.youtube-nocookie.com/embed/${current.youtubeVideoId}?${params}`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  constructor() {
    // Новый эфир — новый iframe, звук в нём снова выключен.
    effect(() => {
      this.stream();
      this.muted.set(true);
    });
  }

  toggleSound(): void {
    const win = this.frame()?.nativeElement.contentWindow;
    if (!win) {
      return;
    }

    const next = !this.muted();
    win.postMessage(
      JSON.stringify({ event: 'command', func: next ? 'mute' : 'unMute', args: [] }),
      'https://www.youtube-nocookie.com',
    );
    this.muted.set(next);
  }
}
