import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { LOCATIONS, type LocationId } from '../../lib/locations';
import { TRIP_MARINAS } from '../../lib/marinas';
import { degToCardinal, isoToLocalTime, round } from '../../lib/format';
import TripMap from './TripMap';

export const metadata: Metadata = {
  title: 'Freedom Boat - Plan My Trip',
  description: 'Map-based marina trip planner with forecasted boating conditions.'
};

type BaseCondition = {
  id: LocationId;
  name: string;
  marinaName: string;
  label: string;
  detail: string;
  tone: 'good' | 'caution' | 'bad';
  wind: string;
  rain: string;
  asOf?: string;
};

export default async function PlanMyTripPage() {
  const clubMarinas = TRIP_MARINAS.filter((m) => m.freedomClub && m.locationId);
  const baseConditions = await Promise.all(
    clubMarinas.map((m) => getBaseCondition(m.locationId as LocationId, m.name))
  );

  return (
    <main className="tripPage">
      <section className="tripMapPanel" aria-label="Plan my trip map">
        <TripMap marinas={TRIP_MARINAS} />
        <div className="tripMapShade" />

        <header className="tripTopBar">
          <a className="tripLogoLink" href="/location/port-moody" aria-label="Back to conditions">
            <img src="/fb-logo.svg?v=7" alt="" width={42} height={42} />
            <span>
              <b>Plan my trip</b>
              <span>Forecasted conditions + marinas</span>
            </span>
          </a>
          <div className="tripLegendPills" aria-label="Map legend">
            <span className="tripLegendPill tripLegendClub">Freedom Club Boat</span>
            <span className="tripLegendPill">Public marina</span>
          </div>
        </header>

        <div className="tripConditionRail" aria-label="Freedom Club Boat marina conditions">
          {baseConditions.map((base) => (
            <a key={base.id} className={`tripConditionCard tripTone-${base.tone}`} href={`/location/${base.id}`}>
              <span className="tripConditionName">{base.marinaName}</span>
              <strong>{base.label}</strong>
              <span>{base.wind}</span>
              <span>{base.rain}</span>
            </a>
          ))}
        </div>

      </section>

      <section className="tripSheet" aria-label="Marina results">
        <div className="tripSheetHandle" aria-hidden />
        <div className="tripSearchRow">
          <span className="tripSearchIcon" aria-hidden>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span>Marinas</span>
          <a href="/location/port-moody">Conditions</a>
        </div>

        <div className="tripSheetHeader">
          <div>
            <h1>Nearby marinas</h1>
            <p>{TRIP_MARINAS.length} public marina stops around Vancouver, Howe Sound, Gulf Islands, and Sidney.</p>
          </div>
          <div className="tripClubCount">3 club bases</div>
        </div>

        <div className="tripResults">
          {TRIP_MARINAS.map((marina) => (
            <a
              id={`marina-${marina.id}`}
              key={marina.id}
              className={`tripResultRow ${marina.freedomClub ? 'tripResultClub' : ''}`}
              href={marina.locationId ? `/location/${marina.locationId}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${marina.name} ${marina.address}`
              )}`}
              target={marina.locationId ? undefined : '_blank'}
              rel={marina.locationId ? undefined : 'noreferrer'}
            >
              <span className="tripResultIndex">{marina.id}</span>
              <span className="tripResultMain">
                <span className="tripResultTitle">
                  {marina.name}
                  {marina.freedomClub ? <em>Freedom Club Boat</em> : null}
                </span>
                <span className="tripResultAddress">{marina.address}</span>
              </span>
              <span className="tripResultArea">{marina.area}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}

async function getBaseCondition(id: LocationId, marinaName: string): Promise<BaseCondition> {
  const loc = LOCATIONS[id];
  const [nowRes, forecastRes] = await Promise.all([
    fetch(`${baseUrl()}/api/${id}/now`, { cache: 'no-store' }),
    fetch(`${baseUrl()}/api/${id}/forecast?hours=12`, { cache: 'no-store' })
  ]);

  const now = nowRes.ok ? await nowRes.json() : null;
  const forecast = forecastRes.ok ? await forecastRes.json() : null;
  const rows = forecast?.forecast ?? [];
  const wind = Number(now?.wind?.speedKts ?? rows[0]?.windSpeedKts ?? 0);
  const gust = Number(now?.wind?.gustKts ?? rows[0]?.windGustKts ?? wind);
  const maxWind = Math.max(wind, ...rows.slice(0, 6).map((h: any) => Number(h.windSpeedKts ?? 0)));
  const maxGust = Math.max(gust, ...rows.slice(0, 6).map((h: any) => Number(h.windGustKts ?? h.windSpeedKts ?? 0)));
  const rainHour = rows.slice(0, 8).find((h: any) => Number(h.precipProbPct ?? 0) >= 55 || Number(h.precipMm ?? 0) >= 1);
  const direction = degToCardinal(now?.wind?.directionDeg ?? null);

  let tone: BaseCondition['tone'] = 'good';
  let label = 'Go';
  let detail = 'Calmer forecast window';
  if (maxWind >= 22 || maxGust >= 30) {
    tone = 'bad';
    label = 'No-go';
    detail = 'Strong wind signal';
  } else if (maxWind >= 16 || maxGust >= 24 || rainHour) {
    tone = 'caution';
    label = 'Caution';
    detail = 'Watch wind or rain timing';
  }

  return {
    id,
    name: loc.name,
    marinaName,
    label,
    detail,
    tone,
    wind: `${round(wind, 0) ?? '-'} kt${direction ? ` ${direction}` : ''} now`,
    rain: rainHour ? `Rain risk ${isoToLocalTime(rainHour.t)}` : 'No strong rain signal',
    asOf: now?.asOf
  };
}

function baseUrl() {
  const h = headers();
  const forwardedHost = h.get('x-forwarded-host');
  const host = forwardedHost || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;

  if (envBase) return envBase;
  if (host) return `${proto}://${host}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}
