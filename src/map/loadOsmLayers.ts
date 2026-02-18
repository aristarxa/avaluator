import maplibregl from 'maplibre-gl';

const CACHE_KEY    = 'osm_layers_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const BBOX         = '43.60,40.00,43.75,40.10';

interface OsmCache {
  timestamp: number;
  geojson: GeoJSON.FeatureCollection;
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
  const pistes: GeoJSON.Feature[]    = [];
  const aerials: GeoJSON.Feature[]   = [];
  const waters: GeoJSON.Feature[]    = [];

  for (const f of geojson.features) {
    const p = (f.properties || {}) as Record<string, string>;
    if (p['piste:type'])          pistes.push(f);
    else if (p['aerialway'])      aerials.push(f);
    else if (p['waterway'] === 'stream') waters.push(f);
  }

  // beforeLayerId is optional — if layer doesn't exist yet, insert without constraint
  const safeBeforeId = (id?: string) =>
    id && map.getLayer(id) ? id : undefined;

  const add = (
    srcId: string,
    features: GeoJSON.Feature[],
    color: string
  ) => {
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
    if (!map.getSource(srcId)) {
      map.addSource(srcId, { type: 'geojson', data: fc });
    } else {
      (map.getSource(srcId) as maplibregl.GeoJSONSource).setData(fc);
    }

    const before = safeBeforeId(beforeLayerId);

    if (!map.getLayer(`${srcId}-line`)) {
      map.addLayer({
        id: `${srcId}-line`, type: 'line', source: srcId,
        paint: { 'line-color': color, 'line-width': 2, 'line-opacity': 0.8 }
      }, before);
    }
    if (!map.getLayer(`${srcId}-label`)) {
      map.addLayer({
        id: `${srcId}-label`, type: 'symbol', source: srcId,
        layout: {
          'symbol-placement': 'line',
          // coalesce guards against null/missing name fields
          'text-field': ['coalesce', ['get', 'name'], ['get', 'piste:name'], ''],
          'text-size': 11,
          'text-font': ['Noto Sans Regular'],  // font available in OpenFreeMap liberty style
          'text-max-angle': 45,
          'text-offset': [0, -1]
        },
        paint: {
          'text-color': color,
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5
        }
      }, before);
    }
  };

  add('osm-pistes',    pistes,  '#1565C0');
  add('osm-aerials',  aerials, '#E65100');
  add('osm-waters',   waters,  '#0277BD');
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
    // After async fetch/cache read, slopes layer is guaranteed to exist
    applyOsm(map, geojson, beforeLayerId);
  } catch (err) {
    console.warn('[Avalancher] OSM load failed:', err);
  }
}
