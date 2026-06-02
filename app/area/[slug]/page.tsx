import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { breadcrumbJsonLd } from '../../../lib/seo-schema';
import { AREA_HUBS, canonicalUrl, getAreaHubBySlug, marinaPath, SEO_LAUNCHES, SEO_MARINAS } from '../../../lib/seo-slugs';
import GlobalHeader from '../../GlobalHeader';

export const revalidate = 86400;

export function generateStaticParams() {
  return AREA_HUBS.map((hub) => ({ slug: hub.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const hub = getAreaHubBySlug(params.slug);
  if (!hub) return {};
  return {
    title: `${hub.name} Marinas, Marine Parks, Boat Launches & Boating Conditions | Fairtide`,
    description: hub.description,
    alternates: {
      canonical: canonicalUrl(`/area/${hub.slug}`)
    }
  };
}

export default function AreaHubPage({ params }: { params: { slug: string } }) {
  const hub = getAreaHubBySlug(params.slug);
  if (!hub) return notFound();

  const marinas = SEO_MARINAS.filter((marina) => hub.match(marina));
  const launches = SEO_LAUNCHES.filter((launch) => hub.match(launch));

  return (
    <main className="container seoPage">
      <GlobalHeader active="area" contextLabel={hub.name} />
      <header className="seoHero">
        <nav className="seoBreadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <a href="/browse">Browse</a>
          <span>/</span>
          <span>{hub.name}</span>
        </nav>
        <h1>{hub.name} Destinations, Boat Launches & Boating Conditions</h1>
        <p>{hub.description}</p>
        <div className="seoActions">
          <a className="seoButton seoButtonPrimary" href="/plan-my-trip">Open interactive map</a>
          <a className="seoButton" href="/area/pacific-northwest">All Pacific Northwest areas</a>
        </div>
      </header>

      <section className="seoContent">
        <h2>{hub.name} Destinations</h2>
        <div className="seoLinkGrid">
          {marinas.map((marina) => (
            <a key={marina.slug} href={marinaPath(marina)}>
              <strong>{marina.name}</strong>
              <span>{marina.area}</span>
            </a>
          ))}
        </div>

        <h2>{hub.name} Boat Launches</h2>
        <div className="seoLinkGrid">
          {launches.map((launch) => (
            <a key={launch.slug} href={`/launch/${launch.slug}`}>
              <strong>{launch.name}</strong>
              <span>{launch.area}</span>
            </a>
          ))}
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([
            ['Home', '/'],
            [hub.name, `/area/${hub.slug}`]
          ]))
        }}
      />
    </main>
  );
}
