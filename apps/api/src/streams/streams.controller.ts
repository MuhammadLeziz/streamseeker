import { Controller, Get, Param, Query } from '@nestjs/common';
import type { IStream, IStreamListResponse } from '@world-watcher/shared';

import { ListStreamsQuery } from './dto/list-streams-query.dto';
import { StreamsService } from './streams.service';

@Controller('streams')
export class StreamsController {
  constructor(private readonly streams: StreamsService) {}

  /**
   * The whole catalogue in one response, filtered on request.
   *
   * There is no pagination and that is deliberate: the front end holds every
   * point in NgRx and filters in selectors so that toggling a category touches
   * no network. Paging would break that. If the catalogue ever outgrows one
   * response, the map bounds filter is the way to cut it down.
   */
  @Get()
  list(@Query() query: ListStreamsQuery): Promise<IStreamListResponse> {
    return this.streams.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<IStream> {
    return this.streams.findOne(id);
  }
}
