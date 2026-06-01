import { ADDITIONAL_PUBLIC_MARINAS, FBC_PNW_MARINAS, PUBLIC_LAUNCHES, TRIP_MARINAS, type BoatLaunch, type Marina } from './marinas';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fairtide.app';

export type AreaHub = {
  slug: string;
  name: string;
  description: string;
  match: (place: { area: string; lat: number; lon: number }) => boolean;
};

export const AREA_HUBS: AreaHub[] = [
  {
    slug: 'sunshine-coast',
    name: 'Sunshine Coast',
    description: 'Marina conditions, tide windows, and transient moorage from Gibsons through Powell River and Lund.',
    match: (place) => /sunshine coast|gibsons|pender harbour|halfmoon|powell river|lund|secret cove/i.test(place.area)
  },
  {
    slug: 'howe-sound',
    name: 'Howe Sound',
    description: 'Boating conditions, marina tides, guest moorage, and public launch options around Howe Sound.',
    match: (place) => /west vancouver|horseshoe bay|bowen|lions bay|deep cove/i.test(place.area)
  },
  {
    slug: 'gulf-islands',
    name: 'Gulf Islands',
    description: 'Tides, marina conditions, fuel, and transient moorage for Gulf Islands cruising stops.',
    match: (place) => /galiano|north pender|south pender|pender island|sidney|north saanich|mill bay|oak bay/i.test(place.area)
  },
  {
    slug: 'discovery-islands',
    name: 'Discovery Islands',
    description: 'Boating conditions, marina access, and Discovery Passage stops around Quadra, Cortes, and Desolation Sound.',
    match: (place) => /discovery islands|desolation sound|quadra|cortes|campbell river/i.test(place.area)
  },
  {
    slug: 'vancouver-island-east',
    name: 'Vancouver Island East Coast',
    description: 'East Vancouver Island marina conditions from French Creek and Nanaimo north to Comox and Courtenay.',
    match: (place) => /comox|courtenay|french creek|nanoose|nanaimo|ladysmith/i.test(place.area)
  },
  {
    slug: 'puget-sound',
    name: 'Puget Sound',
    description: 'Freedom Club locations, boating conditions, marina access, and forecast windows around Puget Sound.',
    match: (place) => /bellingham|anacortes|everett|edmonds|poulsbo|seattle|lake union|kirkland|lake washington|port orchard|tacoma|olympia/i.test(place.area)
  },
  {
    slug: 'columbia-river',
    name: 'Columbia River',
    description: 'Boating conditions and Freedom Club marina pages for the Portland, Camas, and Washougal stretch of the Columbia River.',
    match: (place) => /portland|camas|washougal/i.test(place.area)
  },
  {
    slug: 'north-idaho',
    name: 'North Idaho',
    description: 'Lake boating conditions and Freedom Club marina pages for Coeur d’Alene and Hayden Lake.',
    match: (place) => /coeur|hayden/i.test(place.area)
  },
  {
    slug: 'salish-sea',
    name: 'Salish Sea',
    description: 'Daily boating conditions, tide windows, marinas, and public launches across the Salish Sea.',
    match: (place) => /vancouver|richmond|port moody|north vancouver|surrey|blaine|gibsons|sunshine coast|lions bay|deep cove|west vancouver|horseshoe bay|bowen|galiano|pender|sidney|north saanich|mill bay|oak bay|comox|courtenay|french creek|nanoose|campbell river|powell river|lund|discovery islands|desolation sound/i.test(place.area)
  },
  {
    slug: 'pacific-northwest',
    name: 'Pacific Northwest',
    description: 'Freedom Club marina pages, boating forecasts, and regional boating condition links across BC, Washington, Oregon, and North Idaho.',
    match: () => true
  }
];

export const SEO_MARINAS = [...TRIP_MARINAS, ...ADDITIONAL_PUBLIC_MARINAS, ...FBC_PNW_MARINAS].map((marina) => ({
  ...marina,
  slug: seoSlugForMarina(marina)
}));

export const SEO_LAUNCHES = PUBLIC_LAUNCHES.map((launch) => ({
  ...launch,
  slug: seoSlugForLaunch(launch)
}));

export type SeoMarina = (typeof SEO_MARINAS)[number];
export type SeoLaunch = (typeof SEO_LAUNCHES)[number];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function seoSlugForMarina(marina: Pick<Marina, 'name' | 'id'>) {
  return `${slugify(marina.name)}-${marina.id}`;
}

export function marinaPath(marina: Pick<Marina, 'name' | 'id' | 'locationId'> & { slug?: string }) {
  if (marina.locationId) return `/location/${marina.locationId}`;
  return `/marina/${marina.slug ?? seoSlugForMarina(marina)}`;
}

export function seoSlugForLaunch(launch: Pick<BoatLaunch, 'name' | 'id'>) {
  return `${slugify(launch.name)}-${launch.id}`;
}

export function getMarinaBySlug(slug: string) {
  return SEO_MARINAS.find((marina) => marina.slug === slug) ?? null;
}

export function getLaunchBySlug(slug: string) {
  return SEO_LAUNCHES.find((launch) => launch.slug === slug) ?? null;
}

export function getAreaHubBySlug(slug: string) {
  return AREA_HUBS.find((hub) => hub.slug === slug) ?? null;
}

export function areaHubForPlace(place: { area: string; lat: number; lon: number }) {
  return AREA_HUBS.find((hub) => hub.slug !== 'salish-sea' && hub.slug !== 'pacific-northwest' && hub.match(place))
    ?? AREA_HUBS.find((hub) => hub.slug === 'salish-sea' && hub.match(place))
    ?? AREA_HUBS[AREA_HUBS.length - 1];
}

export function canonicalUrl(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
