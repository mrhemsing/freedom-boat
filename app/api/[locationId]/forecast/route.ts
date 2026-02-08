import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';
import { fetchOpenMeteo, normalizeForecast } from '../../../../lib/openmeteo';

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
  const hours = Math.min(Math.max(Number(searchParams.get('hours') ?? '24'), 1), 168);

  const data = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon, hours: hours + 1 });
  const out = normalizeForecast(data, { limitHours: hours });
  return NextResponse.json({ locationId: id, hours, forecast: out });
}
