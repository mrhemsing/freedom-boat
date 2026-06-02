import { z } from 'zod';
import { msToKnots } from './units';

const OpenMeteoResponse = z.object({
  latitude: z.number(),
  longitude: z.number(),
  generationtime_ms: z.number().optional(),
  timezone: z.string().optional(),
  current: z
    .object({
      time: z.string(),
      temperature_2m: z.number().optional(),
      precipitation: z.number().optional(),
      wind_speed_10m: z.number().optional(),
      wind_gusts_10m: z.number().optional(),
      wind_direction_10m: z.number().optional()
    })
    .optional(),
  hourly: z
    .object({
      time: z.array(z.string()),
      temperature_2m: z.array(z.number()).optional(),
      precipitation_probability: z.array(z.number()).optional(),
      precipitation: z.array(z.number()).optional(),
      wind_speed_10m: z.array(z.number()).optional(),
      wind_gusts_10m: z.array(z.number()).optional(),
      wind_direction_10m: z.array(z.number()).optional()
    })
    .optional(),
  daily: z
    .object({
      time: z.array(z.string()),
      sunrise: z.array(z.string()).optional(),
      sunset: z.array(z.string()).optional()
    })
    .optional()
});

export type ConditionsNow = {
  locationId: string;
  asOf: string;
  wind: { speedKts: number; gustKts?: number; directionDeg?: number };
  tempC?: number;
  precipMmHr?: number;
  sun?: { sunrise?: string; sunset?: string };
};

export type ForecastHour = {
  t: string;
  tempC?: number;
  windSpeedKts: number;
  windGustKts?: number;
  windDirDeg?: number;
  precipMm?: number;
  precipProbPct?: number;
};

type CachedWeather = {
  data: z.infer<typeof OpenMeteoResponse>;
  fetchedAt: number;
};

const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_STALE_TTL_MS = 6 * 60 * 60 * 1000;
const weatherCache = new Map<string, CachedWeather>();
const weatherInflight = new Map<string, Promise<z.infer<typeof OpenMeteoResponse>>>();

export async function fetchOpenMeteo({
  lat,
  lon,
  hours
}: {
  lat: number;
  lon: number;
  hours: number;
}) {
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const now = Date.now();
  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < WEATHER_CACHE_TTL_MS) {
    return cached.data;
  }

  const inflight = weatherInflight.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const request = fetchOpenMeteoFresh({ lat, lon, hours: 168 })
    .catch(async (error) => {
      if (cached && Date.now() - cached.fetchedAt < WEATHER_STALE_TTL_MS) {
        return cached.data;
      }

      const fallback = await fetchWttrFallback({ lat, lon, hours: 168 });
      if (fallback) {
        weatherCache.set(cacheKey, { data: fallback, fetchedAt: Date.now() });
        return fallback;
      }

      throw error;
    })
    .finally(() => {
      weatherInflight.delete(cacheKey);
    });

  weatherInflight.set(cacheKey, request);
  return request;
}

async function fetchOpenMeteoFresh({
  lat,
  lon,
  hours
}: {
  lat: number;
  lon: number;
  hours: number;
}) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(lat));
  url.searchParams.set('longitude', String(lon));
  url.searchParams.set('timezone', 'America/Vancouver');
  url.searchParams.set(
    'current',
    [
      'temperature_2m',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m'
    ].join(',')
  );
  url.searchParams.set(
    'hourly',
    [
      'temperature_2m',
      'precipitation_probability',
      'precipitation',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m'
    ].join(',')
  );
  url.searchParams.set('daily', ['sunrise', 'sunset'].join(','));
  // Ensure daily arrays include today.
  url.searchParams.set('forecast_days', '7');
  url.searchParams.set('forecast_hours', String(Math.min(Math.max(hours, 1), 168)));

  const res = await fetch(url.toString(), {
    // Cache at Next layer (can tune later)
    next: { revalidate: 300 }
  });
  if (!res.ok) {
    throw new Error(`Open-Meteo error: HTTP ${res.status}`);
  }

  const json = await res.json();
  const parsed = OpenMeteoResponse.parse(json);
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  weatherCache.set(cacheKey, { data: parsed, fetchedAt: Date.now() });
  return parsed;
}

export function normalizeNow(locationId: string, data: unknown): ConditionsNow {
  const parsed = OpenMeteoResponse.parse(data);
  const c = parsed.current;
  if (!c) {
    throw new Error('Open-Meteo response missing current');
  }

  const today = c.time.slice(0, 10);
  const daily = parsed.daily;
  const i = daily?.time?.findIndex((t) => t === today) ?? -1;
  const sunrise = i >= 0 ? daily?.sunrise?.[i] : undefined;
  const sunset = i >= 0 ? daily?.sunset?.[i] : undefined;

  return {
    locationId,
    asOf: c.time,
    wind: {
      speedKts: msToKnots(c.wind_speed_10m ?? 0),
      gustKts: c.wind_gusts_10m !== undefined ? msToKnots(c.wind_gusts_10m) : undefined,
      directionDeg: c.wind_direction_10m
    },
    tempC: c.temperature_2m,
    // Open-Meteo current.precipitation is mm over the last hour for many models
    precipMmHr: c.precipitation,
    sun: {
      sunrise,
      sunset
    }
  };
}

export function normalizeForecast(
  data: unknown,
  { limitHours }: { limitHours: number }
): ForecastHour[] {
  const parsed = OpenMeteoResponse.parse(data);
  const h = parsed.hourly;
  if (!h) throw new Error('Open-Meteo response missing hourly');

  const n = Math.min(h.time.length, limitHours);
  const out: ForecastHour[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      t: h.time[i],
      tempC: h.temperature_2m?.[i],
      windSpeedKts: msToKnots(h.wind_speed_10m?.[i] ?? 0),
      windGustKts: h.wind_gusts_10m?.[i] !== undefined ? msToKnots(h.wind_gusts_10m[i]!) : undefined,
      windDirDeg: h.wind_direction_10m?.[i],
      precipMm: h.precipitation?.[i],
      precipProbPct: h.precipitation_probability?.[i]
    });
  }

  return out;
}

const WttrResponse = z.object({
  current_condition: z
    .array(
      z.object({
        temp_C: z.string().optional(),
        precipMM: z.string().optional(),
        windspeedKmph: z.string().optional(),
        WindGustKmph: z.string().optional(),
        winddirDegree: z.string().optional()
      })
    )
    .optional(),
  weather: z
    .array(
      z.object({
        date: z.string(),
        astronomy: z
          .array(
            z.object({
              sunrise: z.string().optional(),
              sunset: z.string().optional()
            })
          )
          .optional(),
        hourly: z
          .array(
            z.object({
              time: z.string(),
              tempC: z.string().optional(),
              precipMM: z.string().optional(),
              chanceofrain: z.string().optional(),
              chanceofsnow: z.string().optional(),
              windspeedKmph: z.string().optional(),
              WindGustKmph: z.string().optional(),
              winddirDegree: z.string().optional()
            })
          )
          .optional()
      })
    )
    .optional()
});

async function fetchWttrFallback({
  lat,
  lon,
  hours
}: {
  lat: number;
  lon: number;
  hours: number;
}): Promise<z.infer<typeof OpenMeteoResponse> | null> {
  try {
    const url = `https://wttr.in/${lat.toFixed(4)},${lon.toFixed(4)}?format=j1`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const parsed = WttrResponse.parse(await res.json());
    const weather = parsed.weather ?? [];
    const current = parsed.current_condition?.[0];
    const hourlyRows = weather.flatMap((day) =>
      (day.hourly ?? []).map((hour) => ({
        day: day.date,
        hour
      }))
    );
    const now = new Date();
    const forecastRows = hourlyRows
      .map(({ day, hour }) => ({
        t: wttrHourToIso(day, hour.time),
        hour
      }))
      .filter((row) => {
        const t = Date.parse(row.t);
        return Number.isFinite(t) && t >= now.getTime() - 90 * 60 * 1000;
      })
      .slice(0, Math.min(Math.max(hours, 1), 168));

    if (!current && !forecastRows.length) return null;

    const first = forecastRows[0]?.hour;
    const currentTime = forecastRows[0]?.t ?? localIsoFromDate(now);
    const daily = {
      time: weather.map((day) => day.date),
      sunrise: weather.map((day) => wttrClockToIso(day.date, day.astronomy?.[0]?.sunrise) ?? `${day.date}T05:30`),
      sunset: weather.map((day) => wttrClockToIso(day.date, day.astronomy?.[0]?.sunset) ?? `${day.date}T21:00`)
    };

    return {
      latitude: lat,
      longitude: lon,
      timezone: 'America/Vancouver',
      current: {
        time: currentTime,
        temperature_2m: numberFrom(current?.temp_C ?? first?.tempC),
        precipitation: numberFrom(current?.precipMM ?? first?.precipMM),
        wind_speed_10m: numberFrom(current?.windspeedKmph ?? first?.windspeedKmph),
        wind_gusts_10m: numberFrom(current?.WindGustKmph ?? first?.WindGustKmph),
        wind_direction_10m: numberFrom(current?.winddirDegree ?? first?.winddirDegree)
      },
      hourly: {
        time: forecastRows.map((row) => row.t),
        temperature_2m: forecastRows.map((row) => numberFrom(row.hour.tempC) ?? 0),
        precipitation_probability: forecastRows.map((row) =>
          Math.max(numberFrom(row.hour.chanceofrain) ?? 0, numberFrom(row.hour.chanceofsnow) ?? 0)
        ),
        precipitation: forecastRows.map((row) => numberFrom(row.hour.precipMM) ?? 0),
        wind_speed_10m: forecastRows.map((row) => numberFrom(row.hour.windspeedKmph) ?? 0),
        wind_gusts_10m: forecastRows.map((row) => numberFrom(row.hour.WindGustKmph) ?? numberFrom(row.hour.windspeedKmph) ?? 0),
        wind_direction_10m: forecastRows.map((row) => numberFrom(row.hour.winddirDegree) ?? 0)
      },
      daily
    };
  } catch {
    return null;
  }
}

function numberFrom(value: string | undefined) {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function wttrHourToIso(day: string, time: string) {
  const hour = Math.floor((Number(time) || 0) / 100);
  return `${day}T${String(hour).padStart(2, '0')}:00`;
}

function wttrClockToIso(day: string, clock: string | undefined) {
  if (!clock) return undefined;
  const match = clock.trim().match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === 'PM' && hour !== 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  return `${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function localIsoFromDate(date: Date) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Vancouver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
