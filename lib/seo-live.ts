import { fetchOpenMeteo, normalizeForecast, normalizeNow } from './openmeteo';
import { findNearestStation, fetchTideHiLo, normalizeTideEvents, type TideEvent } from './iwls';
import { buildWeeklyOutlook } from './outlook';
import { type BoatLaunch, type Marina, MARINA_ACCESS_INFO } from './marinas';

export type SeoSnapshot = {
  summary: string;
  score: number | null;
  windKts: number | null;
  gustKts: number | null;
  nextTide: string | null;
  stationName: string | null;
  forecastLabel: string;
};

const DIRECTIONS = ['northerlies', 'northeasterlies', 'easterlies', 'southeasterlies', 'southerlies', 'southwesterlies', 'westerlies', 'northwesterlies'];

export async function getMarinaSeoSnapshot(marina: Marina): Promise<SeoSnapshot> {
  const [weather, tide] = await Promise.all([
    getWeatherSnapshot(marina.name, marina.area, marina.lat, marina.lon),
    getTideSnapshot(marina.lat, marina.lon)
  ]);

  const access = marina.accessInfo || (marina.osmId ? MARINA_ACCESS_INFO[marina.osmId] : undefined);
  const fuel = access?.fuel === 'Y' ? 'Fuel available.' : access?.fuel === 'N' ? 'No fuel listed.' : 'Fuel status should be verified.';
  const moorage =
    access?.transient === 'Y'
      ? 'Guest moorage available.'
      : access?.transient === 'Limited'
        ? 'Limited guest moorage may be available.'
        : access?.transient === 'N'
          ? 'No transient moorage listed.'
          : 'Guest moorage should be verified.';

  return {
    ...weather,
    nextTide: tide.nextTide,
    stationName: tide.stationName,
    summary: `${marina.name} in ${marina.area}: today's forecast is ${weather.forecastLabel}${tide.nextTide ? ` with ${tide.nextTide}` : ''}. ${weather.score != null ? `${scorePhrase(weather.score)} for small boats. ` : ''}${fuel} ${moorage}`
  };
}

export async function getLaunchSeoSnapshot(launch: BoatLaunch): Promise<SeoSnapshot> {
  const [weather, tide] = await Promise.all([
    getWeatherSnapshot(launch.name, launch.area, launch.lat, launch.lon),
    getTideSnapshot(launch.lat, launch.lon)
  ]);
  const minTide = launch.minTide ?? (launch.type.toLowerCase().includes('hand') ? 0.8 : 1.2);
  return {
    ...weather,
    nextTide: tide.nextTide,
    stationName: tide.stationName,
    summary: `${launch.name} in ${launch.area}: today's boating forecast is ${weather.forecastLabel}${tide.nextTide ? ` with ${tide.nextTide}` : ''}. This ${launch.type.toLowerCase()} launch is best checked around ${minTide.toFixed(1)} m tide or higher.`
  };
}

async function getWeatherSnapshot(name: string, area: string, lat: number, lon: number): Promise<Omit<SeoSnapshot, 'nextTide' | 'stationName' | 'summary'>> {
  try {
    const raw = await fetchOpenMeteo({ lat, lon, hours: 72 });
    const now = normalizeNow(`${name}-${area}`, raw);
    const forecast = normalizeForecast(raw, { limitHours: 72 });
    const sunByDay = (raw.daily?.time ?? []).map((day, index) => ({
      day,
      sunrise: raw.daily?.sunrise?.[index],
      sunset: raw.daily?.sunset?.[index]
    }));
    const outlook = buildWeeklyOutlook(forecast, sunByDay, 1)[0] ?? null;
    const windKts = Math.round(now.wind.speedKts);
    const gustKts = now.wind.gustKts != null ? Math.round(now.wind.gustKts) : null;
    const score = outlook?.score ?? scoreFromWind(windKts, gustKts);
    const direction = directionLabel(now.wind.directionDeg);
    const forecastLabel = `${windAdjective(windKts)} ${windKts} kt ${direction}${gustKts ? `, gusting ${gustKts} kt` : ''}`;
    return { score, windKts, gustKts, forecastLabel };
  } catch {
    return {
      score: null,
      windKts: null,
      gustKts: null,
      forecastLabel: `localized conditions for ${area}`
    };
  }
}

async function getTideSnapshot(lat: number, lon: number) {
  try {
    const nearest = await findNearestStation({ lat, lon, region: 'PAC', timeSeriesCode: 'wlp-hilo' });
    const from = new Date();
    const to = new Date(from.getTime() + 36 * 60 * 60 * 1000);
    const points = await fetchTideHiLo({
      stationId: nearest.station.id,
      from: from.toISOString(),
      to: to.toISOString()
    });
    const events = normalizeTideEvents({ points, station: nearest.station });
    const next = nextTideEvent(events);
    return {
      stationName: nearest.station.officialName ?? nearest.station.code ?? 'CHS tide station',
      nextTide: next
    };
  } catch {
    return { stationName: null, nextTide: null };
  }
}

function nextTideEvent(events: TideEvent[]) {
  const now = Date.now();
  const next = events
    .map((event) => ({ ...event, ms: new Date(event.t).getTime() }))
    .filter((event) => Number.isFinite(event.ms) && event.ms >= now)
    .sort((a, b) => a.ms - b.ms)[0];
  if (!next) return null;
  const kind = next.kind === 'high' ? 'high tide' : 'low tide';
  const height = typeof next.heightM === 'number' ? ` at ${next.heightM.toFixed(1)} m` : '';
  return `${kind}${height} around ${formatSeoTime(next.t)}`;
}

export function scorePhrase(score: number) {
  if (score >= 80) return 'a good boating window';
  if (score >= 65) return 'a workable boating window';
  if (score >= 50) return 'a cautious boating window';
  return 'a marginal boating window';
}

export function formatSeoTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
}

function windAdjective(kts: number) {
  if (kts < 8) return 'light';
  if (kts < 16) return 'moderate';
  if (kts < 24) return 'fresh';
  return 'strong';
}

function directionLabel(deg?: number) {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return 'winds';
  const index = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return DIRECTIONS[index];
}

function scoreFromWind(windKts: number, gustKts: number | null) {
  return Math.max(0, Math.min(100, Math.round(100 - windKts * 2.2 - (gustKts ?? windKts) * 0.8)));
}
