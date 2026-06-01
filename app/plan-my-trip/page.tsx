import type { Metadata } from 'next';
import { ADDITIONAL_PUBLIC_MARINAS, FBC_PNW_MARINAS, TRIP_MARINAS, type Marina } from '../../lib/marinas';
import { seoSlugForMarina } from '../../lib/seo-slugs';
import TripMap from './TripMap';

export const metadata: Metadata = {
  title: 'FAIRTIDE Boat Planner',
  description: 'Map-based marina trip planner with forecasted boating conditions.'
};

export default function PlanMyTripPage() {
  const freedomMarinas = [...TRIP_MARINAS, ...FBC_PNW_MARINAS]
    .filter((marina) => marina.freedomClub)
    .sort(compareFreedomMenuMarinas);

  return (
    <main className="container tripPlannerPage">
      <header className="topbar tripPlannerHeader">
        <div className="headerBrand">
          <a className="brand tripPlannerBrand" href="/location/port-moody" aria-label="FAIRTIDE home">
            <img className="fbLogo" src="/fb-logo.svg?v=7" alt="FAIRTIDE" width={72} height={72} />
            <span className="brandTitle">
              <span className="brandFreedom">FAIRTIDE</span>
              <span className="brandBoat">BOAT PLANNER</span>
            </span>
          </a>
        </div>

        <div className="headerInfo">
          <div className="tripPlannerKicker">Plan my trip</div>
          <div className="tripPlannerSubhead">Freedom Club marinas, public marinas, launches, tides, and day scores across the Pacific Northwest.</div>
          <details className="tripPlannerMenu">
            <summary aria-label="Open marina menu">
              <span />
              <span />
              <span />
            </summary>
            <div className="tripPlannerMenuPanel" aria-label="Freedom Club marinas">
              <div className="tripPlannerMenuTitle">Freedom Club Marinas</div>
              {freedomMarinas.map((marina) => (
                <a key={marina.id} href={`/marina/${seoSlugForMarina(marina)}`}>
                  <strong>{marina.name.replace('Freedom Boat Club ', '')}</strong>
                  <span>{marina.area}</span>
                </a>
              ))}
              <a className="tripPlannerMenuAll" href="/browse?type=marinas">Browse all marinas</a>
            </div>
          </details>
          <div className="tripPlannerNav">
            <a className="tripPlannerBrowse" href="/browse">Browse directory</a>
          </div>
        </div>
      </header>

      <section className="tripPlannerPanel" aria-label="Plan my trip map">
        <TripMap marinas={[...TRIP_MARINAS, ...ADDITIONAL_PUBLIC_MARINAS, ...FBC_PNW_MARINAS]} />
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

function compareFreedomMenuMarinas(a: Marina, b: Marina) {
  return (
    featuredFreedomRank(a) - featuredFreedomRank(b) ||
    regionRank(a) - regionRank(b) ||
    a.area.localeCompare(b.area) ||
    a.name.localeCompare(b.name)
  );
}

function featuredFreedomRank(marina: Marina) {
  return marina.name === 'Reed Point Marina' ? 0 : 1;
}

function regionRank(marina: Marina) {
  const region = marina.address.match(/,\s*(BC|WA|OR|ID)\b/)?.[1];
  if (region === 'BC') return 0;
  if (region === 'WA') return 1;
  if (region === 'OR') return 2;
  if (region === 'ID') return 3;
  return 4;
}
