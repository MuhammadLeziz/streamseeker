import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { countriesOfRegion } from '@streamseeker/shared';
import type { IStream, IStreamListResponse } from '@streamseeker/shared';

import { PrismaService } from '../prisma/prisma.service';
import { ListStreamsQuery } from './dto/list-streams-query.dto';
import { toStream } from './stream.mapper';

const WITH_TAGS = { tags: true } as const;

@Injectable()
export class StreamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListStreamsQuery): Promise<IStreamListResponse> {
    const where = this.buildWhere(query);

    const rows = await this.prisma.stream.findMany({
      where,
      include: WITH_TAGS,
      // Featured points first, then alphabetically. The front end sorts nothing
      // of its own, so this order is what the reader sees.
      orderBy: [{ featured: 'desc' }, { title: 'asc' }],
    });

    const items = rows.map(toStream);
    return { items, total: items.length };
  }

  async findOne(id: string): Promise<IStream> {
    const row = await this.prisma.stream.findUnique({ where: { id }, include: WITH_TAGS });

    if (!row) {
      throw new NotFoundException(`No stream with id ${id}`);
    }

    return toStream(row);
  }

  private buildWhere(query: ListStreamsQuery): Prisma.StreamWhereInput {
    const where: Prisma.StreamWhereInput = {};

    if (query.categories?.length) {
      where.category = { in: query.categories };
    }

    if (query.statuses?.length) {
      where.status = { in: query.statuses };
    }

    const countries = this.resolveCountries(query);
    if (countries) {
      where.countryCode = { in: countries };
    }

    const bounds = this.buildBounds(query.bounds);
    if (bounds) {
      Object.assign(where, bounds);
    }

    const search = this.buildSearch(query.search);
    if (search) {
      where.OR = search;
    }

    return where;
  }

  /**
   * Regions become country codes, and an explicit `countries` filter narrows
   * that further rather than widening it: asking for the CIS and for Uzbekistan
   * means Uzbekistan, not the whole CIS.
   */
  private resolveCountries(query: ListStreamsQuery): string[] | undefined {
    const fromRegions = query.regions?.length
      ? [...new Set(query.regions.flatMap(countriesOfRegion))]
      : undefined;
    const explicit = query.countries?.length ? query.countries : undefined;

    if (fromRegions && explicit) {
      return explicit.filter((code) => fromRegions.includes(code));
    }

    return fromRegions ?? explicit;
  }

  /**
   * `?bounds=south,west,north,east`.
   *
   * A box that crosses the antimeridian has a west greater than its east, and
   * a plain `between` would return the whole world minus the box. Splitting it
   * in two is the only correct reading.
   */
  private buildBounds(bounds: number[] | undefined): Prisma.StreamWhereInput | undefined {
    if (!bounds || bounds.length !== 4) {
      return undefined;
    }

    const [south, west, north, east] = bounds as [number, number, number, number];
    const latitude: Prisma.StreamWhereInput = { lat: { gte: south, lte: north } };

    if (west <= east) {
      return { ...latitude, lng: { gte: west, lte: east } };
    }

    return { ...latitude, OR: [{ lng: { gte: west } }, { lng: { lte: east } }] };
  }

  /**
   * A prefix match per field, which is the rule the front end already follows:
   * "med" finds Medina and must not find "Ahmed".
   *
   * Tags are rows rather than a String[] column precisely so this can be said
   * in Prisma instead of in raw SQL.
   */
  private buildSearch(search: string | undefined): Prisma.StreamWhereInput[] | undefined {
    const term = search?.trim();
    if (!term) {
      return undefined;
    }

    const prefix = { startsWith: term, mode: 'insensitive' } as const;

    return [
      { title: prefix },
      { city: prefix },
      { countryCode: prefix },
      { tags: { some: { value: prefix } } },
    ];
  }
}
