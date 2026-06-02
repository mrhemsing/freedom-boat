import type { Metadata } from 'next';
import LocationPage from './location/[locationId]/page';

export const metadata: Metadata = {
  title: 'FAIRTIDE Boat Planner - Port Moody',
  description: 'Hyper-local boating conditions for Port Moody.'
};

export default function HomePage() {
  return <LocationPage params={{ locationId: 'port-moody' }} />;
}
