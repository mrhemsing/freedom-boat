#!/usr/bin/env node
/*
  Merge verified, hand-checked marina access details onto a fresh OSM pull.

  Run:
    npm run marinas:fetch
    npm run marinas:enrich
*/

const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(process.cwd(), 'data');
const marinasFile = process.env.MARINAS_FILE || path.join(dataDir, 'marinas.raw.json');
const overridesFile = process.env.OVERRIDES_FILE || path.join(dataDir, 'marina-access-info.json');
const outFile = process.env.OUT_FILE || path.join(dataDir, 'marinas.enriched.json');
const MATCH_KM = Number(process.env.MATCH_KM || 8);
const PROX_ONLY_KM = Number(process.env.PROX_ONLY_KM || 0.4);

const norm = (value) => (value || '')
  .toLowerCase()
  .replace(/&/g, 'and')
  .replace(/\b(marina|marinas|harbour|harbor|authority|resort|moorage|the|co|ltd|fuel|dock|pier)\b/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

function km(a, b) {
  const radius = 6371;
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad((b.lon ?? b.lng) - (a.lon ?? a.lng));
  const latA = toRad(a.lat);
  const latB = toRad(b.lat);
  const n = Math.sin(dLat / 2) ** 2 +
    Math.cos(latA) * Math.cos(latB) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(n));
}

function boolFlag(value) {
  if (value === 'Y') return true;
  if (value === 'N') return false;
  return null;
}

function loadOverrides(raw) {
  const overrides = [];
  for (const [group, value] of Object.entries(raw)) {
    if (group.startsWith('_README') || group.startsWith('_exclude')) continue;
    if (!value || typeof value !== 'object') continue;

    for (const [key, override] of Object.entries(value)) {
      if (override && typeof override === 'object' && override.name) {
        overrides.push({ key, ...override });
      }
    }
  }
  return overrides;
}

function findTarget(marinas, used, override) {
  if (override.osmId) {
    const byId = marinas.find((marina) => marina.osmId === override.osmId);
    if (byId) return { target: byId, matchedBy: 'osmId' };
  }

  if (override.lat == null || (override.lng == null && override.lon == null)) {
    return { target: null, matchedBy: null };
  }

  const overrideName = norm(override.name);
  let best = null;
  let bestDistance = Infinity;

  for (const marina of marinas) {
    if (used.has(marina.osmId)) continue;
    const distance = km(override, marina);
    if (distance > MATCH_KM) continue;
    const marinaName = norm(marina.name);
    const nameHit = marinaName && overrideName &&
      (marinaName === overrideName || marinaName.includes(overrideName) || overrideName.includes(marinaName));
    if (nameHit && distance < bestDistance) {
      best = marina;
      bestDistance = distance;
    }
  }

  if (best) return { target: best, matchedBy: 'name+proximity' };

  for (const marina of marinas) {
    if (used.has(marina.osmId)) continue;
    const distance = km(override, marina);
    if (distance < PROX_ONLY_KM && distance < bestDistance) {
      best = marina;
      bestDistance = distance;
    }
  }

  return best
    ? { target: best, matchedBy: 'proximity' }
    : { target: null, matchedBy: null };
}

function main() {
  if (!fs.existsSync(marinasFile)) {
    console.error(`Missing ${marinasFile}. Run "npm run marinas:fetch" first.`);
    process.exit(1);
  }

  const marinas = JSON.parse(fs.readFileSync(marinasFile, 'utf8'));
  const overrides = loadOverrides(JSON.parse(fs.readFileSync(overridesFile, 'utf8')));
  const used = new Set();
  const stats = { osmId: 0, 'name+proximity': 0, proximity: 0, appended: 0 };

  for (const override of overrides) {
    const { target, matchedBy } = findTarget(marinas, used, override);

    if (target) {
      used.add(target.osmId);
      stats[matchedBy] += 1;
      target.name = override.name || target.name;
      target.access = override.access ?? target.access;
      target.transient = override.transient ?? target.transient;
      target.fuel = boolFlag(override.fuel) ?? target.fuel;
      target.launch = boolFlag(override.launch);
      target.moorage = override.moorage ?? target.moorage ?? null;
      target.verified = override.verified === true;
      target.source = 'osm+override';
      continue;
    }

    marinas.push({
      osmId: `ov_${override.key}`,
      name: override.name,
      address: override.addr || override.address || '',
      lat: override.lat ?? null,
      lon: override.lon ?? override.lng ?? null,
      area: override.area || '',
      exp: override.exp ?? 0.4,
      fuel: boolFlag(override.fuel),
      access: override.access || 'Public',
      transient: override.transient ?? null,
      launch: boolFlag(override.launch),
      moorage: override.moorage ?? null,
      verified: override.verified === true,
      source: 'override-only'
    });
    stats.appended += 1;
  }

  fs.writeFileSync(outFile, `${JSON.stringify(marinas, null, 2)}\n`);
  console.error(`Enriched ${marinas.length} marinas -> ${outFile}`);
  console.error(`matched by osmId: ${stats.osmId}, name+proximity: ${stats['name+proximity']}, proximity: ${stats.proximity}`);
  console.error(`appended override-only: ${stats.appended}`);

  const noCoords = marinas.filter((marina) => marina.lat == null || marina.lon == null).length;
  if (noCoords) console.error(`${noCoords} rows have no coordinates. Add lat/lon before mapping them.`);
}

main();
