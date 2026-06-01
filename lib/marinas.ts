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
  locationId?: 'port-moody' | 'north-saanich' | 'west-vancouver' | 'oak-bay';
  accessInfo?: MarinaAccessInfo;
  operator?: string;
  sourceUrl?: string;
  waterType?: 'tidal' | 'lake' | 'river';
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
  mosq: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  westvan: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'Y', moorage: 'by the foot', verified: false },
  lynn: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  vanm: { access: 'Public', transient: 'Limited', fuel: '?', launch: '?', moorage: 'by the foot', verified: false },
  sky: { access: 'Public', transient: 'Limited', fuel: '?', launch: '?', moorage: 'by the foot', verified: false },
  reed: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'Y', moorage: 'by the foot', verified: false },
  thun: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  sewm: { access: 'Public', transient: 'Y', fuel: 'N', launch: 'N', moorage: 'by the foot', verified: false },
  sewf: { access: 'Public', transient: 'N', fuel: 'Y', launch: 'N', moorage: 'fuel dock only', verified: false },
  sun: { access: 'Public', transient: 'Limited', fuel: 'N', launch: 'Y', moorage: 'by the foot', verified: false },
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
  steveston_harbour: { access: 'Public', transient: 'Y', fuel: '?', launch: 'Y', moorage: 'transient float, max 7 days', verified: true },
  secret_cove: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'transient moorage as available', verified: false },
  john_henrys: { access: 'Resort', transient: 'Y', fuel: '?', launch: 'N', moorage: 'transient moorage as available', verified: false },
  westview_harbour: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'guest moorage as available', verified: false },
  beach_gardens: { access: 'Resort', transient: 'Y', fuel: '?', launch: 'N', moorage: 'resort marina transient moorage', verified: false },
  lund_harbour: { access: 'Public', transient: 'Y', fuel: '?', launch: '?', moorage: 'small craft harbour transient moorage', verified: false },
  refuge_cove: { access: 'Public', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'transient moorage as available', verified: false },
  gorge_harbour: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'government wharf / marina moorage', verified: false },
  heriot_bay: { access: 'Resort', transient: 'Y', fuel: 'Y', launch: 'N', moorage: 'transient moorage as available', verified: false },
  taku_resort: { access: 'Resort', transient: 'Y', fuel: '?', launch: 'N', moorage: 'resort marina transient moorage', verified: false },
  discovery_harbour: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'transient moorage as available', verified: false },
  coast_campbell_river: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'transient moorage as available', verified: false },
  salmon_point: { access: 'Resort', transient: 'Y', fuel: '?', launch: 'N', moorage: 'resort marina transient moorage', verified: false },
  courtenay_marina: { access: 'Public', transient: 'Limited', fuel: '?', launch: '?', moorage: 'moorage as available', verified: false },
  comox_bay: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'harbour authority transient moorage', verified: false },
  french_creek: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'harbour authority transient moorage', verified: false },
  schooner_cove: { access: 'Public', transient: 'Y', fuel: '?', launch: 'N', moorage: 'transient moorage as available', verified: false }
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
    locationId: 'west-vancouver',
    operator: 'Freedom Boat Club of British Columbia',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/freedom-boat-club-of-british-columbia-ltd/west-vancouver'
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
    locationId: 'port-moody',
    operator: 'Freedom Boat Club of British Columbia',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/freedom-boat-club-of-british-columbia-ltd/port-moody'
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
    locationId: 'north-saanich',
    operator: 'Freedom Boat Club of British Columbia',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/freedom-boat-club-of-british-columbia-ltd/northsaanich'
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
    name: 'Steveston Harbour Authority',
    address: '12740 Trites Road, Richmond, BC',
    lat: 49.1234,
    lon: -123.1868,
    area: 'Richmond'
  },
  {
    id: 32,
    osmId: 'mosq',
    name: 'Mosquito Creek Marina',
    address: '415 Esplanade W, North Vancouver, BC',
    lat: 49.3111,
    lon: -123.0842,
    area: 'North Vancouver'
  },
  {
    id: 33,
    osmId: 'sun',
    name: 'Sunset Marina',
    address: 'West Vancouver, BC',
    lat: 49.3585,
    lon: -123.2715,
    area: 'West Vancouver'
  },
  {
    id: 51,
    osmId: 'secret_cove',
    name: 'Secret Cove Marina',
    address: '5411 Secret Cove Road, Halfmoon Bay, BC',
    lat: 49.5308,
    lon: -123.9694,
    area: 'Sunshine Coast',
    exp: 0.5
  },
  {
    id: 52,
    osmId: 'john_henrys',
    name: "John Henry's Marina & Resort",
    address: 'Garden Bay, Pender Harbour, BC',
    lat: 49.6317,
    lon: -124.0337,
    area: 'Pender Harbour',
    exp: 0.5
  },
  {
    id: 53,
    osmId: 'westview_harbour',
    name: 'Powell River Westview Harbour',
    address: '6790 Wharf Street, Powell River, BC',
    lat: 49.8359,
    lon: -124.5298,
    area: 'Powell River',
    exp: 0.6
  },
  {
    id: 54,
    osmId: 'beach_gardens',
    name: 'Beach Gardens Resort & Marina',
    address: 'Powell River, BC',
    lat: 49.8018,
    lon: -124.5185,
    area: 'Powell River',
    exp: 0.6
  },
  {
    id: 55,
    osmId: 'lund_harbour',
    name: 'Lund Harbour',
    address: 'Lund, BC',
    lat: 49.9817,
    lon: -124.763,
    area: 'Lund',
    exp: 0.7
  },
  {
    id: 56,
    osmId: 'refuge_cove',
    name: 'Refuge Cove Marina',
    address: 'Refuge Cove, West Redonda Island, BC',
    lat: 50.1228,
    lon: -124.844,
    area: 'Desolation Sound',
    exp: 0.7
  },
  {
    id: 57,
    osmId: 'gorge_harbour',
    name: 'Gorge Harbour Government Wharf',
    address: 'Gorge Harbour, Cortes Island, BC',
    lat: 50.0993,
    lon: -125.0203,
    area: 'Discovery Islands',
    exp: 0.7
  },
  {
    id: 58,
    osmId: 'heriot_bay',
    name: 'Heriot Bay Inn & Marina',
    address: 'Heriot Bay, Quadra Island, BC',
    lat: 50.1029,
    lon: -125.2114,
    area: 'Discovery Islands',
    exp: 0.7
  },
  {
    id: 59,
    osmId: 'taku_resort',
    name: 'Taku Resort & Marina',
    address: 'Drew Harbour, Quadra Island, BC',
    lat: 50.101,
    lon: -125.2044,
    area: 'Discovery Islands',
    exp: 0.7
  },
  {
    id: 60,
    osmId: 'discovery_harbour',
    name: 'Discovery Harbour Marina',
    address: 'Campbell River, BC',
    lat: 50.0335,
    lon: -125.2431,
    area: 'Campbell River',
    exp: 0.7
  },
  {
    id: 61,
    osmId: 'coast_campbell_river',
    name: 'The Coast Marina Campbell River',
    address: 'Campbell River, BC',
    lat: 50.0275,
    lon: -125.2408,
    area: 'Campbell River',
    exp: 0.7
  },
  {
    id: 62,
    osmId: 'salmon_point',
    name: 'Salmon Point Marina',
    address: 'Campbell River, BC',
    lat: 49.8896,
    lon: -125.1269,
    area: 'Campbell River',
    exp: 0.7
  },
  {
    id: 63,
    osmId: 'courtenay_marina',
    name: 'Courtenay Marina',
    address: 'Courtenay, BC',
    lat: 49.682,
    lon: -124.9839,
    area: 'Courtenay',
    exp: 0.7
  },
  {
    id: 64,
    osmId: 'comox_bay',
    name: 'Comox Bay Marina',
    address: 'Comox, BC',
    lat: 49.6695,
    lon: -124.9284,
    area: 'Comox',
    exp: 0.7
  },
  {
    id: 65,
    osmId: 'french_creek',
    name: 'French Creek Marina',
    address: 'French Creek, BC',
    lat: 49.3497,
    lon: -124.3572,
    area: 'French Creek',
    exp: 0.5
  },
  {
    id: 66,
    osmId: 'schooner_cove',
    name: 'Schooner Cove Marina',
    address: 'Nanoose Bay, BC',
    lat: 49.2869,
    lon: -124.1357,
    area: 'Nanoose Bay',
    exp: 0.5
  }
];

const FREEDOM_CLUB_ACCESS: MarinaAccessInfo = {
  access: 'Members',
  transient: 'N',
  fuel: '?',
  launch: '?',
  moorage: 'Freedom Boat Club member access',
  verified: true
};

export const FBC_PNW_MARINAS: Marina[] = [
  {
    id: 34,
    osmId: 'fbc_oak_bay',
    name: 'Freedom Boat Club Oak Bay',
    address: 'Oak Bay Marina, Victoria, BC',
    lat: 48.4249,
    lon: -123.3025,
    area: 'Oak Bay',
    freedomClub: true,
    locationId: 'oak-bay',
    operator: 'Freedom Boat Club of British Columbia',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/freedom-boat-club-of-british-columbia-ltd/oak-bay',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 35,
    osmId: 'fbc_bellingham',
    name: 'Freedom Boat Club Bellingham',
    address: 'Squalicum Harbor Marina, Bellingham, WA',
    lat: 48.7531,
    lon: -122.5014,
    area: 'Bellingham',
    freedomClub: true,
    operator: 'FBC of San Juan Islands',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/san-juan-boat-club/bellingham',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 36,
    osmId: 'fbc_anacortes',
    name: 'Freedom Boat Club Anacortes',
    address: 'Anacortes, WA',
    lat: 48.5126,
    lon: -122.6127,
    area: 'Anacortes',
    freedomClub: true,
    operator: 'FBC of San Juan Islands',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/san-juan-boat-club/anacortes',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 37,
    osmId: 'fbc_everett',
    name: 'Freedom Boat Club Everett',
    address: 'Port of Everett Marina, Everett, WA',
    lat: 47.9972,
    lon: -122.2227,
    area: 'Everett',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/everett',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 38,
    osmId: 'fbc_edmonds',
    name: 'Freedom Boat Club Port of Edmonds',
    address: 'Port of Edmonds Marina, Edmonds, WA',
    lat: 47.8112,
    lon: -122.3857,
    area: 'Edmonds',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/port-of-edmonds',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 39,
    osmId: 'fbc_poulsbo',
    name: 'Freedom Boat Club Port of Poulsbo',
    address: 'Poulsbo Marina, Poulsbo, WA',
    lat: 47.7359,
    lon: -122.6477,
    area: 'Poulsbo',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/port-of-poulsbo',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 40,
    osmId: 'fbc_elliott_bay',
    name: 'Freedom Boat Club Elliott Bay Marina',
    address: 'Elliott Bay Marina, Seattle, WA',
    lat: 47.6309,
    lon: -122.3912,
    area: 'Seattle',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/elliott-bay-marina',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 41,
    osmId: 'fbc_agc',
    name: 'Freedom Boat Club AGC Marina',
    address: 'AGC Marina, Lake Union, Seattle, WA',
    lat: 47.6268,
    lon: -122.3354,
    area: 'Lake Union',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/agc-marina',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 42,
    osmId: 'fbc_yarrow_bay',
    name: 'Freedom Boat Club Yarrow Bay Marina',
    address: 'Yarrow Bay Marina, Kirkland, WA',
    lat: 47.6433,
    lon: -122.2086,
    area: 'Kirkland',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/yarrow-bay-marina',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 43,
    osmId: 'fbc_leschi',
    name: 'Freedom Boat Club Leschi Marina',
    address: 'Leschi Marina, Seattle, WA',
    lat: 47.6021,
    lon: -122.2861,
    area: 'Lake Washington',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/leschi-marina',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 44,
    osmId: 'fbc_port_orchard',
    name: 'Freedom Boat Club Port Orchard',
    address: 'Port Orchard Marina, Port Orchard, WA',
    lat: 47.5432,
    lon: -122.6367,
    area: 'Port Orchard',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/port-orchard',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 45,
    osmId: 'fbc_tacoma',
    name: 'Freedom Boat Club Tacoma',
    address: 'Foss Harbor Marina, Tacoma, WA',
    lat: 47.2531,
    lon: -122.4345,
    area: 'Tacoma',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/tacoma',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 46,
    osmId: 'fbc_olympia',
    name: 'Freedom Boat Club Olympia',
    address: 'Swantown Marina, Olympia, WA',
    lat: 47.0554,
    lon: -122.9004,
    area: 'Olympia',
    freedomClub: true,
    operator: 'FBC Seattle and Greater Puget Sound',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/victory-marine-llc/olympia',
    accessInfo: FREEDOM_CLUB_ACCESS
  },
  {
    id: 47,
    osmId: 'fbc_tomahawk_bay',
    name: 'Freedom Boat Club Portland Tomahawk Bay Marina',
    address: 'Tomahawk Bay Marina, Portland, OR',
    lat: 45.6074,
    lon: -122.6606,
    area: 'Portland',
    freedomClub: true,
    operator: 'FBC of Portland OR',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/columbia-boat-club-inc/portland-oregon',
    accessInfo: FREEDOM_CLUB_ACCESS,
    waterType: 'river'
  },
  {
    id: 48,
    osmId: 'fbc_camas',
    name: 'Freedom Boat Club Port of Camas',
    address: "Parker's Landing Marina, Camas/Washougal, WA",
    lat: 45.5782,
    lon: -122.3811,
    area: 'Camas/Washougal',
    freedomClub: true,
    operator: 'FBC of Portland OR',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/columbia-boat-club-inc/port-of-camas',
    accessInfo: FREEDOM_CLUB_ACCESS,
    waterType: 'river'
  },
  {
    id: 49,
    osmId: 'fbc_cda',
    name: "Freedom Boat Club Lake Coeur d'Alene",
    address: "Lakeside Marina, Coeur d'Alene, ID",
    lat: 47.6732,
    lon: -116.7859,
    area: "Lake Coeur d'Alene",
    freedomClub: true,
    operator: 'FBC of Northern ID',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/coeur-dalene/cda',
    accessInfo: FREEDOM_CLUB_ACCESS,
    waterType: 'lake'
  },
  {
    id: 50,
    osmId: 'fbc_hayden_lake',
    name: 'Freedom Boat Club Hayden Lake Marina',
    address: 'Hayden Lake Marina, Hayden Lake, ID',
    lat: 47.7665,
    lon: -116.7563,
    area: 'Hayden Lake',
    freedomClub: true,
    operator: 'FBC of Northern ID',
    sourceUrl: 'https://www.freedomboatclub.com/franchises/coeur-dalene/hayden-lake-marina.html',
    accessInfo: FREEDOM_CLUB_ACCESS,
    waterType: 'lake'
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
