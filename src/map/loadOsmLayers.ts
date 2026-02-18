import maplibregl from 'maplibre-gl';

const CACHE_KEY    = 'osm_layers_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const BBOX         = '43.60,40.00,43.75,40.10';

interface OsmCache {
  timestamp: number;
  geojson: GeoJSON.FeatureCollection;
}

// OSM piste:difficulty → standard ski resort colors
const PISTE_DIFFICULTY_COLOR: Record<string, string> = {
  novice:       '#4CAF50',  // green
  easy:         '#4CAF50',  // green
  intermediate: '#2196F3',  // blue
  advanced:     '#F44336',  // red
  expert:       '#212121',  // black
  freeride:     '#FF9800',  // orange (off-piste)
  extreme:      '#212121'   // black
};
const PISTE_DEFAULT_COLOR = '#2196F3'; // blue fallback

function getPisteColor(props: Record<string, string>): string {
  const diff = (props['piste:difficulty'] || props['difficulty'] || '').toLowerCase();
  return PISTE_DIFFICULTY_COLOR[diff] ?? PISTE_DEFAULT_COLOR;
}

function getCached(): GeoJSON.FeatureCollection | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const c: OsmCache = JSON.parse(raw);
    return Date.now() - c.timestamp > CACHE_TTL_MS ? null : c.geojson;
  } catch { return null; }
}

function setCache(geojson: GeoJSON.FeatureCollection): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), geojson }));
  } catch { /* storage full */ }
}

async function fetchOsm(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:30];
(
  way["piste:type"](${BBOX});
  way["aerialway"](${BBOX});
  way["waterway"="stream"](${BBOX});
);
out geom;`;
  const r = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', body: query,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  const json = await r.json();
  const osmtogeojson = (await import('osmtogeojson')).default;
  return osmtogeojson(json) as GeoJSON.FeatureCollection;
}

function applyOsm(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection,
  beforeLayerId?: string
): void {
  // Separate pistes by difficulty for per-color styling
  const pistesByDiff: Record<string, GeoJSON.Feature[]> = {};
  const aerials: GeoJSON.Feature[] = [];
  const waters: GeoJSON.Feature[]  = [];

  for (const f of geojson.features) {
    const p = (f.properties || {}) as Record<string, string>;
    // Attach color to properties for data-driven styling
    if (p['piste:type']) {
      const color = getPisteColor(p);
      const diff  = (p['piste:difficulty'] || 'easy').toLowerCase();
      if (!pistesByDiff[diff]) pistesByDiff[diff] = [];
      pistesByDiff[diff].push({ ...f, properties: { ...p, _color: color } });
    } else if (p['aerialway']) {
      aerials.push(f);
    } else if (p['waterway'] === 'stream') {
      waters.push(f);
    }
  }

  const safeBeforeId = (id?: string) =>
    id && map.getLayer(id) ? id : undefined;
  const before = safeBeforeId(beforeLayerId);

  // All pistes in a single source, data-driven color from _color property
  const allPistes = Object.values(pistesByDiff).flat();
  const pisteFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: allPistes };

  if (!map.getSource('osm-pistes')) {
    map.addSource('osm-pistes', { type: 'geojson', data: pisteFC });
  } else {
    (map.getSource('osm-pistes') as maplibregl.GeoJSONSource).setData(pisteFC);
  }

  // Thick casing (white/light) for contrast on map
  if (!map.getLayer('osm-pistes-casing')) {
    map.addLayer({
      id: 'osm-pistes-casing', type: 'line', source: 'osm-pistes',
      paint: {
        'line-color': 'rgba(255,255,255,0.85)',
        'line-width': 6,
        'line-opacity': 0.9
      }
    }, before);
  }
  // Colored line on top of casing
  if (!map.getLayer('osm-pistes-line')) {
    map.addLayer({
      id: 'osm-pistes-line', type: 'line', source: 'osm-pistes',
      paint: {
        'line-color': ['coalesce', ['get', '_color'], '#2196F3'],
        'line-width': 3.5,
        'line-opacity': 1
      }
    }, before);
  }
  // Piste name label
  if (!map.getLayer('osm-pistes-label')) {
    map.addLayer({
      id: 'osm-pistes-label', type: 'symbol', source: 'osm-pistes',
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name'], ['get', 'piste:name'], ['get', 'ref'], ''],
        'text-size': 11,
        'text-font': ['Noto Sans Bold'],
        'text-max-angle': 45,
        'text-offset': [0, -1]
      },
      paint: {
        'text-color': ['coalesce', ['get', '_color'], '#1565C0'],
        'text-halo-color': 'rgba(255,255,255,0.95)',
        'text-halo-width': 2
      }
    }, before);
  }

  // Aerialways (канатные дороги)
  const aerialFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: aerials };
  if (!map.getSource('osm-aerials')) {
    map.addSource('osm-aerials', { type: 'geojson', data: aerialFC });
  } else {
    (map.getSource('osm-aerials') as maplibregl.GeoJSONSource).setData(aerialFC);
  }
  if (!map.getLayer('osm-aerials-line')) {
    map.addLayer({
      id: 'osm-aerials-line', type: 'line', source: 'osm-aerials',
      paint: { 'line-color': '#E65100', 'line-width': 2, 'line-dasharray': [3, 2] }
    }, before);
  }
  if (!map.getLayer('osm-aerials-label')) {
    map.addLayer({
      id: 'osm-aerials-label', type: 'symbol', source: 'osm-aerials',
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name'], ''],
        'text-size': 10,
        'text-font': ['Noto Sans Regular'],
        'text-max-angle': 45,
        'text-offset': [0, -1]
      },
      paint: {
        'text-color': '#E65100',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 1.5
      }
    }, before);
  }

  // Waterways
  const waterFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: waters };
  if (!map.getSource('osm-waters')) {
    map.addSource('osm-waters', { type: 'geojson', data: waterFC });
  } else {
    (map.getSource('osm-waters') as maplibregl.GeoJSONSource).setData(waterFC);
  }
  if (!map.getLayer('osm-waters-line')) {
    map.addLayer({
      id: 'osm-waters-line', type: 'line', source: 'osm-waters',
      paint: { 'line-color': '#0277BD', 'line-width': 1.5 }
    }, before);
  }
}

export async function loadOsmLayers(
  map: maplibregl.Map,
  beforeLayerId?: string
): Promise<void> {
  try {
    let geojson = getCached();
    if (!geojson) {
      geojson = await fetchOsm();
      setCache(geojson);
    }
    applyOsm(map, geojson, beforeLayerId);
  } catch (err) {
    console.warn('[Avalancher] OSM load failed:', err);
  }
}
