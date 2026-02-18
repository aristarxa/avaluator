import maplibregl from 'maplibre-gl';

const CACHE_KEY = 'osm_layers_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const KRASNAYA_POLYANA_BBOX = '43.60,40.00,43.75,40.10';

interface OsmCache {
  timestamp: number;
  geojson: GeoJSON.FeatureCollection;
}

function getCachedOsmData(): GeoJSON.FeatureCollection | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: OsmCache = JSON.parse(raw);
    if (Date.now() - cache.timestamp > CACHE_TTL_MS) return null;
    return cache.geojson;
  } catch { return null; }
}

function setCachedOsmData(geojson: GeoJSON.FeatureCollection): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), geojson }));
  } catch { /* storage full */ }
}

async function fetchOsmData(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:30];
(
  way["piste:type"](${KRASNAYA_POLYANA_BBOX});
  way["aerialway"](${KRASNAYA_POLYANA_BBOX});
  way["waterway"="stream"](${KRASNAYA_POLYANA_BBOX});
);
out geom;`;

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  const osmJson = await response.json();
  const osmtogeojson = (await import('osmtogeojson')).default;
  return osmtogeojson(osmJson) as GeoJSON.FeatureCollection;
}

/**
 * Adds OSM source+layer pairs.
 * beforeLayerId: if provided, all OSM layers are inserted BEFORE that layer
 * so slopes/drawing always render on top.
 */
function addOsmLayersToMap(
  map: maplibregl.Map,
  geojson: GeoJSON.FeatureCollection,
  beforeLayerId?: string
): void {
  const pistes: GeoJSON.Feature[]    = [];
  const aerialways: GeoJSON.Feature[] = [];
  const waterways: GeoJSON.Feature[]  = [];

  for (const f of geojson.features) {
    const t = (f.properties || {}) as Record<string, string>;
    if (t['piste:type'])          pistes.push(f);
    else if (t['aerialway'])      aerialways.push(f);
    else if (t['waterway'] === 'stream') waterways.push(f);
  }

  const add = (
    sourceId: string,
    features: GeoJSON.Feature[],
    lineColor: string,
    labelColor: string,
    labelField: string
  ) => {
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data: fc });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
    }

    const lineId  = `${sourceId}-line`;
    const labelId = `${sourceId}-label`;

    if (!map.getLayer(lineId)) {
      map.addLayer({
        id: lineId, type: 'line', source: sourceId,
        paint: { 'line-color': lineColor, 'line-width': 2, 'line-opacity': 0.8 }
      }, beforeLayerId);  // <-- INSERT BELOW slopes layer
    }
    if (!map.getLayer(labelId)) {
      map.addLayer({
        id: labelId, type: 'symbol', source: sourceId,
        layout: {
          'symbol-placement': 'line',
          'text-field': ['coalesce', ['get', labelField], ['get', 'name'], ''],
          'text-size': 11,
          'text-font': ['Open Sans Regular'],
          'text-max-angle': 45,
          'text-offset': [0, -1]
        },
        paint: {
          'text-color': labelColor,
          'text-halo-color': 'rgba(255,255,255,0.9)',
          'text-halo-width': 1.5
        }
      }, beforeLayerId);  // <-- INSERT BELOW slopes layer
    }
  };

  add('osm-pistes',    pistes,    '#1565C0', '#1565C0', 'piste:name');
  add('osm-aerialways',aerialways,'#E65100', '#E65100', 'name');
  add('osm-waterways', waterways, '#0277BD', '#0277BD', 'name');
}

export async function loadOsmLayers(
  map: maplibregl.Map,
  beforeLayerId?: string   // pass 'slopes-fill' so OSM goes under slopes
): Promise<void> {
  try {
    let geojson = getCachedOsmData();
    if (!geojson) {
      geojson = await fetchOsmData();
      setCachedOsmData(geojson);
    }
    addOsmLayersToMap(map, geojson, beforeLayerId);
  } catch (err) {
    console.warn('[Avalancher] Failed to load OSM layers:', err);
  }
}
