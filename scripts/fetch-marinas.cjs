#!/usr/bin/env node
/*
  Pull public marinas and launches from OpenStreetMap Overpass.

  This is an offline refresh tool, not runtime app code. It writes raw
  generated JSON under data/ so curated planner data can be reviewed before
  anything is promoted into lib/marinas.ts.
*/

const fs = require('fs');
const path = require('path');

const DEFAULT_BBOX = '48.30,-127.00,52.50,-122.10'; // S,W,N,E
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

const args = process.argv.slice(2);
const argValue = (flag) => {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
};

const bbox = argValue('--bbox') || process.env.BBOX || DEFAULT_BBOX;
const inputFile = argValue('--in') || process.env.OVERPASS_FILE || null;
const dataDir = path.resolve(process.cwd(), 'data');
const marinasFile = process.env.MARINAS_FILE || path.join(dataDir, 'marinas.raw.json');
const rampsFile = process.env.RAMPS_FILE || path.join(dataDir, 'ramps.raw.json');

function buildQuery(targetBbox) {
  return `[out:json][timeout:90];
(
  nwr["leisure"="marina"](${targetBbox});
  nwr["leisure"="slipway"](${targetBbox});
  nwr["seamark:type"="harbour"]["seamark:harbour:category"="marina"](${targetBbox});
);
out center tags;`;
}

async function runOverpass(targetBbox) {
  const query = buildQuery(targetBbox);
  let lastError;

  for (const endpoint of ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FreedomBoatPlanner/1.0 offline marina refresh'
        },
        body: `data=${encodeURIComponent(query)}`
      });
      if (!response.ok) throw new Error(`${endpoint} -> HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      lastError = error;
      console.error(`Overpass mirror failed: ${error.message}`);
    }
  }

  throw lastError;
}

const slug = (type, id) => `osm${type[0]}${id}`;
const yes = (value) => value === 'yes' || value === 'only' || value === 'designated';

function address(tags) {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  return [street, tags['addr:city'], tags['addr:province'] || tags['addr:state'] || 'BC']
    .filter(Boolean)
    .join(', ');
}

function exposure(lat, lon) {
  if (lat > 49.9) return 0.7;
  if (lon < -124.6) return 0.7;
  if (lat < 48.7) return 0.6;
  return 0.4;
}

function hasFuel(tags) {
  const facility = tags['seamark:small_craft_facility:category'] || '';
  return yes(tags.fuel) ||
    yes(tags['fuel:diesel']) ||
    yes(tags['fuel:gasoline']) ||
    facility.includes('fuel') ||
    /fuel/i.test(tags.name || '');
}

function normalize(osm) {
  const marinas = [];
  const ramps = [];
  const seen = new Set();

  for (const element of osm.elements || []) {
    const tags = element.tags || {};
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (lat == null || lon == null) continue;

    if (tags.leisure === 'slipway') {
      ramps.push({
        osmId: slug(element.type, element.id),
        name: tags.name || 'Public launch',
        area: tags['addr:city'] || '',
        lat: Number(lat.toFixed(5)),
        lon: Number(lon.toFixed(5)),
        type: tags.access === 'private' ? 'Private' : yes(tags.fee) ? 'Trailer (fee)' : 'Trailer',
        access: tags.access || 'unknown',
        fee: tags.fee || null
      });
      continue;
    }

    if (tags.access === 'private') continue;

    const key = `${tags.name || ''}@${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    marinas.push({
      osmId: slug(element.type, element.id),
      name: tags.name || 'Unnamed marina',
      address: address(tags),
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5)),
      area: tags['addr:city'] || '',
      exp: exposure(lat, lon),
      fuel: hasFuel(tags) || null,
      access: 'Public',
      transient: null,
      fee: tags.fee || null,
      vhf: tags['seamark:radio_station:channel'] || null,
      website: tags.website || tags['contact:website'] || null,
      phone: tags.phone || tags['contact:phone'] || null,
      verified: false,
      source: 'osm'
    });
  }

  marinas.sort((a, b) => b.lat - a.lat);
  ramps.sort((a, b) => b.lat - a.lat);
  return { marinas, ramps };
}

(async () => {
  const osm = inputFile
    ? JSON.parse(fs.readFileSync(path.resolve(inputFile), 'utf8'))
    : await runOverpass(bbox);

  const { marinas, ramps } = normalize(osm);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(marinasFile, `${JSON.stringify(marinas, null, 2)}\n`);
  fs.writeFileSync(rampsFile, `${JSON.stringify(ramps, null, 2)}\n`);

  console.error(`Wrote ${marinas.length} marinas -> ${marinasFile}`);
  console.error(`Wrote ${ramps.length} launches -> ${rampsFile}`);
  console.error(`${marinas.filter((marina) => marina.fuel).length} marinas tagged with fuel`);
})().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
