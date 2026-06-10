import { type BoatLaunch, type Marina, MARINA_ACCESS_INFO } from './marinas';
import { SITE_URL, areaHubForPlace, canonicalUrl, marinaPath, seoSlugForLaunch } from './seo-slugs';

export function siteJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': `${SITE_URL}#organization`,
      name: 'Fair Tide',
      url: SITE_URL,
      logo: canonicalUrl('/fb-logo.svg'),
      parentOrganization: {
        '@type': 'Organization',
        name: 'B Average',
        url: 'https://www.b-average.com/'
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}#website`,
      name: 'Fair Tide',
      url: SITE_URL,
      publisher: {
        '@id': `${SITE_URL}#organization`
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/browse?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }
  ];
}

export function placeJsonLd(place: {
  name: string;
  address?: string;
  lat: number;
  lon: number;
  path: string;
  regionName?: string;
  commercial?: boolean;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': place.commercial ? 'LocalBusiness' : 'Place',
    '@id': `${canonicalUrl(place.path)}#place`,
    name: place.name,
    url: canonicalUrl(place.path),
    address: place.address,
    containedInPlace: place.regionName
      ? {
          '@type': 'Place',
          name: place.regionName
        }
      : undefined,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: place.lat,
      longitude: place.lon
    }
  };
}

export function marinaJsonLd(marina: Marina) {
  const access = marina.accessInfo || (marina.osmId ? MARINA_ACCESS_INFO[marina.osmId] : undefined);
  const area = areaHubForPlace(marina);
  const path = marinaPath(marina);
  const url = canonicalUrl(path);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${url}#place`,
      name: marina.name,
      url,
      address: marina.address,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: marina.lat,
        longitude: marina.lon
      },
      amenityFeature: [
        access ? feature('Guest moorage', access.transient !== 'N') : null,
        access ? feature('Fuel dock', access.fuel === 'Y') : null,
        access ? feature('Boat launch', access.launch === 'Y') : null
      ].filter(Boolean)
    },
    breadcrumbJsonLd([
      ['Home', '/plan-my-trip'],
      [area.name, `/area/${area.slug}`],
      [marina.name, path]
    ])
  ];
}

export function launchJsonLd(launch: BoatLaunch) {
  const area = areaHubForPlace(launch);
  const url = canonicalUrl(`/launch/${seoSlugForLaunch(launch)}`);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      '@id': `${url}#place`,
      name: launch.name,
      url,
      address: launch.area,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: launch.lat,
        longitude: launch.lon
      },
      amenityFeature: [
        feature('Public boat launch', true),
        feature(launch.type, true)
      ]
    },
    breadcrumbJsonLd([
      ['Home', '/plan-my-trip'],
      [area.name, `/area/${area.slug}`],
      [launch.name, `/launch/${seoSlugForLaunch(launch)}`]
    ])
  ];
}

export function breadcrumbJsonLd(items: Array<[string, string]>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: canonicalUrl(path)
    }))
  };
}

function feature(name: string, value: boolean) {
  return {
    '@type': 'LocationFeatureSpecification',
    name,
    value
  };
}
