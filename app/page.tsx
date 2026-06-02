import type { Metadata } from 'next';
import GlobalHeader from './GlobalHeader';
import { degToCardinal, round } from '../lib/format';
import { LOCATIONS } from '../lib/locations';
import { buildWeeklyOutlook, type DailyOutlook } from '../lib/outlook';
import { getLocationWeatherSnapshot } from '../lib/weather-snapshots';

const HOME_LOCATION_ID = 'port-moody';

export const metadata: Metadata = {
  title: 'FAIRTIDE Boat Planner',
  description: 'Personalized boating conditions, marina map, and trip planning for the Pacific Northwest.'
};

export default async function HomePage() {
  const loc = LOCATIONS[HOME_LOCATION_ID];
  const weatherSnapshot = await getLocationWeatherSnapshot(HOME_LOCATION_ID).catch(() => null);
  const now = weatherSnapshot?.now ?? null;
  const week = weatherSnapshot
    ? buildWeeklyOutlook(weatherSnapshot.forecast.slice(0, 120), weatherSnapshot.sunByDay, 5)
    : [];
  const today = week[0] ?? null;
  const best = week.reduce((acc, day) => (acc == null || day.score > acc.score ? day : acc), null as DailyOutlook | null);
  const score = today?.score ?? null;
  const wind = now?.wind?.speedKts;
  const gust = now?.wind?.gustKts;
  const direction = degToCardinal(now?.wind?.directionDeg);

  return (
    <main className="container homeHubPage">
      <GlobalHeader active="home" contextLabel="Home marina" />

      <section className="homeHero" aria-label="Home marina conditions">
        <div className="homeHeroCopy">
          <span className="homeEyebrow">Home marina</span>
          <h1>{loc.name} boating conditions</h1>
          <p>{loc.address}</p>
          <div className="homeHeroActions">
            <a className="seoButton seoButtonPrimary" href="/plan-my-trip?marina=reed-point-marina-6">Open on map</a>
            <a className="seoButton" href="/browse">Browse directory</a>
          </div>
        </div>

        <div className="homeConditionPanel" aria-label={`${loc.name} current snapshot`}>
          <div className="homeScore">
            <span>Today</span>
            <strong>{score ?? '--'}</strong>
            <em>{scoreLabel(score)}</em>
          </div>
          <dl className="homeMetrics">
            <div>
              <dt>Wind</dt>
              <dd>{wind != null ? `${round(wind, 0)} kt${direction ? ` ${direction}` : ''}` : '--'}</dd>
            </div>
            <div>
              <dt>Gust</dt>
              <dd>{gust != null ? `${round(gust, 0)} kt` : '--'}</dd>
            </div>
            <div>
              <dt>Best day</dt>
              <dd>{best?.label ?? '--'}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="homeEntryGrid" aria-label="Fairtide surfaces">
        <a className="homeEntry" href="/plan-my-trip">
          <span>Map</span>
          <strong>Plan spatially</strong>
          <p>Explore marinas, launches, pins, day scores, and your float plan on the interactive map.</p>
        </a>
        <a className="homeEntry" href="/browse">
          <span>Browse</span>
          <strong>Scan the directory</strong>
          <p>Move through areas, destinations, and launches without losing the canonical conditions pages.</p>
        </a>
        <a className="homeEntry" href="/location/port-moody">
          <span>Conditions</span>
          <strong>Open Port Moody detail</strong>
          <p>Use the standalone canonical page for the full forecast, tides, advisories, and live look.</p>
        </a>
      </section>
    </main>
  );
}

function scoreLabel(score: number | null) {
  if (score == null) return 'Forecast unavailable';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}
