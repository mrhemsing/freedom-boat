export const runtime = 'nodejs';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
  body: string;
  contentType: string;
  expiresAt: number;
  status: number;
};

const cache = new Map<string, CacheEntry>();

export async function POST(request: Request) {
  const body = await request.text();
  if (!body.trim()) {
    return new Response(JSON.stringify({ error: 'Missing Overpass query' }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }

  const cached = cache.get(body);
  if (cached && cached.expiresAt > Date.now()) {
    return proxyResponse(cached, 'HIT');
  }

  try {
    const upstreamResponse = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json,text/plain,*/*',
        'content-type': request.headers.get('content-type') ?? 'application/x-www-form-urlencoded',
        'user-agent': 'freedom-boat/0.0.1 (freedom.b-average.com)'
      },
      body,
      cache: 'no-store'
    });
    const responseBody = await upstreamResponse.text();
    const entry: CacheEntry = {
      body: responseBody,
      contentType: upstreamResponse.headers.get('content-type') ?? 'application/json',
      expiresAt: Date.now() + CACHE_TTL_MS,
      status: upstreamResponse.status
    };

    if (upstreamResponse.ok) cache.set(body, entry);
    return proxyResponse(entry, 'MISS');
  } catch {
    return new Response(JSON.stringify({ error: 'Overpass proxy request failed' }), {
      status: 502,
      headers: {
        'cache-control': 'no-store',
        'content-type': 'application/json'
      }
    });
  }
}

function proxyResponse(entry: CacheEntry, cacheStatus: string) {
  return new Response(entry.body, {
    status: entry.status,
    headers: {
      'cache-control': 'public, max-age=900, stale-while-revalidate=1800',
      'content-type': entry.contentType,
      'x-proxy-cache': cacheStatus
    }
  });
}
