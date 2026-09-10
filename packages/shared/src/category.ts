/**
 * Stream categories.
 *
 * The original worldwatcher.live keeps every religious place in one bucket.
 * We split it into mosques, madrasas and shrines, and add bazaars on top.
 * That split is the point of difference, not decoration.
 */
export const STREAM_CATEGORIES = [
  'mosque',
  'madrasa',
  'ziyarat',
  'city',
  'bazaar',
  'nature',
  'mountain',
  'beach',
  'wildlife',
  'airport',
  'port',
  'railway',
  'sport',
  'space',
  'other',
] as const;

export type StreamCategory = (typeof STREAM_CATEGORIES)[number];

export interface ICategoryMeta {
  readonly id: StreamCategory;
  /** i18n key, for example `category.mosque`. */
  readonly labelKey: string;
  /** Icon name in the sprite. */
  readonly icon: string;
  /** Marker colour on the map, as hex. */
  readonly color: string;
}

export const CATEGORY_META: Readonly<Record<StreamCategory, ICategoryMeta>> = {
  mosque: { id: 'mosque', labelKey: 'category.mosque', icon: 'mosque', color: '#1f7a5a' },
  madrasa: { id: 'madrasa', labelKey: 'category.madrasa', icon: 'book', color: '#2e8b7a' },
  ziyarat: { id: 'ziyarat', labelKey: 'category.ziyarat', icon: 'dome', color: '#4a9d8f' },
  city: { id: 'city', labelKey: 'category.city', icon: 'buildings', color: '#5b6bbf' },
  bazaar: { id: 'bazaar', labelKey: 'category.bazaar', icon: 'basket', color: '#c77d3a' },
  nature: { id: 'nature', labelKey: 'category.nature', icon: 'tree', color: '#3f8f43' },
  mountain: { id: 'mountain', labelKey: 'category.mountain', icon: 'mountain', color: '#6b7f8f' },
  beach: { id: 'beach', labelKey: 'category.beach', icon: 'wave', color: '#2f9fc4' },
  wildlife: { id: 'wildlife', labelKey: 'category.wildlife', icon: 'paw', color: '#8a6d3b' },
  airport: { id: 'airport', labelKey: 'category.airport', icon: 'plane', color: '#4a7fb5' },
  port: { id: 'port', labelKey: 'category.port', icon: 'anchor', color: '#3d6e8f' },
  railway: { id: 'railway', labelKey: 'category.railway', icon: 'train', color: '#8f5a3d' },
  sport: { id: 'sport', labelKey: 'category.sport', icon: 'ball', color: '#b5504a' },
  space: { id: 'space', labelKey: 'category.space', icon: 'rocket', color: '#54459c' },
  other: { id: 'other', labelKey: 'category.other', icon: 'dot', color: '#7a7a7a' },
};

export function isStreamCategory(value: string): value is StreamCategory {
  return (STREAM_CATEGORIES as readonly string[]).includes(value);
}
