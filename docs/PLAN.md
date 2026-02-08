# Freedom Boat – MVP Plan

## MVP screens

### 1) Dashboard (Port Moody default)
- **Now**
  - wind speed / gust / direction
  - precip now + next hour
  - temperature
- **Next 12h / 24h**
  - hourly strip: wind+gust+precip
- **Tides**
  - next high/low + mini chart (today/tomorrow)
- **Alerts feed**
  - computed “heads up” items with timestamps and severity

### 2) Location switcher
- Port Moody
- North Saanich

### 3) Settings
- thresholds (later)
- units (kt/m/s, °C/°F)

## Data model (server normalized)

### `ConditionsNow`
```ts
type ConditionsNow = {
  locationId: 'port-moody' | 'north-saanich'
  asOf: string // ISO
  wind: { speedKts: number; gustKts?: number; directionDeg?: number }
  tempC?: number
  precipMmHr?: number
  precipProbPct?: number
}
```

### `ForecastHour[]`
```ts
type ForecastHour = {
  t: string // ISO
  windSpeedKts: number
  windGustKts?: number
  windDirDeg?: number
  precipMm?: number
  precipProbPct?: number
}
```

### `TideEvent[]` (TBD)
```ts
type TideEvent = {
  t: string
  kind: 'high' | 'low'
  heightM?: number
}
```

### `AlertItem[]`
```ts
type AlertItem = {
  id: string
  t: string
  severity: 'info' | 'caution' | 'warning'
  title: string
  body?: string
  source?: string
}
```

## API routes (MVP)

- `GET /api/locations` → list location profiles
- `GET /api/:locationId/now`
- `GET /api/:locationId/forecast?hours=24`
- `GET /api/:locationId/alerts`
- `GET /api/:locationId/tides` (once provider picked)

## Caching

- Cache upstream results server-side for 2–10 minutes depending on endpoint.
- Keep computed alerts for ~24h so the feed is stable.

## Alert rules (initial defaults)

Start simple and tune later:

- **Caution:** gusts >= 18 kt within next 6 hours
- **Warning:** gusts >= 25 kt within next 6 hours
- **Info:** rain starting within 90 minutes (prob >= 60%)

## Next steps

1) Pick a tide provider (free vs paid). If paid, pick one with:
   - tide times + heights
   - decent station coverage for Port Moody and North Saanich

2) Confirm exact anchor lat/lon for each marina.

3) Build Next.js skeleton + the first two endpoints:
   - `/api/port-moody/now`
   - `/api/port-moody/forecast`
