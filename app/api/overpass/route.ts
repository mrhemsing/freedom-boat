export const runtime = 'nodejs';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 2000;

type CacheEntry = {
  body: string;
  cacheSeconds: number;
  contentType: string;
  expiresAt: number;
  status: number;
};

const cache = new Map<string, CacheEntry>();

export async function POST(request: Request) {
  const body = await request.text();
  return overpassResponse(body, request.headers.get('content-type') ?? 'application/x-www-form-urlencoded');
}

export async function GET(request: Request) {
  const data = new URL(request.url).searchParams.get('data') ?? '';
  const body = data ? `data=${encodeURIComponent(data)}` : '';
  return overpassResponse(body, 'application/x-www-form-urlencoded');
}

async function overpassResponse(body: string, contentType: string) {
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
        'content-type': contentType,
        'user-agent': 'freedom-boat/0.0.1 (freedom.b-average.com)'
      },
      body,
      cache: 'no-store'
    });
    const responseBody = await upstreamResponse.text();
    const entry: CacheEntry = {
      body: responseBody,
      cacheSeconds: CACHE_TTL_MS / 1000,
      contentType: upstreamResponse.headers.get('content-type') ?? 'application/json',
      expiresAt: Date.now() + CACHE_TTL_MS,
      status: upstreamResponse.status
    };

    if (upstreamResponse.ok) setCached(body, entry);
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

function setCached(key: string, entry: CacheEntry) {
  cache.set(key, entry);
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}

function proxyResponse(entry: CacheEntry, cacheStatus: string) {
  return new Response(entry.body, {
    status: entry.status,
    headers: {
      'cache-control': `public, s-maxage=${entry.cacheSeconds}, stale-while-revalidate=86400`,
      'content-type': entry.contentType,
      'x-proxy-cache': cacheStatus
    }
  });
}
