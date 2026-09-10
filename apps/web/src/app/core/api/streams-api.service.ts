import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { IStream, IStreamListResponse } from '@world-watcher/shared';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StreamsApiService {
  private readonly http = inject(HttpClient);

  /**
   * Забирает весь каталог трансляций одним запросом.
   *
   * Каталог небольшой (сотни точек), поэтому фильтрация живёт на клиенте
   * в селекторах: переключение категорий работает мгновенно и не дёргает сеть.
   */
  loadAll(): Observable<IStream[]> {
    return this.http
      .get<IStreamListResponse>(environment.catalogueUrl)
      .pipe(map((response) => [...response.items]));
  }
}
