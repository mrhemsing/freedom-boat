import type { Metadata } from 'next';
import { ADDITIONAL_PUBLIC_MARINAS, FBC_PNW_MARINAS, TRIP_MARINAS } from '../../lib/marinas';
import { AREA_HUBS, SEO_LAUNCHES, SEO_MARINAS } from '../../lib/seo-slugs';
import MarinaJump from '../location/[locationId]/MarinaJump';
import TripMap from './TripMap';

export const metadata: Metadata = {
  title: 'FAIRTIDE - Plan My Trip',
  description: 'Map-based marina trip planner with forecasted boating conditions.'
};

export default function PlanMyTripPage() {
  return (
    <main className="container tripPlannerPage">
      <header className="topbar tripPlannerHeader">
        <div className="headerBrand">
          <a className="brand tripPlannerBrand" href="/location/port-moody" aria-label="FAIRTIDE home">
            <img className="fbLogo" src="/fb-logo.svg?v=7" alt="FAIRTIDE" width={72} height={72} />
            <span className="brandTitle">
              <span className="brandFreedom">FAIRTIDE</span>
            </span>
          </a>
        </div>

        <div className="headerInfo">
          <div className="tripPlannerKicker">Plan my trip</div>
          <div className="tripPlannerSubhead">Freedom Club marinas, public marinas, launches, tides, and day scores across the Pacific Northwest.</div>
          <div className="tripPlannerNav">
            <label htmlFor="marinaJump" className="miniNote tripPlannerJumpLabel">
              Marina:
            </label>
            <MarinaJump value="" placeholder="Select Freedom Club" />
          </div>
        </div>
      </header>

      <section className="tripPlannerPanel" aria-label="Plan my trip map">
        <TripMap marinas={[...TRIP_MARINAS, ...ADDITIONAL_PUBLIC_MARINAS, ...FBC_PNW_MARINAS]} />
      </section>

      <section className="seoContent plannerSeoLinks" aria-label="Browse boating condition pages">
        <h2>Browse Marina and Launch Conditions</h2>
        <div className="seoLinkGrid">
          {AREA_HUBS.map((hub) => (
            <a key={hub.slug} href={`/area/${hub.slug}`}>
              <strong>{hub.name}</strong>
              <span>Area guide</span>
            </a>
          ))}
        </div>
        <div className="seoLinkGrid">
          {SEO_MARINAS.map((marina) => (
            <a key={marina.slug} href={`/marina/${marina.slug}`}>
              <strong>{marina.name}</strong>
              <span>{marina.area}</span>
            </a>
          ))}
          {SEO_LAUNCHES.map((launch) => (
            <a key={launch.slug} href={`/launch/${launch.slug}`}>
              <strong>{launch.name}</strong>
              <span>{launch.area}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="siteFooter">
        <section className="sourceLegend" aria-label="Data sources">
          <div className="sourceLegendTitle">Data sources</div>
          <ul className="sourceLegendList">
            <li>
              <span>Conditions + forecast</span>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo Forecast API</a>
            </li>
            <li>
              <span>Marine advisories</span>
              <a href="https://weather.gc.ca/rss/warning/bc_e.xml" target="_blank" rel="noreferrer">Environment Canada warnings RSS</a>
            </li>
            <li>
              <span>Tides + water levels</span>
              <a href="https://api-iwls.dfo-mpo.gc.ca/" target="_blank" rel="noreferrer">DFO / Canadian Hydrographic Service IWLS</a>
            </li>
          </ul>
        </section>
        <div className="footerBrandRow">
          <span>© {new Date().getFullYear()}</span>
          <a className="baBadge baBadgeWhite" href="https://www.b-average.com/" target="_blank" rel="noreferrer">B AVERAGE</a>
        </div>
      </footer>
    </main>
  );
}
