export type LocationId = string;

export type LocationProfile = {
  id: LocationId;
  name: string;
  address?: string;
  tidal: boolean;
  waterType?: 'tidal' | 'lake' | 'river';
  timeZone?: string;
  // Anchor point used for forecast queries (can be refined later)
  lat: number;
  lon: number;
  // Environment Canada RSS marine warning area keywords to filter on (best-effort)
  marineAreas?: string[];
  // Environment Canada marine ATOM feed site IDs for the nearest forecast areas.
  marineSiteIds?: string[];
};

export const LOCATIONS: Record<LocationId, LocationProfile> = {
  'port-moody': {
    id: 'port-moody',
    name: 'Port Moody',
    address: '850 Barnet Hwy, Port Moody, BC',
    tidal: true,
    // Marina anchor (Burrard Inlet)
    lat: 49.291406,
    lon: -122.884611,
    // EC does not publish a Burrard Inlet marine ATOM zone. Do not fall
    // through to Howe Sound; use the south Strait of Georgia feed instead.
    marineAreas: [
      'Strait of Georgia - south of Nanaimo'
    ],
    marineSiteIds: ['14300']
  },
  'north-saanich': {
    id: 'north-saanich',
    name: 'North Saanich',
    address: '2300 Canoe Cove Rd, North Saanich, BC',
    tidal: true,
    lat: 48.65,
    lon: -123.43,
    marineAreas: [
      'Strait of Georgia',
      'Juan de Fuca Strait',
      'Haro Strait'
    ],
    marineSiteIds: ['06100', '14305']
  },
  'oak-bay': {
    id: 'oak-bay',
    name: 'Oak Bay',
    address: 'Oak Bay Marina, Victoria, BC',
    tidal: true,
    lat: 48.4249,
    lon: -123.3025,
    marineAreas: [
      'Juan de Fuca Strait',
      'Haro Strait',
      'Strait of Georgia'
    ],
    marineSiteIds: ['06100', '07003', '14305']
  },
  'comox': {
    id: 'comox',
    name: 'Comox Valley',
    address: 'Comox Harbour, Comox, BC',
    tidal: true,
    // Shared local forecast anchor for Comox/Courtenay detail pages. The trip
    // planner independently fetches coordinate-specific forecasts for every
    // destination.
    lat: 49.6748,
    lon: -124.9495,
    marineAreas: [
      'Strait of Georgia - north of Nanaimo'
    ],
    marineSiteIds: ['14303']
  },
  'west-vancouver': {
    id: 'west-vancouver',
    name: 'West Vancouver',
    address: '34 Sunset Beach, West Vancouver, BC, V7W 2T7',
    tidal: true,
    lat: 49.3293,
    lon: -123.1566,
    marineAreas: [
      'Howe Sound',
      'Strait of Georgia',
      'Burrard Inlet'
    ],
    marineSiteIds: ['06400', '14305']
  },
  'richmond': {
    id: 'richmond',
    name: 'Richmond',
    address: '8031 River Rd, Richmond, BC',
    tidal: true,
    lat: 49.188,
    lon: -123.126,
    marineAreas: [
      'Strait of Georgia',
      'Burrard Inlet'
    ],
    marineSiteIds: ['14305']
  },
  'bellingham': {
    id: 'bellingham',
    name: 'Bellingham',
    address: 'Squalicum Harbor Marina, Bellingham, WA',
    tidal: true,
    lat: 48.7531,
    lon: -122.5014,
    marineAreas: ['Strait of Georgia']
  },
  'anacortes': {
    id: 'anacortes',
    name: 'Anacortes',
    address: 'Anacortes, WA',
    tidal: true,
    lat: 48.5126,
    lon: -122.6127,
    marineAreas: ['Juan de Fuca Strait', 'Haro Strait']
  },
  'everett': {
    id: 'everett',
    name: 'Everett',
    address: 'Port of Everett Marina, Everett, WA',
    tidal: true,
    lat: 47.9972,
    lon: -122.2227
  },
  'port-of-edmonds': {
    id: 'port-of-edmonds',
    name: 'Port of Edmonds',
    address: 'Port of Edmonds Marina, Edmonds, WA',
    tidal: true,
    lat: 47.8112,
    lon: -122.3857
  },
  'port-of-poulsbo': {
    id: 'port-of-poulsbo',
    name: 'Port of Poulsbo',
    address: 'Poulsbo Marina, Poulsbo, WA',
    tidal: true,
    lat: 47.7359,
    lon: -122.6477
  },
  'elliott-bay-marina': {
    id: 'elliott-bay-marina',
    name: 'Elliott Bay Marina',
    address: 'Elliott Bay Marina, Seattle, WA',
    tidal: true,
    lat: 47.6309,
    lon: -122.3912
  },
  'agc-marina': {
    id: 'agc-marina',
    name: 'AGC Marina',
    address: 'AGC Marina, Lake Union, Seattle, WA',
    tidal: false,
    waterType: 'lake',
    lat: 47.6268,
    lon: -122.3354
  },
  'yarrow-bay-marina': {
    id: 'yarrow-bay-marina',
    name: 'Yarrow Bay Marina',
    address: 'Yarrow Bay Marina, Kirkland, WA',
    tidal: false,
    waterType: 'lake',
    lat: 47.6433,
    lon: -122.2086
  },
  'leschi-marina': {
    id: 'leschi-marina',
    name: 'Leschi Marina',
    address: 'Leschi Marina, Seattle, WA',
    tidal: false,
    waterType: 'lake',
    lat: 47.6021,
    lon: -122.2861
  },
  'port-orchard': {
    id: 'port-orchard',
    name: 'Port Orchard',
    address: 'Port Orchard Marina, Port Orchard, WA',
    tidal: true,
    lat: 47.5432,
    lon: -122.6367
  },
  'tacoma': {
    id: 'tacoma',
    name: 'Tacoma',
    address: 'Foss Harbor Marina, Tacoma, WA',
    tidal: true,
    lat: 47.2531,
    lon: -122.4345
  },
  'olympia': {
    id: 'olympia',
    name: 'Olympia',
    address: 'Swantown Marina, Olympia, WA',
    tidal: true,
    lat: 47.0554,
    lon: -122.9004
  },
  'portland-tomahawk-bay-marina': {
    id: 'portland-tomahawk-bay-marina',
    name: 'Portland Tomahawk Bay Marina',
    address: 'Tomahawk Bay Marina, Portland, OR',
    tidal: false,
    waterType: 'river',
    lat: 45.6074,
    lon: -122.6606
  },
  'port-of-camas': {
    id: 'port-of-camas',
    name: 'Port of Camas',
    address: "Parker's Landing Marina, Camas/Washougal, WA",
    tidal: false,
    waterType: 'river',
    lat: 45.5782,
    lon: -122.3811
  },
  'lake-coeur-dalene': {
    id: 'lake-coeur-dalene',
    name: "Lake Coeur d'Alene",
    address: "Lakeside Marina, Coeur d'Alene, ID",
    tidal: false,
    waterType: 'lake',
    timeZone: 'America/Boise',
    lat: 47.6732,
    lon: -116.7859
  },
  'hayden-lake-marina': {
    id: 'hayden-lake-marina',
    name: 'Hayden Lake Marina',
    address: 'Hayden Lake Marina, Hayden Lake, ID',
    tidal: false,
    waterType: 'lake',
    timeZone: 'America/Boise',
    lat: 47.7665,
    lon: -116.7563
  }
};

export function isTidalLocation(loc: Pick<LocationProfile, 'tidal' | 'waterType'>) {
  return loc.tidal && loc.waterType !== 'lake' && loc.waterType !== 'river';
}
