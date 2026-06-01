export type Marina = {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
  area: string;
  freedomClub?: boolean;
  locationId?: 'port-moody' | 'north-saanich' | 'west-vancouver';
};

export const TRIP_MARINAS: Marina[] = [
  {
    id: 1,
    name: 'Coal Harbour Marina',
    address: '1525 Coal Harbour Quay, Vancouver, BC',
    lat: 49.2906,
    lon: -123.121,
    area: 'Vancouver'
  },
  {
    id: 2,
    name: 'Freedom Boat Club West Vancouver',
    address: '34 Sunset Beach, West Vancouver, BC, V7W 2T7',
    lat: 49.3293,
    lon: -123.1566,
    area: 'West Vancouver',
    freedomClub: true,
    locationId: 'west-vancouver'
  },
  {
    id: 3,
    name: 'Lynnwood Marina',
    address: '1681 Columbia St, North Vancouver, BC',
    lat: 49.304,
    lon: -123.031,
    area: 'North Vancouver'
  },
  {
    id: 4,
    name: 'Vancouver Marina',
    address: '8211 River Rd, Richmond, BC',
    lat: 49.189,
    lon: -123.129,
    area: 'Richmond'
  },
  {
    id: 5,
    name: 'Skyline Marina',
    address: '8031 River Rd, Richmond, BC',
    lat: 49.188,
    lon: -123.126,
    area: 'Richmond'
  },
  {
    id: 6,
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
    name: 'Thunderbird Marina',
    address: '5776 Marine Dr, West Vancouver, BC',
    lat: 49.355,
    lon: -123.268,
    area: 'West Vancouver'
  },
  {
    id: 8,
    name: "Sewell's Marina Moorage",
    address: '6409 Bay St, West Vancouver, BC',
    lat: 49.374,
    lon: -123.273,
    area: 'Horseshoe Bay'
  },
  {
    id: 9,
    name: "Sewell's Marina Fuel Dock",
    address: '6675 Nelson Ave, West Vancouver, BC',
    lat: 49.376,
    lon: -123.275,
    area: 'Horseshoe Bay'
  },
  {
    id: 10,
    name: 'Bowen Island Marina & The Pier',
    address: '400 Bowen Island Trunk Rd, Bowen Island, BC',
    lat: 49.379,
    lon: -123.335,
    area: 'Bowen Island'
  },
  {
    id: 11,
    name: 'Crescent Beach Marina',
    address: '12555 Crescent Rd, Surrey, BC',
    lat: 49.056,
    lon: -122.887,
    area: 'Surrey'
  },
  {
    id: 12,
    name: 'Semiahmoo Marina',
    address: '9540 Semiahmoo Pkwy, Blaine, WA',
    lat: 48.988,
    lon: -122.765,
    area: 'Blaine'
  },
  {
    id: 13,
    name: 'Montague Harbour Marina',
    address: '3451 Montague Rd, Galiano Island, BC',
    lat: 48.891,
    lon: -123.4,
    area: 'Galiano Island'
  },
  {
    id: 14,
    name: 'Port Stalashen',
    address: '1585 Field Rd, Sechelt, BC',
    lat: 49.47,
    lon: -123.755,
    area: 'Sunshine Coast'
  },
  {
    id: 15,
    name: 'Poets Cove Marina',
    address: '9801 Spalding Rd, Bedwell Harbour, BC',
    lat: 48.747,
    lon: -123.229,
    area: 'Pender Island'
  },
  {
    id: 16,
    name: 'Newcastle Marina',
    address: '1300 Stewart Ave, Nanaimo, BC',
    lat: 49.177,
    lon: -123.936,
    area: 'Nanaimo'
  },
  {
    id: 17,
    name: 'Van Isle Marina Co',
    address: '2320 Harbour Rd, Sidney, BC',
    lat: 48.684,
    lon: -123.415,
    area: 'Sidney'
  },
  {
    id: 18,
    name: 'Port Sidney Marina',
    address: '9835 Seaport Pl, Sidney, BC',
    lat: 48.652,
    lon: -123.398,
    area: 'Sidney'
  },
  {
    id: 19,
    name: 'Mill Bay Marina',
    address: '740 Handy Rd, Mill Bay, BC',
    lat: 48.65,
    lon: -123.555,
    area: 'Mill Bay'
  },
  {
    id: 20,
    name: 'Canoe Cove Marina',
    address: '2300 Canoe Cove Rd, North Saanich, BC',
    lat: 48.681,
    lon: -123.407,
    area: 'North Saanich',
    freedomClub: true,
    locationId: 'north-saanich'
  }
];

export const TRIP_MAP_BOUNDS = {
  north: 49.53,
  south: 48.62,
  west: -124.02,
  east: -122.63
};
