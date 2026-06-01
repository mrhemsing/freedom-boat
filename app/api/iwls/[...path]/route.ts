export const runtime = 'nodejs';

const IWLS_ORIGIN = 'https://api-iwls.dfo-mpo.gc.ca';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

type CacheEntry = {
  body: string;
  contentType: string;
  expiresAt: number;
  status: number;
};

const cache = new Map<string, CacheEntry>();

export async function GET(request: Request, { params }: { params: { path?: string[] } }) {
  const path = params.path?.join('/') ?? '';
  if (!path.startsWith('api/v1/')) {
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
    const entry: CacheEntry = {
      body,
      contentType: upstreamResponse.headers.get('content-type') ?? 'application/json',
      expiresAt: Date.now() + CACHE_TTL_MS,
      status: upstreamResponse.status
    };

    if (upstreamResponse.ok) cache.set(key, entry);
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
      'cache-control': 'public, max-age=900, stale-while-revalidate=43200',
      'content-type': entry.contentType,
      'x-proxy-cache': cacheStatus
    }
  });
}
