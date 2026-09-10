import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

import { StreamsApiService } from '../../core/api/streams-api.service';
import { StreamsApiActions, StreamsPageActions } from './streams.actions';

@Injectable()
export class StreamsEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(StreamsApiService);

  readonly loadStreams$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StreamsPageActions.opened),
      switchMap(() =>
        this.api.loadAll().pipe(
          map((streams) => StreamsApiActions.loadSucceeded({ streams })),
          catchError((error: unknown) =>
            of(
              StreamsApiActions.loadFailed({
                error: error instanceof Error ? error.message : 'Не удалось загрузить трансляции',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
