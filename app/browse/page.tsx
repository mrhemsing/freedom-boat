import type { Metadata } from 'next';
import { AREA_HUBS, canonicalUrl, SEO_LAUNCHES, SEO_MARINAS } from '../../lib/seo-slugs';

type BrowseType = 'all' | 'areas' | 'marinas' | 'launches';

const FILTERS: { label: string; type: BrowseType }[] = [
  { label: 'All', type: 'all' },
  { label: 'Areas', type: 'areas' },
  { label: 'Marinas', type: 'marinas' },
  { label: 'Launches', type: 'launches' }
];

export const metadata: Metadata = {
  title: 'Browse Marinas, Launches & Area Guides | Fairtide',
  description: 'Browse Fairtide marina condition pages, public boat launches, and Pacific Northwest area guides.',
  alternates: {
    canonical: canonicalUrl('/browse')
  }
};

export default function BrowsePage({
  searchParams
}: {
  searchParams?: { type?: string };
}) {
  const activeType = normalizeType(searchParams?.type);
  const showAreas = activeType === 'all' || activeType === 'areas';
  const showMarinas = activeType === 'all' || activeType === 'marinas';
  const showLaunches = activeType === 'all' || activeType === 'launches';

  return (
    <main className="container seoPage browsePage">
      <header className="seoHero">
        <a className="seoBrand" href="/plan-my-trip" aria-label="FAIRTIDE map">
          <img className="fbLogo" src="/fb-logo.svg?v=7" alt="FAIRTIDE" width={64} height={64} />
          <span>FAIRTIDE</span>
        </a>
        <nav className="seoBreadcrumb" aria-label="Breadcrumb">
          <a href="/plan-my-trip">Map</a>
          <span>/</span>
          <span>Browse</span>
        </nav>
        <h1>Browse Boating Conditions</h1>
        <p>Area guides, marina pages, and public launch pages for planning Pacific Northwest cruising days.</p>
        <div className="seoActions browseFilters" aria-label="Directory filters">
          {FILTERS.map((filter) => (
            <a
              key={filter.type}
              className={`seoButton ${activeType === filter.type ? 'seoButtonPrimary' : ''}`}
              href={filter.type === 'all' ? '/browse' : `/browse?type=${filter.type}`}
            >
              {filter.label}
            </a>
          ))}
        </div>
      </header>

      <section className="seoContent browseDirectory" aria-label="Browse directory">
        {showAreas ? (
          <>
            <h2>Area Guides</h2>
            <div className="seoLinkGrid">
              {AREA_HUBS.map((hub) => (
                <a key={hub.slug} href={`/area/${hub.slug}`}>
                  <strong>{hub.name}</strong>
                  <span>Area guide</span>
                </a>
              ))}
            </div>
          </>
        ) : null}

        {showMarinas ? (
          <>
            <h2>Marinas</h2>
            <div className="seoLinkGrid">
              {SEO_MARINAS.map((marina) => (
                <a key={marina.slug} href={`/marina/${marina.slug}`}>
                  <strong>{marina.name}</strong>
                  <span>{marina.area}</span>
                </a>
              ))}
            </div>
          </>
        ) : null}

        {showLaunches ? (
          <>
            <h2>Launches</h2>
            <div className="seoLinkGrid">
              {SEO_LAUNCHES.map((launch) => (
                <a key={launch.slug} href={`/launch/${launch.slug}`}>
                  <strong>{launch.name}</strong>
                  <span>{launch.area}</span>
                </a>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function normalizeType(value?: string): BrowseType {
  return value === 'areas' || value === 'marinas' || value === 'launches' ? value : 'all';
}
