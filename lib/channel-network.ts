export type ChannelPoint = {
  lat: number;
  lon: number;
};

type ChannelNode = ChannelPoint & {
  id: string;
  label: string;
};

type ChannelEdge = [string, string];

const CHANNEL_NODES: ChannelNode[] = [
  { id: 'burrard_inner', label: 'Burrard Inlet inner', lat: 49.299, lon: -123.115 },
  { id: 'first_narrows', label: 'First Narrows', lat: 49.317, lon: -123.139 },
  { id: 'english_bay', label: 'English Bay', lat: 49.285, lon: -123.205 },
  { id: 'howe_sound_south', label: 'Howe Sound south', lat: 49.385, lon: -123.285 },
  { id: 'gibsons_channel', label: 'Gibsons approach', lat: 49.405, lon: -123.505 },
  { id: 'sechelt_channel', label: 'Sechelt channel', lat: 49.505, lon: -123.775 },
  { id: 'secret_cove_channel', label: 'Secret Cove channel', lat: 49.535, lon: -123.975 },
  { id: 'malaspina_south', label: 'Malaspina Strait south', lat: 49.625, lon: -124.17 },
  { id: 'powell_river_channel', label: 'Powell River channel', lat: 49.835, lon: -124.55 },
  { id: 'lund_channel', label: 'Lund channel', lat: 49.98, lon: -124.77 },
  { id: 'desolation_south', label: 'Desolation Sound south', lat: 50.075, lon: -124.78 },
  { id: 'cortes_channel', label: 'Cortes channel', lat: 50.1, lon: -124.98 },
  { id: 'campbell_river_channel', label: 'Campbell River channel', lat: 50.035, lon: -125.24 },

  { id: 'victoria_harbour', label: 'Victoria Harbour', lat: 48.42, lon: -123.38 },
  { id: 'oak_bay_channel', label: 'Oak Bay channel', lat: 48.425, lon: -123.285 },
  { id: 'sidney_channel', label: 'Sidney channel', lat: 48.66, lon: -123.39 },
  { id: 'swartz_bay_channel', label: 'Swartz Bay channel', lat: 48.69, lon: -123.41 },
  { id: 'saanich_inlet', label: 'Saanich Inlet', lat: 48.63, lon: -123.52 },
  { id: 'cowichan_channel', label: 'Cowichan channel', lat: 48.75, lon: -123.6 },
  { id: 'dodd_narrows', label: 'Dodd Narrows', lat: 49.134, lon: -123.817 },
  { id: 'nanaimo_channel', label: 'Nanaimo channel', lat: 49.17, lon: -123.91 },
  { id: 'nanoose_channel', label: 'Nanoose channel', lat: 49.27, lon: -124.14 },
  { id: 'parksville_channel', label: 'Parksville channel', lat: 49.32, lon: -124.3 },
  { id: 'french_creek_channel', label: 'French Creek channel', lat: 49.35, lon: -124.37 },
  { id: 'comox_channel', label: 'Comox channel', lat: 49.67, lon: -124.92 },

  { id: 'boundary_pass', label: 'Boundary Pass', lat: 48.73, lon: -123.08 },
  { id: 'active_pass', label: 'Active Pass', lat: 48.86, lon: -123.315 },
  { id: 'ganges_channel', label: 'Ganges channel', lat: 48.85, lon: -123.5 },
  { id: 'trincomali_channel', label: 'Trincomali Channel', lat: 49.0, lon: -123.53 },
  { id: 'porlier_pass', label: 'Porlier Pass', lat: 49.018, lon: -123.585 },
  { id: 'gabriola_passage', label: 'Gabriola Passage', lat: 49.13, lon: -123.71 },

  { id: 'san_juan_channel', label: 'San Juan Channel', lat: 48.51, lon: -123.03 },
  { id: 'friday_harbor_channel', label: 'Friday Harbor channel', lat: 48.535, lon: -123.01 },
  { id: 'cattle_pass', label: 'Cattle Pass', lat: 48.45, lon: -122.96 },
  { id: 'rosario_strait', label: 'Rosario Strait', lat: 48.52, lon: -122.78 },
  { id: 'anacortes_channel', label: 'Anacortes channel', lat: 48.51, lon: -122.61 },
  { id: 'deception_pass', label: 'Deception Pass', lat: 48.405, lon: -122.64 },
  { id: 'bellingham_channel', label: 'Bellingham channel', lat: 48.75, lon: -122.5 },
  { id: 'blaine_channel', label: 'Blaine channel', lat: 48.99, lon: -122.76 }
];

const CHANNEL_EDGES: ChannelEdge[] = [
  ['burrard_inner', 'first_narrows'],
  ['first_narrows', 'english_bay'],
  ['english_bay', 'howe_sound_south'],
  ['howe_sound_south', 'gibsons_channel'],
  ['gibsons_channel', 'sechelt_channel'],
  ['sechelt_channel', 'secret_cove_channel'],
  ['secret_cove_channel', 'malaspina_south'],
  ['malaspina_south', 'powell_river_channel'],
  ['powell_river_channel', 'lund_channel'],
  ['lund_channel', 'desolation_south'],
  ['desolation_south', 'cortes_channel'],
  ['cortes_channel', 'campbell_river_channel'],
  ['campbell_river_channel', 'comox_channel'],

  ['victoria_harbour', 'oak_bay_channel'],
  ['oak_bay_channel', 'sidney_channel'],
  ['sidney_channel', 'swartz_bay_channel'],
  ['swartz_bay_channel', 'saanich_inlet'],
  ['saanich_inlet', 'cowichan_channel'],
  ['cowichan_channel', 'dodd_narrows'],
  ['dodd_narrows', 'nanaimo_channel'],
  ['nanaimo_channel', 'nanoose_channel'],
  ['nanoose_channel', 'parksville_channel'],
  ['parksville_channel', 'french_creek_channel'],
  ['french_creek_channel', 'comox_channel'],

  ['sidney_channel', 'boundary_pass'],
  ['boundary_pass', 'active_pass'],
  ['active_pass', 'ganges_channel'],
  ['ganges_channel', 'trincomali_channel'],
  ['trincomali_channel', 'porlier_pass'],
  ['porlier_pass', 'gabriola_passage'],
  ['gabriola_passage', 'dodd_narrows'],
  ['gabriola_passage', 'nanaimo_channel'],
  ['active_pass', 'trincomali_channel'],
  ['porlier_pass', 'nanaimo_channel'],

  ['english_bay', 'active_pass'],
  ['gibsons_channel', 'nanaimo_channel'],
  ['secret_cove_channel', 'french_creek_channel'],
  ['powell_river_channel', 'comox_channel'],

  ['boundary_pass', 'san_juan_channel'],
  ['san_juan_channel', 'friday_harbor_channel'],
  ['friday_harbor_channel', 'cattle_pass'],
  ['cattle_pass', 'victoria_harbour'],
  ['san_juan_channel', 'rosario_strait'],
  ['rosario_strait', 'anacortes_channel'],
  ['anacortes_channel', 'deception_pass'],
  ['rosario_strait', 'bellingham_channel'],
  ['bellingham_channel', 'blaine_channel'],
  ['blaine_channel', 'boundary_pass'],
  ['anacortes_channel', 'friday_harbor_channel']
];

const NODE_BY_ID = new Map(CHANNEL_NODES.map((node) => [node.id, node]));
const ADJACENCY = buildAdjacency();
const MIN_WAYPOINT_NM = 0.18;

export function draftChannelRoute(start: ChannelPoint, end: ChannelPoint): ChannelPoint[] {
  const startNode = nearestChannelNode(start);
  const endNode = nearestChannelNode(end);
  if (!startNode || !endNode || startNode.id === endNode.id) return [];

  const nodeIds = shortestPath(startNode.id, endNode.id);
  if (nodeIds.length < 2) return [];

  return nodeIds
    .map((id) => NODE_BY_ID.get(id))
    .filter((node): node is ChannelNode => Boolean(node))
    .filter((node, index, nodes) => {
      const point = { lat: node.lat, lon: node.lon };
      const previous = nodes[index - 1];
      const previousPoint = previous ? { lat: previous.lat, lon: previous.lon } : null;
      if (distanceNm(point, start) < MIN_WAYPOINT_NM) return false;
      if (distanceNm(point, end) < MIN_WAYPOINT_NM) return false;
      if (previousPoint && distanceNm(point, previousPoint) < MIN_WAYPOINT_NM) return false;
      return true;
    })
    .map((node) => ({ lat: node.lat, lon: node.lon }));
}

function buildAdjacency() {
  const adjacency = new Map<string, Array<{ id: string; weight: number }>>();
  CHANNEL_NODES.forEach((node) => adjacency.set(node.id, []));

  CHANNEL_EDGES.forEach(([a, b]) => {
    const nodeA = NODE_BY_ID.get(a);
    const nodeB = NODE_BY_ID.get(b);
    if (!nodeA || !nodeB) return;
    const weight = distanceNm(nodeA, nodeB);
    adjacency.get(a)?.push({ id: b, weight });
    adjacency.get(b)?.push({ id: a, weight });
  });

  return adjacency;
}

function nearestChannelNode(point: ChannelPoint) {
  return CHANNEL_NODES.reduce<ChannelNode | null>((best, node) => {
    if (!best) return node;
    return distanceNm(point, node) < distanceNm(point, best) ? node : best;
  }, null);
}

function shortestPath(startId: string, endId: string) {
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();
  const open = new Set(CHANNEL_NODES.map((node) => node.id));
  CHANNEL_NODES.forEach((node) => distances.set(node.id, Number.POSITIVE_INFINITY));
  distances.set(startId, 0);

  while (open.size) {
    let current: string | null = null;
    open.forEach((id) => {
      if (current == null || (distances.get(id) ?? Number.POSITIVE_INFINITY) < (distances.get(current) ?? Number.POSITIVE_INFINITY)) {
        current = id;
      }
    });
    if (current == null) break;
    if (current === endId) break;
    open.delete(current);

    for (const edge of ADJACENCY.get(current) ?? []) {
      if (!open.has(edge.id)) continue;
      const nextDistance = (distances.get(current) ?? Number.POSITIVE_INFINITY) + edge.weight;
      if (nextDistance < (distances.get(edge.id) ?? Number.POSITIVE_INFINITY)) {
        distances.set(edge.id, nextDistance);
        previous.set(edge.id, current);
      }
    }
  }

  if (startId !== endId && !previous.has(endId)) return [];

  const path = [endId];
  let cursor = endId;
  while (cursor !== startId) {
    const prev = previous.get(cursor);
    if (!prev) return [];
    path.unshift(prev);
    cursor = prev;
  }
  return path;
}

function distanceNm(a: ChannelPoint, b: ChannelPoint) {
  const earthRadiusNm = 3440.065;
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * earthRadiusNm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function toRadians(value: number) {
  return value * Math.PI / 180;
}
