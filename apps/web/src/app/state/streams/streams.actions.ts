import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Region, IStream, StreamCategory } from '@manara/shared';

export const StreamsPageActions = createActionGroup({
  source: 'Streams Page',
  events: {
    Opened: emptyProps(),
    'Category Toggled': props<{ category: StreamCategory }>(),
    'Region Toggled': props<{ region: Region }>(),
    'Search Changed': props<{ search: string }>(),
    'Live Only Toggled': emptyProps(),
    'Filters Reset': emptyProps(),
    'Stream Selected': props<{ streamId: string | null }>(),
  },
});

export const StreamsApiActions = createActionGroup({
  source: 'Streams API',
  events: {
    'Load Succeeded': props<{ streams: IStream[] }>(),
    'Load Failed': props<{ error: string }>(),
  },
});
