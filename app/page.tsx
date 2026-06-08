import type { Metadata } from 'next';
import LocationPage from './location/[locationId]/page';
import HomeMarinaRedirect from './HomeMarinaRedirect';

export const metadata: Metadata = {
  title: 'Fair Tide Boat Planner - Port Moody',
  description: 'Hyper-local boating conditions for Port Moody.'
};

export default async function HomePage() {
  return (
    <>
      <HomeMarinaRedirect />
      {await LocationPage({ params: { locationId: 'port-moody' } })}
    </>
  );
}
