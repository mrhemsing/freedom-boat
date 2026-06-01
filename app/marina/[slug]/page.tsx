import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getMarinaSeoSnapshot, scorePhrase } from '../../../lib/seo-live';
import { marinaJsonLd } from '../../../lib/seo-schema';
import { areaHubForPlace, canonicalUrl, getMarinaBySlug, marinaPath, SEO_MARINAS } from '../../../lib/seo-slugs';
import { MARINA_ACCESS_INFO } from '../../../lib/marinas';

export const revalidate = 3600;

export function generateStaticParams() {
  return SEO_MARINAS.map((marina) => ({ slug: marina.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const marina = getMarinaBySlug(params.slug);
  if (!marina) return {};
  if (marina.locationId) {
    const path = marinaPath(marina);
    return {
      title: `FAIRTIDE Boat Planner - ${marina.area}`,
      description: `Hyper-local boating conditions for ${marina.area}.`,
      alternates: {
        canonical: canonicalUrl(path)
      },
      openGraph: {
        title: `FAIRTIDE Boat Planner - ${marina.area}`,
        description: `Hyper-local boating conditions for ${marina.area}.`,
        url: canonicalUrl(path),
        type: 'website'
      }
    };
  }
  const snapshot = await getMarinaSeoSnapshot(marina);
  const title = marinaPageTitle(marina);
  return {
    title: `${title} | Fairtide`,
    description: snapshot.summary,
    alternates: {
      canonical: canonicalUrl(`/marina/${marina.slug}`)
    },
    openGraph: {
      title: `${title} | Fairtide`,
      description: snapshot.summary,
      url: canonicalUrl(`/marina/${marina.slug}`),
      type: 'website'
    }
  };
}

export default async function MarinaSeoPage({ params }: { params: { slug: string } }) {
  const marina = getMarinaBySlug(params.slug);
  if (!marina) return notFound();
  if (marina.locationId) redirect(marinaPath(marina));

  const [snapshot, nearby] = await Promise.all([
    getMarinaSeoSnapshot(marina),
    Promise.resolve(nearbyMarinas(marina.slug))
  ]);
  const access = marina.accessInfo || (marina.osmId ? MARINA_ACCESS_INFO[marina.osmId] : undefined);
  const area = areaHubForPlace(marina);
  const title = marinaPageTitle(marina);

  return (
    <main className="container seoPage">
      <header className="seoHero">
        <a className="seoBrand" href="/plan-my-trip" aria-label="FAIRTIDE map">
          <img className="fbLogo" src="/fb-logo.svg?v=7" alt="FAIRTIDE" width={64} height={64} />
          <span>FAIRTIDE</span>
        </a>
        <nav className="seoBreadcrumb" aria-label="Breadcrumb">
          <a href="/plan-my-trip">Map</a>
          <span>/</span>
          <a href={`/area/${area.slug}`}>{area.name}</a>
        </nav>
        <h1>{title}</h1>
        <p>{snapshot.summary}</p>
        <div className="seoActions">
          <a className="seoButton seoButtonPrimary" href={`/plan-my-trip?marina=${marina.slug}`}>Open in interactive map</a>
          <a className="seoButton" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${marina.name} ${marina.address}`)}`} target="_blank" rel="noreferrer">Open in Maps</a>
        </div>
      </header>

      <section className="seoGrid" aria-label={`${marina.name} current boating snapshot`}>
        <div className="seoCard">
          <span>Boating score</span>
          <strong>{snapshot.score ?? '--'}</strong>
          <p>{snapshot.score != null ? scorePhrase(snapshot.score) : 'Forecast unavailable right now'}</p>
        </div>
        <div className="seoCard">
          <span>Wind forecast</span>
          <strong>{snapshot.windKts != null ? `${snapshot.windKts} kt` : '--'}</strong>
          <p>{snapshot.gustKts != null ? `gusting ${snapshot.gustKts} kt` : snapshot.forecastLabel}</p>
        </div>
        <div className="seoCard">
          <span>Tide station</span>
          <strong>{snapshot.stationName ?? 'Nearest CHS station'}</strong>
          <p>{snapshot.nextTide ?? 'Live tide event unavailable'}</p>
        </div>
      </section>

      <section className="seoContent">
        <h2>Guest Moorage, Fuel, and Access</h2>
        <dl className="seoFacts">
          <div><dt>Area</dt><dd>{marina.area}</dd></div>
          <div><dt>Address</dt><dd>{marina.address}</dd></div>
          {marina.operator ? <div><dt>Operator</dt><dd>{marina.operator}</dd></div> : null}
          <div><dt>Access</dt><dd>{access?.access ?? 'Verify before arrival'}</dd></div>
          <div><dt>Guest moorage</dt><dd>{access ? transientLabel(access.transient) : 'Verify before arrival'}</dd></div>
          <div><dt>Fuel</dt><dd>{access?.fuel ?? 'Verify'}</dd></div>
          <div><dt>Boat launch</dt><dd>{access?.launch ?? 'Verify'}</dd></div>
          {marina.sourceUrl ? (
            <div>
              <dt>Source</dt>
              <dd><a href={marina.sourceUrl} target="_blank" rel="noreferrer">Official Freedom Boat Club page</a></dd>
            </div>
          ) : null}
        </dl>

        <h2>Marinas Near {marina.name}</h2>
        <div className="seoLinkGrid">
          {nearby.map((near) => (
            <a key={near.slug} href={marinaPath(near)}>
              <strong>{near.name}</strong>
              <span>{near.area}</span>
            </a>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(marinaJsonLd(marina)) }} />
    </main>
  );
}

function nearbyMarinas(slug: string) {
  const current = SEO_MARINAS.find((marina) => marina.slug === slug);
  if (!current) return [];
  return SEO_MARINAS
    .filter((marina) => marina.slug !== slug)
    .map((marina) => ({ ...marina, distance: haversineKm(current.lat, current.lon, marina.lat, marina.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}

function transientLabel(value: 'Y' | 'Limited' | 'N') {
  if (value === 'Y') return 'Yes';
  if (value === 'N') return 'No';
  return 'Limited';
}

function marinaPageTitle(marina: { name: string; waterType?: 'tidal' | 'lake' | 'river' }) {
  if (marina.waterType === 'lake') return `${marina.name} Boating Conditions`;
  if (marina.waterType === 'river') return `${marina.name} River Boating Conditions`;
  return `${marina.name} Tides & Boating Conditions`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
