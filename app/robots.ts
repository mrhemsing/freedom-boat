import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/seo-slugs';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/plan-my-trip?*',
        '/*?overview=*',
        '/*?marina=*',
        '/*?route=*',
        '/*?plan=*',
        '/*?embed=*'
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
