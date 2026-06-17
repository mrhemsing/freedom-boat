export type ForecastAlertHour = {
  t: string;
  windSpeedKts?: number;
  windGustKts?: number;
  precipMm?: number;
  precipProbPct?: number;
};

export type DaylightWindow = { start: string; end: string };

export type QuickSummary = {
  label: string;
  detail: string;
  tone: 'toneGood' | 'toneWarn' | 'toneBad' | 'toneInfo';
};

export function getLiveLocalIso(timeZone: string): string {
  return isoToLocationLocalIso(new Date().toISOString(), timeZone) ?? new Date().toISOString();
}

export function getNextTideSummary({
  nowIso,
  events
}: {
  nowIso?: string | null;
  events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }>;
}) {
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  const future = (events || [])
    .map((e) => ({ ...e, ms: new Date(e.t).getTime() }))
    .filter((e) => Number.isFinite(e.ms) && e.ms >= nowMs - 60 * 1000)
    .sort((a, b) => a.ms - b.ms);

  const n = future[0];
  if (!n) return null;

  const kind = n.kind === 'high' ? 'High' : 'Low';
  const etaMs = Math.max(0, n.ms - nowMs);
  return { kindLabel: kind, etaLabel: formatEta(etaMs), t: n.t, heightM: n.heightM };
}

export function getSlackTideSummary({
  nowIso,
  events
}: {
  nowIso?: string | null;
  events: Array<{ t: string; kind: 'high' | 'low'; heightM?: number }>;
}): QuickSummary {
  const next = getNextTideSummary({ nowIso, events });
  if (!next) return { label: '—', detail: 'No upcoming tide turn available', tone: 'toneInfo' };
  return {
    label: next.etaLabel,
    detail: `Next slack near ${next.kindLabel.toLowerCase()} tide turn`,
    tone: 'toneInfo'
  };
}

export function getBestLaunchWindowSummary({
  forecast,
  nowIso,
  sunriseIso,
  sunsetIso,
  sunByDay = []
}: {
  forecast: Array<{ t: string; windSpeedKts?: number; windGustKts?: number; precipProbPct?: number }>;
  nowIso?: string | null;
  sunriseIso?: string;
  sunsetIso?: string;
  sunByDay?: Array<{ day: string; sunrise?: string; sunset?: string }>;
}): QuickSummary {
  const rows = (forecast || []).slice(0, 24);
  if (!rows.length) return { label: '—', detail: 'No forecast data', tone: 'toneInfo' };

  const daylightByDay = new Map<string, { sunriseMinute: number; sunsetMinute: number }>();
  for (const s of sunByDay || []) {
    if (!s.day) continue;
    daylightByDay.set(s.day, {
      sunriseMinute: extractLocalMinuteOfDay(s.sunrise) ?? 6 * 60,
      sunsetMinute: extractLocalMinuteOfDay(s.sunset) ?? 18 * 60
    });
  }

  const today = extractLocalDay(sunriseIso) ?? extractLocalDay(sunsetIso);
  if (today && !daylightByDay.has(today)) {
    daylightByDay.set(today, {
      sunriseMinute: extractLocalMinuteOfDay(sunriseIso) ?? 6 * 60,
      sunsetMinute: extractLocalMinuteOfDay(sunsetIso) ?? 18 * 60
    });
  }

  const scored = rows.map((h) => {
    const wind = Number(h.windSpeedKts ?? 0);
    const gust = Number(h.windGustKts ?? wind);
    const rain = Number(h.precipProbPct ?? 0);
    const score = Math.max(0, 100 - wind * 3 - gust * 1.2 - rain * 0.6);
    const day = extractLocalDay(h.t);
    const minute = extractLocalMinuteOfDay(h.t);
    return { ...h, day, minute, score };
  });

  const findBestStart = ({
    day,
    afterDay,
    nowDay,
    nowMinute
  }: {
    day?: string;
    afterDay?: string;
    nowDay?: string | null;
    nowMinute?: number | null;
  } = {}) => {
    let bestStart = -1;
    let bestAvg = -1;
    for (let i = 0; i <= scored.length - 3; i += 1) {
      const window = scored.slice(i, i + 3);
      const [start, mid, end] = window;
      if (!start.day || start.minute == null || mid.minute == null || end.minute == null) continue;
      if (afterDay && start.day <= afterDay) continue;
      if (day && start.day !== day) continue;
      if (mid.day !== start.day || end.day !== start.day) continue;
      if (mid.minute !== start.minute + 60 || end.minute !== start.minute + 120) continue;
      if (start.day === nowDay && nowMinute != null && start.minute + 180 <= nowMinute) continue;

      const daylight = daylightByDay.get(start.day) ?? { sunriseMinute: 6 * 60, sunsetMinute: 18 * 60 };
      if (start.minute < daylight.sunriseMinute || start.minute + 180 > daylight.sunsetMinute) continue;

      const avg = window.reduce((a, b) => a + b.score, 0) / window.length;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestStart = i;
      }
    }
    return bestStart;
  };

  const nowDay = extractLocalDay(nowIso ?? undefined);
  const nowMinute = extractLocalMinuteOfDay(nowIso ?? undefined);
  const todayDaylight = nowDay ? daylightByDay.get(nowDay) : null;
  if (
    nowDay
    && nowMinute != null
    && todayDaylight
    && todayDaylight.sunsetMinute - nowMinute < 2 * 60
  ) {
    const tomorrowStart = findBestStart({ afterDay: nowDay });
    if (tomorrowStart >= 0) {
      const start = scored[tomorrowStart];
      return {
        label: 'Done for today',
        detail: `Tomorrow's window: ${formatLaunchWindowRange(start.minute ?? 0)}`,
        tone: 'toneInfo'
      };
    }
    return { label: 'Done for today', detail: "Check tomorrow's launch window after the forecast refreshes", tone: 'toneInfo' };
  }

  let bestStart = findBestStart({ day: nowDay ?? undefined, nowDay, nowMinute });
  if (bestStart < 0 && nowDay) {
    bestStart = findBestStart({ afterDay: nowDay });
  }
  if (bestStart < 0) return { label: '—', detail: 'No suitable window found', tone: 'toneWarn' };

  const start = scored[bestStart];
  const labelPrefix = nowDay && start.day && compareLocalDays(start.day, nowDay) === 1 ? 'Tomorrow ' : '';
  const labelRange = start.day === nowDay && nowMinute != null && (start.minute ?? 0) < nowMinute
    ? `Now until ${formatLaunchWindowTime((start.minute ?? 0) + 180, true)}`
    : formatLaunchWindowRange(start.minute ?? 0);
  return {
    label: `${labelPrefix}${labelRange}`,
    detail: 'Best 3-hour window between sunrise and sunset',
    tone: 'toneGood'
  };
}

export function getDaylightWindow({
  now,
  fetchedAt,
  timeZone = 'America/Vancouver',
  sunByDay,
  forecast
}: {
  now: any;
  fetchedAt?: string;
  timeZone?: string;
  sunByDay: Array<{ day: string; sunrise?: string; sunset?: string }>;
  forecast: ForecastAlertHour[];
}): DaylightWindow | undefined {
  const fetchedLocal = fetchedAt ? isoToLocationLocalIso(fetchedAt, timeZone) : null;
  const localNowIso = now?.asOf ?? fetchedLocal ?? forecast[0]?.t;
  const localNowDay = extractLocalDay(localNowIso);
  const localNowMinute = extractLocalMinuteOfDay(localNowIso);
  const fallbackDay = extractLocalDay(forecast[0]?.t);
  const todaySun = sunByDay.find((entry) => entry.day === localNowDay);
  const todaySunsetMinute = extractLocalMinuteOfDay(todaySun?.sunset);
  const shouldUseTomorrow = Boolean(
    localNowDay
    && localNowMinute != null
    && todaySunsetMinute != null
    && localNowMinute >= todaySunsetMinute
  );
  const day = shouldUseTomorrow && localNowDay
    ? nextSunDay(localNowDay, sunByDay) ?? nextForecastDay(localNowDay, forecast) ?? localNowDay
    : localNowDay ?? fallbackDay;
  const sun = sunByDay.find((entry) => entry.day === day);
  const nowSunDay = extractLocalDay(now?.sun?.sunrise);
  const useNowSun = nowSunDay === day;
  const sunrise = useNowSun ? now?.sun?.sunrise : sun?.sunrise;
  const sunset = useNowSun ? now?.sun?.sunset : sun?.sunset;
  if (!sunrise || !sunset) return undefined;
  return { start: sunrise, end: sunset };
}

export function isoToLocationLocalIso(iso: string, timeZone: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(d);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = value('hour');
  const minute = value('minute');
  if (!year || !month || !day || !hour || !minute) return null;
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function extractLocalDay(isoLike?: string) {
  const m = String(isoLike || '').match(/^(\d{4}-\d{2}-\d{2})T/);
  return m?.[1] ?? null;
}

export function extractLocalMinuteOfDay(isoLike?: string) {
  const m = String(isoLike || '').match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
}

export function formatLaunchWindowRange(startMinute: number) {
  const endMinute = startMinute + 180;
  const startPeriod = (((startMinute % 1440) + 1440) % 1440) >= 720 ? 'PM' : 'AM';
  const endPeriod = (((endMinute % 1440) + 1440) % 1440) >= 720 ? 'PM' : 'AM';
  return `${formatLaunchWindowTime(startMinute, startPeriod !== endPeriod)}-${formatLaunchWindowTime(endMinute, true)}`;
}

export function compareLocalDays(a: string, b: string) {
  const left = Date.parse(`${a}T00:00:00Z`);
  const right = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return 0;
  return Math.round((left - right) / 86_400_000);
}

function nextSunDay(day: string, sunByDay: Array<{ day: string }>) {
  return sunByDay
    .map((entry) => entry.day)
    .filter((candidate) => candidate > day)
    .sort()[0] ?? null;
}

function nextForecastDay(day: string, forecast: ForecastAlertHour[]) {
  return [...new Set((forecast || []).map((hour) => extractLocalDay(hour.t)).filter(Boolean) as string[])]
    .filter((candidate) => candidate > day)
    .sort()[0] ?? null;
}

function formatEta(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `in ${m}m`;
  return `in ${h}h ${m}m`;
}

function formatLaunchWindowTime(totalMinutes: number, showPeriod: boolean) {
  const wrapped = ((totalMinutes % 1440) + 1440) % 1440;
  const hhRaw = Math.floor(wrapped / 60);
  const mm = wrapped % 60;
  const period = hhRaw >= 12 ? 'PM' : 'AM';
  let hh = hhRaw % 12;
  if (hh === 0) hh = 12;
  const minuteText = mm === 0 ? '' : `:${String(mm).padStart(2, '0')}`;
  return `${hh}${minuteText}${showPeriod ? ` ${period}` : ''}`;
}
