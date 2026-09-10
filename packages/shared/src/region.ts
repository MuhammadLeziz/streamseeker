/**
 * Regions behind the quick filters on the map.
 *
 * `cis` and `muslim-world` are the two that matter: the original site has no
 * such grouping, and they are why this catalogue is worth building.
 *
 * Regions are not mutually exclusive. Uzbekistan belongs to `cis`,
 * `central-asia` and `muslim-world` at once.
 */
export const REGIONS = [
  'cis',
  'muslim-world',
  'central-asia',
  'caucasus',
  'middle-east',
  'north-africa',
  'south-asia',
  'southeast-asia',
  'europe',
  'americas',
  'africa',
  'east-asia',
  'oceania',
] as const;

export type Region = (typeof REGIONS)[number];

/** CIS and post-Soviet states, ISO 3166-1 alpha-2. */
const CIS: readonly string[] = ['RU', 'BY', 'UA', 'MD', 'AM', 'AZ', 'GE', 'KZ', 'KG', 'TJ', 'TM', 'UZ'];

/** States with a Muslim-majority population. */
const MUSLIM_WORLD: readonly string[] = [
  'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE', 'JO', 'PS', 'LB', 'SY', 'IQ', 'IR', 'TR',
  'EG', 'LY', 'TN', 'DZ', 'MA', 'MR', 'SD', 'SO', 'DJ', 'KM',
  'PK', 'BD', 'AF', 'MV',
  'ID', 'MY', 'BN',
  'UZ', 'KZ', 'KG', 'TJ', 'TM', 'AZ',
  'SN', 'ML', 'NE', 'GM', 'GN', 'BF', 'TD', 'NG',
  'AL', 'XK', 'BA',
];

/** Geographic regions. Every country belongs to exactly one. */
const GEOGRAPHIC: Readonly<Record<string, Region>> = {
  KZ: 'central-asia', KG: 'central-asia', TJ: 'central-asia', TM: 'central-asia', UZ: 'central-asia',
  AM: 'caucasus', AZ: 'caucasus', GE: 'caucasus',
  SA: 'middle-east', AE: 'middle-east', QA: 'middle-east', KW: 'middle-east', BH: 'middle-east',
  OM: 'middle-east', YE: 'middle-east', JO: 'middle-east', PS: 'middle-east', LB: 'middle-east',
  SY: 'middle-east', IQ: 'middle-east', IR: 'middle-east', TR: 'middle-east', IL: 'middle-east',
  EG: 'north-africa', LY: 'north-africa', TN: 'north-africa', DZ: 'north-africa', MA: 'north-africa', SD: 'north-africa',
  PK: 'south-asia', BD: 'south-asia', AF: 'south-asia', IN: 'south-asia', LK: 'south-asia', NP: 'south-asia', MV: 'south-asia',
  ID: 'southeast-asia', MY: 'southeast-asia', BN: 'southeast-asia', TH: 'southeast-asia',
  SG: 'southeast-asia', PH: 'southeast-asia', VN: 'southeast-asia',
  CN: 'east-asia', JP: 'east-asia', KR: 'east-asia', TW: 'east-asia', MN: 'east-asia',
  RU: 'europe', BY: 'europe', UA: 'europe', MD: 'europe', AL: 'europe', XK: 'europe', BA: 'europe',
  DE: 'europe', FR: 'europe', IT: 'europe', ES: 'europe', GB: 'europe', NL: 'europe', PL: 'europe',
  CZ: 'europe', AT: 'europe', CH: 'europe', SE: 'europe', NO: 'europe', FI: 'europe', IS: 'europe',
  PT: 'europe', GR: 'europe', RO: 'europe', HU: 'europe', HR: 'europe', RS: 'europe', IE: 'europe',
  US: 'americas', CA: 'americas', MX: 'americas', BR: 'americas', AR: 'americas', CL: 'americas',
  PE: 'americas', CO: 'americas', CR: 'americas', CU: 'americas',
  ZA: 'africa', KE: 'africa', TZ: 'africa', ET: 'africa', GH: 'africa', SN: 'africa', ML: 'africa',
  NE: 'africa', NG: 'africa', SO: 'africa', DJ: 'africa', KM: 'africa', MR: 'africa',
  GM: 'africa', GN: 'africa', BF: 'africa', TD: 'africa',
  AU: 'oceania', NZ: 'oceania', FJ: 'oceania',
};

/**
 * Every region a country belongs to: its geographic one plus the thematic
 * `cis` and `muslim-world` memberships where they apply.
 */
export function regionsOfCountry(countryCode: string): Region[] {
  const code = countryCode.toUpperCase();
  const regions: Region[] = [];

  const geographic = GEOGRAPHIC[code];
  if (geographic) {
    regions.push(geographic);
  }
  if (CIS.includes(code)) {
    regions.push('cis');
  }
  if (MUSLIM_WORLD.includes(code)) {
    regions.push('muslim-world');
  }

  return regions;
}

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}
