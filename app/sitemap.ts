import type { MetadataRoute } from 'next';
import { AREA_HUBS, canonicalUrl, marinaPath, SEO_LAUNCHES, SEO_MARINAS } from '../lib/seo-slugs';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    url('/plan-my-trip', lastModified, 'hourly', 1),
    url('/browse', lastModified, 'daily', 0.8),
    ...AREA_HUBS.map((hub) => url(`/area/${hub.slug}`, lastModified, 'daily', 0.8)),
    ...uniquePaths(SEO_MARINAS.map((marina) => marinaPath(marina))).map((path) => url(path, lastModified, 'hourly', 0.9)),
    ...SEO_LAUNCHES.map((launch) => url(`/launch/${launch.slug}`, lastModified, 'hourly', 0.85))
  ];
}

function uniquePaths(paths: string[]) {
  return Array.from(new Set(paths));
}

function url(path: string, lastModified: Date, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'], priority: number) {
  return {
    url: canonicalUrl(path),
    lastModified,
    changeFrequency,
    priority
  };
}
