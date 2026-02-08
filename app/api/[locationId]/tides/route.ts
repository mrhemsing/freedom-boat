import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';
import { fetchTideHiLo, findNearestStation, normalizeTideEvents } from '../../../../lib/iwls';

export async function GET(
  req: Request,
  { params }: { params: { locationId: string } }
) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) {
    return NextResponse.json({ error: 'unknown location' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const days = Math.min(Math.max(Number(searchParams.get('days') ?? '2'), 1), 7);

  const now = new Date();
  const from = now.toISOString();
  const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  // Use nearest PAC station that supports wlp-hilo.
  const nearest = await findNearestStation({
    lat: loc.lat,
    lon: loc.lon,
    region: 'PAC',
    timeSeriesCode: 'wlp-hilo'
  });

  const points = await fetchTideHiLo({ stationId: nearest.station.id, from, to });
  const events = normalizeTideEvents({ points, station: nearest.station });

  return NextResponse.json({
    locationId: id,
    anchor: { lat: loc.lat, lon: loc.lon },
    station: {
      id: nearest.station.id,
      name: nearest.station.officialName,
      distanceKm: nearest.distanceKm
    },
    from,
    to,
    events
  });
}
