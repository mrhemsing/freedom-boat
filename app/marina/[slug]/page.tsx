import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getMarinaSeoSnapshot, scorePhrase } from '../../../lib/seo-live';
import { scoreBand } from '../../../lib/outlook';
import { marinaJsonLd } from '../../../lib/seo-schema';
import { areaHubForPlace, canonicalUrl, getMarinaBySlug, marinaPath, SEO_MARINAS } from '../../../lib/seo-slugs';
import { MARINA_ACCESS_INFO } from '../../../lib/marinas';
import GlobalHeader from '../../GlobalHeader';
import SiteFooter from '../../SiteFooter';

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
      title: `Fair Tide Boat Planner - ${marina.area}`,
      description: `Hyper-local boating conditions for ${marina.area}.`,
      alternates: {
        canonical: canonicalUrl(path)
      },
      openGraph: {
        title: `Fair Tide Boat Planner - ${marina.area}`,
        description: `Hyper-local boating conditions for ${marina.area}.`,
        url: canonicalUrl(path),
        type: 'website'
      }
    };
  }
  const snapshot = await getMarinaSeoSnapshot(marina);
  const title = marinaPageTitle(marina);
  return {
    title: `${title} | Fair Tide`,
    description: snapshot.summary,
    alternates: {
      canonical: canonicalUrl(`/marina/${marina.slug}`)
    },
    openGraph: {
      title: `${title} | Fair Tide`,
      description: snapshot.summary,
      url: canonicalUrl(`/marina/${marina.slug}`),
      type: 'website'
    }
  };
}

export default async function MarinaSeoPage({
  params,
  searchParams
}: {
  params: { slug: string };
  searchParams?: { embed?: string; plannerScore?: string; plannerVessel?: string };
}) {
  const marina = getMarinaBySlug(params.slug);
  if (!marina) return notFound();
  if (marina.locationId) redirect(marinaPath(marina));

  const isPlannerEmbed = searchParams?.embed === 'planner';
  const [snapshot, nearby] = await Promise.all([
    getMarinaSeoSnapshot(marina),
    Promise.resolve(isPlannerEmbed ? [] : nearbyMarinas(marina.slug))
  ]);
  const access = marina.accessInfo || (marina.osmId ? MARINA_ACCESS_INFO[marina.osmId] : undefined);
  const area = areaHubForPlace(marina);
  const title = marinaPageTitle(marina);
  const hasTideInfo = marina.waterType !== 'lake' && marina.waterType !== 'river';
  const plannerScore = isPlannerEmbed ? parsePlannerScore(searchParams?.plannerScore) : null;
  const displayedScore = plannerScore ?? snapshot.score;

  return (
    <main className="container seoPage marinaPage">
      {!isPlannerEmbed ? <GlobalHeader active="conditions" contextLabel={marina.area} /> : null}
      <header className="seoHero">
        {!isPlannerEmbed ? (
          <>
            <nav className="seoBreadcrumb" aria-label="Breadcrumb">
              <a href="/">Home</a>
              <span>/</span>
              <a href="/browse">Browse</a>
              <span>/</span>
              <a href={`/area/${area.slug}`}>{area.name}</a>
            </nav>
          </>
        ) : null}
        <h1 className="marinaTitle">{title}</h1>
        <p className="marinaIntro">{snapshot.summary}</p>
        <div className="seoActions">
          <a className="seoButton seoButtonPrimary" href={`/plan-my-trip?marina=${marina.slug}`}>Open in interactive map</a>
          <a className="seoButton" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${marina.name} ${marina.address}`)}`} target="_blank" rel="noreferrer">Open in Maps</a>
        </div>
      </header>

      <section className="seoGrid" aria-label={`${marina.name} current boating snapshot`}>
        <div className="seoCard seoCardScore">
          <span>Boating score</span>
          <strong>{displayedScore ?? '--'}</strong>
          <p>{scoreCardText(displayedScore, plannerScore != null, searchParams?.plannerVessel)}</p>
        </div>
        <div className="seoCard">
          <span>Wind forecast</span>
          <strong>{snapshot.windKts != null ? `${snapshot.windKts} kt` : '--'}</strong>
          <p>{snapshot.gustKts != null ? `gusting ${snapshot.gustKts} kt` : snapshot.forecastLabel}</p>
        </div>
        {hasTideInfo ? (
          <div className="seoCard">
            <span>Tide station</span>
            <strong>{snapshot.stationName ?? 'Nearest CHS station'}</strong>
            <p>{snapshot.nextTide ?? 'Live tide event unavailable'}</p>
          </div>
        ) : (
          <div className="seoCard">
            <span>Water type</span>
            <strong>{marina.waterType === 'lake' ? 'Freshwater lake' : 'River marina'}</strong>
            <p>Fair Tide focuses on wind, gusts, daylight, rain, and the boating score here; tide timing is omitted for this location.</p>
          </div>
        )}
      </section>

      <section className="seoContent">
        <h2>Guest Moorage, Fuel, and Access</h2>
        <dl className="seoFacts">
          <div><dt>Area</dt><dd>{marina.area}</dd></div>
          <div><dt>Address</dt><dd>{marina.address}</dd></div>
          {marina.operator ? <div><dt>Operator</dt><dd>{marina.operator}</dd></div> : null}
          <div><dt>Access</dt><dd>{access?.access ?? 'Verify before arrival'}</dd></div>
          <div><dt>Guest moorage</dt><dd className={statusValueClass(access?.transient)}>{access ? transientLabel(access.transient) : 'Verify before arrival'}</dd></div>
          <div><dt>Fuel</dt><dd className={statusValueClass(access?.fuel)}>{access?.fuel ?? 'Verify'}</dd></div>
          <div><dt>Boat launch</dt><dd className={statusValueClass(access?.launch)}>{access?.launch ?? 'Verify'}</dd></div>
          {marina.sourceUrl ? (
            <div>
              <dt>Source</dt>
              <dd><a href={marina.sourceUrl} target="_blank" rel="noreferrer">Official Freedom Boat Club page</a></dd>
            </div>
          ) : null}
        </dl>

        {!isPlannerEmbed ? (
          <>
            <h2>Destinations Near {marina.name}</h2>
            <div className="seoLinkGrid">
              {nearby.map((near) => (
                <a key={near.slug} href={marinaPath(near)}>
                  <strong>{near.name}</strong>
                  <span>{near.area}</span>
                </a>
              ))}
            </div>
          </>
        ) : null}
      </section>

      {!isPlannerEmbed ? <SiteFooter includeTides={hasTideInfo} /> : null}
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

function statusValueClass(value?: 'Y' | 'Limited' | 'N' | '?') {
  if (value === 'Y') return 'valueStatusYes';
  if (value === 'N') return 'valueStatusNo';
  return undefined;
}

function marinaPageTitle(marina: { name: string; waterType?: 'tidal' | 'lake' | 'river' }) {
  if (marina.waterType === 'lake') return `${marina.name} Boating Conditions`;
  if (marina.waterType === 'river') return `${marina.name} River Boating Conditions`;
  return `${marina.name} Tides & Boating Conditions`;
}

function parsePlannerScore(value?: string) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreCardText(score: number | null, isPlannerScore: boolean, vessel?: string) {
  if (score == null) return 'Forecast unavailable right now';
  if (!isPlannerScore) return scorePhrase(score);
  const band = scoreBand(score);
  return `${band.label} planner score${vessel ? ` for ${vessel.toLowerCase()}` : ''}`;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
