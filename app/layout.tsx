import type { Metadata } from 'next';
import 'leaflet/dist/leaflet.css';
import './globals.css';
import { SITE_URL } from '../lib/seo-slugs';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Fair Tide - Salish Sea Boat Planner: Marine Forecasts, Tides & Trip Planning',
    template: '%s | Fair Tide'
  },
  description:
    'Plan boating trips across the Salish Sea and Pacific Northwest. Live marine forecasts, tides, wind and a 0-100 conditions score for marinas and anchorages across BC and Washington.',
  alternates: {
    canonical: '/'
  },
  openGraph: {
    title: 'Fair Tide - Salish Sea Boat Planner',
    description:
      'Live marine forecasts, tides, wind and a 0-100 boating conditions score for Salish Sea and Pacific Northwest destinations.',
    url: SITE_URL,
    type: 'website'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  const setScrollbarWidth = () => {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');
    document.documentElement.style.setProperty('--scrollbar-half-width', (scrollbarWidth / 2) + 'px');
  };
  setScrollbarWidth();
  requestAnimationFrame(setScrollbarWidth);
  window.addEventListener('load', setScrollbarWidth, { once: true });
  window.addEventListener('resize', setScrollbarWidth, { passive: true });
  new ResizeObserver(setScrollbarWidth).observe(document.documentElement);
})();
`
          }}
        />
        {children}
      </body>
    </html>
  );
}
