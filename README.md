# freedom-boat

Hyper-local boating conditions PWA for Freedom Boat Club BC (Port Moody + North Saanich).

## Goals

- **Port Moody first**, North Saanich second.
- Show **current conditions**, **hourly forecast**, **tides**, and a simple **alerts feed**.
- Fast, installable **PWA**.
- “On-site alerts”: alerts are computed server-side and displayed in the app (push/Telegram optional later).

## Stack (proposed)

- **Next.js** (App Router) + TypeScript
- PWA via `next-pwa` (or a minimal service worker)
- Server routes under `/api/*` that:
  - fetch upstream data (cached)
  - normalize into a stable schema
  - compute alerts

## Locations

- Port Moody (primary)
- North Saanich (secondary)

## Data sources (MVP)

- Forecast + wind: Open-Meteo (free, no-key) or equivalent.
- Tides: TBD (likely paid marine API if worth it).

## Development

```bash
npm install
npm run dev
```

## Roadmap

See `docs/PLAN.md`.
