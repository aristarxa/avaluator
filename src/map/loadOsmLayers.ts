import maplibregl from 'maplibre-gl';

const CACHE_KEY    = 'osm_layers_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Bounding box covering ALL four Krasnaya Polyana resorts:
 *   Rosa Khutor, Gazprom / Laura, Alpika-Service, Gorki Gorod
 * lat: 43.60 – 43.72   lon: 40.00 – 40.30
 */
const BBOX = '43.60,40.00,43.72,40.30';

interface OsmCache {
  timestamp: number;
  geojson: GeoJSON.FeatureCollection;
}

// ─── Piste difficulty → standard ski resort colours ──────────────────────────
const PISTE_COLOR: Record<string, string> = {
  novice:       '#4CAF50',  // green
  easy:         '#4CAF50',  // green
  intermediate: '#2196F3',  // blue
  advanced:     '#F44336',  // red
  expert:       '#1A1A1A',  // black
  freeride:     '#FF9800',  // orange – off-piste
  extreme:      '#1A1A1A',  // black
};
const PISTE_DEFAULT_COLOR = '#2196F3';

function pisteColor(props: Record<string, string>): string {
  const diff = (props['piste:difficulty'] || props['difficulty'] || '').toLowerCase();
  return PISTE_COLOR[diff] ?? PISTE_DEFAULT_COLOR;
}

// ─── Aerialway line width by type ────────────────────────────────────────────
function aerialWidth(type: string): number {
  switch (type) {
    case 'gondola':
    case 'cable_car':    return 3;
    case 'chair_lift':   return 2.5;
    case 'drag_lift':
    case 't-bar':
    case 'platter':      return 1.5;
    default:             return 2;
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
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

// ─── Overpass query ───────────────────────────────────────────────────────────
async function fetchOsm(): Promise<GeoJSON.FeatureCollection> {
  // Fetch:
  //   • piste ways + relations (full geometry)
  //   • aerialways
  //   • ski area boundaries (leisure=ski_resort / landuse=winter_sports)
  const query = `[out:json][timeout:60];
(
  way["piste:type"](${BBOX});
  relation["piste:type"](${BBOX});
  way["aerialway"](${BBOX});
  relation["aerialway"](${BBOX});
  way["landuse"="winter_sports"](${BBOX});
  way["leisure"="ski_resort"](${BBOX});
  relation["leisure"="ski_resort"](${BBOX});
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

// ─── Apply layers to map ──────────────────────────────────────────────────────
function applyOsm(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection,
  beforeLayerId?: string
): void {
  const pisteLines:   GeoJSON.Feature[] = [];
  const pisteAreas:   GeoJSON.Feature[] = [];
  const aerials:      GeoJSON.Feature[] = [];
  const resortAreas:  GeoJSON.Feature[] = [];

  for (const f of geojson.features) {
    const p = (f.properties || {}) as Record<string, string>;
    const geomType = (f.geometry as GeoJSON.Geometry).type;

    if (p['piste:type']) {
      const color = pisteColor(p);
      const feat  = { ...f, properties: { ...p, _color: color } };
      if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        pisteAreas.push(feat);
      } else {
        pisteLines.push(feat);
      }
    } else if (p['aerialway']) {
      aerials.push({ ...f, properties: { ...p, _width: aerialWidth(p['aerialway']) } });
    } else if (
      p['landuse'] === 'winter_sports' ||
      p['leisure'] === 'ski_resort'
    ) {
      resortAreas.push(f);
    }
  }

  const before = beforeLayerId && map.getLayer(beforeLayerId) ? beforeLayerId : undefined;

  // ── Resort boundary fill ─────────────────────────────────────
  const resortFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: resortAreas };
  upsertSource(map, 'osm-resort', resortFC);
  if (!map.getLayer('osm-resort-fill')) {
    map.addLayer({
      id: 'osm-resort-fill', type: 'fill', source: 'osm-resort',
      paint: { 'fill-color': '#e8f0fe', 'fill-opacity': 0.25 }
    }, before);
  }
  if (!map.getLayer('osm-resort-outline')) {
    map.addLayer({
      id: 'osm-resort-outline', type: 'line', source: 'osm-resort',
      paint: { 'line-color': '#1565C0', 'line-width': 1.5, 'line-dasharray': [4, 3], 'line-opacity': 0.6 }
    }, before);
  }

  // ── Piste area fills (polygon runs) ─────────────────────────
  const pisteAreaFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: pisteAreas };
  upsertSource(map, 'osm-piste-areas', pisteAreaFC);
  if (!map.getLayer('osm-piste-areas-fill')) {
    map.addLayer({
      id: 'osm-piste-areas-fill', type: 'fill', source: 'osm-piste-areas',
      paint: {
        'fill-color': ['coalesce', ['get', '_color'], '#2196F3'],
        'fill-opacity': 0.18
      }
    }, before);
  }
  if (!map.getLayer('osm-piste-areas-outline')) {
    map.addLayer({
      id: 'osm-piste-areas-outline', type: 'line', source: 'osm-piste-areas',
      paint: {
        'line-color': ['coalesce', ['get', '_color'], '#2196F3'],
        'line-width': 1.5,
        'line-opacity': 0.7
      }
    }, before);
  }

  // ── Piste line casings + colour ──────────────────────────────
  const pisteLineFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: pisteLines };
  upsertSource(map, 'osm-pistes', pisteLineFC);

  if (!map.getLayer('osm-pistes-casing')) {
    map.addLayer({
      id: 'osm-pistes-casing', type: 'line', source: 'osm-pistes',
      paint: { 'line-color': 'rgba(255,255,255,0.9)', 'line-width': 7, 'line-opacity': 0.85 }
    }, before);
  }
  if (!map.getLayer('osm-pistes-line')) {
    map.addLayer({
      id: 'osm-pistes-line', type: 'line', source: 'osm-pistes',
      paint: {
        'line-color': ['coalesce', ['get', '_color'], '#2196F3'],
        'line-width': 4,
        'line-opacity': 1
      }
    }, before);
  }
  if (!map.getLayer('osm-pistes-label')) {
    map.addLayer({
      id: 'osm-pistes-label', type: 'symbol', source: 'osm-pistes',
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name'], ['get', 'piste:name'], ['get', 'ref'], ''],
        'text-size': 11,
        'text-font': ['Noto Sans Bold'],
        'text-max-angle': 45,
        'text-offset': [0, -1.2]
      },
      paint: {
        'text-color': ['coalesce', ['get', '_color'], '#1565C0'],
        'text-halo-color': 'rgba(255,255,255,0.95)',
        'text-halo-width': 2
      }
    }, before);
  }

  // ── Aerialways ───────────────────────────────────────────────
  const aerialFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: aerials };
  upsertSource(map, 'osm-aerials', aerialFC);

  // Support cable — thin black dashes (the rope)
  if (!map.getLayer('osm-aerials-cable')) {
    map.addLayer({
      id: 'osm-aerials-cable', type: 'line', source: 'osm-aerials',
      paint: {
        'line-color': '#333',
        'line-width': 1,
        'line-dasharray': [6, 3],
        'line-opacity': 0.7
      }
    }, before);
  }
  // Coloured overlay for type-based width
  if (!map.getLayer('osm-aerials-line')) {
    map.addLayer({
      id: 'osm-aerials-line', type: 'line', source: 'osm-aerials',
      paint: {
        'line-color': '#BF360C',
        'line-width': ['coalesce', ['get', '_width'], 2],
        'line-opacity': 0.85
      }
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
        'text-color': '#BF360C',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 1.5
      }
    }, before);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function upsertSource(map: maplibregl.Map, id: string, data: GeoJSON.FeatureCollection) {
  if (!map.getSource(id)) {
    map.addSource(id, { type: 'geojson', data });
  } else {
    (map.getSource(id) as maplibregl.GeoJSONSource).setData(data);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
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

/** Force-refresh OSM cache (e.g. from dev tools) */
export function clearOsmCache(): void {
  localStorage.removeItem(CACHE_KEY);
}
