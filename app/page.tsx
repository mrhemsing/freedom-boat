import type { Metadata } from 'next';
import { AREA_HUBS, SEO_MARINAS, marinaPath } from '../lib/seo-slugs';
import GlobalHeader from './GlobalHeader';
import HomeMarinaRedirect from './HomeMarinaRedirect';

export const metadata: Metadata = {
  title: {
    absolute: 'Fair Tide - Salish Sea Boat Planner: Marine Forecasts, Tides & Trip Planning'
  },
  description:
    'Plan boating trips across the Salish Sea and Pacific Northwest. Live marine forecasts, tides, wind and a 0-100 conditions score for 170+ marinas and anchorages across BC and Washington.',
  alternates: {
    canonical: '/'
  }
};

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

export default function HomePage() {
  return (
    <main className="container homeHubPage">
      <HomeMarinaRedirect />
      <GlobalHeader active="home" />

      <section className="homeHero" aria-label="Fair Tide overview">
        <div className="homeHeroCopy">
          <div className="homeEyebrow">Salish Sea boat planner</div>
          <h1>Marine forecasts, tides, and trip planning for Pacific Northwest boating days.</h1>
          <p>
            Fair Tide turns wind, tide, daylight, rain, and marine advisories into a live 0-100 boating conditions score for marinas, anchorages, launches, and home-marina trip planning.
          </p>
          <div className="homeHeroActions">
            <a className="seoButton seoButtonPrimary" href="/browse">Browse destinations</a>
            <a className="seoButton" href="/plan-my-trip">Open trip planner</a>
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

      <section className="homeEntryGrid" aria-label="Featured boating regions">
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
    </main>
  );
}
