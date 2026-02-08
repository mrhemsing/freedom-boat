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

export function isoToLocalTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function isoToLocalDayTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}
