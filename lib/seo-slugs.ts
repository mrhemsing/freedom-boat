import { ADDITIONAL_PUBLIC_MARINAS, PUBLIC_LAUNCHES, TRIP_MARINAS, type BoatLaunch, type Marina } from './marinas';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://fairtide.app';

export type AreaHub = {
  slug: string;
  name: string;
  description: string;
  match: (place: { area: string; lat: number; lon: number }) => boolean;
};

export const AREA_HUBS: AreaHub[] = [
  {
    slug: 'howe-sound',
    name: 'Howe Sound',
    description: 'Boating conditions, marina tides, guest moorage, and public launch options around Howe Sound.',
    match: (place) => /west vancouver|horseshoe bay|bowen|gibsons|sunshine coast|lions bay|deep cove/i.test(place.area)
  },
  {
    slug: 'gulf-islands',
    name: 'Gulf Islands',
    description: 'Tides, marina conditions, fuel, and transient moorage for Gulf Islands cruising stops.',
    match: (place) => /galiano|pender|sidney|north saanich|mill bay/i.test(place.area)
  },
  {
    slug: 'salish-sea',
    name: 'Salish Sea',
    description: 'Daily boating conditions, tide windows, marinas, and public launches across the Salish Sea.',
    match: () => true
  }
];

export const SEO_MARINAS = [...TRIP_MARINAS, ...ADDITIONAL_PUBLIC_MARINAS].map((marina) => ({
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
  return AREA_HUBS.find((hub) => hub.slug !== 'salish-sea' && hub.match(place)) ?? AREA_HUBS[2];
}

export function canonicalUrl(path: string) {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
