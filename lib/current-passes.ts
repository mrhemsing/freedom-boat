export type CurrentSource = 'DFO' | 'NOAA';

export type CurrentPass = {
  id: string;
  name: string;
  gate: [[number, number], [number, number]]; // [lon, lat]
  source: CurrentSource;
  stationId: string;
  stationCode?: string;
  bin?: number;
  maxCurrentKt: number;
  notes?: string;
};

export type CurrentEvent = {
  t: string;
  kind: 'slack' | 'max_flood' | 'max_ebb';
  speedKt: number;
};

export type CurrentPassForecast = {
  passId: string;
  source: CurrentSource;
  stationId: string;
  events: CurrentEvent[];
};

export const CURRENT_PASSES: CurrentPass[] = [
  {
    id: 'PASS-ACTIVE',
    name: 'Active Pass',
    gate: [[-123.335, 48.874], [-123.288, 48.845]],
    source: 'DFO',
    stationId: '63aef09f84e5432cd3b6c509',
    stationCode: '07527',
    maxCurrentKt: 7,
    notes: 'Heavy ferry traffic'
  },
  {
    id: 'PASS-PORLIER',
    name: 'Porlier Pass',
    gate: [[-123.604, 49.021], [-123.562, 49.008]],
    source: 'DFO',
    stationId: '63aef0ed84e5432cd3b6c50b',
    stationCode: '07438',
    maxCurrentKt: 6
  },
  {
    id: 'PASS-GABRIOLA',
    name: 'Gabriola Passage',
    gate: [[-123.733, 49.122], [-123.684, 49.133]],
    source: 'DFO',
    stationId: '63aef12e84e5432cd3b6db8d',
    stationCode: '07545',
    maxCurrentKt: 6
  },
  {
    id: 'PASS-DODD',
    name: 'Dodd Narrows',
    gate: [[-123.829, 49.139], [-123.805, 49.129]],
    source: 'DFO',
    stationId: '63aef1866a2b9417c035030f',
    stationCode: '07487',
    maxCurrentKt: 9
  },
  {
    id: 'PASS-FIRST-NARROWS',
    name: 'First Narrows',
    gate: [[-123.154, 49.321], [-123.125, 49.311]],
    source: 'DFO',
    stationId: '5dd30650e0fdc4b9b4be6d24',
    stationCode: '07721',
    maxCurrentKt: 5
  },
  {
    id: 'PASS-SECOND-NARROWS',
    name: 'Second Narrows',
    gate: [[-123.042, 49.301], [-123.006, 49.288]],
    source: 'DFO',
    stationId: '5dd30650e0fdc4b9b4be6c2d',
    stationCode: '07745',
    maxCurrentKt: 6
  },
  {
    id: 'PASS-SEYMOUR',
    name: 'Seymour Narrows',
    gate: [[-125.377, 50.144], [-125.323, 50.121]],
    source: 'DFO',
    stationId: '63aefc7784e5432cd3b6eb1e',
    stationCode: '08108',
    maxCurrentKt: 15
  },
  {
    id: 'PASS-DENT',
    name: 'Dent Rapids',
    gate: [[-125.232, 50.422], [-125.191, 50.399]],
    source: 'DFO',
    stationId: '63af06d56a2b9417c0353451',
    stationCode: '08138',
    maxCurrentKt: 11
  },
  {
    id: 'PASS-YUCULTA',
    name: 'Yuculta Rapids / Gillard Passage',
    gate: [[-125.18, 50.407], [-125.135, 50.381]],
    source: 'DFO',
    stationId: '5dd3064fe0fdc4b9b4be6978',
    stationCode: '08059',
    maxCurrentKt: 10
  },
  {
    id: 'PASS-DECEPTION',
    name: 'Deception Pass',
    gate: [[-122.662, 48.414], [-122.623, 48.397]],
    source: 'NOAA',
    stationId: 'PUG1701',
    bin: 24,
    maxCurrentKt: 8
  },
  {
    id: 'PASS-ROSARIO',
    name: 'Rosario Strait',
    gate: [[-122.785, 48.48], [-122.717, 48.435]],
    source: 'NOAA',
    stationId: 'PUG1702',
    bin: 16,
    maxCurrentKt: 4
  },
  {
    id: 'PASS-SAN-JUAN',
    name: 'San Juan Channel / Cattle Pass',
    gate: [[-122.982, 48.478], [-122.922, 48.428]],
    source: 'NOAA',
    stationId: 'PUG1703',
    bin: 17,
    maxCurrentKt: 5
  }
];
