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
            [src]="embedUrl()"
            title="Live stream"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
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

  /**
   * The embed deliberately carries no `autoplay` and no `mute`.
   *
   * Browsers refuse to autoplay with sound, so autoplay only works when the
   * player starts muted. That muted start is exactly what broke sound: the
   * player's own speaker icon and its real audio state drifted apart, and it
   * took two clicks to get audio. Driving mute from our side through the
   * IFrame API did not settle it either.
   *
   * So the player now loads paused and hands sound entirely to YouTube's own
   * controls. The stream costs one click to start, and audio behaves the way
   * it does on YouTube itself, with nothing to fall out of sync.
   */
  readonly embedUrl = computed<SafeResourceUrl | null>(() => {
    const current = this.stream();
    if (!current) {
      return null;
    }

    const url = `https://www.youtube-nocookie.com/embed/${current.youtubeVideoId}?playsinline=1&rel=0`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });
}
