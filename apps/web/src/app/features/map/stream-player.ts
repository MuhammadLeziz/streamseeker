import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import type { IStream } from '@manara/shared';

/** How much of the window must stay on screen once it has been dragged. */
const VISIBLE_MARGIN = 32;

interface IWindowPlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

@Component({
  selector: 'app-stream-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-dragging]': 'dragging()',
    '[class.is-placed]': '!!placement()',
    '[style.left.px]': 'placement()?.x',
    '[style.top.px]': 'placement()?.y',
    '[style.width.px]': 'placement()?.width',
    '(window:resize)': 'onWindowResize()',
  },
  template: `
    @let current = stream();
    @if (current) {
      <section class="player">
        <header class="player__head" (pointerdown)="onDragStart($event)">
          <span class="player__grip" aria-hidden="true">
            <svg viewBox="0 0 10 16">
              <circle cx="3" cy="4" r="1" />
              <circle cx="7" cy="4" r="1" />
              <circle cx="3" cy="8" r="1" />
              <circle cx="7" cy="8" r="1" />
              <circle cx="3" cy="12" r="1" />
              <circle cx="7" cy="12" r="1" />
            </svg>
          </span>

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
      /* The player is a window floating over the map. It starts in the bottom
         corner and can be dragged anywhere from there.

         Physical properties rather than the logical ones used elsewhere: once
         the window has been moved it is placed by coordinates taken from the
         drag, and mixing those with inset-inline-* would leave two rules
         describing the same edge. */
      :host {
        position: absolute;
        bottom: var(--hud-inset);
        right: var(--hud-inset);
        z-index: var(--z-float);
        width: min(var(--player-width), calc(100% - var(--hud-inset) * 2));
        pointer-events: none;
      }

      /* Dragged at least once: the corner anchor is released and the
         coordinates bound on the host take over. */
      :host(.is-placed) {
        right: auto;
        bottom: auto;
      }

      :host(.is-dragging) {
        user-select: none;
      }

      .player {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        padding: 0.75rem;
        border: 1px solid var(--line-strong);
        border-radius: var(--radius-lg);
        background: var(--glass);
        backdrop-filter: blur(20px) saturate(1.4);
        box-shadow: var(--shadow-float);
        pointer-events: auto;
        animation: player-in var(--transition) both;
      }

      /* Lifted while it is being carried. */
      :host(.is-dragging) .player {
        border-color: color-mix(in srgb, var(--accent) 45%, var(--line-strong));
        box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 55%);
        animation: none;
      }

      @keyframes player-in {
        from {
          opacity: 0;
          transform: translateY(0.5rem);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .player {
          animation: none;
        }
      }

      .player__head {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        cursor: grab;
        /* Without this a drag on a touch screen scrolls the page instead of
           moving the window, and the pointer events stop arriving. */
        touch-action: none;
      }

      :host(.is-dragging) .player__head {
        cursor: grabbing;
      }

      .player__grip {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: 0.75rem;
        block-size: 1.75rem;
        color: var(--text-muted);
      }

      .player__grip svg {
        inline-size: 0.625rem;
        block-size: 1rem;
        fill: currentcolor;
      }

      .player__meta {
        flex: 1;
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

      /* An iframe swallows pointer events, and a drag crossing it would
         otherwise land inside YouTube. Pointer capture on the header covers
         most of that; this closes the rest. */
      :host(.is-dragging) .player__frame {
        pointer-events: none;
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

      /* On a phone the corner card would cover the map it belongs to, so it
         starts as a bottom sheet spanning the width. Once dragged it behaves
         like the window it is everywhere else. */
      @media (max-width: 720px) {
        :host {
          left: var(--hud-inset);
          right: var(--hud-inset);
          /* The sheet spans the width, so it would sit on top of the map
             attribution. Lifting it by one line keeps the credit readable,
             which the OpenStreetMap licence requires. */
          bottom: calc(var(--hud-inset) + 1.125rem);
          width: auto;
        }

        :host(.is-placed) {
          left: auto;
        }

        .player__description {
          display: none;
        }
      }
    `,
  ],
})
export class StreamPlayerComponent {
  readonly stream = input.required<IStream | null>();
  readonly closed = output<void>();

  private readonly sanitizer = inject(DomSanitizer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Where the window sits, once it has been moved. `null` means it is still
   * parked in the corner the stylesheet puts it in.
   *
   * The width belongs to the placement because releasing the right edge would
   * otherwise leave the element to shrink-wrap its contents, and on a phone,
   * where the sheet is stretched between two edges, collapse it outright.
   */
  readonly placement = signal<IWindowPlacement | null>(null);
  readonly dragging = signal(false);

  private grabOffsetX = 0;
  private grabOffsetY = 0;

  onDragStart(event: PointerEvent): void {
    // Primary button or touch only, and never a drag that starts on the close
    // button.
    if (event.button !== 0 || (event.target as Element).closest('button')) {
      return;
    }

    const rect = this.host.nativeElement.getBoundingClientRect();
    this.grabOffsetX = event.clientX - rect.left;
    this.grabOffsetY = event.clientY - rect.top;

    this.placement.set(this.clamp(rect.left, rect.top, rect.width));
    this.dragging.set(true);

    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    // Bound to the capturing element rather than to the document: capture
    // routes every move here until release, including moves over the iframe
    // and outside the window, and the listeners take themselves off again.
    const onMove = (move: PointerEvent): void => {
      this.placement.set(
        this.clamp(move.clientX - this.grabOffsetX, move.clientY - this.grabOffsetY, rect.width),
      );
    };

    const onEnd = (): void => {
      this.dragging.set(false);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);

    // Stops the text selection that dragging across a heading would start.
    event.preventDefault();
  }

  /** A window parked against an edge would be off screen after a resize. */
  onWindowResize(): void {
    const current = this.placement();
    if (current) {
      this.placement.set(this.clamp(current.x, current.y, current.width));
    }
  }

  /**
   * Keeps a strip of the window on screen rather than the whole of it. Being
   * able to push most of a window past the edge is the point of a window; being
   * able to lose it off the side of the screen is not.
   */
  private clamp(x: number, y: number, width: number): IWindowPlacement {
    const minX = VISIBLE_MARGIN - width;
    const maxX = window.innerWidth - VISIBLE_MARGIN;
    // The header is the only grip, so the top edge never leaves the viewport.
    const maxY = window.innerHeight - VISIBLE_MARGIN;

    return {
      x: Math.min(Math.max(x, minX), Math.max(minX, maxX)),
      y: Math.min(Math.max(y, 0), Math.max(0, maxY)),
      width,
    };
  }

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
