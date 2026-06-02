import type { Marina } from './marinas';

export type SalishSeaLaunchNote = {
  id: string;
  name: string;
  area: string;
  waterBody: string;
  country: string;
  notes: string | null;
  coordSource: string;
};

export const SALISH_SEA_DATASET = "Salish Sea — transient marinas, marine parks & launches (core coverage)";
export const SALISH_SEA_COUNTS = {"marinas":87,"marine_parks":45,"launches":10} as const;

export const SALISH_SEA_MARINAS: Marina[] = [
  {
    id: 1001,
    osmId: "MAR-001",
    name: "Swantown Marina",
    address: "Olympia, Puget Sound, WA",
    lat: 47.054233,
    lon: -122.897959,
    area: "Olympia",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Olympia",
      verified: false
    }
  },
  {
    id: 1002,
    osmId: "MAR-002",
    name: "Boston Harbor Marina",
    address: "Olympia, Puget Sound, WA",
    lat: 47.139964,
    lon: -122.904203,
    area: "Olympia",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; No permanent moorage",
      verified: false
    }
  },
  {
    id: 1003,
    osmId: "MAR-003",
    name: "Longbranch Marina",
    address: "Filucy Bay (Key Pen.), Puget Sound, WA",
    lat: 47.20899,
    lon: -122.755136,
    area: "Filucy Bay (Key Pen.)",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Community club marina",
      verified: false
    }
  },
  {
    id: 1004,
    osmId: "MAR-004",
    name: "Oakland Bay Marina",
    address: "Shelton, Puget Sound, WA",
    lat: 47.21325,
    lon: -123.086003,
    area: "Shelton",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Limited",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Shelton",
      verified: false
    }
  },
  {
    id: 1005,
    osmId: "MAR-005",
    name: "Fair Harbor Marina",
    address: "Grapeview, Puget Sound, WA",
    lat: 47.337409,
    lon: -122.83254,
    area: "Grapeview",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Limited",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Case Inlet",
      verified: false
    }
  },
  {
    id: 1006,
    osmId: "MAR-006",
    name: "Arabella's Landing",
    address: "Gig Harbor, Puget Sound, WA",
    lat: 47.333348,
    lon: -122.582971,
    area: "Gig Harbor",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Upscale guest moorage",
      verified: false
    }
  },
  {
    id: 1007,
    osmId: "MAR-007",
    name: "Foss Harbor Marina",
    address: "Tacoma, Puget Sound, WA",
    lat: 47.255524,
    lon: -122.433765,
    area: "Tacoma",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Thea Foss Waterway",
      verified: false
    }
  },
  {
    id: 1008,
    osmId: "MAR-008",
    name: "Dock Street Marina",
    address: "Tacoma, Puget Sound, WA",
    lat: 47.245618,
    lon: -122.432773,
    area: "Tacoma",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Thea Foss Waterway",
      verified: false
    }
  },
  {
    id: 1009,
    osmId: "MAR-009",
    name: "Breakwater Marina",
    address: "Tacoma, Puget Sound, WA",
    lat: 47.3041351,
    lon: -122.512068,
    area: "Tacoma",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Point Defiance",
      verified: true
    }
  },
  {
    id: 1010,
    osmId: "MAR-010",
    name: "Des Moines Marina",
    address: "Des Moines, Puget Sound, WA",
    lat: 47.401491,
    lon: -122.33013,
    area: "Des Moines",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; City marina",
      verified: false
    }
  },
  {
    id: 1011,
    osmId: "MAR-011",
    name: "Bell Harbor Marina",
    address: "Seattle, Puget Sound, WA",
    lat: 47.609963,
    lon: -122.34736,
    area: "Seattle",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Seattle, downtown",
      verified: false
    }
  },
  {
    id: 1012,
    osmId: "MAR-012",
    name: "Elliott Bay Marina",
    address: "Seattle, Puget Sound, WA",
    lat: 47.629841,
    lon: -122.390893,
    area: "Seattle",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Smith Cove",
      verified: false
    }
  },
  {
    id: 1013,
    osmId: "MAR-013",
    name: "Shilshole Bay Marina",
    address: "Seattle, Puget Sound, WA",
    lat: 47.680732,
    lon: -122.404432,
    area: "Seattle",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Seattle, outside locks",
      verified: false
    }
  },
  {
    id: 1014,
    osmId: "MAR-014",
    name: "Port of Edmonds",
    address: "Edmonds, Puget Sound, WA",
    lat: 47.807909,
    lon: -122.38924,
    area: "Edmonds",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1015,
    osmId: "MAR-015",
    name: "Port of Everett Marina",
    address: "Everett, Puget Sound, WA",
    lat: 47.997475,
    lon: -122.220411,
    area: "Everett",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "Y",
      moorage: "Marina; Year-round; Largest public marina on W coast; 13-lane launch",
      verified: false
    }
  },
  {
    id: 1016,
    osmId: "MAR-016",
    name: "Port Orchard Marina",
    address: "Sinclair Inlet, Puget Sound, WA",
    lat: 47.5431002,
    lon: -122.638179,
    area: "Sinclair Inlet",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Bremerton",
      verified: true
    }
  },
  {
    id: 1017,
    osmId: "MAR-017",
    name: "Bremerton Marina",
    address: "Bremerton, Puget Sound, WA",
    lat: 47.563297,
    lon: -122.622195,
    area: "Bremerton",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Bremerton",
      verified: false
    }
  },
  {
    id: 1018,
    osmId: "MAR-018",
    name: "Port of Brownsville",
    address: "Brownsville, Puget Sound, WA",
    lat: 47.651722,
    lon: -122.614954,
    area: "Brownsville",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1019,
    osmId: "MAR-019",
    name: "Port of Silverdale",
    address: "Silverdale (Dyes Inlet), Puget Sound, WA",
    lat: 47.642597,
    lon: -122.694669,
    area: "Silverdale (Dyes Inlet)",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; No permanent moorage",
      verified: false
    }
  },
  {
    id: 1020,
    osmId: "MAR-020",
    name: "Port of Poulsbo",
    address: "Liberty Bay, Puget Sound, WA",
    lat: 47.7335809,
    lon: -122.6469868,
    area: "Liberty Bay",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: true
    }
  },
  {
    id: 1021,
    osmId: "MAR-021",
    name: "Eagle Harbor Marina",
    address: "Bainbridge Island, Puget Sound, WA",
    lat: 47.616824,
    lon: -122.512686,
    area: "Bainbridge Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Limited",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1022,
    osmId: "MAR-022",
    name: "Port of Kingston",
    address: "Kingston, Puget Sound, WA",
    lat: 47.795341,
    lon: -122.496657,
    area: "Kingston",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Appletree Cove",
      verified: false
    }
  },
  {
    id: 1023,
    osmId: "MAR-023",
    name: "Langley Marina",
    address: "Whidbey Island, Puget Sound, WA",
    lat: 48.038682,
    lon: -122.403359,
    area: "Whidbey Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Saratoga Passage",
      verified: false
    }
  },
  {
    id: 1024,
    osmId: "MAR-024",
    name: "Coupeville Wharf",
    address: "Penn Cove, Whidbey, Puget Sound, WA",
    lat: 48.221799,
    lon: -122.687835,
    area: "Penn Cove, Whidbey",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Coupeville; no permanent",
      verified: false
    }
  },
  {
    id: 1025,
    osmId: "MAR-025",
    name: "Oak Harbor Marina",
    address: "Whidbey Island, Puget Sound, WA",
    lat: 48.285742,
    lon: -122.634652,
    area: "Whidbey Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; 52 guest slips + side-tie",
      verified: false
    }
  },
  {
    id: 1026,
    osmId: "MAR-026",
    name: "Alderbrook Resort Marina",
    address: "Union, Hood Canal, WA",
    lat: 47.348063,
    lon: -123.067796,
    area: "Union",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Resort; no permanent",
      verified: false
    }
  },
  {
    id: 1027,
    osmId: "MAR-027",
    name: "Pleasant Harbor Marina",
    address: "Brinnon, Hood Canal, WA",
    lat: 47.662302,
    lon: -122.916874,
    area: "Brinnon",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1028,
    osmId: "MAR-028",
    name: "Quilcene / Herb Beck Marina",
    address: "Quilcene, Hood Canal, WA",
    lat: 47.801391,
    lon: -122.867156,
    area: "Quilcene",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Limited",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Port Townsend",
      verified: false
    }
  },
  {
    id: 1029,
    osmId: "MAR-029",
    name: "Port Ludlow Marina",
    address: "Port Ludlow, Admiralty Inlet, WA",
    lat: 47.922367,
    lon: -122.685302,
    area: "Port Ludlow",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Resort marina",
      verified: false
    }
  },
  {
    id: 1030,
    osmId: "MAR-030",
    name: "Port Hadlock Marina",
    address: "Port Hadlock, Admiralty Inlet, WA",
    lat: 48.030253,
    lon: -122.745046,
    area: "Port Hadlock",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1031,
    osmId: "MAR-031",
    name: "Point Hudson Marina",
    address: "Port Townsend, Strait of Juan de Fuca, WA",
    lat: 48.117141,
    lon: -122.751194,
    area: "Port Townsend",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Port Townsend",
      verified: false
    }
  },
  {
    id: 1032,
    osmId: "MAR-032",
    name: "Port Townsend Boat Haven",
    address: "Port Townsend, Strait of Juan de Fuca, WA",
    lat: 48.107933,
    lon: -122.775886,
    area: "Port Townsend",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Port Townsend",
      verified: false
    }
  },
  {
    id: 1033,
    osmId: "MAR-033",
    name: "John Wayne Marina",
    address: "Sequim Bay, Strait of Juan de Fuca, WA",
    lat: 48.062744,
    lon: -123.040674,
    area: "Sequim Bay",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Port Angeles",
      verified: false
    }
  },
  {
    id: 1034,
    osmId: "MAR-034",
    name: "Port Angeles Boat Haven",
    address: "Port Angeles, Strait of Juan de Fuca, WA",
    lat: 48.125983,
    lon: -123.453841,
    area: "Port Angeles",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Western edge of core",
      verified: false
    }
  },
  {
    id: 1035,
    osmId: "MAR-035",
    name: "La Conner Marina",
    address: "Swinomish Channel, Skagit Bay, WA",
    lat: 48.398209,
    lon: -122.494812,
    area: "Swinomish Channel",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Skagit",
      verified: false
    }
  },
  {
    id: 1036,
    osmId: "MAR-036",
    name: "Cap Sante Marina",
    address: "Anacortes, Fidalgo Bay, WA",
    lat: 48.5135112,
    lon: -122.6093714,
    area: "Anacortes",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Anacortes; main SJI gateway",
      verified: true
    }
  },
  {
    id: 1037,
    osmId: "MAR-037",
    name: "Skyline Marina",
    address: "Anacortes, Rosario Strait, WA",
    lat: 48.491596,
    lon: -122.681472,
    area: "Anacortes",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1038,
    osmId: "MAR-038",
    name: "Squalicum Harbor",
    address: "Bellingham, Bellingham Bay, WA",
    lat: 48.7565411,
    lon: -122.5032947,
    area: "Bellingham",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Bellingham",
      verified: true
    }
  },
  {
    id: 1039,
    osmId: "MAR-039",
    name: "Blaine Harbor",
    address: "Blaine, Drayton Harbor, WA",
    lat: 48.996663,
    lon: -122.755823,
    area: "Blaine",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Port of Bellingham",
      verified: false
    }
  },
  {
    id: 1040,
    osmId: "MAR-040",
    name: "Semiahmoo Marina",
    address: "Blaine, Semiahmoo Bay, WA",
    lat: 48.9890144,
    lon: -122.7724351,
    area: "Blaine",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: true
    }
  },
  {
    id: 1041,
    osmId: "MAR-041",
    name: "Point Roberts Marina",
    address: "Point Roberts, Boundary Bay, WA",
    lat: 48.976752,
    lon: -123.069448,
    area: "Point Roberts",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1042,
    osmId: "MAR-042",
    name: "Port of Friday Harbor",
    address: "San Juan Island, San Juan Channel, WA",
    lat: 48.537892,
    lon: -123.015933,
    area: "San Juan Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Main SJI hub",
      verified: false
    }
  },
  {
    id: 1043,
    osmId: "MAR-043",
    name: "Roche Harbor Resort Marina",
    address: "San Juan Island, Haro Strait, WA",
    lat: 48.6087088,
    lon: -123.151958,
    area: "San Juan Island",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Resort marina",
      verified: true
    }
  },
  {
    id: 1044,
    osmId: "MAR-044",
    name: "Snug Harbor Resort",
    address: "San Juan Island, Mosquito Pass, WA",
    lat: 48.570481,
    lon: -123.167349,
    area: "San Juan Island",
    exp: 0.45,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Some permanent",
      verified: false
    }
  },
  {
    id: 1045,
    osmId: "MAR-045",
    name: "Deer Harbor Marina",
    address: "Orcas Island, San Juan Channel, WA",
    lat: 48.620456,
    lon: -123.001535,
    area: "Orcas Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1046,
    osmId: "MAR-046",
    name: "West Beach Resort",
    address: "Orcas Island, President Channel, WA",
    lat: 48.688205,
    lon: -122.958384,
    area: "Orcas Island",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Seasonal (summer); No permanent",
      verified: false
    }
  },
  {
    id: 1047,
    osmId: "MAR-047",
    name: "Rosario Resort Marina",
    address: "Orcas Island, East Sound, WA",
    lat: 48.647002,
    lon: -122.870729,
    area: "Orcas Island",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Historic resort",
      verified: false
    }
  },
  {
    id: 1048,
    osmId: "MAR-048",
    name: "Lopez Islander (Fisherman Bay)",
    address: "Lopez Island, San Juan Channel, WA",
    lat: 48.513534,
    lon: -122.913494,
    area: "Lopez Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Seasonal (resort hrs); Resort; no permanent",
      verified: false
    }
  },
  {
    id: 1049,
    osmId: "MAR-049",
    name: "Blakely Island Marina",
    address: "Blakely Island, Rosario Strait, WA",
    lat: 48.585266,
    lon: -122.814059,
    area: "Blakely Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1050,
    osmId: "MAR-050",
    name: "Coal Harbour Marina",
    address: "Vancouver, Burrard Inlet, BC",
    lat: 49.2910735,
    lon: -123.1267341,
    area: "Vancouver",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Downtown; already in app",
      verified: true
    }
  },
  {
    id: 1051,
    osmId: "MAR-051",
    name: "Bayshore West Marina",
    address: "Vancouver, Coal Harbour, BC",
    lat: 49.294449,
    lon: -123.132459,
    area: "Vancouver",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1052,
    osmId: "MAR-052",
    name: "False Creek Harbour Authority",
    address: "Vancouver, False Creek, BC",
    lat: 49.27328,
    lon: -123.138564,
    area: "Vancouver",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Fishermen's Wharf",
      verified: false
    }
  },
  {
    id: 1053,
    osmId: "MAR-053",
    name: "Quayside Marina",
    address: "Vancouver, False Creek, BC",
    lat: 49.272712,
    lon: -123.1182,
    area: "Vancouver",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1054,
    osmId: "MAR-054",
    name: "Steveston Harbour Authority",
    address: "Richmond, Fraser River mouth, BC",
    lat: 49.1196142,
    lon: -123.1637964,
    area: "Richmond",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Side-tie transient, reservation",
      verified: true
    }
  },
  {
    id: 1055,
    osmId: "MAR-055",
    name: "Deep Cove North Shore Marina",
    address: "North Vancouver, Indian Arm, BC",
    lat: 49.332218,
    lon: -122.938444,
    area: "North Vancouver",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1056,
    osmId: "MAR-056",
    name: "Bowen Island Marina",
    address: "Snug Cove, Bowen Is., Howe Sound, BC",
    lat: 49.380211,
    lon: -123.330036,
    area: "Snug Cove, Bowen Is.",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1057,
    osmId: "MAR-057",
    name: "Union Steamship Co. Marina",
    address: "Snug Cove, Bowen Is., Howe Sound, BC",
    lat: 49.378936,
    lon: -123.332992,
    area: "Snug Cove, Bowen Is.",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Adjacent to Bowen Is. Marina",
      verified: false
    }
  },
  {
    id: 1058,
    osmId: "MAR-058",
    name: "Gibsons Landing Harbour Auth.",
    address: "Gibsons, Howe Sound, BC",
    lat: 49.4006811,
    lon: -123.5044625,
    area: "Gibsons",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: true
    }
  },
  {
    id: 1059,
    osmId: "MAR-059",
    name: "Secret Cove Marina",
    address: "Secret Cove, Strait of Georgia, BC",
    lat: 49.535319,
    lon: -123.965478,
    area: "Secret Cove",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1060,
    osmId: "MAR-060",
    name: "Buccaneer Marina",
    address: "Secret Cove, Strait of Georgia, BC",
    lat: 49.532129,
    lon: -123.954902,
    area: "Secret Cove",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1061,
    osmId: "MAR-061",
    name: "Pender Harbour Resort Marina",
    address: "Garden Bay, Strait of Georgia, BC",
    lat: 49.6339,
    lon: -124.043283,
    area: "Garden Bay",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1062,
    osmId: "MAR-062",
    name: "Sunshine Coast Resort & Marina",
    address: "Madeira Park, Strait of Georgia, BC",
    lat: 49.624939,
    lon: -124.018655,
    area: "Madeira Park",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1063,
    osmId: "MAR-063",
    name: "Powell River (Westview/South)",
    address: "Powell River, Malaspina Strait, BC",
    lat: 49.8360044,
    lon: -124.5288606,
    area: "Powell River",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; South Harbour = transient; North = permanent only",
      verified: true
    }
  },
  {
    id: 1064,
    osmId: "MAR-064",
    name: "Lund Small Craft Harbour",
    address: "Lund, Malaspina Strait, BC",
    lat: 49.9804541,
    lon: -124.7623629,
    area: "Lund",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; End of Hwy 101; Desolation gateway",
      verified: true
    }
  },
  {
    id: 1065,
    osmId: "MAR-065",
    name: "Greater Victoria Harbour Auth.",
    address: "Victoria, Victoria Harbour, BC",
    lat: 48.422216,
    lon: -123.368665,
    area: "Victoria",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Causeway/Ship Point/Wharf St floats",
      verified: false
    }
  },
  {
    id: 1066,
    osmId: "MAR-066",
    name: "Westbay Marine Village",
    address: "Esquimalt/Victoria, Victoria Harbour, BC",
    lat: 48.426944,
    lon: -123.396705,
    area: "Esquimalt/Victoria",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1067,
    osmId: "MAR-067",
    name: "Oak Bay Marina",
    address: "Victoria, Haro Strait, BC",
    lat: 48.424744,
    lon: -123.302425,
    area: "Victoria",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1068,
    osmId: "MAR-068",
    name: "Port of Sidney",
    address: "Sidney, Haro Strait, BC",
    lat: 48.651695,
    lon: -123.39509,
    area: "Sidney",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1069,
    osmId: "MAR-069",
    name: "Brentwood Bay Marina",
    address: "Saanich Inlet, Saanich Inlet, BC",
    lat: 48.576976,
    lon: -123.466469,
    area: "Saanich Inlet",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Resort",
      verified: false
    }
  },
  {
    id: 1070,
    osmId: "MAR-070",
    name: "Maple Bay Marina",
    address: "Maple Bay, Sansum Narrows, BC",
    lat: 48.796603,
    lon: -123.602564,
    area: "Maple Bay",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Cowichan",
      verified: false
    }
  },
  {
    id: 1071,
    osmId: "MAR-071",
    name: "Nanaimo Port Authority",
    address: "Nanaimo, Strait of Georgia, BC",
    lat: 49.167198,
    lon: -123.934085,
    area: "Nanaimo",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Visitor docks + Newcastle",
      verified: false
    }
  },
  {
    id: 1072,
    osmId: "MAR-072",
    name: "Comox Valley Marina",
    address: "Comox, Comox Harbour, BC",
    lat: 49.6709024,
    lon: -124.9299299,
    area: "Comox",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Year-round transient",
      verified: true
    }
  },
  {
    id: 1073,
    osmId: "MAR-073",
    name: "Comox Municipal Marina",
    address: "Comox, Comox Harbour, BC",
    lat: 49.670272,
    lon: -124.9278193,
    area: "Comox",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Limited",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Temp moorage varies by year",
      verified: true
    }
  },
  {
    id: 1074,
    osmId: "MAR-074",
    name: "Discovery Harbour Marina",
    address: "Campbell River, Discovery Passage, BC",
    lat: 50.0347369,
    lon: -125.2448152,
    area: "Campbell River",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Northern boundary",
      verified: true
    }
  },
  {
    id: 1075,
    osmId: "MAR-075",
    name: "Ganges Marina",
    address: "Salt Spring Island, Ganges Harbour, BC",
    lat: 48.855736,
    lon: -123.499128,
    area: "Salt Spring Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1076,
    osmId: "MAR-076",
    name: "Salt Spring Marina",
    address: "Salt Spring Island, Ganges Harbour, BC",
    lat: 48.857946,
    lon: -123.500115,
    area: "Salt Spring Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1077,
    osmId: "MAR-077",
    name: "Montague Harbour Marina",
    address: "Galiano Island, Trincomali Channel, BC",
    lat: 48.891929,
    lon: -123.391217,
    area: "Galiano Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1078,
    osmId: "MAR-078",
    name: "Otter Bay Marina",
    address: "North Pender Island, Swanson Channel, BC",
    lat: 48.799504,
    lon: -123.310477,
    area: "North Pender Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1079,
    osmId: "MAR-079",
    name: "Port Browning Marina",
    address: "Pender Island, Plumper Sound, BC",
    lat: 48.777086,
    lon: -123.273286,
    area: "Pender Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1080,
    osmId: "MAR-080",
    name: "Poets Cove Marina",
    address: "South Pender Island, Bedwell Harbour, BC",
    lat: 48.746979,
    lon: -123.228385,
    area: "South Pender Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1081,
    osmId: "MAR-081",
    name: "Telegraph Harbour Marina",
    address: "Thetis Island, Telegraph Harbour, BC",
    lat: 48.983062,
    lon: -123.670188,
    area: "Thetis Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1082,
    osmId: "MAR-082",
    name: "Thetis Island Marina",
    address: "Thetis Island, Telegraph Harbour, BC",
    lat: 48.977492,
    lon: -123.669384,
    area: "Thetis Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1083,
    osmId: "MAR-083",
    name: "Silva Bay Resort & Marina",
    address: "Gabriola Island, Strait of Georgia, BC",
    lat: 49.149924,
    lon: -123.697815,
    area: "Gabriola Island",
    exp: 0.55,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round",
      verified: false
    }
  },
  {
    id: 1084,
    osmId: "MAR-084",
    name: "Refuge Cove",
    address: "West Redonda Island, Desolation Sound, BC",
    lat: 50.1237487,
    lon: -124.8390156,
    area: "West Redonda Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Seasonal (Jun–mid Sep); Resupply hub",
      verified: true
    }
  },
  {
    id: 1085,
    osmId: "MAR-085",
    name: "Squirrel Cove",
    address: "Cortes Island, Desolation Sound, BC",
    lat: 50.116667,
    lon: -124.916667,
    area: "Cortes Island",
    exp: 0.55,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Public dock; Year-round; Govt wharf + store dock",
      verified: true
    }
  },
  {
    id: 1086,
    osmId: "MAR-086",
    name: "Gorge Harbour Marina Resort",
    address: "Cortes Island, Discovery Islands, BC",
    lat: 50.1009025,
    lon: -125.0231933,
    area: "Cortes Island",
    exp: 0.45,
    accessInfo: {
      access: "Resort",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Seasonal peak (May–Sep); Full facilities, pool, store",
      verified: true
    }
  },
  {
    id: 1087,
    osmId: "MAR-087",
    name: "Heriot Bay Inn & Marina",
    address: "Quadra Island, Discovery Islands, BC",
    lat: 50.1022725,
    lon: -125.2102684,
    area: "Quadra Island",
    exp: 0.45,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "?",
      launch: "?",
      moorage: "Marina; Year-round; Side-tie + govt dock nearby",
      verified: true
    }
  }
];

export const SALISH_SEA_MARINE_PARKS: Marina[] = [
  {
    id: 2001,
    osmId: "PRK-001",
    name: "Sucia Island Marine SP",
    address: "Sucia Island, Strait of Georgia, WA",
    lat: 48.7571821,
    lon: -122.9088505,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer (fee yr-round); Marquee destination",
      verified: true
    }
  },
  {
    id: 2002,
    osmId: "PRK-002",
    name: "Matia Island Marine SP",
    address: "Matia Island, Strait of Georgia, WA",
    lat: 48.746981,
    lon: -122.8387178,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer; Rolfe Cove; only 2 dock spots",
      verified: true
    }
  },
  {
    id: 2003,
    osmId: "PRK-003",
    name: "Patos Island SP",
    address: "Patos Island, Strait of Georgia, WA",
    lat: 48.784417,
    lon: -122.9555619,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; Active Cove; no dock",
      verified: true
    }
  },
  {
    id: 2004,
    osmId: "PRK-004",
    name: "Clark Island SP",
    address: "Clark Island, Rosario Strait, WA",
    lat: 48.7008402,
    lon: -122.7644573,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; No dock",
      verified: true
    }
  },
  {
    id: 2005,
    osmId: "PRK-005",
    name: "Jones Island Marine SP",
    address: "Jones Island, San Juan Channel, WA",
    lat: 48.6158084,
    lon: -123.0456917,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer; Popular small-boat stop",
      verified: true
    }
  },
  {
    id: 2006,
    osmId: "PRK-006",
    name: "Stuart Island Marine SP",
    address: "Stuart Island, Haro Strait, WA",
    lat: 48.6769481,
    lon: -123.2022618,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer; Reid & Prevost Harbors",
      verified: true
    }
  },
  {
    id: 2007,
    osmId: "PRK-007",
    name: "Spencer Spit SP",
    address: "Lopez Island, San Juan Channel, WA",
    lat: 48.536678,
    lon: -122.8609478,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; Exposed; lee-shore buoys",
      verified: true
    }
  },
  {
    id: 2008,
    osmId: "PRK-008",
    name: "James Island Marine SP",
    address: "James Island, Rosario Strait, WA",
    lat: 48.5122456,
    lon: -122.775132,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer; E & W coves",
      verified: true
    }
  },
  {
    id: 2009,
    osmId: "PRK-009",
    name: "Doe Island Marine SP",
    address: "Doe Island, Rosario Strait, WA",
    lat: 48.6330606,
    lon: -122.7877856,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Small dock; WA State Parks; Summer; Off Orcas; ~30 ft dock",
      verified: true
    }
  },
  {
    id: 2010,
    osmId: "PRK-010",
    name: "Turn Island SP",
    address: "Turn Island, San Juan Channel, WA",
    lat: 48.5330841,
    lon: -122.9715308,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; Near Friday Harbor",
      verified: true
    }
  },
  {
    id: 2011,
    osmId: "PRK-011",
    name: "Blind Island SP",
    address: "Shaw Island (Blind Bay), San Juan Channel, WA",
    lat: 48.5850265,
    lon: -122.9370614,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; Tiny; Blind Bay",
      verified: true
    }
  },
  {
    id: 2012,
    osmId: "PRK-012",
    name: "Posey Island SP",
    address: "off San Juan Is., Haro Strait, WA",
    lat: 48.6184234,
    lon: -123.1678786,
    area: "San Juans",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Limited",
      fuel: "N",
      launch: "N",
      moorage: "Paddle-in; WA State Parks; Summer; Near Roche Harbor; kayak",
      verified: true
    }
  },
  {
    id: 2013,
    osmId: "PRK-013",
    name: "Saddlebag Island SP",
    address: "Saddlebag Island, Padilla Bay, WA",
    lat: 48.5356343,
    lon: -122.5564664,
    area: "Anacortes",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage / buoys; WA State Parks; Summer; Near Anacortes",
      verified: true
    }
  },
  {
    id: 2014,
    osmId: "PRK-014",
    name: "Cypress Head (DNR)",
    address: "Cypress Island, Rosario Strait, WA",
    lat: 48.568834,
    lon: -122.669693,
    area: "Anacortes",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys (free, DNR); WA DNR; Summer; DNR, not State Parks",
      verified: true
    }
  },
  {
    id: 2015,
    osmId: "PRK-015",
    name: "Deception Pass SP (Bowman Bay)",
    address: "Fidalgo/Whidbey, Skagit Bay, WA",
    lat: 48.415154,
    lon: -122.6546136,
    area: "Anacortes",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "Y",
      moorage: "Dock + buoys + launch; WA State Parks; Year-round; Bowman & Cornet Bays",
      verified: true
    }
  },
  {
    id: 2016,
    osmId: "PRK-016",
    name: "Hope Island SP (Skagit)",
    address: "Skagit Bay, Skagit Bay, WA",
    lat: 48.3987503,
    lon: -122.5697851,
    area: "Anacortes",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; 4 buoys; Lang Bay",
      verified: true
    }
  },
  {
    id: 2017,
    osmId: "PRK-017",
    name: "Blake Island Marine SP",
    address: "Blake Island, Puget Sound, WA",
    lat: 47.538398,
    lon: -122.4928808,
    area: "Central Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys (power); WA State Parks; Year-round; Only marine park w/ shore power",
      verified: true
    }
  },
  {
    id: 2018,
    osmId: "PRK-018",
    name: "Jarrell Cove SP",
    address: "Harstine Island, Puget Sound, WA",
    lat: 47.2850253,
    lon: -122.883395,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer; 2 docks",
      verified: true
    }
  },
  {
    id: 2019,
    osmId: "PRK-019",
    name: "McMicken Island SP",
    address: "off Harstine Is., Puget Sound, WA",
    lat: 47.2481512,
    lon: -122.862362,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer",
      verified: true
    }
  },
  {
    id: 2020,
    osmId: "PRK-020",
    name: "Penrose Point SP",
    address: "Mayo Cove, Puget Sound, WA",
    lat: 47.2587227,
    lon: -122.745121,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer",
      verified: true
    }
  },
  {
    id: 2021,
    osmId: "PRK-021",
    name: "Joemma Beach SP",
    address: "Key Peninsula, Puget Sound, WA",
    lat: 47.2259975,
    lon: -122.8055643,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; WA State Parks; Summer",
      verified: true
    }
  },
  {
    id: 2022,
    osmId: "PRK-022",
    name: "Kopachuck SP (Cutts Island)",
    address: "near Gig Harbor, Puget Sound, WA",
    lat: 47.3087867,
    lon: -122.6856197,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer; Cutts Is. buoys offshore",
      verified: true
    }
  },
  {
    id: 2023,
    osmId: "PRK-023",
    name: "Hope Island Marine SP (S Sound)",
    address: "Squaxin area, Puget Sound, WA",
    lat: 47.1870595,
    lon: -122.9285144,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; WA State Parks; Summer",
      verified: true
    }
  },
  {
    id: 2024,
    osmId: "PRK-024",
    name: "Tolmie SP",
    address: "near Olympia, Puget Sound, WA",
    lat: 47.12038,
    lon: -122.7757975,
    area: "South Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys (day); WA State Parks; Summer; Day-use marine park",
      verified: true
    }
  },
  {
    id: 2025,
    osmId: "PRK-025",
    name: "Pleasant Harbor SP",
    address: "Brinnon, Hood Canal, WA",
    lat: 47.6647125,
    lon: -122.9136282,
    area: "Hood Canal",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock; WA State Parks; Summer; Inside Pleasant Harbor",
      verified: true
    }
  },
  {
    id: 2026,
    osmId: "PRK-026",
    name: "Montague Harbour Marine PP",
    address: "Galiano Island, Trincomali Channel, BC",
    lat: 48.8995388,
    lon: -123.4044456,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "Y",
      moorage: "Dock + buoys + launch; BC Parks; Summer (May 15–Sep); ~35 buoys; dock max 36 ft",
      verified: true
    }
  },
  {
    id: 2027,
    osmId: "PRK-027",
    name: "Newcastle Island (Saysutshun)",
    address: "Nanaimo, Nanaimo Harbour, BC",
    lat: 49.1858332,
    lon: -123.9344989,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; BC Parks; Summer; Mark Bay; city amenities across",
      verified: true
    }
  },
  {
    id: 2028,
    osmId: "PRK-028",
    name: "Wallace Island Marine PP",
    address: "Trincomali Channel, Trincomali Channel, BC",
    lat: 48.9418162,
    lon: -123.5523108,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + stern-tie; BC Parks; Summer; Conover dock; Princess Cove stern-tie",
      verified: true
    }
  },
  {
    id: 2029,
    osmId: "PRK-029",
    name: "Pirates Cove Marine PP",
    address: "De Courcy Island, Pylades Channel, BC",
    lat: 49.0940807,
    lon: -123.7261129,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys / stern-tie; BC Parks; Summer; Near Dodd Narrows",
      verified: true
    }
  },
  {
    id: 2030,
    osmId: "PRK-030",
    name: "Princess Margaret (Portland Is.)",
    address: "Portland Island, Satellite Channel, BC",
    lat: 48.7321575,
    lon: -123.3691492,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys / stern-tie; Parks Canada (GINPR); Summer; Royal Cove stern-ties",
      verified: true
    }
  },
  {
    id: 2031,
    osmId: "PRK-031",
    name: "Sidney Spit",
    address: "Sidney Island, Haro Strait, BC",
    lat: 48.638549,
    lon: -123.329702,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Dock + buoys; Parks Canada (GINPR); Summer; Sandy spit; no water on island",
      verified: true
    }
  },
  {
    id: 2032,
    osmId: "PRK-032",
    name: "Cabbage Island Marine PP",
    address: "Cabbage Island, Strait of Georgia, BC",
    lat: 48.7981488,
    lon: -123.0866225,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; Parks Canada (GINPR); Summer; ~10 buoys; off Tumbo Is.",
      verified: true
    }
  },
  {
    id: 2033,
    osmId: "PRK-033",
    name: "Beaumont / Mt Norman (GINPR)",
    address: "South Pender Is., Bedwell Harbour, BC",
    lat: 48.7542763,
    lon: -123.2394613,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; Parks Canada (GINPR); Summer; By Poets Cove",
      verified: true
    }
  },
  {
    id: 2034,
    osmId: "PRK-034",
    name: "Prevost Island (GINPR)",
    address: "Prevost Island, Trincomali Channel, BC",
    lat: 48.8399839,
    lon: -123.3992088,
    area: "Gulf Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage / buoys; Parks Canada (GINPR); Summer; James Bay anchorage",
      verified: true
    }
  },
  {
    id: 2035,
    osmId: "PRK-035",
    name: "Plumper Cove Marine PP",
    address: "Keats Island, Howe Sound, BC",
    lat: 49.4045102,
    lon: -123.4651164,
    area: "Howe Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Wharf + buoys; BC Parks; Year-round (min. winter); ~8 buoys; dock ~11-12 boats",
      verified: true
    }
  },
  {
    id: 2036,
    osmId: "PRK-036",
    name: "Halkett Bay Marine PP",
    address: "Gambier Island, Howe Sound, BC",
    lat: 49.4576652,
    lon: -123.3313176,
    area: "Howe Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Buoys; BC Parks; Summer; Dinghy dock",
      verified: true
    }
  },
  {
    id: 2037,
    osmId: "PRK-037",
    name: "Smuggler Cove Marine PP",
    address: "near Secret Cove, Strait of Georgia, BC",
    lat: 49.5113788,
    lon: -123.9489476,
    area: "Sunshine Coast",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage / stern-tie; BC Parks; Summer; Stern-tie rings; no buoys",
      verified: true
    }
  },
  {
    id: 2038,
    osmId: "PRK-038",
    name: "Garden Bay Marine PP",
    address: "Pender Harbour, Pender Harbour, BC",
    lat: 49.6381677,
    lon: -124.0073379,
    area: "Sunshine Coast",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage / dock; BC Parks; Summer; Small dock tie-up",
      verified: true
    }
  },
  {
    id: 2039,
    osmId: "PRK-039",
    name: "Desolation Sound MP (Prideaux Haven)",
    address: "Prideaux Haven, Desolation Sound, BC",
    lat: 50.1422633,
    lon: -124.6874532,
    area: "Desolation Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage / stern-tie; BC Parks; Summer; No buoys; stern-tie pins",
      verified: true
    }
  },
  {
    id: 2040,
    osmId: "PRK-040",
    name: "Tenedos Bay (Desolation MP)",
    address: "Desolation Sound, Desolation Sound, BC",
    lat: 50.1193912,
    lon: -124.7028548,
    area: "Desolation Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage; BC Parks; Summer; Unwin Lake access",
      verified: true
    }
  },
  {
    id: 2041,
    osmId: "PRK-041",
    name: "Grace Harbour (Desolation MP)",
    address: "Gifford Peninsula, Malaspina Inlet, BC",
    lat: 50.0542457,
    lon: -124.7449182,
    area: "Desolation Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage; BC Parks; Summer; Head of Malaspina Inlet",
      verified: true
    }
  },
  {
    id: 2042,
    osmId: "PRK-042",
    name: "Roscoe Bay Marine PP",
    address: "West Redonda Is., Desolation Sound, BC",
    lat: 50.1603267,
    lon: -124.766863,
    area: "Desolation Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage; BC Parks; Summer; Black Lake swimming",
      verified: true
    }
  },
  {
    id: 2043,
    osmId: "PRK-043",
    name: "Háthayim (Von Donop) Marine PP",
    address: "Cortes Island, Sutil Channel, BC",
    lat: 50.1550625,
    lon: -124.9563518,
    area: "Discovery Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage; BC Parks; Summer; Von Donop Inlet",
      verified: true
    }
  },
  {
    id: 2044,
    osmId: "PRK-044",
    name: "Rebecca Spit Marine PP",
    address: "Quadra Island, Sutil Channel, BC",
    lat: 50.094995,
    lon: -125.1843327,
    area: "Discovery Islands",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage / day; BC Parks; Summer; Drew Harbour; facilities ashore",
      verified: true
    }
  },
  {
    id: 2045,
    osmId: "PRK-045",
    name: "Copeland Islands Marine PP",
    address: "near Lund, Thulin Passage, BC",
    lat: 50.0057697,
    lon: -124.8120475,
    area: "Desolation Sound",
    exp: 0.7,
    accessInfo: {
      access: "Public",
      transient: "Y",
      fuel: "N",
      launch: "N",
      moorage: "Anchorage; BC Parks; Summer; 'Ragged Islands'",
      verified: true
    }
  }
];

export const SALISH_SEA_LAUNCH_NOTES: SalishSeaLaunchNote[] = [
  {
    id: "LCH-001",
    name: "Port of Everett 13-Lane Launch",
    area: "Everett",
    waterBody: "Puget Sound",
    country: "USA",
    notes: "Largest launch in WA",
    coordSource: "to verify"
  },
  {
    id: "LCH-002",
    name: "Cap Sante / Washington Park Ramp",
    area: "Anacortes",
    waterBody: "Fidalgo Bay",
    country: "USA",
    notes: "SJI staging",
    coordSource: "to verify"
  },
  {
    id: "LCH-003",
    name: "Cornet Bay Ramp",
    area: "Deception Pass",
    waterBody: "Skagit Bay",
    country: "USA",
    notes: "WA State Parks",
    coordSource: "to verify"
  },
  {
    id: "LCH-004",
    name: "Squalicum Harbor Launch",
    area: "Bellingham",
    waterBody: "Bellingham Bay",
    country: "USA",
    notes: "Port of Bellingham",
    coordSource: "to verify"
  },
  {
    id: "LCH-005",
    name: "Des Moines Marina Ramp",
    area: "Des Moines",
    waterBody: "Puget Sound",
    country: "USA",
    notes: null,
    coordSource: "to verify"
  },
  {
    id: "LCH-006",
    name: "John Wayne Marina Ramp",
    area: "Sequim",
    waterBody: "Strait of Juan de Fuca",
    country: "USA",
    notes: null,
    coordSource: "to verify"
  },
  {
    id: "LCH-007",
    name: "Powell River North Harbour Ramp",
    area: "Powell River",
    waterBody: "Malaspina Strait",
    country: "Canada",
    notes: "City main saltwater ramp",
    coordSource: "to verify"
  },
  {
    id: "LCH-008",
    name: "Comox Municipal Boat Ramp",
    area: "Comox",
    waterBody: "Comox Harbour",
    country: "Canada",
    notes: "Pay launch Mar–Oct",
    coordSource: "to verify"
  },
  {
    id: "LCH-009",
    name: "Nanaimo (Brechin) Ramp",
    area: "Nanaimo",
    waterBody: "Strait of Georgia",
    country: "Canada",
    notes: null,
    coordSource: "to verify"
  },
  {
    id: "LCH-010",
    name: "Cates Park / Deep Cove Ramp",
    area: "North Vancouver",
    waterBody: "Indian Arm",
    country: "Canada",
    notes: null,
    coordSource: "to verify"
  }
];
