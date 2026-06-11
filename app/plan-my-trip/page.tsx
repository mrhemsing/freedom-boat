import type { Metadata } from 'next';
import { FBC_PNW_MARINAS, PLANNER_MARINAS, TRIP_MARINAS, type Marina } from '../../lib/marinas';
import { canonicalUrl, marinaPath } from '../../lib/seo-slugs';
import GlobalHeader from '../GlobalHeader';
import SiteFooter from '../SiteFooter';
import TripMap from './TripMap';

const baseMetadata: Metadata = {
  title: 'Salish Sea Boating Trip Planner',
  description:
    'Plan Pacific Northwest boating trips with destination distances, live wind, tides, daylight, marine warnings, and Fair Tide day scores.',
  alternates: {
    canonical: canonicalUrl('/plan-my-trip')
  }
};

export function generateMetadata({
  searchParams
}: {
  searchParams?: { marina?: string; overview?: string; plan?: string; route?: string };
}): Metadata {
  const hasTripState = Boolean(searchParams?.marina || searchParams?.overview || searchParams?.plan || searchParams?.route);
  return {
    ...baseMetadata,
    robots: hasTripState ? { index: false, follow: true } : undefined
  };
}

export default function PlanMyTripPage() {
  const freedomMarinas = [...TRIP_MARINAS, ...FBC_PNW_MARINAS]
    .filter((marina) => marina.freedomClub)
    .sort(compareFreedomMenuMarinas);
  const freedomMenuRows = buildFreedomMenuRows(freedomMarinas);

  return (
    <main className="tripPlannerPage">
      <GlobalHeader active="map" />
      <div className="tripPlannerMenuRow">
        <div className="tripPlannerSubhead">Freedom Club marinas, public marinas, launches, tides, and day scores across the Pacific Northwest.</div>
        <details className="tripPlannerMenu">
          <summary aria-label="Open marina menu">
            <span />
            <span />
            <span />
          </summary>
          <div className="tripPlannerMenuPanel" aria-label="Freedom Club marinas">
            <div className="tripPlannerMenuTitle">Freedom Club Marinas</div>
            {freedomMenuRows.map((row) => row.kind === 'divider' ? (
              <div key={row.label} className="tripPlannerMenuDivider">{row.label}</div>
            ) : (
              <a key={row.marina.id} href={marinaPath(row.marina)}>
                <strong>{row.marina.name.replace('Freedom Boat Club ', '')}</strong>
                <span>{row.marina.area}</span>
              </a>
            ))}
            <a className="tripPlannerMenuAll" href="/browse?type=marinas">Browse all marinas</a>
          </div>
        </details>
      </div>

      <section className="tripPlannerPanel" aria-label="Plan my trip map">
        <TripMap marinas={PLANNER_MARINAS} />
      </section>

      <SiteFooter />
    </main>
  );
}

type FreedomMenuRow =
  | { kind: 'divider'; label: string }
  | { kind: 'marina'; marina: Marina };

const BC_MENU_AREA_ORDER = new Map([
  ['Port Moody', 0],
  ['West Vancouver', 1],
  ['North Saanich', 2],
  ['Oak Bay', 3]
]);

function compareFreedomMenuMarinas(a: Marina, b: Marina) {
  return (
    regionRank(a) - regionRank(b) ||
    withinRegionRank(a) - withinRegionRank(b) ||
    a.name.localeCompare(b.name)
  );
}

function buildFreedomMenuRows(marinas: Marina[]): FreedomMenuRow[] {
  const rows: FreedomMenuRow[] = [];
  let previousRegion = 'BC';

  for (const marina of marinas) {
    const region = menuRegion(marina);
    if (region !== previousRegion) {
      rows.push({ kind: 'divider', label: regionLabel(region) });
      previousRegion = region;
    }
    rows.push({ kind: 'marina', marina });
  }

  return rows;
}

function withinRegionRank(marina: Marina) {
  if (menuRegion(marina) === 'BC') {
    return BC_MENU_AREA_ORDER.get(marina.area) ?? 99;
  }

  return -marina.lat;
}

function regionRank(marina: Marina) {
  const region = menuRegion(marina);
  if (region === 'BC') return 0;
  if (region === 'WA') return 1;
  if (region === 'OR') return 2;
  if (region === 'ID') return 3;
  return 4;
}

function menuRegion(marina: Marina) {
  return marina.address.match(/,\s*(BC|WA|OR|ID)\b/)?.[1] ?? 'OTHER';
}

function regionLabel(region: string) {
  if (region === 'WA') return 'Washington';
  if (region === 'OR') return 'Oregon';
  if (region === 'ID') return 'Idaho';
  return region;
}
