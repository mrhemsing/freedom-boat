import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLaunchSeoSnapshot, scorePhrase } from '../../../lib/seo-live';
import { launchJsonLd } from '../../../lib/seo-schema';
import { areaHubForPlace, canonicalUrl, getLaunchBySlug, SEO_LAUNCHES, SEO_MARINAS } from '../../../lib/seo-slugs';

export const revalidate = 3600;

export function generateStaticParams() {
  return SEO_LAUNCHES.map((launch) => ({ slug: launch.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const launch = getLaunchBySlug(params.slug);
  if (!launch) return {};
  const snapshot = await getLaunchSeoSnapshot(launch);
  return {
    title: `${launch.name} Boat Launch & Tides | Fairtide`,
    description: snapshot.summary,
    alternates: {
      canonical: canonicalUrl(`/launch/${launch.slug}`)
    }
  };
}

export default async function LaunchSeoPage({ params }: { params: { slug: string } }) {
  const launch = getLaunchBySlug(params.slug);
  if (!launch) return notFound();

  const snapshot = await getLaunchSeoSnapshot(launch);
  const area = areaHubForPlace(launch);
  const nearby = nearbyMarinas(launch.lat, launch.lon);
  const minTide = launch.minTide ?? (launch.type.toLowerCase().includes('hand') ? 0.8 : 1.2);

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
        <h1>{launch.name} Boat Launch & Tides</h1>
        <p>{snapshot.summary}</p>
        <div className="seoActions">
          <a className="seoButton seoButtonPrimary" href={`/plan-my-trip?launch=${launch.slug}`}>Open in interactive map</a>
          <a className="seoButton" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${launch.name} ${launch.area}`)}`} target="_blank" rel="noreferrer">Open in Maps</a>
        </div>
      </header>

      <section className="seoGrid" aria-label={`${launch.name} launch snapshot`}>
        <div className="seoCard">
          <span>Boating score</span>
          <strong>{snapshot.score ?? '--'}</strong>
          <p>{snapshot.score != null ? scorePhrase(snapshot.score) : 'Forecast unavailable right now'}</p>
        </div>
        <div className="seoCard">
          <span>Usable tide</span>
          <strong>{minTide.toFixed(1)} m+</strong>
          <p>{snapshot.nextTide ?? 'Check current tide before launching'}</p>
        </div>
        <div className="seoCard">
          <span>Launch type</span>
          <strong>{launch.type}</strong>
          <p>{launch.area}</p>
        </div>
      </section>

      <section className="seoContent">
        <h2>Public Boat Launch Details</h2>
        <dl className="seoFacts">
          <div><dt>Area</dt><dd>{launch.area}</dd></div>
          <div><dt>Type</dt><dd>{launch.type}</dd></div>
          <div><dt>Minimum tide</dt><dd>{minTide.toFixed(1)} m estimated</dd></div>
          <div><dt>Access</dt><dd>{launch.access ?? 'Public access, verify locally'}</dd></div>
          <div><dt>Fee</dt><dd>{launch.fee ?? 'Verify locally'}</dd></div>
        </dl>

        <h2>Nearby Marinas</h2>
        <div className="seoLinkGrid">
          {nearby.map((marina) => (
            <a key={marina.slug} href={`/marina/${marina.slug}`}>
              <strong>{marina.name}</strong>
              <span>{marina.area}</span>
            </a>
          ))}
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(launchJsonLd(launch)) }} />
    </main>
  );
}

function nearbyMarinas(lat: number, lon: number) {
  return SEO_MARINAS
    .map((marina) => ({ ...marina, distance: haversineKm(lat, lon, marina.lat, marina.lon) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
