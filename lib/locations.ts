export type LocationId = 'port-moody' | 'north-saanich';

export type LocationProfile = {
  id: LocationId;
  name: string;
  // Anchor point used for forecast queries (can be refined later)
  lat: number;
  lon: number;
};

export const LOCATIONS: Record<LocationId, LocationProfile> = {
  'port-moody': {
    id: 'port-moody',
    name: 'Port Moody',
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
