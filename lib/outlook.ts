import { isoToLocalDay } from './format';

export type ForecastHour = {
  t: string;
  tempC?: number;
  windSpeedKts: number;
  windDirDeg?: number;
  windGustKts?: number;
  precipMm?: number;
  precipProbPct?: number;
};

export type SunDay = {
  day: string;
  sunrise?: string;
  sunset?: string;
};

export type DailyOutlook = {
  day: string;
  label: string;
  score: number;
  maxWind: number;
  maxWindDirDeg?: number;
  maxGust: number;
  maxPrecipProb: number;
  totalPrecipMm: number;
  minTempC?: number;
  maxTempC?: number;
};

export type ScoreBand = {
  label: 'Poor' | 'Fair' | 'Good' | 'Excellent';
  min: number;
  max: number;
  color: string;
  tone: 'poor' | 'fair' | 'good' | 'excellent';
};

export const SCORE_BANDS: ScoreBand[] = [
  { label: 'Poor', min: 0, max: 40, color: '#d95c58', tone: 'poor' },
  { label: 'Fair', min: 41, max: 60, color: '#e6a13c', tone: 'fair' },
  { label: 'Good', min: 61, max: 80, color: '#2fae6b', tone: 'good' },
  { label: 'Excellent', min: 81, max: 100, color: '#0e9f9a', tone: 'excellent' }
];

export function scoreBand(score: number): ScoreBand {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  return SCORE_BANDS.find((band) => normalized >= band.min && normalized <= band.max) ?? SCORE_BANDS[0];
}

export function tierColorVar(tier: string): string {
  switch (tier) {
    case 'poor':
      return 'var(--tw-bad)';
    case 'fair':
      return 'var(--tw-warn)';
    default:
      return 'var(--tw-good)';
  }
}

function extractHour(isoLike?: string) {
  const s = String(isoLike || '');
  const m = s.match(/T(\d{2}):/);
  if (!m) return null;
  const hh = Number(m[1]);
  return Number.isFinite(hh) ? hh : null;
}

export function buildWeeklyOutlook(
  forecast: ForecastHour[],
  sunByDay: SunDay[] = [],
  days = 5,
  startDay?: string | null
): DailyOutlook[] {
  const daylightHoursByDay = new Map<string, { sunriseHour: number; sunsetHour: number }>();
  for (const s of sunByDay || []) {
    const day = String(s?.day || '');
    if (!day) continue;
    const sunriseHour = extractHour(s?.sunrise) ?? 8;
    const sunsetHour = extractHour(s?.sunset) ?? 18;
    daylightHoursByDay.set(day, { sunriseHour, sunsetHour });
  }

  const byDay = new Map<string, ForecastHour[]>();
  for (const h of forecast || []) {
    const day = typeof h.t === 'string' ? h.t.slice(0, 10) : null;
    if (!day) continue;

    const hour = Number(h.t.slice(11, 13));
    if (!Number.isFinite(hour)) continue;
    const daylight = daylightHoursByDay.get(day) ?? { sunriseHour: 8, sunsetHour: 18 };
    if (hour < daylight.sunriseHour || hour > daylight.sunsetHour) continue;

    const arr = byDay.get(day) ?? [];
    arr.push(h);
    byDay.set(day, arr);
  }

  const daysSorted = [...byDay.keys()]
    .filter((day) => !startDay || day >= startDay)
    .sort()
    .slice(0, days);
  const out: DailyOutlook[] = [];

  for (const day of daysSorted) {
    const rows = byDay.get(day) ?? [];
    const maxWind = Math.max(...rows.map((r) => (typeof r.windSpeedKts === 'number' ? r.windSpeedKts : 0)), 0);
    const maxWindRow = rows.find((r) => r.windSpeedKts === maxWind);
    const maxWindDirDeg = typeof maxWindRow?.windDirDeg === 'number' && Number.isFinite(maxWindRow.windDirDeg)
      ? maxWindRow.windDirDeg
      : undefined;
    const maxGust = Math.max(...rows.map((r) => (typeof r.windGustKts === 'number' ? r.windGustKts : r.windSpeedKts ?? 0)), 0);
    const maxPrecipProb = Math.max(...rows.map((r) => (typeof r.precipProbPct === 'number' ? r.precipProbPct : 0)), 0);
    const totalPrecipMm = rows.reduce((acc, r) => acc + (typeof r.precipMm === 'number' ? r.precipMm : 0), 0);

    const temps = rows
      .map((r) => (typeof r.tempC === 'number' && Number.isFinite(r.tempC) ? r.tempC : null))
      .filter((v) => v != null) as number[];
    const minTempC = temps.length ? Math.min(...temps) : undefined;
    const maxTempC = temps.length ? Math.max(...temps) : undefined;

    const rainPenalty =
      totalPrecipMm <= 5
        ? totalPrecipMm * 1.8
        : totalPrecipMm <= 10
          ? 5 * 1.8 + (totalPrecipMm - 5) * 4.5
          : totalPrecipMm <= 20
            ? 5 * 1.8 + 5 * 4.5 + (totalPrecipMm - 10) * 7.5
            : 5 * 1.8 + 5 * 4.5 + 10 * 7.5 + (totalPrecipMm - 20) * 10.5;
    const popPenalty = maxPrecipProb * 0.1;
    const raw = 100 - (maxGust * 1.65 + maxWind * 0.45 + popPenalty + rainPenalty);
    const score = Math.max(0, Math.min(100, Math.round(raw)));

    out.push({
      day,
      label: isoToLocalDay(`${day}T12:00:00`),
      score,
      maxWind,
      maxWindDirDeg,
      maxGust,
      maxPrecipProb,
      totalPrecipMm,
      minTempC,
      maxTempC
    });
  }

  return out;
}
