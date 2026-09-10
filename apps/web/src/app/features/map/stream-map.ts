import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';
import { CATEGORY_META } from '@manara/shared';
import type { IStream } from '@manara/shared';

/** Opening view: Middle East and Central Asia in frame. */
const INITIAL_CENTER: L.LatLngExpression = [30, 45];

/**
 * The edge of the world, as far as this map is concerned.
 *
 * Two separate things produce the black field you get by panning far enough.
 * Past 85 degrees Web Mercator has no tiles at all, and past the antimeridian
 * there is no world to draw; that is the real edge. But the last few degrees
 * before it are permanent ice, which OpenStreetMap draws white and the dark
 * basemap inverts to near-black, so a view up there looks just as broken as one
 * off the edge.
 *
 * 80 degrees is where the second problem stops: Svalbard and the inhabited
 * coast of Greenland are still inside it, and nothing above it has a camera on
 * it. Longitude is clamped to a single world, which also ends the infinite
 * sideways scroll the old worldCopyJump option allowed.
 */
const WORLD_BOUNDS = L.latLngBounds([-80, -180], [80, 180]);
const INITIAL_ZOOM = 3;
const FOCUS_ZOOM = 12;

/**
 * The search bar floats at the top and the player in the bottom-right corner,
 * which leaves the bottom-left as the one corner nothing else claims.
 */
const CONTROL_CORNER = 'bottomleft' as const;

@Component({
  selector: 'app-stream-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="map" #host></div>`,
  styles: [
    `
      :host {
        display: block;
        block-size: 100%;
      }

      .map {
        block-size: 100%;
        inline-size: 100%;
        background: #1a1d21;
      }
    `,
  ],
})
export class StreamMapComponent implements AfterViewInit, OnDestroy {
  readonly streams = input.required<readonly IStream[]>();
  readonly selectedId = input<string | null>(null);
  readonly streamSelected = output<string>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  private map?: L.Map;
  private markerLayer?: L.LayerGroup;
  private readonly markers = new Map<string, L.Marker>();
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Markers are only drawn once the map exists. Before ngAfterViewInit
    // there is no container and Leaflet throws.
    effect(() => {
      const streams = this.streams();
      if (this.map) {
        this.renderMarkers(streams);
      }
    });

    effect(() => {
      const id = this.selectedId();
      if (id && this.map) {
        this.focusOn(id);
      }
    });
  }

  ngAfterViewInit(): void {
    this.map = L.map(this.host().nativeElement, {
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxBounds: WORLD_BOUNDS,
      // 1.0 makes the edge solid. Anything lower lets the view be dragged past
      // it and rubber-banded back, which still shows the black field.
      maxBoundsViscosity: 1,
      // Both default controls are re-added below in the corner the floating
      // interface leaves free. Leaflet offers no option for their position, so
      // they have to be switched off and constructed by hand.
      zoomControl: false,
      attributionControl: false,
    });

    // Order matters: within one corner Leaflet stacks controls in the order
    // they are added, and the credit belongs at the very bottom.
    L.control
      .attribution({ position: CONTROL_CORNER, prefix: false })
      .addAttribution('&copy; OpenStreetMap contributors')
      .addTo(this.map);
    L.control.zoom({ position: CONTROL_CORNER }).addTo(this.map);

    // Plain OSM tiles: free and keyless. CARTO and Stadia have both closed
    // their basemaps behind an API key.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(this.map);

    // Leaflet caches the container size at construction, before the layout has
    // run, which leaves the map a few pixels tall. The observer fixes both that
    // and ordinary window resizing.
    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
      this.applyMinZoom();
    });
    this.resizeObserver.observe(this.host().nativeElement);

    this.applyMinZoom();

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers(this.streams());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  /**
   * Holds the smallest zoom at which the world still covers the viewport.
   *
   * A fixed `minZoom` cannot do this: at zoom 2 the world is 1024px across, so
   * a wide monitor zoomed all the way out sees black to the left and right of
   * it. `getBoundsZoom` with `inside` set answers the opposite question to the
   * usual one — not "what zoom fits the world in the view" but "what zoom fits
   * the view inside the world" — which is exactly the floor we need, and it has
   * to be recomputed whenever the window changes shape.
   */
  private applyMinZoom(): void {
    if (!this.map) {
      return;
    }

    const minZoom = this.map.getBoundsZoom(WORLD_BOUNDS, true);
    this.map.setMinZoom(minZoom);

    if (this.map.getZoom() < minZoom) {
      this.map.setZoom(minZoom);
    }
  }

  private renderMarkers(streams: readonly IStream[]): void {
    this.markerLayer?.clearLayers();
    this.markers.clear();

    for (const stream of streams) {
      const color = CATEGORY_META[stream.category].color;
      const marker = L.marker([stream.location.lat, stream.location.lng], {
        title: stream.title,
        icon: L.divIcon({
          className: 'stream-pin',
          html: `<span class="stream-pin__dot" style="--pin-color:${color}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      });

      marker.on('click', () => this.streamSelected.emit(stream.id));
      marker.addTo(this.markerLayer!);
      this.markers.set(stream.id, marker);
    }
  }

  private focusOn(id: string): void {
    const marker = this.markers.get(id);
    if (!marker || !this.map) {
      return;
    }

    const zoom = Math.max(this.map.getZoom(), FOCUS_ZOOM);
    this.map.flyTo(marker.getLatLng(), zoom, { duration: 0.8 });
  }
}
