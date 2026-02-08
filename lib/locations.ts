export type LocationId = 'port-moody' | 'north-saanich';

export type LocationProfile = {
  id: LocationId;
  name: string;
  address?: string;
  // Anchor point used for forecast queries (can be refined later)
  lat: number;
  lon: number;
};

export const LOCATIONS: Record<LocationId, LocationProfile> = {
  'port-moody': {
    id: 'port-moody',
    name: 'Port Moody',
    address: '850 Barnet Hwy, Port Moody, BC V3H 1V6',
    // TODO: confirm exact anchor lat/lon (marina entrance preferred)
    lat: 49.282,
    lon: -122.86
  },
  'north-saanich': {
    id: 'north-saanich',
    name: 'North Saanich',
    lat: 48.65,
    lon: -123.43
  }
};
