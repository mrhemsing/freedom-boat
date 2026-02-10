import { redirect } from 'next/navigation';

export default function HomePage() {
  // No landing page: go straight to the default dashboard.
  redirect('/location/port-moody');
}
