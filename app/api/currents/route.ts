import { CURRENT_PASSES, type CurrentEvent, type CurrentPass, type CurrentPassForecast } from '../../../lib/current-passes';

export const runtime = 'nodejs';

const IWLS_ORIGIN = 'https://api-iwls.dfo-mpo.gc.ca';
const NOAA_ORIGIN = 'https://api.tidesandcurrents.noaa.gov';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheEntry = {
  body: string;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();

export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const from = parseDateParam(incoming.searchParams.get('from')) ?? new Date();
  const to = parseDateParam(incoming.searchParams.get('to')) ?? new Date(from.getTime() + 5 * 86400000);
  const clampedTo = new Date(Math.min(to.getTime(), from.getTime() + 7 * 86400000));
  const key = `${from.toISOString()}:${clampedTo.toISOString()}`;
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return jsonResponse(cached.body, 'HIT');
  }

  const forecasts = await Promise.all(CURRENT_PASSES.map((pass) => fetchPassForecast(pass, from, clampedTo)));
  const body = JSON.stringify({
    generatedAt: new Date().toISOString(),
    from: from.toISOString(),
    to: clampedTo.toISOString(),
    passes: CURRENT_PASSES,
    forecasts: forecasts.filter(Boolean)
  });
  cache.set(key, { body, expiresAt: Date.now() + CACHE_TTL_MS });
  return jsonResponse(body, 'MISS');
}

function jsonResponse(body: string, cacheStatus: string) {
  return new Response(body, {
    headers: {
      'cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      'content-type': 'application/json',
      'x-current-cache': cacheStatus
    }
  });
}

function parseDateParam(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function fetchPassForecast(pass: CurrentPass, from: Date, to: Date): Promise<CurrentPassForecast | null> {
  try {
    const events = pass.source === 'DFO'
      ? await fetchDfoEvents(pass, from, to)
      : await fetchNoaaEvents(pass, from, to);
    return {
      passId: pass.id,
      source: pass.source,
      stationId: pass.stationId,
      events
    };
  } catch {
    return null;
  }
}

async function fetchDfoEvents(pass: CurrentPass, from: Date, to: Date) {
  const url = new URL(`/api/v1/stations/${pass.stationId}/data`, IWLS_ORIGIN);
  url.searchParams.set('time-series-code', 'wcp1-events');
  url.searchParams.set('from', from.toISOString());
  url.searchParams.set('to', to.toISOString());

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    next: { revalidate: 6 * 60 * 60 }
  });
  if (!res.ok) throw new Error(`DFO currents ${pass.id} HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : [])
    .map((item): CurrentEvent | null => {
      const t = typeof item?.eventDate === 'string' ? item.eventDate : null;
      const qualifier = String(item?.qualifier || '').toUpperCase();
      const value = Number(item?.value);
      if (!t || Number.isNaN(Date.parse(t))) return null;
      if (qualifier === 'SLACK') return { t, kind: 'slack', speedKt: 0 };
      if (qualifier === 'EXTREMA_FLOOD') return { t, kind: 'max_flood', speedKt: Number.isFinite(value) ? value : 0 };
      if (qualifier === 'EXTREMA_EBB') return { t, kind: 'max_ebb', speedKt: Number.isFinite(value) ? value : 0 };
      return null;
    })
    .filter((event): event is CurrentEvent => Boolean(event));
}

async function fetchNoaaEvents(pass: CurrentPass, from: Date, to: Date) {
  const url = new URL('/api/prod/datagetter', NOAA_ORIGIN);
  url.searchParams.set('product', 'currents_predictions');
  url.searchParams.set('interval', 'max_slack');
  url.searchParams.set('station', pass.stationId);
  url.searchParams.set('begin_date', formatNoaaDate(from));
  url.searchParams.set('end_date', formatNoaaDate(to));
  url.searchParams.set('time_zone', 'gmt');
  url.searchParams.set('units', 'english');
  url.searchParams.set('application', 'Fairtide');
  url.searchParams.set('format', 'json');
  if (pass.bin != null) url.searchParams.set('bin', String(pass.bin));

  const res = await fetch(url.toString(), {
    headers: { accept: 'application/json' },
    next: { revalidate: 6 * 60 * 60 }
  });
  if (!res.ok) throw new Error(`NOAA currents ${pass.id} HTTP ${res.status}`);
  const json = await res.json();
  const rows = Array.isArray(json?.current_predictions?.cp) ? json.current_predictions.cp : [];
  return rows
    .map((row: any): CurrentEvent | null => {
      const rawTime = typeof row?.Time === 'string' ? row.Time : typeof row?.t === 'string' ? row.t : null;
      if (!rawTime) return null;
      const t = parseNoaaTime(rawTime);
      const type = String(row?.Type || row?.type || '').toLowerCase();
      const velocity = Number(row?.Velocity_Major ?? row?.velocity_major ?? row?.Speed ?? row?.speed ?? 0);
      if (type.includes('slack')) return { t, kind: 'slack', speedKt: 0 };
      if (type.includes('flood')) return { t, kind: 'max_flood', speedKt: Math.abs(velocity) };
      if (type.includes('ebb')) return { t, kind: 'max_ebb', speedKt: Math.abs(velocity) };
      return null;
    })
    .filter((event: CurrentEvent | null): event is CurrentEvent => Boolean(event));
}

function formatNoaaDate(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getUTCFullYear()}${pad(value.getUTCMonth() + 1)}${pad(value.getUTCDate())}`;
}

function parseNoaaTime(value: string) {
  const iso = value.includes('T')
    ? value
    : `${value.replace(' ', 'T')}:00Z`;
  const date = new Date(iso.endsWith('Z') ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
