import { Transform } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsOptional, IsString, Length } from 'class-validator';
import { REGIONS, STREAM_CATEGORIES, STREAM_STATUSES } from '@manara/shared';
import type { Region, StreamCategory, StreamStatus } from '@manara/shared';

/**
 * Splits `?categories=mosque,city` into a list.
 *
 * Repeated parameters (`?categories=mosque&categories=city`) arrive as an
 * array already, so both spellings work and callers need not know which one
 * this API prefers.
 */
function toList(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw = Array.isArray(value) ? value : [value];
  const items = raw
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return items.length > 0 ? items : undefined;
}

export class ListStreamsQuery {
  @IsOptional()
  @IsArray()
  @IsIn(STREAM_CATEGORIES, { each: true })
  @Transform(({ value }) => toList(value))
  categories?: StreamCategory[];

  @IsOptional()
  @IsArray()
  @IsIn(REGIONS, { each: true })
  @Transform(({ value }) => toList(value))
  regions?: Region[];

  @IsOptional()
  @IsArray()
  @Length(2, 2, { each: true })
  @Transform(({ value }) => toList(value)?.map((code) => code.toUpperCase()))
  countries?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(STREAM_STATUSES, { each: true })
  @Transform(({ value }) => toList(value))
  statuses?: StreamStatus[];

  /** Matched as a prefix against the title, city, country code and each tag. */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Transform(({ value }) => toList(value)?.map(Number))
  // Four numbers, south first, matching the IMapBounds field order in shared.
  bounds?: number[];
}
