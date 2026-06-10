import type { Metadata } from 'next';
import LocationPage from './location/[locationId]/page';
import HomeMarinaRedirect from './HomeMarinaRedirect';

export const metadata: Metadata = {
  title: 'Salish Sea Boat Planner: Marine Forecasts, Tides & Trip Planning',
  description:
    'Plan boating trips across the Salish Sea and Pacific Northwest with live wind, tides, marine warnings, daylight and a 0-100 boating conditions score.',
  alternates: {
    canonical: '/'
  }
};

export default async function HomePage() {
  return (
    <>
      <HomeMarinaRedirect />
      {await LocationPage({ params: { locationId: 'port-moody' } })}
    </>
  );
}
