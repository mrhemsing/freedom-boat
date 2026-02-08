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
  windSpeedKts: number;
  windGustKts?: number;
  windDirDeg?: number;
  precipMm?: number;
  precipProbPct?: number;
};

export async function fetchOpenMeteo({
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
  return OpenMeteoResponse.parse(json);
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
      windSpeedKts: msToKnots(h.wind_speed_10m?.[i] ?? 0),
      windGustKts: h.wind_gusts_10m?.[i] !== undefined ? msToKnots(h.wind_gusts_10m[i]!) : undefined,
      windDirDeg: h.wind_direction_10m?.[i],
      precipMm: h.precipitation?.[i],
      precipProbPct: h.precipitation_probability?.[i]
    });
  }

  return out;
}
