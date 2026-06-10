import { LOCATIONS, type LocationId, type LocationProfile } from './locations';
import { fetchOpenMeteo, normalizeForecast, normalizeNow, type ConditionsNow, type ForecastHour, type OpenMeteoData } from './openmeteo';

export type WeatherSnapshot = {
  locationId: LocationId;
  fetchedAt: string;
  timeZone: string;
  provider: 'open-meteo' | 'met-no-fallback' | 'wttr-fallback';
  raw: OpenMeteoData;
  now: ConditionsNow;
  forecast: ForecastHour[];
  sunByDay: Array<{ day: string; sunrise?: string; sunset?: string }>;
};

type SnapshotEntry = {
  snapshot: WeatherSnapshot;
  fetchedAtMs: number;
};

const SNAPSHOT_FRESH_MS = 15 * 60 * 1000;
const SNAPSHOT_STALE_MS = 12 * 60 * 60 * 1000;
const REFRESH_BACKOFF_MS = 10 * 60 * 1000;

const snapshotCache = new Map<LocationId, SnapshotEntry>();
const snapshotInflight = new Map<LocationId, Promise<WeatherSnapshot>>();
const refreshBackoffUntil = new Map<LocationId, number>();

export async function getLocationWeatherSnapshot(
  locationId: LocationId,
  options: { force?: boolean } = {}
) {
  const location = LOCATIONS[locationId];
  if (!location) throw new Error(`Unknown weather location: ${locationId}`);

  const now = Date.now();
  const cached = snapshotCache.get(locationId);
  if (!options.force && cached && now - cached.fetchedAtMs < SNAPSHOT_FRESH_MS) {
    return cached.snapshot;
  }

  const inflight = snapshotInflight.get(locationId);
  if (inflight) return inflight;

  if (cached && !options.force && now < (refreshBackoffUntil.get(locationId) ?? 0)) {
    return cached.snapshot;
  }

  const request = fetchLocationWeatherSnapshot(location, options)
    .catch((error) => {
      refreshBackoffUntil.set(locationId, Date.now() + REFRESH_BACKOFF_MS);
      if (cached && Date.now() - cached.fetchedAtMs < SNAPSHOT_STALE_MS) {
        return cached.snapshot;
      }
      throw error;
    })
    .finally(() => {
      snapshotInflight.delete(locationId);
    });

  snapshotInflight.set(locationId, request);
  return request;
}

export async function refreshAllLocationWeatherSnapshots(options: { concurrency?: number } = {}) {
  const concurrency = Math.max(1, Math.min(options.concurrency ?? 2, 4));
  const locationIds = Object.keys(LOCATIONS) as LocationId[];
  const results: Array<{ locationId: LocationId; ok: boolean; error?: string; fetchedAt?: string }> = [];

  let index = 0;
  async function worker() {
    while (index < locationIds.length) {
      const locationId = locationIds[index++];
      try {
        const snapshot = await getLocationWeatherSnapshot(locationId, { force: true });
        results.push({ locationId, ok: true, fetchedAt: snapshot.fetchedAt });
      } catch (error) {
        results.push({
          locationId,
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown weather refresh error'
        });
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  results.sort((a, b) => a.locationId.localeCompare(b.locationId));
  return results;
}

export function nearestWeatherLocation(lat: number, lon: number) {
  return Object.values(LOCATIONS)
    .map((location) => ({
      location,
      distanceKm: haversineKm(lat, lon, location.lat, location.lon)
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;
}

async function fetchLocationWeatherSnapshot(
  location: LocationProfile,
  options: { force?: boolean }
): Promise<WeatherSnapshot> {
  const raw = await fetchOpenMeteo({
    lat: location.lat,
    lon: location.lon,
    hours: 168,
    timeZone: location.timeZone,
    force: options.force
  });
  const now = normalizeNow(location.id, raw);
  const forecast = normalizeForecast(raw, { limitHours: 168 });
  const sunByDay = (raw.daily?.time ?? []).map((day, index) => ({
    day,
    sunrise: raw.daily?.sunrise?.[index],
    sunset: raw.daily?.sunset?.[index]
  }));
  const snapshot: WeatherSnapshot = {
    locationId: location.id,
    fetchedAt: new Date().toISOString(),
    timeZone: location.timeZone ?? 'America/Vancouver',
    provider: raw.source ?? (raw.timezone === 'America/Vancouver' && raw.generationtime_ms == null ? 'wttr-fallback' : 'open-meteo'),
    raw,
    now,
    forecast,
    sunByDay
  };

  snapshotCache.set(location.id, { snapshot, fetchedAtMs: Date.now() });
  refreshBackoffUntil.delete(location.id);
  return snapshot;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6371;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(a));
}
