// Open-Meteo wind_speed_10m / wind_gusts_10m are returned in km/h by default.
// Keep function name for compatibility with existing imports.
export function msToKnots(kmh: number) {
  return kmh * 0.539957;
}
