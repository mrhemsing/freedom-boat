export type Marina = {
  id: number;
  osmId?: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  area: string;
  exp?: number;
  freedomClub?: boolean;
  locationId?: 'port-moody' | 'north-saanich' | 'west-vancouver';
  accessInfo?: MarinaAccessInfo;
};

export type MarinaAccessInfo = {
  access: 'Public' | 'Civic' | 'Resort' | 'Members';
  transient: 'Y' | 'Limited' | 'N';
  fuel: 'Y' | 'N' | '?';
  launch: 'Y' | 'N' | '?';
  moorage: string;
  verified: boolean;
};

export type BoatLaunch = {
  id: number;
  osmId?: string;
  name: string;
  area: string;
  lat: number;
  lon: number;
  type: string;
  minTide?: number;
  access?: string;
  fee?: string;
};

export const MARINA_ACCESS_INFO: Record<string, MarinaAccessInfo> = {
  coal: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot', verified: false },
  westvan: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'Y', moorage: 'by the foot', verified: false },
  lynn: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  vanm: { access: 'Public', transient: 'Limited', fuel: '?', launch: '?', moorage: 'by the foot', verified: false },
  sky: { access: 'Public', transient: 'Limited', fuel: '?', launch: '?', moorage: 'by the foot', verified: false },
  reed: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'Y', moorage: 'by the foot', verified: false },
  thun: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  sewm: { access: 'Public', transient: 'Y', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  sewf: { access: 'Public', transient: 'N', fuel: 'Y', launch: 'N', moorage: 'fuel dock only', verified: false },
  bowen: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot', verified: false },
  cres: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'Y', moorage: 'by the foot', verified: false },
  semi: { access: 'Resort', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot, USD', verified: false },
  mont: { access: 'Resort', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot', verified: false },
  stal: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  poet: { access: 'Resort', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot, resort', verified: false },
  newc: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  vanis: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot', verified: false },
  sid: { access: 'Public', transient: 'Y', fuel: 'N', launch: 'N', moorage: 'by the foot, reserve', verified: false },
  mill: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'by the foot', verified: false },
  canoe: { access: 'Public', transient: 'Limited', fuel: 'Y', launch: 'Y', moorage: 'by the foot', verified: false },
  fc_fishermens: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'by the foot; annual waitlist', verified: true },
  burrard_civic: { access: 'Civic', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'City marina; mostly permanent', verified: true },
  heather_civic: { access: 'Civic', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'City marina', verified: true },
  quayside: { access: 'Public', transient: 'Y', fuel: 'N', launch: 'N', moorage: 'guest moorage to 120 ft', verified: true },
  deepcove: { access: 'Public', transient: 'Limited', fuel: 'Y', launch: 'Y', moorage: '~6 guest slips, max 14 nights', verified: true },
  gibsons_glha: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'Y', moorage: 'overnight, to 110 ft; reserve 50ft+', verified: true },
  gibsons_marina: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'N', moorage: "transient 'as available', to 85 ft", verified: true },
  union_steamship: { access: 'Public', transient: 'Y', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  pender_hbr: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'Y', moorage: 'by the foot', verified: false },
  lions_bay: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'Y', moorage: 'by the foot', verified: false },
  steveston_harbour: { access: 'Public', transient: 'Y', fuel: '?', launch: 'Y', moorage: 'transient float, max 7 days', verified: true }
};

export const EXCLUDED_MARINAS = {
  fcyc: { name: 'False Creek Yacht Club', access: 'Members', note: 'transient to members only, seniority basis' },
  rvyc: { name: 'Royal Vancouver Yacht Club', access: 'Members', note: 'reciprocal clubs only' },
  dcyc: { name: 'Deep Cove Yacht Club', access: 'Members', note: 'members only' },
  wvyc: { name: 'West Vancouver Yacht Club', access: 'Members', note: 'members only' }
};

export const TRIP_MARINAS: Marina[] = [
  {
    id: 1,
    osmId: 'coal',
    name: 'Coal Harbour Marina',
    address: '1525 Coal Harbour Quay, Vancouver, BC',
    lat: 49.2906,
    lon: -123.121,
    area: 'Vancouver'
  },
  {
    id: 2,
    osmId: 'westvan',
    name: 'Freedom Boat Club West Vancouver',
    address: '34 Sunset Beach, West Vancouver, BC, V7W 2T7',
    lat: 49.37,
    lon: -123.288,
    area: 'West Vancouver',
    freedomClub: true,
    locationId: 'west-vancouver'
  },
  {
    id: 3,
    osmId: 'lynn',
    name: 'Lynnwood Marina',
    address: '1681 Columbia St, North Vancouver, BC',
    lat: 49.304,
    lon: -123.031,
    area: 'North Vancouver'
  },
  {
    id: 4,
    osmId: 'vanm',
    name: 'Vancouver Marina',
    address: '8211 River Rd, Richmond, BC',
    lat: 49.189,
    lon: -123.129,
    area: 'Richmond'
  },
  {
    id: 5,
    osmId: 'sky',
    name: 'Skyline Marina',
    address: '8031 River Rd, Richmond, BC',
    lat: 49.188,
    lon: -123.126,
    area: 'Richmond'
  },
  {
    id: 6,
    osmId: 'reed',
    name: 'Reed Point Marina',
    address: '850 Barnet Hwy, Port Moody, BC',
    lat: 49.2914,
    lon: -122.8846,
    area: 'Port Moody',
    freedomClub: true,
    locationId: 'port-moody'
  },
  {
    id: 7,
    osmId: 'thun',
    name: 'Thunderbird Marina',
    address: '5776 Marine Dr, West Vancouver, BC',
    lat: 49.355,
    lon: -123.268,
    area: 'West Vancouver'
  },
  {
    id: 8,
    osmId: 'sewm',
    name: "Sewell's Marina Moorage",
    address: '6409 Bay St, West Vancouver, BC',
    lat: 49.374,
    lon: -123.273,
    area: 'Horseshoe Bay'
  },
  {
    id: 9,
    osmId: 'sewf',
    name: "Sewell's Marina Fuel Dock",
    address: '6675 Nelson Ave, West Vancouver, BC',
    lat: 49.376,
    lon: -123.275,
    area: 'Horseshoe Bay'
  },
  {
    id: 10,
    osmId: 'bowen',
    name: 'Bowen Island Marina & The Pier',
    address: '400 Bowen Island Trunk Rd, Bowen Island, BC',
    lat: 49.379,
    lon: -123.335,
    area: 'Bowen Island'
  },
  {
    id: 11,
    osmId: 'cres',
    name: 'Crescent Beach Marina',
    address: '12555 Crescent Rd, Surrey, BC',
    lat: 49.056,
    lon: -122.887,
    area: 'Surrey'
  },
  {
    id: 12,
    osmId: 'semi',
    name: 'Semiahmoo Marina',
    address: '9540 Semiahmoo Pkwy, Blaine, WA',
    lat: 48.988,
    lon: -122.765,
    area: 'Blaine'
  },
  {
    id: 13,
    osmId: 'mont',
    name: 'Montague Harbour Marina',
    address: '3451 Montague Rd, Galiano Island, BC',
    lat: 48.891,
    lon: -123.4,
    area: 'Galiano Island'
  },
  {
    id: 14,
    osmId: 'stal',
    name: 'Port Stalashen',
    address: '1585 Field Rd, Sechelt, BC',
    lat: 49.47,
    lon: -123.755,
    area: 'Sunshine Coast'
  },
  {
    id: 15,
    osmId: 'poet',
    name: 'Poets Cove Marina',
    address: '9801 Spalding Rd, Bedwell Harbour, BC',
    lat: 48.747,
    lon: -123.229,
    area: 'Pender Island'
  },
  {
    id: 16,
    osmId: 'newc',
    name: 'Newcastle Marina',
    address: '1300 Stewart Ave, Nanaimo, BC',
    lat: 49.177,
    lon: -123.936,
    area: 'Nanaimo'
  },
  {
    id: 17,
    osmId: 'vanis',
    name: 'Van Isle Marina Co',
    address: '2320 Harbour Rd, Sidney, BC',
    lat: 48.684,
    lon: -123.415,
    area: 'Sidney'
  },
  {
    id: 18,
    osmId: 'sid',
    name: 'Port Sidney Marina',
    address: '9835 Seaport Pl, Sidney, BC',
    lat: 48.652,
    lon: -123.398,
    area: 'Sidney'
  },
  {
    id: 19,
    osmId: 'mill',
    name: 'Mill Bay Marina',
    address: '740 Handy Rd, Mill Bay, BC',
    lat: 48.65,
    lon: -123.555,
    area: 'Mill Bay'
  },
  {
    id: 20,
    osmId: 'canoe',
    name: 'Canoe Cove Marina',
    address: '2300 Canoe Cove Rd, North Saanich, BC',
    lat: 48.681,
    lon: -123.407,
    area: 'North Saanich',
    freedomClub: true,
    locationId: 'north-saanich'
  }
];

export const ADDITIONAL_PUBLIC_MARINAS: Marina[] = [
  {
    id: 21,
    osmId: 'fc_fishermens',
    name: "False Creek Fishermen's Wharf",
    address: 'False Creek, Vancouver, BC',
    lat: 49.271,
    lon: -123.143,
    area: 'False Creek'
  },
  {
    id: 22,
    osmId: 'burrard_civic',
    name: 'Burrard Civic Marina',
    address: '1655 Whyte Ave, Vancouver, BC',
    lat: 49.2735,
    lon: -123.1405,
    area: 'False Creek'
  },
  {
    id: 23,
    osmId: 'heather_civic',
    name: 'Heather Civic Marina',
    address: 'Heather St, Vancouver, BC',
    lat: 49.2705,
    lon: -123.118,
    area: 'False Creek'
  },
  {
    id: 24,
    osmId: 'quayside',
    name: 'Quayside Marina',
    address: 'False Creek, Vancouver, BC',
    lat: 49.2725,
    lon: -123.1235,
    area: 'False Creek'
  },
  {
    id: 25,
    osmId: 'deepcove',
    name: 'Deep Cove North Shore Marina',
    address: 'Deep Cove, North Vancouver, BC',
    lat: 49.329,
    lon: -122.951,
    area: 'Deep Cove'
  },
  {
    id: 26,
    osmId: 'gibsons_glha',
    name: 'Gibsons Landing Harbour Authority',
    address: 'Gibsons, BC',
    lat: 49.397,
    lon: -123.505,
    area: 'Gibsons'
  },
  {
    id: 27,
    osmId: 'gibsons_marina',
    name: 'Gibsons Marina & Fuel',
    address: 'Gibsons, BC',
    lat: 49.3985,
    lon: -123.508,
    area: 'Gibsons'
  },
  {
    id: 28,
    osmId: 'union_steamship',
    name: 'Union Steamship Marina',
    address: 'Bowen Island, BC',
    lat: 49.3805,
    lon: -123.3355,
    area: 'Bowen Island'
  },
  {
    id: 29,
    osmId: 'pender_hbr',
    name: 'Pender Harbour',
    address: 'Madeira Park, BC',
    lat: 49.624,
    lon: -124.016,
    area: 'Pender Harbour'
  },
  {
    id: 30,
    osmId: 'lions_bay',
    name: 'Lions Bay Marina',
    address: 'Lions Bay, BC',
    lat: 49.452,
    lon: -123.237,
    area: 'Lions Bay'
  },
  {
    id: 31,
    osmId: 'steveston_harbour',
    name: 'Steveston Harbour Marina',
    address: '12740 Trites Road, Richmond, BC',
    lat: 49.1227,
    lon: -123.1841,
    area: 'Richmond'
  }
];

export const PUBLIC_LAUNCHES: BoatLaunch[] = [
  { id: 1, name: 'Vanier Park Boat Launch', area: 'Kitsilano, Vancouver', lat: 49.2762, lon: -123.1448, type: 'Trailer + hand', minTide: 1.0 },
  { id: 2, name: 'Jericho / Spanish Banks', area: 'West Point Grey', lat: 49.2772, lon: -123.201, type: 'Hand / cartop', minTide: 1.2 },
  { id: 3, name: 'Ambleside Boat Launch', area: 'West Vancouver', lat: 49.3228, lon: -123.1438, type: 'Trailer', minTide: 1.1 },
  { id: 4, name: 'Cates Park Boat Launch', area: 'North Vancouver', lat: 49.3012, lon: -122.9556, type: 'Trailer', minTide: 1.0 },
  { id: 5, name: 'Horseshoe Bay Ramp', area: 'West Vancouver', lat: 49.3742, lon: -123.2738, type: 'Trailer', minTide: 1.2 },
  { id: 6, name: 'Rocky Point Park', area: 'Port Moody', lat: 49.2872, lon: -122.852, type: 'Trailer', minTide: 1.4 },
  { id: 7, name: 'Belcarra / Bedwell Bay', area: 'Belcarra', lat: 49.3148, lon: -122.9288, type: 'Trailer', minTide: 1.2 },
  { id: 8, name: 'Garry Point / Steveston', area: 'Richmond', lat: 49.1252, lon: -123.1925, type: 'Trailer', minTide: 1.5 },
  { id: 9, name: 'Blackie Spit', area: 'Crescent Beach, Surrey', lat: 49.0578, lon: -122.8818, type: 'Trailer', minTide: 1.6 },
  { id: 10, name: 'Centennial Beach', area: 'Boundary Bay, Delta', lat: 49.0028, lon: -123.027, type: 'Trailer (tide)', minTide: 1.8 },
  { id: 11, name: 'Squamish Public Ramp', area: 'Mamquam Blind Channel', lat: 49.6938, lon: -123.1558, type: 'Trailer', minTide: 1.4 }
];

export const TRIP_MAP_BOUNDS = {
  north: 49.53,
  south: 48.62,
  west: -124.02,
  east: -122.63
};
