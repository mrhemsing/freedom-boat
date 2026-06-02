import { NextResponse } from 'next/server';
import { LOCATIONS } from '../../../lib/locations';

export async function GET() {
  return NextResponse.json(
    Object.values(LOCATIONS).map((location) => ({
      id: location.id,
      name: location.name,
      lat: location.lat,
      lon: location.lon
    }))
  );
}
