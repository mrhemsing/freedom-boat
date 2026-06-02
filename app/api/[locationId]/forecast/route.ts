import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';
import { getLocationWeatherSnapshot } from '../../../../lib/weather-snapshots';

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

  const snapshot = await getLocationWeatherSnapshot(id);
  return NextResponse.json({
    locationId: id,
    hours,
    fetchedAt: snapshot.fetchedAt,
    provider: snapshot.provider,
    forecast: snapshot.forecast.slice(0, hours),
    sunByDay: snapshot.sunByDay
  }, {
    headers: {
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=3600'
    }
  });
}
