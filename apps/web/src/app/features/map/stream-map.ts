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
import { CATEGORY_META } from '@world-watcher/shared';
import type { IStream } from '@world-watcher/shared';

/** Стартовый вид: Ближний Восток и Центральная Азия в кадре. */
const INITIAL_CENTER: L.LatLngExpression = [30, 45];
const INITIAL_ZOOM = 3;
const FOCUS_ZOOM = 12;

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
    // Маркеры перерисовываем только после того, как карта создана:
    // до ngAfterViewInit контейнера ещё нет и Leaflet падает.
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
      minZoom: 2,
      worldCopyJump: true,
      zoomControl: true,
    });

    // Стандартные тайлы OSM: бесплатные и без ключа. У CARTO и Stadia
    // подложки закрыты API-ключом, поэтому они здесь не подходят.
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; участники OpenStreetMap',
      maxZoom: 19,
    }).addTo(this.map);

    // Leaflet кеширует размер контейнера в момент создания, а грид к этому
    // моменту ещё не разложен — карта получается в несколько пикселей.
    // Наблюдатель чинит и это, и обычный ресайз окна.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(this.host().nativeElement);

    this.markerLayer = L.layerGroup().addTo(this.map);
    this.renderMarkers(this.streams());
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
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
