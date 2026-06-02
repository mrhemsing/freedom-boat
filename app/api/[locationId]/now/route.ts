import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';
import { getLocationWeatherSnapshot } from '../../../../lib/weather-snapshots';

export async function GET(
  _req: Request,
  { params }: { params: { locationId: string } }
) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) {
    return NextResponse.json({ error: 'unknown location' }, { status: 404 });
  }

  const snapshot = await getLocationWeatherSnapshot(id);
  return NextResponse.json({
    ...snapshot.now,
    fetchedAt: snapshot.fetchedAt,
    provider: snapshot.provider
  }, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600'
    }
  });
}
