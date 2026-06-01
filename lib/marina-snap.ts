import { COAST, type CoastPoint, type CoastPolygon, type CoastRing } from './coastline';

type MappablePoint = {
  lat: number;
  lon: number;
};

const LAT0 = 49.2;
const KX = Math.cos((LAT0 * Math.PI) / 180);
const WATER_OFFSET = 0.0007;

export function snapMarinaList<T extends MappablePoint>(marinas: readonly T[]): T[] {
  return marinas.map(snapMarinaToShore);
}

export function snapMarinaToShore<T extends MappablePoint>(marina: T): T {
  const snapped = snapToShore(marina.lat, marina.lon);
  if (snapped.lat === marina.lat && snapped.lon === marina.lon) return marina;
  return { ...marina, lat: snapped.lat, lon: snapped.lon };
}

function snapToShore(lat: number, lon: number) {
  for (const poly of COAST) {
    if (!inPoly(lon, lat, poly)) continue;

    let best: { d: number; lon: number; lat: number } | null = null;
    for (const ring of poly) {
      for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
        const candidate = nearestPointOnSegment(lon, lat, ring[previous], ring[index]);
        if (!best || candidate.d < best.d) best = candidate;
      }
    }

    if (!best) break;
    const ux = best.lon * KX - lon * KX;
    const uy = best.lat - lat;
    const magnitude = Math.hypot(ux, uy) || 1e-9;
    return {
      lat: best.lat + (uy / magnitude) * WATER_OFFSET,
      lon: (best.lon * KX + (ux / magnitude) * WATER_OFFSET) / KX
    };
  }

  return { lat, lon };
}

function inPoly(lon: number, lat: number, poly: CoastPolygon) {
  if (!inRing(lon, lat, poly[0])) return false;
  for (let index = 1; index < poly.length; index += 1) {
    if (inRing(lon, lat, poly[index])) return false;
  }
  return true;
}

function inRing(lon: number, lat: number, ring: CoastRing) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    const crosses = yi > lat !== yj > lat;
    if (crosses && lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function nearestPointOnSegment(lon: number, lat: number, a: CoastPoint, b: CoastPoint) {
  const ax = a[0] * KX;
  const ay = a[1];
  const bx = b[0] * KX;
  const by = b[1];
  const px = lon * KX;
  const py = lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy || 1e-12;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return {
    d: Math.hypot(px - cx, py - cy),
    lon: cx / KX,
    lat: cy
  };
}
