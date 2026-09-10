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
// Side-effect import: the plugin exports nothing and augments Leaflet in place.
import 'leaflet.markercluster';
import { CATEGORY_META } from '@streamseeker/shared';
import type { IStream } from '@streamseeker/shared';

/**
 * The one Leaflet this file builds anything with.
 *
 * leaflet.markercluster never imports Leaflet. It reads a bare global `L` at
 * module-evaluation time and writes `markerClusterGroup` onto it. What
 * `import * as L` gives this module is a different object: the optimised build
 * hands each importer its own interop namespace, so the augmentation is not on
 * it and `L.markerClusterGroup` is undefined. The dev server bundles the two
 * as one object and hides this completely — the bug exists in production only,
 * and the first anyone sees of it is a map with no markers on it.
 *
 * Mixing the two is its own hazard: a layer built from one reference and a map
 * built from another are not guaranteed to be the same Leaflet. So resolve one
 * reference here — the augmented global when the plugin reached it, this
 * module's namespace otherwise — and build the map, the tiles, the icons and
 * the clusters from that single object. `L` stays in use for types, which have
 * no runtime identity to get wrong.
 */
const leaflet: typeof L =
  typeof (globalThis as { L?: typeof L }).L?.markerClusterGroup === 'function'
    ? (globalThis as unknown as { L: typeof L }).L
    : L;

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
const WORLD_BOUNDS = leaflet.latLngBounds([-80, -180], [80, 180]);
const INITIAL_ZOOM = 3;
const FOCUS_ZOOM = 12;

/**
 * Where clustering stops.
 *
 * Below this the catalogue is unreadable in the places that matter most: ten
 * cameras in the centre of Saint Petersburg and eight around the Botswana pans
 * land on the same few pixels, and the densest parts of the map — the parts
 * this catalogue exists for — turn into one blob. Above it every pin stands on
 * its own, which is what someone who has zoomed that far in is asking for.
 *
 * It sits below FOCUS_ZOOM on purpose: selecting a stream flies to it, and the
 * pin has to be a pin by the time the flight lands, not a cluster of one.
 */
const CLUSTER_UNTIL_ZOOM = 11;

/**
 * The search bar floats at the top and the player opens over the middle, which
 * leaves the bottom-left as the one corner nothing else claims.
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
  private markerLayer?: L.MarkerClusterGroup;
  private readonly markers = new Map<string, L.Marker>();
  private resizeObserver?: ResizeObserver;

  constructor() {
    // Markers are only drawn once the cluster layer exists, which is not
    // until ngAfterViewInit has a container to give Leaflet.
    effect(() => {
      const streams = this.streams();
      if (this.markerLayer) {
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
    this.map = leaflet.map(this.host().nativeElement, {
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
    leaflet.control
      .attribution({ position: CONTROL_CORNER, prefix: false })
      .addAttribution('&copy; OpenStreetMap contributors')
      .addTo(this.map);
    leaflet.control.zoom({ position: CONTROL_CORNER }).addTo(this.map);

    // Plain OSM tiles: free and keyless. CARTO and Stadia have both closed
    // their basemaps behind an API key.
    leaflet
      .tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      })
      .addTo(this.map);

    // Leaflet caches the container size at construction, before the layout has
    // run, which leaves the map a few pixels tall. The observer fixes both that
    // and ordinary window resizing.
    this.resizeObserver = new ResizeObserver(() => {
      this.map?.invalidateSize();
      this.applyMinZoom();
    });
    this.resizeObserver.observe(this.host().nativeElement);

    this.applyMinZoom();

    this.initClusterLayer(this.map);
  }

  private initClusterLayer(map: L.Map): void {
    this.markerLayer = leaflet
      .markerClusterGroup({
        disableClusteringAtZoom: CLUSTER_UNTIL_ZOOM,
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        // The spider only appears for markers that share a coordinate exactly,
        // which here means the three feeds of the Grand Mosque.
        spiderfyOnMaxZoom: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? 30 : count < 50 ? 36 : 42;
          return leaflet.divIcon({
            className: 'stream-cluster',
            html: `<span class="stream-cluster__body">${count}</span>`,
            iconSize: [size, size],
          });
        },
      })
      .addTo(map);

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
    if (!this.markerLayer) {
      return;
    }

    this.markerLayer.clearLayers();
    this.markers.clear();

    for (const stream of streams) {
      const color = CATEGORY_META[stream.category].color;
      const marker = leaflet.marker([stream.location.lat, stream.location.lng], {
        title: stream.title,
        icon: leaflet.divIcon({
          className: 'stream-pin',
          html: `<span class="stream-pin__dot" style="--pin-color:${color}"></span>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
      });

      marker.on('click', () => this.streamSelected.emit(stream.id));
      marker.addTo(this.markerLayer);
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
