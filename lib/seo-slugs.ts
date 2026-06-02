import { PLANNER_MARINAS, PUBLIC_LAUNCHES, type BoatLaunch, type Marina } from './marinas';

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
    match: (place) => /sunshine coast|gibsons|keats|gambier|pender harbour|madeira|garden bay|halfmoon|powell river|lund|secret cove|smuggler cove/i.test(place.area)
  },
  {
    slug: 'howe-sound',
    name: 'Howe Sound',
    description: 'Boating conditions, marina tides, guest moorage, and public launch options around Howe Sound.',
    match: (place) => /howe sound|west vancouver|horseshoe bay|bowen|snug cove|lions bay|deep cove/i.test(place.area)
  },
  {
    slug: 'gulf-islands',
    name: 'Gulf Islands',
    description: 'Tides, marina conditions, fuel, and transient moorage for Gulf Islands cruising stops.',
    match: (place) => /gulf islands|salt spring|ganges|galiano|thetis|gabriola|prevost|portland|cabbage|sidney spit|north pender|south pender|pender island|sidney|north saanich|saanich|mill bay|oak bay/i.test(place.area)
  },
  {
    slug: 'discovery-islands',
    name: 'Discovery Islands',
    description: 'Boating conditions, marina access, and Discovery Passage stops around Quadra, Cortes, and Desolation Sound.',
    match: (place) => /discovery islands|desolation sound|redonda|prideaux|tenedos|grace harbour|malaspina|copeland|refuge cove|squirrel cove|quadra|cortes|campbell river/i.test(place.area)
  },
  {
    slug: 'vancouver-island-east',
    name: 'Vancouver Island East Coast',
    description: 'East Vancouver Island marina conditions from French Creek and Nanaimo north to Comox and Courtenay.',
    match: (place) => /victoria|esquimalt|maple bay|cowichan|comox|courtenay|french creek|nanoose|nanaimo|newcastle|ladysmith/i.test(place.area)
  },
  {
    slug: 'puget-sound',
    name: 'Puget Sound',
    description: 'Freedom Club locations, boating conditions, marina access, and forecast windows around Puget Sound.',
    match: (place) => /puget sound|south sound|central sound|san juans|san juan|orcas|lopez|bellingham|blaine|point roberts|anacortes|skagit|la conner|whidbey|deception pass|everett|edmonds|kingston|bainbridge|poulsbo|silverdale|brownsville|bremerton|port orchard|seattle|lake union|kirkland|lake washington|des moines|tacoma|gig harbor|olympia|shelton|grapeview|hood canal|union|brinnon|quilcene|port ludlow|port hadlock|port townsend|sequim|port angeles/i.test(place.area)
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
    match: (place) => /salish sea|vancouver|richmond|port moody|north vancouver|surrey|blaine|gibsons|sunshine coast|howe sound|lions bay|deep cove|west vancouver|horseshoe bay|bowen|gulf islands|salt spring|galiano|pender|sidney|north saanich|saanich|mill bay|oak bay|victoria|maple bay|comox|courtenay|french creek|nanoose|nanaimo|campbell river|powell river|lund|discovery islands|desolation sound|puget sound|san juan|san juans|orcas|lopez|bellingham|anacortes|everett|edmonds|poulsbo|seattle|tacoma|olympia|hood canal|port townsend|sequim|port angeles/i.test(place.area)
  },
  {
    slug: 'pacific-northwest',
    name: 'Pacific Northwest',
    description: 'Freedom Club marina pages, boating forecasts, and regional boating condition links across BC, Washington, Oregon, and North Idaho.',
    match: () => true
  }
];

export const SEO_MARINAS = PLANNER_MARINAS.map((marina) => ({
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
