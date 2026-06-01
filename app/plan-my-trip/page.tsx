import type { Metadata } from 'next';
import { ADDITIONAL_PUBLIC_MARINAS, TRIP_MARINAS } from '../../lib/marinas';
import TripMap from './TripMap';

export const metadata: Metadata = {
  title: 'Freedom Boat - Plan My Trip',
  description: 'Map-based marina trip planner with forecasted boating conditions.'
};

export default function PlanMyTripPage() {
  return (
    <main className="tripPage">
      <TripMap marinas={[...TRIP_MARINAS, ...ADDITIONAL_PUBLIC_MARINAS]} />
    </main>
  );
}
