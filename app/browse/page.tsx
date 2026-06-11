import type { Metadata } from 'next';
import { AREA_HUBS, canonicalUrl, marinaPath, SEO_LAUNCHES, SEO_MARINAS } from '../../lib/seo-slugs';
import GlobalHeader from '../GlobalHeader';

type BrowseType = 'all' | 'areas' | 'marinas' | 'launches';

const FILTERS: { label: string; type: BrowseType }[] = [
  { label: 'All', type: 'all' },
  { label: 'Areas', type: 'areas' },
  { label: 'Destinations', type: 'marinas' },
  { label: 'Launches', type: 'launches' }
];

const featuredAreas = AREA_HUBS.filter((hub) => [
  'salish-sea',
  'puget-sound',
  'gulf-islands',
  'howe-sound',
  'lake-washington-lake-union',
  'north-idaho'
].includes(hub.slug));

const featuredHomeMarinas = SEO_MARINAS
  .filter((marina) => marina.freedomClub && marina.locationId)
  .slice(0, 8);

export const metadata: Metadata = {
  title: 'Browse Fair Tide: Salish Sea Regions, Marinas, Launches & Club Pages',
  description: 'Browse Fair Tide region guides, marina condition pages, public boat launches, and home-marina planning pages across the Pacific Northwest.',
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
      <GlobalHeader active="browse" contextLabel="Directory" />
      <header className="seoHero">
        <nav className="seoBreadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
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

      {activeType === 'all' ? (
        <>
          <section className="homeHero browseOverview" aria-label="Fair Tide overview">
            <div className="homeHeroCopy">
              <div className="homeEyebrow">Salish Sea boat planner</div>
              <h2>Marine forecasts, tides, and trip planning for Pacific Northwest boating days.</h2>
              <p>
                Fair Tide turns wind, tide, daylight, rain, and marine advisories into a live 0-100 boating conditions score for marinas, anchorages, launches, and home-marina trip planning.
              </p>
              <div className="homeHeroActions">
                <a className="seoButton seoButtonPrimary" href="/plan-my-trip?overview=all">Open trip planner</a>
                <a className="seoButton" href="/browse?type=areas">Browse regions</a>
              </div>
            </div>

            <div className="homeConditionPanel">
              <div className="homeScore">
                <span>Live planning surface</span>
                <strong>170+</strong>
                <em>PNW destinations</em>
              </div>
              <dl className="homeMetrics">
                <div><dt>Conditions</dt><dd>Wind · tides · advisories</dd></div>
                <div><dt>Coverage</dt><dd>BC · WA · OR · ID</dd></div>
                <div><dt>Use case</dt><dd>Check before you book</dd></div>
              </dl>
            </div>
          </section>

          <section className="homeEntryGrid browseFeaturedRegions" aria-label="Featured boating regions">
            {featuredAreas.map((hub) => (
              <a key={hub.slug} className="homeEntry" href={`/area/${hub.slug}`}>
                <span>Region guide</span>
                <strong>{hub.name}</strong>
                <p>{hub.description}</p>
              </a>
            ))}
          </section>

          <section className="seoContent homeClubSection" aria-label="Home marina condition pages">
            <h2>Home-Marina Condition Pages</h2>
            <p>Start with the marina you book from, then move into the map when you are ready to plan the route.</p>
            <div className="seoLinkGrid">
              {featuredHomeMarinas.map((marina) => (
                <a key={marina.slug} href={marinaPath(marina)}>
                  <strong>{marina.name.replace('Freedom Boat Club ', '')}</strong>
                  <span>{marina.area}</span>
                </a>
              ))}
            </div>
          </section>
        </>
      ) : null}

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
            <h2>Destinations</h2>
            <div className="seoLinkGrid">
              {SEO_MARINAS.map((marina) => (
                <a key={marina.slug} href={marinaPath(marina)}>
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
