import { z } from 'zod';

const Station = z.object({
  id: z.string(),
  code: z.string().optional(),
  officialName: z.string().optional(),
  latitude: z.number(),
  longitude: z.number(),
  // timeSeries: array with code etc
  timeSeries: z
    .array(
      z.object({
        id: z.string(),
        code: z.string(),
        nameEn: z.string().optional(),
        latitude: z.number().optional(),
        longitude: z.number().optional()
      })
    )
    .optional()
});

const DataPoint = z.object({
  eventDate: z.string(),
  value: z.number().nullable().optional(),
  qualifier: z.enum(['SLACK', 'EXTREMA_FLOOD', 'EXTREMA_EBB']).nullable().optional()
});

export type IwlsStation = z.infer<typeof Station>;

export type TideEvent = {
  t: string; // ISO
  kind: 'high' | 'low';
  heightM?: number;
  stationId: string;
  stationName?: string;
};

function haversineKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const IWLS_BASE = 'https://api-iwls.dfo-mpo.gc.ca';

// Very small in-memory cache (Next route modules can be reused between requests).
let stationCache:
  | { key: string; fetchedAt: number; stations: IwlsStation[] }
  | null = null;

export async function fetchStations({
  region,
  timeSeriesCode
}: {
  region: 'PAC' | 'ATL' | 'CNA' | 'QUE';
  timeSeriesCode: string;
}) {
  const key = `${region}:${timeSeriesCode}`;
  const now = Date.now();
  if (stationCache && stationCache.key === key && now - stationCache.fetchedAt < 24 * 60 * 60 * 1000) {
    return stationCache.stations;
  }

  const url = new URL('/api/v1/stations', IWLS_BASE);
  url.searchParams.set('chs-region-code', region);
  url.searchParams.set('time-series-code', timeSeriesCode);

  const res = await fetch(url.toString(), {
    next: { revalidate: 24 * 60 * 60 }
  });
  if (!res.ok) throw new Error(`IWLS stations error HTTP ${res.status}`);
  const json = await res.json();
  const stations = z.array(Station).parse(json);

  stationCache = { key, fetchedAt: now, stations };
  return stations;
}

export async function findNearestStation({
  lat,
  lon,
  region,
  timeSeriesCode
}: {
  lat: number;
  lon: number;
  region: 'PAC' | 'ATL' | 'CNA' | 'QUE';
  timeSeriesCode: string;
}) {
  const stations = await fetchStations({ region, timeSeriesCode });
  let best: { s: IwlsStation; km: number } | null = null;
  for (const s of stations) {
    const km = haversineKm({ lat, lon }, { lat: s.latitude, lon: s.longitude });
    if (!best || km < best.km) best = { s, km };
  }
  if (!best) throw new Error('No IWLS stations found');
  return { station: best.s, distanceKm: best.km };
}

export async function fetchTideHiLo({
  stationId,
  from,
  to
}: {
  stationId: string;
  from: string; // ISO
  to: string; // ISO
}) {
  const url = new URL(`/api/v1/stations/${stationId}/data`, IWLS_BASE);
  url.searchParams.set('time-series-code', 'wlp-hilo');
  url.searchParams.set('from', from);
  url.searchParams.set('to', to);
  // resolution optional; leave unset for event series.

  const res = await fetch(url.toString(), {
    next: { revalidate: 10 * 60 }
  });
  if (!res.ok) throw new Error(`IWLS tide data error HTTP ${res.status}`);
  const json = await res.json();
  return z.array(DataPoint).parse(json);
}

export function normalizeTideEvents({
  points,
  station
}: {
  points: Array<z.infer<typeof DataPoint>>;
  station: IwlsStation;
}): TideEvent[] {
  const sorted = [...points].sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  // Preferred: use qualifier when present.
  const withQualifier: TideEvent[] = [];
  for (const p of sorted) {
    const q = p.qualifier;
    if (q !== 'EXTREMA_FLOOD' && q !== 'EXTREMA_EBB') continue;
    withQualifier.push({
      t: p.eventDate,
      kind: q === 'EXTREMA_FLOOD' ? 'high' : 'low',
      heightM: typeof p.value === 'number' ? p.value : undefined,
      stationId: station.id,
      stationName: station.officialName
    });
  }
  if (withQualifier.length) return withQualifier;

  // Fallback: IWLS wlp-hilo sometimes returns just alternating highs/lows without a qualifier.
  // Infer by comparing the first two values.
  const out: TideEvent[] = [];
  const vals = sorted.map((p) => (typeof p.value === 'number' ? p.value : null));
  const first = vals.find((v) => v != null);
  const second = vals.slice(vals.indexOf(first as number) + 1).find((v) => v != null);

  // Default to starting with high if unknown.
  let nextKind: 'high' | 'low' = 'high';
  if (first != null && second != null) {
    nextKind = first >= second ? 'high' : 'low';
  }

  for (const p of sorted) {
    if (typeof p.value !== 'number') continue;
    out.push({
      t: p.eventDate,
      kind: nextKind,
      heightM: p.value,
      stationId: station.id,
      stationName: station.officialName
    });
    nextKind = nextKind === 'high' ? 'low' : 'high';
  }

  return out;
}
