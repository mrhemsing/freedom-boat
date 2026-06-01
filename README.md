# FAIRTIDE

Map-based marina trip planner for live wind and wave forecasts, CHS tides,
vessel-aware boating scores, launch-depth checks, optional OSM marina pulls, and
shareable float plans.

This repo is a standard Next.js App Router project for Vercel. It keeps the app
in `app/` and uses serverless route handlers for upstream data that benefits from
same-origin proxying and CDN caching.

## Structure

```text
app/plan-my-trip/TripMap.tsx        planner UI and map logic
app/api/iwls/[...path]/route.ts     proxy -> DFO / CHS IWLS tides
app/api/overpass/route.ts           proxy -> OSM Overpass
lib/marinas.ts                      curated marina and launch data
data/marina-access-info.json        verified access/transient/fuel/moorage overrides
scripts/fetch-marinas.cjs           OSM marina and launch refresh pipeline
scripts/enrich-marinas.cjs          merge verified info onto OSM pull
docs/bc-marinas-reference.md        regional marina validation checklist
docs/bc-offpage-seo.md              BC backlink and outreach playbook
vercel.json                         explicit Next.js project hint
```

## What Runs Where

| Data | How it loads | Needs a function? |
| --- | --- | --- |
| Map tiles | CARTO Voyager, direct from browser | No |
| Forecast | Open-Meteo weather + marine APIs | No |
| Tides | CHS IWLS via `/api/iwls/*` | Yes, for CORS |
| Marinas | Curated list, optional OSM via `/api/overpass` | Yes, for caching |

If a live data call fails, the planner falls back to its built-in models or
curated lists instead of showing a blank screen.

## Development

```bash
npm install
npm run dev
```

## Deploy

Deploy as a normal Next.js project on Vercel. The app uses `npm run build`, and
the route handlers under `app/api/*` become serverless functions automatically.

No API keys, always-on server, or `npm start` process are required for the current
planner. The Vercel CDN caches proxy responses using `s-maxage` headers.

## Caching

- IWLS station list: 24h.
- IWLS tide predictions: 6h.
- Overpass marina/launch geometry: 24h with week-long stale revalidation.

`stale-while-revalidate` keeps responses fast while Vercel refreshes them in the
background.

## Marina Data Refresh

The planner uses the vetted TypeScript marina list in `lib/marinas.ts`. For an
offline OpenStreetMap refresh/review pass:

```bash
npm run marinas:fetch
npm run marinas:enrich
```

`marinas:fetch` writes generated OSM snapshots to `data/marinas.raw.json` and
`data/ramps.raw.json`. `marinas:enrich` merges `data/marina-access-info.json`
onto that pull and writes `data/marinas.enriched.json`. The generated snapshots
are ignored so they can be reviewed before promoting any changes into the app.

Use `docs/bc-marinas-reference.md` as a regional validation checklist when
reviewing whether an OSM pull caught the obvious transient-friendly marinas.

## SEO Growth

The server-rendered marina, launch, and area pages are the on-page SEO layer.
Use `docs/bc-offpage-seo.md` as the BC-specific backlink plan for harbour
authorities, yacht clubs, boating forums, marine businesses, and local resource
pages.

## Config Knobs

In `app/plan-my-trip/TripMap.tsx`:

- `USE_CHS` controls live CHS tides through the IWLS proxy.
- `USE_OSM` controls optional live OSM marina/launch loading through the Overpass
  proxy.
- `OVERPASS_QUERY` defines the Salish Sea OSM marina/slipway pull.

## Notes

- Marina pins are snapped to the nearest embedded shoreline when they fall inland.
- Launch ramps are not snapped because their coordinates represent ramp/waterline
  access.
- Ramp depths and unverified marina rates should be ground-truthed before relying
  on them operationally.
