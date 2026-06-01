export const runtime = 'nodejs';

const IWLS_ORIGIN = 'https://api-iwls.dfo-mpo.gc.ca';
const STATION_LIST_TTL_MS = 24 * 60 * 60 * 1000;
const TIDE_DATA_TTL_MS = 6 * 60 * 60 * 1000;
const STATION_LIST_STALE_SECONDS = 7 * 24 * 60 * 60;
const TIDE_DATA_STALE_SECONDS = 24 * 60 * 60;
const MAX_CACHE_ENTRIES = 2000;

type CacheEntry = {
  body: string;
  cacheSeconds: number;
  contentType: string;
  expiresAt: number;
  staleSeconds: number;
  status: number;
};

const cache = new Map<string, CacheEntry>();

export async function GET(request: Request, { params }: { params: { path?: string[] } }) {
  const path = normalizeIwlsPath(params.path?.join('/') ?? '');
  if (!path) {
    return new Response('Unsupported IWLS path', { status: 404 });
  }

  const incoming = new URL(request.url);
  const upstream = new URL(`/${path}`, IWLS_ORIGIN);
  upstream.search = incoming.search;

  const key = upstream.toString();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return proxyResponse(cached, 'HIT');
  }

  try {
    const upstreamResponse = await fetch(key, {
      headers: { accept: 'application/json' },
      cache: 'no-store'
    });
    const body = await upstreamResponse.text();
    const cacheSeconds = ttlForPath(path) / 1000;
    const entry: CacheEntry = {
      body,
      cacheSeconds,
      contentType: upstreamResponse.headers.get('content-type') ?? 'application/json',
      expiresAt: Date.now() + cacheSeconds * 1000,
      staleSeconds: staleSecondsForPath(path),
      status: upstreamResponse.status
    };

    if (upstreamResponse.ok) setCached(key, entry);
    return proxyResponse(entry, 'MISS');
  } catch {
    return new Response(JSON.stringify({ error: 'IWLS proxy request failed' }), {
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
      'cache-control': `public, s-maxage=${entry.cacheSeconds}, stale-while-revalidate=${entry.staleSeconds}`,
      'content-type': entry.contentType,
      'x-proxy-cache': cacheStatus
    }
  });
}

function normalizeIwlsPath(path: string) {
  const cleanPath = path.replace(/^\/+/, '');
  if (cleanPath.startsWith('api/v1/')) return cleanPath;
  if (cleanPath.startsWith('stations')) return `api/v1/${cleanPath}`;
  return null;
}

function ttlForPath(path: string) {
  return path.startsWith('api/v1/stations') && !path.includes('/data')
    ? STATION_LIST_TTL_MS
    : TIDE_DATA_TTL_MS;
}

function staleSecondsForPath(path: string) {
  return path.startsWith('api/v1/stations') && !path.includes('/data')
    ? STATION_LIST_STALE_SECONDS
    : TIDE_DATA_STALE_SECONDS;
}

function setCached(key: string, entry: CacheEntry) {
  cache.set(key, entry);
  if (cache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
}
