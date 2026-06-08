import { type BoatLaunch, type Marina, MARINA_ACCESS_INFO } from './marinas';
import { areaHubForPlace, canonicalUrl, marinaPath, seoSlugForLaunch } from './seo-slugs';

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
    ]),
    faqJsonLd([
      {
        q: `What are the tide times at ${marina.name} today?`,
        a: `${marina.name} tide times are shown with the nearest Canadian Hydrographic Service tide station and refreshed through Fair Tide.`
      },
      {
        q: `Does ${marina.name} have guest moorage?`,
        a: access ? transientAnswer(access.transient, marina.name) : `Guest moorage at ${marina.name} should be confirmed directly before relying on it.`
      },
      {
        q: `Is there fuel at ${marina.name}?`,
        a: access?.fuel === 'Y' ? `${marina.name} is listed with fuel available.` : access?.fuel === 'N' ? `${marina.name} is not listed with fuel.` : `Fuel availability at ${marina.name} should be verified before departure.`
      }
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
    ]),
    faqJsonLd([
      {
        q: `Is ${launch.name} a public boat launch?`,
        a: `${launch.name} is listed as a public ${launch.type.toLowerCase()} launch in ${launch.area}.`
      },
      {
        q: `What tide is needed at ${launch.name}?`,
        a: `Use ${launch.name} around ${((launch.minTide ?? (launch.type.toLowerCase().includes('hand') ? 0.8 : 1.2))).toFixed(1)} m tide or higher, then verify locally before launching.`
      }
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

export function faqJsonLd(items: Array<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a
      }
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

function transientAnswer(value: 'Y' | 'Limited' | 'N', name: string) {
  if (value === 'Y') return `${name} is listed with guest or transient moorage.`;
  if (value === 'Limited') return `${name} is listed with limited guest moorage.`;
  return `${name} is not listed with transient moorage.`;
}
