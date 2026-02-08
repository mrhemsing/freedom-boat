import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json([
    {
      id: 'port-moody',
      name: 'Port Moody',
      // TODO: set precise marina anchor.
      lat: 49.282,
      lon: -122.86
    },
    {
      id: 'north-saanich',
      name: 'North Saanich',
      lat: 48.65,
      lon: -123.43
    }
  ]);
}
