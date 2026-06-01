import type { Metadata } from 'next';
import { ADDITIONAL_PUBLIC_MARINAS, TRIP_MARINAS } from '../../lib/marinas';
import TripMap from './TripMap';

export const metadata: Metadata = {
  title: 'Freedom Boat - Plan My Trip',
  description: 'Map-based marina trip planner with forecasted boating conditions.'
};

export default function PlanMyTripPage() {
  return (
    <main className="container tripPlannerPage">
      <header className="topbar tripPlannerHeader">
        <div className="headerBrand">
          <a className="brand tripPlannerBrand" href="/location/port-moody" aria-label="Freedom Boat Planner home">
            <img className="fbLogo" src="/fb-logo.svg?v=7" alt="Freedom Boat Planner" width={72} height={72} />
            <span className="brandTitle">
              <span className="brandFreedom">FREEDOM</span>
              <span className="brandBoat">BOAT PLANNER</span>
            </span>
          </a>
        </div>

        <div className="headerInfo">
          <div className="tripPlannerKicker">Plan my trip</div>
          <div className="tripPlannerSubhead">Marinas, launches, tides, and day scores around the Salish Sea.</div>
          <div className="tripPlannerNav">
            <a className="seg" href="/location/port-moody">Port Moody</a>
            <a className="seg" href="/location/west-vancouver">West Vancouver</a>
            <a className="seg" href="/location/north-saanich">North Saanich</a>
          </div>
        </div>
      </header>

      <section className="tripPlannerPanel" aria-label="Plan my trip map">
        <TripMap marinas={[...TRIP_MARINAS, ...ADDITIONAL_PUBLIC_MARINAS]} />
      </section>
    </main>
  );
}
