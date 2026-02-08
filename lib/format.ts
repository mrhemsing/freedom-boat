export function round(n: number | undefined | null, digits = 0) {
  if (n === undefined || n === null || Number.isNaN(n)) return null;
  const p = 10 ** digits;
  return Math.round(n * p) / p;
}

export function degToCardinal(deg: number | undefined | null) {
  if (deg === undefined || deg === null || Number.isNaN(deg)) return null;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const i = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[i];
}

const PNW_TZ = 'America/Vancouver';

const fmtTime = new Intl.DateTimeFormat('en-US', {
  timeZone: PNW_TZ,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const fmtDayTime = new Intl.DateTimeFormat('en-US', {
  timeZone: PNW_TZ,
  weekday: 'short',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

export function isoToLocalTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return fmtTime.format(d);
}

export function isoToLocalDayTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return fmtDayTime.format(d);
}

const fmtDay = new Intl.DateTimeFormat('en-US', {
  timeZone: PNW_TZ,
  weekday: 'short',
  month: 'short',
  day: 'numeric'
});

export function isoToLocalDay(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return fmtDay.format(d);
}
