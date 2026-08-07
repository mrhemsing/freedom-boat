import { NextResponse } from 'next/server';
import { PLANNER_MARINAS, type Marina } from '../../../../lib/marinas';
import { OpenMeteoResponse, normalizeForecast } from '../../../../lib/openmeteo';
import { buildWeeklyOutlook, type DailyOutlook } from '../../../../lib/outlook';

export const revalidate = 300;

const BATCH_SIZE = 20;
const FORECAST_DAYS = 5;

export async function GET() {
  const outlooks: Record<string, DailyOutlook[]> = {};
  const unavailable: number[] = [];

  for (let index = 0; index < PLANNER_MARINAS.length; index += BATCH_SIZE) {
    const batch = PLANNER_MARINAS.slice(index, index + BATCH_SIZE);
    try {
      const rows = await fetchBatch(batch);
      batch.forEach((marina, marinaIndex) => {
        const raw = rows[marinaIndex];
        if (!raw) {
          unavailable.push(marina.id);
          return;
        }

        const forecast = normalizeForecast(raw, { limitHours: FORECAST_DAYS * 24 });
        const sunByDay = (raw.daily?.time ?? []).map((day, dayIndex) => ({
          day,
          sunrise: raw.daily?.sunrise?.[dayIndex],
          sunset: raw.daily?.sunset?.[dayIndex]
        }));
        outlooks[String(marina.id)] = buildWeeklyOutlook(forecast, sunByDay, FORECAST_DAYS);
      });
    } catch {
      unavailable.push(...batch.map((marina) => marina.id));
    }
  }

  return NextResponse.json({
    fetchedAt: new Date().toISOString(),
    provider: 'open-meteo',
    outlooks,
    unavailable
  });
}

async function fetchBatch(marinas: Marina[]) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', marinas.map((marina) => marina.lat).join(','));
  url.searchParams.set('longitude', marinas.map((marina) => marina.lon).join(','));
  url.searchParams.set('timezone', 'America/Vancouver');
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
  url.searchParams.set('forecast_days', String(FORECAST_DAYS));

  const response = await fetch(url, { next: { revalidate } });
  if (!response.ok) throw new Error(`Open-Meteo planner forecast error: HTTP ${response.status}`);

  const payload: unknown = await response.json();
  const rows = Array.isArray(payload) ? payload : [payload];
  return rows.map((row) => OpenMeteoResponse.parse(row));
}
