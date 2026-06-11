import { NextResponse } from 'next/server';
import { LOCATIONS, type LocationId } from '../../../../lib/locations';

const EC_MARINE_ATOM = 'https://weather.gc.ca/rss/marine';
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

function withPeriod(text: string) {
  const cleaned = text.trim();
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
}

function cleanNwsAlertBody(description?: string) {
  if (!description) return undefined;

  const text = description.replace(/\s+/g, ' ').trim();
  const sections = text
    .split(/\s*\*\s*(?=[A-Z][A-Z ]+\.\.\.)/g)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) => {
      const match = /^([A-Z][A-Z ]+)\.\.\.(.+)$/i.exec(section);
      return match
        ? { label: match[1].trim().toUpperCase(), body: match[2].trim() }
        : { label: '', body: section.replace(/^\*\s*/, '').trim() };
    });

  if (!sections.length) return text;

  const preferred = ['WHAT', 'WHEN', 'IMPACTS']
    .map((label) => sections.find((section) => section.label === label))
    .filter((section): section is { label: string; body: string } => Boolean(section?.body));

  if (preferred.length) {
    return preferred
      .map((section) => withPeriod(section.body))
      .join(' ');
  }

  return sections
    .filter((section) => section.label !== 'WHERE')
    .map((section) => withPeriod(section.body))
    .join(' ');
}

function extractAtomEntries(xml: string): Array<{ title: string; description?: string; link?: string; pubDate?: string; category?: string }> {
  const entries: Array<{ title: string; description?: string; link?: string; pubDate?: string; category?: string }> = [];
  const blocks = xml.split(/<entry>/i).slice(1);
  for (const b of blocks) {
    const end = b.split(/<\/entry>/i)[0] ?? '';

    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(end)?.[1];
    const summary = /<summary[^>]*>([\s\S]*?)<\/summary>/i.exec(end)?.[1];
    const link = /<link\b[^>]*href="([^"]+)"/i.exec(end)?.[1];
    const updated = /<updated[^>]*>([\s\S]*?)<\/updated>/i.exec(end)?.[1];
    const published = /<published[^>]*>([\s\S]*?)<\/published>/i.exec(end)?.[1];
    const category = /<category\b[^>]*term="([^"]+)"/i.exec(end)?.[1];

    if (!title) continue;
    entries.push({
      title: stripTags(decodeHtml(title)),
      description: summary ? stripTags(decodeHtml(summary)) : undefined,
      link: link ? decodeHtml(link).trim() : undefined,
      pubDate: (published ?? updated)?.trim(),
      category: category ? decodeHtml(category).trim() : undefined
    });
  }
  return entries;
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
      body: cleanNwsAlertBody(String(props.description || '')),
      link: props['@id'],
      severity: severityOf(String(props.event || props.headline || '')),
      pubDate: props.sent
    }));

  return NextResponse.json({ locationId: id, authority, status: 'available', items });
}

async function getEcWarnings(
  id: LocationId,
  loc: { marineAreas?: string[]; marineSiteIds?: string[] },
  authority: string
) {
  const siteIds = loc.marineSiteIds ?? [];
  if (!siteIds.length) {
    return NextResponse.json({
      locationId: id,
      authority,
      status: 'unavailable',
      items: [],
      error: 'No EC marine site IDs configured'
    }, { status: 200 });
  }

  const results = await Promise.all(siteIds.map(async (siteId) => {
    const url = `${EC_MARINE_ATOM}/${siteId}_e.xml`;
    const res = await fetch(url, {
      next: { revalidate: 5 * 60 },
      headers: {
        accept: 'application/atom+xml, application/xml, text/xml',
        'user-agent': 'Fairtide/1.0'
      }
    });
    if (!res.ok) {
      return { ok: false, siteId, error: `EC marine ATOM ${siteId} HTTP ${res.status}`, items: [] };
    }
    const xml = await res.text();
    return { ok: true, siteId, items: extractAtomEntries(xml) };
  }));

  const available = results.filter((result) => result.ok);
  if (!available.length) {
    return NextResponse.json({
      locationId: id,
      authority,
      status: 'unavailable',
      items: [],
      error: results.map((result) => result.error).filter(Boolean).join('; ') || 'EC marine feeds unavailable'
    }, { status: 200 });
  }

  const areas = (loc.marineAreas || []).map((s) => s.toLowerCase());
  const seen = new Set<string>();
  const filtered = available
    .flatMap((result) => result.items)
    .filter((it) => {
      const title = it.title.toLowerCase();
      const category = String(it.category || '').toLowerCase();
      const isWarning = category.includes('marine warnings') || title.includes('warning') || title.includes('watch');
      if (!isWarning) return false;
      if (areas.length && !areas.some((a) => title.includes(a))) return false;

      const key = `${it.title}|${it.pubDate ?? ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 6)
    .map((it) => ({
      title: toTitleCaseWarning(it.title),
      body: it.description,
      link: it.link,
      severity: severityOf(it.title),
      pubDate: it.pubDate
    }));

  return NextResponse.json({ locationId: id, authority, status: 'available', items: filtered });
}

function toTitleCaseWarning(title: string) {
  return title
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bIn\b/g, 'in');
}

export async function GET(_req: Request, { params }: { params: { locationId: string } }) {
  const id = params.locationId as LocationId;
  const loc = LOCATIONS[id];
  if (!loc) return NextResponse.json({ error: 'unknown location' }, { status: 404 });
  if (loc.waterType === 'lake') {
    return NextResponse.json({
      locationId: id,
      authority: 'Inland lake forecast',
      status: 'unavailable',
      items: [],
      nonMarine: true
    });
  }

  const routing = warningAuthority(loc);
  if (routing.country === 'US') {
    return getNwsWarnings(id, loc, routing.authority);
  }

  return getEcWarnings(id, loc, routing.authority);
}
