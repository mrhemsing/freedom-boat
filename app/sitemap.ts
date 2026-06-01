import type { MetadataRoute } from 'next';
import { AREA_HUBS, canonicalUrl, SEO_LAUNCHES, SEO_MARINAS } from '../lib/seo-slugs';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    url('/plan-my-trip', lastModified, 'hourly', 1),
    ...AREA_HUBS.map((hub) => url(`/area/${hub.slug}`, lastModified, 'daily', 0.8)),
    ...SEO_MARINAS.map((marina) => url(`/marina/${marina.slug}`, lastModified, 'hourly', 0.9)),
    ...SEO_LAUNCHES.map((launch) => url(`/launch/${launch.slug}`, lastModified, 'hourly', 0.85))
  ];
}

function url(path: string, lastModified: Date, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'], priority: number) {
  return {
    url: canonicalUrl(path),
    lastModified,
    changeFrequency,
    priority
  };
}
