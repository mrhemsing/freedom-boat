import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { SITE_URL } from '../lib/seo-slugs';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'FAIRTIDE',
  description: 'Hyper-local boating conditions for Port Moody, West Vancouver, and North Saanich.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>{children}</body>
    </html>
  );
}
