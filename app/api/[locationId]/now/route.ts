import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';
import { fetchOpenMeteo, normalizeNow } from '../../../../lib/openmeteo';

export async function GET(
  _req: Request,
  { params }: { params: { locationId: string } }
) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) {
    return NextResponse.json({ error: 'unknown location' }, { status: 404 });
  }

  const data = await fetchOpenMeteo({ lat: loc.lat, lon: loc.lon, hours: 48 });
  return NextResponse.json(normalizeNow(id, data));
}
