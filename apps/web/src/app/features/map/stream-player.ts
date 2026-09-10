import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { CATEGORY_META } from '@streamseeker/shared';
import type { IStream } from '@streamseeker/shared';

import { categoryLabel } from './category-filter';

/** How much of the window must stay on screen once it has been dragged. */
const VISIBLE_MARGIN = 48;

/** Narrower than this and YouTube switches the embed to its cramped layout. */
const MIN_WIDTH = 400;

/** Breathing room kept between a resized window and the viewport edge. */
const EDGE_GAP = 16;

/**
 * Everything in the window that is not the video: header, description,
 * padding. Kept in step with the 120px in the stylesheet, which cannot read a
 * TypeScript constant.
 */
const CHROME_HEIGHT = 120;

/** Survives a reload, so the window reopens where it was left. */
const STORAGE_KEY = 'streamseeker.player.window';

/** The clock in the header only shows minutes, so it need not tick faster. */
const CLOCK_INTERVAL = 30_000;

interface IWindowPlacement {
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

interface IDragOffset {
  readonly dx: number;
  readonly dy: number;
}

@Component({
  selector: 'app-stream-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.is-dragging]': 'dragging()',
    '[class.is-resizing]': 'resizing()',
    '[class.is-placed]': '!!box()',
    '[class.is-maximized]': 'maximized()',
    '[style.left.px]': 'box()?.x',
    '[style.top.px]': 'box()?.y',
    '[style.width.px]': 'box()?.width',
    '[style.translate]': 'liveTranslate()',
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
              <span
                class="player__category-dot"
                [style.background]="categoryColor()"
                aria-hidden="true"
              ></span>
              {{ categoryName() }}
              <!-- A camera in the Namib desert has a country and no city, and an
                   empty slot would leave two separators leaning on each other. -->
              @if (current.city; as city) {
                <span class="player__sep">/</span>{{ city }}
              }
              <span class="player__sep">/</span>{{ current.countryCode }}
              @if (localTime(); as time) {
                <span class="player__sep">/</span>{{ time }}
              }
            </p>
          </div>

          <a
            class="icon-button"
            [href]="watchUrl()"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open on YouTube"
            title="Open on YouTube"
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M6 10l5-5M11 5H7M11 5v4" />
              <path d="M11.5 9v3.5H3.5v-8H7" />
            </svg>
          </a>

          <button
            type="button"
            class="icon-button"
            [attr.aria-pressed]="maximized()"
            [attr.aria-label]="maximized() ? 'Restore size' : 'Maximise'"
            [title]="maximized() ? 'Restore size' : 'Maximise'"
            (click)="onMaximiseToggled()"
          >
            @if (maximized()) {
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M6.5 2.5v4h-4M9.5 13.5v-4h4" />
              </svg>
            } @else {
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M2.5 6.5v-4h4M13.5 9.5v4h-4" />
              </svg>
            }
          </button>

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
            referrerpolicy="strict-origin-when-cross-origin"
          ></iframe>
        </div>

        @if (current.description) {
          <p class="player__description">{{ current.description }}</p>
        }

        @if (!maximized()) {
          <span
            class="player__resize"
            role="separator"
            aria-label="Resize"
            (pointerdown)="onResizeStart($event)"
          >
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="M11 5L5 11M11 9l-2 2" />
            </svg>
          </span>
        }
      </section>
    }
  `,
  styles: [
    `
      /* The player is a window floating over the map. It opens in the middle,
         where the thing that was just asked for belongs, and can be dragged and
         resized from there.

         Physical properties rather than the logical ones used elsewhere: once
         the window has been moved it is placed by coordinates taken from the
         drag, and mixing those with inset-inline-* would leave two rules
         describing the same edge.

         Fixed, not absolute. An absolutely positioned window dragged below the
         fold stretched the document, which raised a scrollbar, which resized
         the map, which moved the scrollbar again: that was the jitter on the
         way down. A fixed element is out of flow entirely and its coordinates
         are the same viewport coordinates a pointer event reports, so there is
         nothing left to convert and nothing to grow. */
      :host {
        position: fixed;
        left: 50%;
        top: 50%;
        translate: -50% -50%;
        z-index: var(--z-float);
        /* The last term keeps the whole window, video and all, inside the
           viewport height: the frame is 16/9, so a height budget is a width
           budget too. 120px is CHROME_HEIGHT in the component. */
        width: min(
          var(--player-width),
          calc(100vw - var(--hud-inset) * 2),
          calc((100dvh - 120px) * 16 / 9)
        );
        pointer-events: none;
      }

      /* Dragged or resized at least once: the centring is released and the
         coordinates bound on the host take over. */
      :host(.is-placed) {
        translate: none;
      }

      /* The one state that outranks the search bar: filling the screen and
         then leaving a control floating on top of the picture would be the
         worst of both. */
      :host(.is-maximized) {
        inset: var(--hud-inset);
        z-index: var(--z-cover);
        width: auto;
        translate: none;
      }

      :host(.is-dragging),
      :host(.is-resizing) {
        user-select: none;
      }

      .player {
        position: relative;
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
        opacity: 1;
        scale: 1;
        transition:
          opacity var(--transition),
          scale var(--transition);
      }

      /* The window used to open on a keyframe animation with a fill mode of
         both, and both halves of that were trouble.

         That fill mode holds the first frame — opacity 0 — until the animation
         actually starts, so anything that kept it from starting left the
         window invisible over the map. And the drag state switched the
         animation off, which meant releasing the header switched it back on
         and thereby restarted it: the window replayed its own opening, jump
         and all, on every press. That was the twitch.

         A transition out of @starting-style has neither failure. It cannot be
         restarted by a class change, because nothing here transitions on one,
         and a browser that ignores the rule simply shows the window straight
         away rather than never showing it. */
      @starting-style {
        .player {
          opacity: 0;
          scale: 0.985;
        }
      }

      :host(.is-maximized) .player {
        block-size: 100%;
      }

      /* Lifted while it is being carried. The blur comes off for the duration:
         it is redrawn over the whole map on every frame of a drag, and at this
         size that is the difference between gliding and stuttering. --glass is
         94% opaque, so what shows through barely changes. */
      :host(.is-dragging) .player,
      :host(.is-resizing) .player {
        border-color: color-mix(in srgb, var(--accent) 45%, var(--line-strong));
        box-shadow: 0 1.5rem 3rem rgb(0 0 0 / 55%);
        background: var(--bg-panel);
        backdrop-filter: none;
      }

      :host(.is-dragging) .player {
        will-change: translate;
      }

      @media (prefers-reduced-motion: reduce) {
        .player {
          transition: none;
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

      :host(.is-maximized) .player__head {
        cursor: default;
      }

      .player__grip {
        flex: none;
        display: grid;
        place-items: center;
        inline-size: 0.75rem;
        block-size: 1.75rem;
        color: var(--text-muted);
      }

      /* Nothing to grab while the window fills the screen, and a grip that does
         nothing is a lie. Hidden rather than removed so the header keeps its
         shape between the two states. */
      :host(.is-maximized) .player__grip {
        visibility: hidden;
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
        overflow: hidden;
        font-size: 0.875rem;
        font-weight: 500;
        line-height: 1.35;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: var(--text-primary);
      }

      .player__place {
        display: flex;
        align-items: center;
        margin: 0.2rem 0 0;
        font-family: var(--font-mono);
        font-size: 0.6875rem;
        color: var(--text-muted);
      }

      .player__sep {
        padding-inline: 0.4em;
        opacity: 0.5;
      }

      /* The same colour as the pin that was clicked and the dot in the results
         list: category hue as data encoding, which is the only job it has. */
      .player__category-dot {
        flex: none;
        inline-size: 0.4375rem;
        block-size: 0.4375rem;
        margin-inline-end: 0.5rem;
        border-radius: 50%;
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
        stroke-linejoin: round;
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

      /* Maximised the window is whatever shape the screen is, so the frame
         takes the leftover height and YouTube letterboxes inside it. */
      :host(.is-maximized) .player__frame {
        flex: 1;
        min-block-size: 0;
        aspect-ratio: auto;
      }

      /* An iframe swallows pointer events, and a gesture crossing it would
         otherwise land inside YouTube. Pointer capture on the handle covers
         most of that; this closes the rest. */
      :host(.is-dragging) .player__frame,
      :host(.is-resizing) .player__frame {
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
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        margin: 0;
        overflow: hidden;
        font-size: 0.75rem;
        line-height: 1.55;
        color: var(--text-secondary);
      }

      /* Width only. The video is 16/9, so a free height would only add black
         bars to a window that already sizes itself correctly. */
      .player__resize {
        position: absolute;
        inset-block-end: 0.125rem;
        inset-inline-end: 0.125rem;
        display: grid;
        place-items: center;
        inline-size: 1.125rem;
        block-size: 1.125rem;
        color: var(--text-muted);
        cursor: nwse-resize;
        touch-action: none;
        opacity: 0.55;
        transition: opacity var(--transition);
      }

      .player:hover .player__resize,
      :host(.is-resizing) .player__resize {
        opacity: 1;
      }

      .player__resize svg {
        inline-size: 0.625rem;
        block-size: 0.625rem;
        stroke: currentcolor;
        stroke-width: 1.5;
        stroke-linecap: round;
        fill: none;
      }

      /* A phone has one sensible width and no pointer to resize with. */
      @media (max-width: 720px) {
        :host {
          width: calc(100vw - var(--hud-inset) * 2);
        }

        .player__description,
        .player__resize {
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
   * Where the window sits, once it has been moved or resized. `null` means it
   * is still centred by the stylesheet.
   *
   * The width belongs to the placement because releasing the centring would
   * otherwise leave the element to shrink-wrap its contents.
   */
  readonly placement = signal<IWindowPlacement | null>(this.restore());
  readonly dragging = signal(false);
  readonly resizing = signal(false);
  readonly maximized = signal(false);

  /**
   * How far the window has been carried in the drag currently under way.
   *
   * A drag moves the window with `translate` and writes to `placement` only on
   * release. Left and top are layout; translate is not, so the browser can
   * carry the window on the compositor instead of laying the page out — map,
   * blurred panel and all — sixty times a second.
   */
  private readonly offset = signal<IDragOffset | null>(null);

  private readonly now = signal(Date.now());

  /** Maximised ignores the placement without discarding it. */
  readonly box = computed<IWindowPlacement | null>(() =>
    this.maximized() ? null : this.placement(),
  );

  readonly liveTranslate = computed<string | null>(() => {
    if (this.maximized()) {
      return null;
    }
    const offset = this.offset();
    return offset ? `${offset.dx}px ${offset.dy}px` : null;
  });

  /**
   * Local time at the camera, which is half of why a distant view is worth
   * looking at. Streams with no time zone on them simply do not show one.
   */
  readonly localTime = computed<string | null>(() => {
    const timezone = this.stream()?.timezone;
    if (!timezone) {
      return null;
    }

    const stamp = this.now();
    try {
      return new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timezone,
      }).format(new Date(stamp));
    } catch {
      // An unknown IANA zone throws rather than falling back.
      return null;
    }
  });

  readonly watchUrl = computed(
    () => `https://www.youtube.com/watch?v=${this.stream()?.youtubeVideoId ?? ''}`,
  );

  private readonly categoryMeta = computed(() => {
    const category = this.stream()?.category;
    return category ? CATEGORY_META[category] : null;
  });

  readonly categoryColor = computed(() => this.categoryMeta()?.color ?? null);

  readonly categoryName = computed(() => {
    const meta = this.categoryMeta();
    return meta ? categoryLabel(meta) : '';
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), CLOCK_INTERVAL);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  onMaximiseToggled(): void {
    this.maximized.update((value) => !value);
  }

  onDragStart(event: PointerEvent): void {
    // Primary button or touch only, never a gesture that starts on a control,
    // and nothing to drag while the window fills the screen.
    if (this.maximized() || event.button !== 0 || (event.target as Element).closest('a, button')) {
      return;
    }

    const start = this.measure();
    this.placement.set(start);
    this.offset.set({ dx: 0, dy: 0 });
    this.dragging.set(true);

    const originX = event.clientX;
    const originY = event.clientY;

    this.capture(
      event,
      (move) => {
        const next = this.clamp(
          start.x + (move.clientX - originX),
          start.y + (move.clientY - originY),
          start.width,
        );
        this.offset.set({ dx: next.x - start.x, dy: next.y - start.y });
      },
      () => {
        const offset = this.offset() ?? { dx: 0, dy: 0 };
        this.dragging.set(false);
        this.offset.set(null);
        this.commit({ x: start.x + offset.dx, y: start.y + offset.dy, width: start.width });
      },
    );
  }

  onResizeStart(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const start = this.measure();
    this.placement.set(start);
    this.resizing.set(true);

    const originX = event.clientX;

    this.capture(
      event,
      (move) => {
        this.placement.set({
          ...start,
          width: this.clampWidth(start.width + (move.clientX - originX), start.x, start.y),
        });
      },
      () => {
        this.resizing.set(false);
        this.commit(this.placement() ?? start);
      },
    );
  }

  /** A window parked against an edge would be off screen after a resize. */
  onWindowResize(): void {
    const current = this.placement();
    if (!current || this.dragging() || this.resizing()) {
      return;
    }

    this.placement.set(
      this.clamp(current.x, current.y, this.clampWidth(current.width, current.x, current.y)),
    );
  }

  /**
   * Routes the rest of a gesture through the element the pointer went down on.
   *
   * Capture delivers every move there until release, including moves over the
   * iframe and outside the window, and the listeners take themselves off again.
   */
  private capture(
    event: PointerEvent,
    onMove: (move: PointerEvent) => void,
    onEnd: () => void,
  ): void {
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture(event.pointerId);

    const end = (): void => {
      onEnd();
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);

    // Stops the text selection that dragging across a heading would start.
    event.preventDefault();
  }

  /**
   * The window's current box, in viewport coordinates.
   *
   * Taken from the element rather than from `placement`, because until the
   * first gesture the placement is null and the stylesheet is what positions
   * it. The host is fixed, so this rectangle is already in the coordinate space
   * pointer events report: handing it straight back as left/top moves the
   * window by exactly nothing, which is why a plain press on the header no
   * longer makes it hop.
   */
  private measure(): IWindowPlacement {
    const rect = this.host.nativeElement.getBoundingClientRect();
    return this.clamp(rect.left, rect.top, rect.width);
  }

  private commit(placement: IWindowPlacement): void {
    const clamped = this.clamp(placement.x, placement.y, placement.width);
    this.placement.set(clamped);
    this.persist(clamped);
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
      x: Math.round(Math.min(Math.max(x, minX), Math.max(minX, maxX))),
      y: Math.round(Math.min(Math.max(y, 0), Math.max(0, maxY))),
      width: Math.round(width),
    };
  }

  /**
   * Below MIN_WIDTH YouTube swaps the embed for its cramped layout, where the
   * controls climb onto the video and the scrub preview lands in the middle of
   * the picture. That floor is not cosmetic.
   */
  private clampWidth(width: number, x: number, y: number): number {
    // A phone is narrower than the floor. There the screen wins, or a window
    // dragged on a 375px handset would be widened past its own viewport.
    const floor = Math.min(MIN_WIDTH, window.innerWidth - EDGE_GAP * 2);
    const byViewport = window.innerWidth - x - EDGE_GAP;
    const byHeight = ((window.innerHeight - y - CHROME_HEIGHT) * 16) / 9;
    const max = Math.max(floor, Math.min(byViewport, byHeight));

    return Math.round(Math.min(Math.max(width, floor), max));
  }

  private persist(placement: IWindowPlacement): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(placement));
    } catch {
      // Private mode and a full quota both throw. Losing the position is not
      // worth failing a drag over.
    }
  }

  /**
   * Anything unreadable, or a box belonging to a screen this one is not, is
   * dropped and the window opens centred instead.
   */
  private restore(): IWindowPlacement | null {
    try {
      // Reading storage throws on its own in private mode, before there is
      // anything to parse, so both live under the one catch.
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }

      const { x, y, width } = parsed as Partial<IWindowPlacement>;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number') {
        return null;
      }

      return this.clamp(x, y, this.clampWidth(width, x, y));
    } catch {
      return null;
    }
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
