import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { LOCATIONS, type LocationId } from '../../../lib/locations';
import { isoToLocalDay, round } from '../../../lib/format';
import { AlertFeed, Card, ForecastStrip, KpiRow, TideList, WindArrow } from './ui';
import { TideMiniChart, WindChart } from './charts';
import { IconMap, IconRain, IconSunrise, IconSunset, IconThermometer, IconTide, IconWind } from './icons';

export default async function LocationPage({
  params
}: {
  params: { locationId: string };
}) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) return notFound();

  const [nowRes, forecastRes, tidesRes] = await Promise.all([
    fetch(`${baseUrl()}/api/${params.locationId}/now`, { cache: 'no-store' }),
    fetch(`${baseUrl()}/api/${params.locationId}/forecast?hours=120`, {
      cache: 'no-store'
    }),
    fetch(`${baseUrl()}/api/${params.locationId}/tides?days=2`, { cache: 'no-store' })
  ]);

  const now = nowRes.ok ? await nowRes.json() : null;
  const forecast = forecastRes.ok ? await forecastRes.json() : null;
  const tides = tidesRes.ok ? await tidesRes.json() : null;

  const alerts = computeDefaultAlerts({ now, forecast: forecast?.forecast ?? [] });

  const windSpeed = now?.wind?.speedKts;
  const gust = now?.wind?.gustKts;
  const dir = now?.wind?.directionDeg;

  return (
    <main className="container">
      <header className="topbar">
        <div>
          <div className="brand" style={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.2, fontSize: 27 }}>Freedom Boat Planner</div>
          </div>
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.78)', fontSize: 13 }}>
            <b style={{ color: 'rgba(255,255,255,0.92)' }}>{loc.name}</b>
            {now?.asOf ? <span style={{ opacity: 0.75 }}>{` • as of ${formatAsOf(now.asOf)}`}</span> : null}
          </div>
          {loc.address ? <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{loc.address}</div> : null}
          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a className={`seg ${id === 'port-moody' ? 'segActive' : ''}`} href="/location/port-moody">Port Moody</a>
            <a className={`seg ${id === 'north-saanich' ? 'segActive' : ''}`} href="/location/north-saanich">North Saanich</a>
          </div>
        </div>
        <div className="sunBadgeWrap" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="badge" style={{ padding: 8, alignItems: 'stretch', borderRadius: 14 }}>
            <span style={{ display: 'grid', gap: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255, 206, 64, 0.95)' }}>
                <span style={{ display: 'inline-flex' }}><IconSunrise size={16} /></span>
                <span style={{ color: 'rgba(255,255,255,0.90)' }}>{now?.sun?.sunrise ? formatAsOf(now.sun.sunrise) : '—'}</span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(251, 113, 133, 0.95)' }}>
                <span style={{ display: 'inline-flex' }}><IconSunset size={16} /></span>
                <span style={{ color: 'rgba(255,255,255,0.90)' }}>{now?.sun?.sunset ? formatAsOf(now.sun.sunset) : '—'}</span>
              </span>
            </span>
          </span>
        </div>
      </header>

      <div className="grid" style={{ marginTop: 24 }}>
        <Card
          title="Weekly outlook (best boating day highlighted)"
          icon={<span style={{ fontWeight: 900 }}>★</span>}
          right={<span>daytime (8am–6pm)</span>}
          headerStackOnMobile
        >
          {(() => {
            const week = buildWeeklyOutlook(forecast?.forecast ?? [], 5);
            const best = week.reduce((acc, d) => (acc == null || d.score > acc.score ? d : acc), null as DailyOutlook | null);
            if (!week.length) return <div className="miniNote">No forecast available.</div>;
            return (
              <div className="outlookGrid">
                {week.map((d) => {
                  const isBest = best?.day === d.day;
                  return (
                    <div key={d.day} className={`dayBox ${isBest ? 'dayBest' : ''}`}>
                      <div className="dayTitle">{d.label}</div>
                      <div className="dayScore">{d.score}/100</div>
                      <div className="dayMeta">
                        <div>max wind: {round(d.maxWind, 0)} kt</div>
                        <div>max gust: {round(d.maxGust, 0)} kt</div>
                        <div>precip chance: {round(d.maxPrecipProb, 0)}%</div>
                        <div>rain total: {round(d.totalPrecipMm, 1)} mm</div>
                      </div>
                      {isBest ? (
                        <div style={{ marginTop: 10 }} className="pill sevInfo">
                          <span style={{ fontWeight: 900 }}>⛵</span>
                          Best day
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </Card>

        <Card title="Live look" icon={<IconWind />} right={<span>Wind · Temp · Rain</span>}>
          <KpiRow
            items={[
              {
                label: '',
                value: (
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid rgba(11,18,32,0.10)',
                      height: 180
                    }}
                  >
                    <iframe
                      title={`${loc.name} mini map`}
                      width="100%"
                      height="240"
                      style={{ border: 0, display: 'block', transform: 'translateY(-22px)' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                        `${loc.lon - 0.015},${loc.lat - 0.01},${loc.lon + 0.015},${loc.lat + 0.01}`
                      )}&layer=mapnik&marker=${encodeURIComponent(`${loc.lat},${loc.lon}`)}`}
                    />
                  </div>
                )
              },
              {
                label: 'Wind',
                icon: <IconWind />,
                value: `${round(windSpeed, 0) ?? '—'} kt`,
                sub: (
                  <span>
                    gust {round(gust, 0) ?? '—'} · <WindArrow deg={dir} />
                  </span>
                )
              },
              {
                label: 'Temp',
                icon: <IconThermometer />,
                value: now?.tempC != null ? `${round(now.tempC, 0)}°C` : '—'
              },
              {
                label: 'Precip (mm/hr)',
                icon: <IconRain />,
                value: now?.precipMmHr != null ? String(round(now?.precipMmHr, 1)) : '—'
              }
            ]}
          />
        </Card>

        <Card title="Wind (next 24h)" icon={<IconWind />} right={<span>speed + gust</span>}>
          <WindChart forecast={forecast?.forecast ?? []} />
          <hr className="soft" />
          <ForecastStrip forecast={forecast?.forecast ?? []} />
        </Card>

        <Card title="Alerts" icon={<span style={{ fontWeight: 900 }}>!</span>}>
          <AlertFeed items={alerts} />
        </Card>

        <Card
          title="Tides"
          icon={<IconTide />}
          right={
            tides?.station?.name ? (
              <span>
                {tides.station.name} · {Math.round(tides.station.distanceKm)} km
              </span>
            ) : (
              '—'
            )
          }
        >
          <TideMiniChart events={tides?.events ?? []} />
          <hr className="soft" />
          <TideList events={tides?.events ?? []} />
        </Card>

        <details>
          <summary style={{ listStyle: 'none' }}>
            <div style={{ cursor: 'pointer' }}>
              <Card title="Map" icon={<IconMap />} right={<span>click to expand</span>}>
                <div className="miniNote">Tap to expand the embedded map.</div>
              </Card>
            </div>
          </summary>
          <div style={{ marginTop: 10 }}>
            <Card title="Map" icon={<IconMap />}>
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(11,18,32,0.10)' }}>
                <iframe
                  title={`${loc.name} map`}
                  width="100%"
                  height="340"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                    `${loc.lon - 0.03},${loc.lat - 0.02},${loc.lon + 0.03},${loc.lat + 0.02}`
                  )}&layer=mapnik&marker=${encodeURIComponent(`${loc.lat},${loc.lon}`)}`}
                />
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(11,18,32,0.62)' }}>
                <a
                  href={`https://www.openstreetmap.org/?mlat=${loc.lat}&mlon=${loc.lon}#map=13/${loc.lat}/${loc.lon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in OpenStreetMap
                </a>
              </div>
            </Card>
          </div>
        </details>
      </div>
    </main>
  );
}

function baseUrl() {
  // In prod (Vercel), never call back to localhost. Build an absolute URL from forwarded headers.
  const h = headers();
  const forwardedHost = h.get('x-forwarded-host');
  const host = forwardedHost || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';

  // Optional explicit override (useful for local dev or unusual proxies)
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase;

  if (host) return `${proto}://${host}`;

  // Vercel fallback
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;

  return 'http://localhost:3000';
}

type DailyOutlook = {
  day: string; // YYYY-MM-DD
  label: string;
  score: number;
  maxWind: number;
  maxGust: number;
  maxPrecipProb: number;
  totalPrecipMm: number;
};

function buildWeeklyOutlook(forecast: Array<{ t: string; windSpeedKts: number; windGustKts?: number; precipMm?: number; precipProbPct?: number }>, days = 5): DailyOutlook[] {
  const byDay = new Map<string, any[]>();
  for (const h of forecast || []) {
    const day = typeof h.t === 'string' ? h.t.slice(0, 10) : null;
    if (!day) continue;

    // focus on "daytime" hours (local time string from Open-Meteo due to timezone param)
    const hour = Number(h.t.slice(11, 13));
    if (!Number.isFinite(hour)) continue;
    if (hour < 8 || hour > 18) continue;

    const arr = byDay.get(day) ?? [];
    arr.push(h);
    byDay.set(day, arr);
  }

  const daysSorted = [...byDay.keys()].sort().slice(0, days);
  const out: DailyOutlook[] = [];

  for (const day of daysSorted) {
    const rows = byDay.get(day) ?? [];
    const maxWind = Math.max(...rows.map((r) => (typeof r.windSpeedKts === 'number' ? r.windSpeedKts : 0)), 0);
    const maxGust = Math.max(...rows.map((r) => (typeof r.windGustKts === 'number' ? r.windGustKts : r.windSpeedKts ?? 0)), 0);
    const maxPrecipProb = Math.max(...rows.map((r) => (typeof r.precipProbPct === 'number' ? r.precipProbPct : 0)), 0);
    const totalPrecipMm = rows.reduce((acc, r) => acc + (typeof r.precipMm === 'number' ? r.precipMm : 0), 0);

    // Heuristic score: lower gust + lower precip probability + lower total precip wins.
    // 100 is best, 0 is worst.
    const raw = 100 - (maxGust * 2.2 + maxWind * 0.6 + maxPrecipProb * 0.6 + totalPrecipMm * 6);
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    out.push({
      day,
      label: isoToLocalDay(`${day}T12:00:00`),
      score,
      maxWind,
      maxGust,
      maxPrecipProb,
      totalPrecipMm
    });
  }

  return out;
}

function formatAsOf(iso: string) {
  // Open-Meteo returns timestamps *without* a timezone suffix when you pass `timezone=...`.
  // If we parse those with `new Date()` on the server (UTC) vs client (local), you can get wrong hours.
  // So: if there's no timezone designator, treat it as a local clock time and format it manually.
  const s = String(iso || '');
  const hasTz = /([zZ]|[+-]\d{2}:?\d{2})$/.test(s);
  if (!hasTz) {
    const m = s.match(/T(\d{2}):(\d{2})/);
    if (m) {
      let hh = Number(m[1]);
      const mm = m[2];
      if (!Number.isFinite(hh)) return s;
      const ampm = hh >= 12 ? 'PM' : 'AM';
      hh = hh % 12;
      if (hh === 0) hh = 12;
      return `${hh}:${mm} ${ampm}`;
    }
    return s;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  // Force stable formatting across server/client to avoid hydration mismatch.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function envCanadaWindCategory(speedKts: number | null | undefined) {
  const v = typeof speedKts === 'number' && Number.isFinite(speedKts) ? speedKts : null;
  if (v == null) return null;

  // Environment Canada marine wind warning categories (sustained wind, excluding gusts)
  if (v >= 64) {
    return { code: 'hurricane', title: 'Hurricane Force Wind', severity: 'warning' as const };
  }
  if (v >= 48) {
    return { code: 'storm', title: 'Storm', severity: 'warning' as const };
  }
  if (v >= 34) {
    return { code: 'gale', title: 'Gale', severity: 'warning' as const };
  }
  if (v >= 20) {
    return { code: 'strong', title: 'Strong Wind', severity: 'caution' as const };
  }
  return null;
}

function computeDefaultAlerts({ now, forecast }: { now: any; forecast: any[] }) {
  const out: Array<{ t: string; severity: string; title: string; body?: string }> = [];

  const sustainedNow = now?.wind?.speedKts ?? null;
  const gustNow = now?.wind?.gustKts ?? null;

  const next6 = (forecast || []).slice(0, 6);
  const next24 = (forecast || []).slice(0, 24);

  const maxSustainedNext6 = Math.max(
    ...(next6 || []).map((h) => (typeof h.windSpeedKts === 'number' ? h.windSpeedKts : 0))
  );
  const maxSustainedNext24 = Math.max(
    ...(next24 || []).map((h) => (typeof h.windSpeedKts === 'number' ? h.windSpeedKts : 0))
  );

  const maxGustNext6 = Math.max(
    ...(next6 || []).map((h) => (typeof h.windGustKts === 'number' ? h.windGustKts : 0))
  );
  const maxGustNext24 = Math.max(
    ...(next24 || []).map((h) => (typeof h.windGustKts === 'number' ? h.windGustKts : 0))
  );

  // Live look category (sustained)
  const catNow = envCanadaWindCategory(sustainedNow);
  if (catNow) {
    out.push({
      t: now?.asOf ?? new Date().toISOString(),
      severity: catNow.severity,
      title: `${catNow.title} (live)`,
      body: `Sustained ~${Math.round(sustainedNow)} kt${gustNow != null ? ` (gusts ~${Math.round(gustNow)} kt)` : ''}.`
    });
  }

  // Next 6 hours category (sustained)
  const cat6 = envCanadaWindCategory(Number.isFinite(maxSustainedNext6) ? maxSustainedNext6 : null);
  if (cat6) {
    out.push({
      t: next6?.[0]?.t ?? new Date().toISOString(),
      severity: cat6.severity,
      title: `${cat6.title} expected (next 6h)`,
      body: `Max sustained ~${Math.round(maxSustainedNext6)} kt${Number.isFinite(maxGustNext6) && maxGustNext6 > 0 ? ` (max gust ~${Math.round(maxGustNext6)} kt)` : ''}.`
    });
  }

  // Next 24 hours category (sustained)
  const cat24 = envCanadaWindCategory(Number.isFinite(maxSustainedNext24) ? maxSustainedNext24 : null);
  if (cat24) {
    out.push({
      t: next24?.[0]?.t ?? new Date().toISOString(),
      severity: cat24.severity,
      title: `${cat24.title} possible (next 24h)`,
      body: `Max sustained ~${Math.round(maxSustainedNext24)} kt${Number.isFinite(maxGustNext24) && maxGustNext24 > 0 ? ` (max gust ~${Math.round(maxGustNext24)} kt)` : ''}.`
    });
  }

  // Rain heads-up: first hour with precipProb >= 60%
  const rain = (forecast || [])
    .slice(0, 24)
    .find((h) => typeof h.precipProbPct === 'number' && h.precipProbPct >= 60);
  if (rain) {
    out.push({
      t: rain.t,
      severity: 'info',
      title: 'Rain likely soon',
      body: `Precip chance ~${Math.round(rain.precipProbPct)}% within the next 24 hours.`
    });
  }

  // De-dupe titles
  const seen = new Set<string>();
  return out.filter((a) => {
    if (seen.has(a.title)) return false;
    seen.add(a.title);
    return true;
  });
}
