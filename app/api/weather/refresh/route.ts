import { NextResponse } from 'next/server';
import { refreshAllLocationWeatherSnapshots } from '../../../../lib/weather-snapshots';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const secret = process.env.WEATHER_REFRESH_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    const isVercelCron = req.headers.get('x-vercel-cron') === '1' || (req.headers.get('user-agent') ?? '').includes('vercel-cron');
    if (auth !== `Bearer ${secret}` && !isVercelCron) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const startedAt = new Date().toISOString();
  const results = await refreshAllLocationWeatherSnapshots({ concurrency: 2 });
  const ok = results.filter((result) => result.ok).length;

  return NextResponse.json({
    startedAt,
    finishedAt: new Date().toISOString(),
    ok,
    failed: results.length - ok,
    results
  });
}
