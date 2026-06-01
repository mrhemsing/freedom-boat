#!/usr/bin/env node
/*
  Check a generated marina pull against the BC reference list.

  Run after:
    npm run marinas:fetch
    npm run marinas:enrich
*/

const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(process.cwd(), 'data');
const marinasFile = process.env.MARINAS_FILE || path.join(dataDir, 'marinas.enriched.json');

const EXPECTED = [
  { label: 'Secret Cove Marina', patterns: ['secret cove'] },
  { label: "John Henry's Marina & Resort", patterns: ['john henry'] },
  { label: 'Garden Bay Marina', patterns: ['garden bay'] },
  { label: 'Powell River Westview Harbour', patterns: ['westview', 'powell river westview'] },
  { label: 'Beach Gardens Resort & Marina', patterns: ['beach gardens'] },
  { label: 'Lund Harbour', patterns: ['lund'] },
  { label: 'Refuge Cove Marina', patterns: ['refuge cove'] },
  { label: 'Heriot Bay Inn & Marina', patterns: ['heriot bay'] },
  { label: 'Taku Resort & Marina', patterns: ['taku'] },
  { label: 'Gorge Harbour Marina', patterns: ['gorge harbour'] },
  { label: 'Discovery Harbour Marina', patterns: ['discovery harbour'] },
  { label: 'The Coast Marina Campbell River', patterns: ['coast marina campbell', 'coast discovery'] },
  { label: 'Salmon Point Marina', patterns: ['salmon point'] },
  { label: 'Comox Bay Marina', patterns: ['comox bay', 'comox valley'] },
  { label: 'Courtenay Marina', patterns: ['courtenay marina'] },
  { label: 'French Creek Marina', patterns: ['french creek'] },
  { label: 'Schooner Cove Marina', patterns: ['schooner cove'] },
  { label: 'Nanaimo Port Authority Boat Basin', patterns: ['nanaimo port', 'nanaimo boat basin'] },
  { label: 'Ladysmith Community Marina', patterns: ['ladysmith community'] }
];

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function haystack(marina) {
  return normalize(`${marina.name} ${marina.area} ${marina.address} ${marina.website || ''}`);
}

function main() {
  if (!fs.existsSync(marinasFile)) {
    console.error(`Missing ${marinasFile}. Run "npm run marinas:enrich" first.`);
    process.exit(1);
  }

  const marinas = JSON.parse(fs.readFileSync(marinasFile, 'utf8'));
  const rows = EXPECTED.map((expected) => {
    const match = marinas.find((marina) => {
      const text = haystack(marina);
      return expected.patterns.some((pattern) => text.includes(normalize(pattern)));
    });

    return {
      expected: expected.label,
      status: match ? 'found' : 'missing',
      match: match?.name || '',
      lat: match?.lat ?? '',
      lon: match?.lon ?? ''
    };
  });

  console.table(rows);
  const missing = rows.filter((row) => row.status === 'missing');
  console.error(`Found ${rows.length - missing.length}/${rows.length} reference marinas.`);
  if (missing.length) {
    console.error(`Missing: ${missing.map((row) => row.expected).join(', ')}`);
  }
}

main();
