import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { IStream, IStreamListResponse } from '@manara/shared';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class StreamsApiService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches the whole catalogue in one request.
   *
   * The catalogue is small, a few hundred points, so filtering lives on the
   * client in selectors. Toggling a category is instant and touches no network.
   */
  loadAll(): Observable<IStream[]> {
    return this.http
      .get<IStreamListResponse>(environment.catalogueUrl)
      .pipe(map((response) => [...response.items]));
  }
}
