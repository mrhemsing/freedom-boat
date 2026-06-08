import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';

// Environment Canada warnings RSS (English)
const EC_BC_WARNINGS = 'https://weather.gc.ca/rss/warning/bc_e.xml';
const NWS_ALERTS = 'https://api.weather.gov/alerts/active';

function warningAuthority(loc: { address?: string }) {
  const address = String(loc.address || '').toUpperCase();
  const country = /\bBC\b|\bCANADA\b/.test(address) ? 'CA' : 'US';
  return country === 'CA'
    ? { country, authority: 'Environment Canada' }
    : { country, authority: 'National Weather Service' };
}

function decodeHtml(s: string) {
  return s
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

function stripTags(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractItems(xml: string): Array<{ title: string; description?: string; link?: string; pubDate?: string }> {
  const items: Array<{ title: string; description?: string; link?: string; pubDate?: string }> = [];
  const blocks = xml.split(/<item>/i).slice(1);
  for (const b of blocks) {
    const end = b.split(/<\/item>/i)[0] ?? '';

    const title = /<title>([\s\S]*?)<\/title>/i.exec(end)?.[1];
    const desc = /<description>([\s\S]*?)<\/description>/i.exec(end)?.[1];
    const link = /<link>([\s\S]*?)<\/link>/i.exec(end)?.[1];
    const pubDate = /<pubDate>([\s\S]*?)<\/pubDate>/i.exec(end)?.[1];

    if (!title) continue;
    items.push({
      title: stripTags(decodeHtml(title)),
      description: desc ? stripTags(decodeHtml(desc)) : undefined,
      link: link ? decodeHtml(link).trim() : undefined,
      pubDate: pubDate ? pubDate.trim() : undefined
    });
  }
  return items;
}

function severityOf(title: string): 'warning' | 'caution' | 'info' {
  const t = title.toLowerCase();
  if (t.includes('hurricane') || t.includes('storm') || t.includes('gale') || t.includes('squall') || t.includes('warning')) {
    return 'warning';
  }
  if (t.includes('strong wind') || t.includes('watch') || t.includes('statement') || t.includes('advisory')) {
    return 'caution';
  }
  return 'info';
}

function isMarineAlert(title: string, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  return (
    text.includes('marine') ||
    text.includes('small craft') ||
    text.includes('gale') ||
    text.includes('storm') ||
    text.includes('hurricane') ||
    text.includes('squall') ||
    text.includes('hazardous seas') ||
    text.includes('coastal waters') ||
    text.includes('puget sound') ||
    text.includes('strait')
  );
}

async function getNwsWarnings(id: LocationId, loc: { lat: number; lon: number }, authority: string) {
  const url = `${NWS_ALERTS}?point=${loc.lat.toFixed(4)},${loc.lon.toFixed(4)}`;
  const res = await fetch(url, {
    next: { revalidate: 5 * 60 },
    headers: {
      accept: 'application/geo+json',
      'user-agent': 'Fairtide/1.0 contact@fairtide.local'
    }
  });

  if (!res.ok) {
    return NextResponse.json({
      locationId: id,
      authority,
      status: 'unavailable',
      items: [],
      error: `NWS alerts HTTP ${res.status}`
    }, { status: 200 });
  }

  const json = await res.json();
  const features = Array.isArray(json?.features) ? json.features : [];
  const items = features
    .map((feature: any) => feature?.properties ?? {})
    .filter((props: any) => isMarineAlert(String(props.event || props.headline || ''), String(props.description || '')))
    .slice(0, 6)
    .map((props: any) => ({
      title: String(props.event || props.headline || 'Marine alert'),
      body: props.description ? String(props.description).replace(/\s+/g, ' ').trim() : undefined,
      link: props['@id'],
      severity: severityOf(String(props.event || props.headline || '')),
      pubDate: props.sent
    }));

  return NextResponse.json({ locationId: id, authority, status: 'available', items });
}

export async function GET(_req: Request, { params }: { params: { locationId: string } }) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) return NextResponse.json({ error: 'unknown location' }, { status: 404 });

  const routing = warningAuthority(loc);
  if (routing.country === 'US') {
    return getNwsWarnings(id, loc, routing.authority);
  }

  const res = await fetch(EC_BC_WARNINGS, { next: { revalidate: 5 * 60 } });
  if (!res.ok) {
    return NextResponse.json({
      locationId: id,
      authority: routing.authority,
      status: 'unavailable',
      items: [],
      error: `EC RSS HTTP ${res.status}`
    }, { status: 200 });
  }

  const xml = await res.text();
  const items = extractItems(xml);

  const areas = (loc.marineAreas || []).map((s) => s.toLowerCase());
  const filtered = items
    .filter((it) => {
      const title = it.title.toLowerCase();
      // Only keep marine-ish items (best-effort)
      const isMarine =
        title.includes('gale') ||
        title.includes('storm') ||
        title.includes('hurricane') ||
        title.includes('squall') ||
        title.includes('strong wind') ||
        title.includes('marine') ||
        title.includes('wind warning');

      if (!isMarine) return false;
      if (areas.length === 0) return true;
      return areas.some((a) => title.includes(a));
    })
    .slice(0, 6)
    .map((it) => ({
      title: it.title,
      body: it.description,
      link: it.link,
      severity: severityOf(it.title),
      // We don't strictly trust pubDate parsing, but keep it for display/debug.
      pubDate: it.pubDate
    }));

  return NextResponse.json({ locationId: id, authority: routing.authority, status: 'available', items: filtered });
}
