import { notFound } from 'next/navigation';
import { LOCATIONS, type LocationId } from '../../../lib/locations';
import { round } from '../../../lib/format';
import { AlertFeed, Card, ForecastStrip, KpiRow, TideList, WindArrow } from './ui';

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
    fetch(`${baseUrl()}/api/${params.locationId}/forecast?hours=24`, {
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
    <main style={{ padding: 18, maxWidth: 980, margin: '0 auto' }}>
      <header style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: 0 }}>{loc.name}</h1>
          {loc.address ? <div style={{ marginTop: 6, color: '#666', fontSize: 13 }}>{loc.address}</div> : null}
        </div>
        <div style={{ color: '#666', fontSize: 13 }}>
          {now?.asOf ? `as of ${formatAsOf(now.asOf)}` : '—'}
        </div>
      </header>

      <div style={{ display: 'grid', gap: 12, marginTop: 14 }}>
        <Card title="Now">
          <KpiRow
            items={[
              {
                label: 'Wind',
                value: `${round(windSpeed, 0) ?? '—'} kt`,
                sub: (
                  <span>
                    gust {round(gust, 0) ?? '—'} · <WindArrow deg={dir} />
                  </span>
                )
              },
              {
                label: 'Temp',
                value: now?.tempC != null ? `${round(now.tempC, 0)}°C` : '—'
              },
              {
                label: 'Precip (mm/hr)',
                value: now?.precipMmHr != null ? String(round(now.precipMmHr, 1)) : '—'
              }
            ]}
          />
        </Card>

        <Card title="Next 12 hours">
          <ForecastStrip forecast={forecast?.forecast ?? []} />
        </Card>

        <Card title="Alerts">
          <AlertFeed items={alerts} />
        </Card>

        <Card title="Tides (next 2 days)">
          <div style={{ color: '#666', fontSize: 13, marginBottom: 10 }}>
            {tides?.station?.name ? (
              <span>
                Nearest station: <b>{tides.station.name}</b> ({Math.round(tides.station.distanceKm)} km)
              </span>
            ) : (
              '—'
            )}
          </div>
          <TideList events={tides?.events ?? []} />
        </Card>

        <Card title="Map">
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #eee' }}>
            <iframe
              title={`${loc.name} map`}
              width="100%"
              height="320"
              style={{ border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
                `${loc.lon - 0.03},${loc.lat - 0.02},${loc.lon + 0.03},${loc.lat + 0.02}`
              )}&layer=mapnik&marker=${encodeURIComponent(`${loc.lat},${loc.lon}`)}`}
            />
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>
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
    </main>
  );
}

function baseUrl() {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

function formatAsOf(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  // Force stable formatting across server/client to avoid hydration mismatch.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Vancouver',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function computeDefaultAlerts({ now, forecast }: { now: any; forecast: any[] }) {
  const out: Array<{ t: string; severity: string; title: string; body?: string }> = [];

  const gustNow = now?.wind?.gustKts ?? null;
  const maxGustNext6 = Math.max(
    ...(forecast || []).slice(0, 6).map((h) => (typeof h.windGustKts === 'number' ? h.windGustKts : 0))
  );

  // Conservative defaults; tune later.
  if (gustNow != null && gustNow >= 25) {
    out.push({
      t: now.asOf,
      severity: 'warning',
      title: 'Strong gusts right now',
      body: `Gusts around ${Math.round(gustNow)} kt.`
    });
  } else if (gustNow != null && gustNow >= 18) {
    out.push({
      t: now.asOf,
      severity: 'caution',
      title: 'Gusty conditions right now',
      body: `Gusts around ${Math.round(gustNow)} kt.`
    });
  }

  if (Number.isFinite(maxGustNext6) && maxGustNext6 >= 25) {
    out.push({
      t: forecast?.[0]?.t ?? new Date().toISOString(),
      severity: 'warning',
      title: 'Strong gusts expected (next 6h)',
      body: `Max gust forecast ~${Math.round(maxGustNext6)} kt.`
    });
  } else if (Number.isFinite(maxGustNext6) && maxGustNext6 >= 18) {
    out.push({
      t: forecast?.[0]?.t ?? new Date().toISOString(),
      severity: 'caution',
      title: 'Gusts expected (next 6h)',
      body: `Max gust forecast ~${Math.round(maxGustNext6)} kt.`
    });
  }

  // Rain heads-up: first hour with precipProb >= 60%
  const rain = (forecast || []).slice(0, 12).find((h) => typeof h.precipProbPct === 'number' && h.precipProbPct >= 60);
  if (rain) {
    out.push({
      t: rain.t,
      severity: 'info',
      title: 'Rain likely soon',
      body: `Precip chance ~${Math.round(rain.precipProbPct)}% within the next 12 hours.`
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
