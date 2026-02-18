import maplibregl from 'maplibre-gl';

const CACHE_KEY = 'osm_layers_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Krasnaya Polyana bounding box [south, west, north, east]
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
  } catch {
    return null;
  }
}

function setCachedOsmData(geojson: GeoJSON.FeatureCollection): void {
  try {
    const cache: OsmCache = { timestamp: Date.now(), geojson };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // storage might be full
  }
}

async function fetchOsmData(): Promise<GeoJSON.FeatureCollection> {
  const query = `[out:json][timeout:30];
(
  way["piste:type"](${KRASNAYA_POLYANA_BBOX});
  way["aerialway"](${KRASNAYA_POLYANA_BBOX});
  way["waterway"="stream"](${KRASNAYA_POLYANA_BBOX});
);
out geom;`;

  const url = 'https://overpass-api.de/api/interpreter';
  const response = await fetch(url, {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);

  const osmJson = await response.json();

  // Convert OSM JSON to GeoJSON using osmtogeojson
  const osmtogeojson = (await import('osmtogeojson')).default;
  return osmtogeojson(osmJson) as GeoJSON.FeatureCollection;
}

function addOsmLayersToMap(map: maplibregl.Map, geojson: GeoJSON.FeatureCollection): void {
  const pistes: GeoJSON.Feature[] = [];
  const aerialways: GeoJSON.Feature[] = [];
  const waterways: GeoJSON.Feature[] = [];

  for (const feature of geojson.features) {
    const tags = (feature.properties as Record<string, string | null | undefined>) || {};
    if (tags['piste:type']) pistes.push(feature);
    else if (tags['aerialway']) aerialways.push(feature);
    else if (tags['waterway'] === 'stream') waterways.push(feature);
  }

  const addLayerSafe = (
    sourceId: string,
    features: GeoJSON.Feature[],
    lineColor: string,
    labelField: string,
    labelColor: string
  ) => {
    const fc: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features };

    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, { type: 'geojson', data: fc });
    } else {
      (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(fc);
    }

    if (!map.getLayer(`${sourceId}-line`)) {
      map.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': lineColor,
          'line-width': 2,
          'line-opacity': 0.8
        }
      });
    }

    if (!map.getLayer(`${sourceId}-label`)) {
      map.addLayer({
        id: `${sourceId}-label`,
        type: 'symbol',
        source: sourceId,
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
      });
    }
  };

  addLayerSafe('osm-pistes', pistes, '#1565C0', 'piste:name', '#1565C0');
  addLayerSafe('osm-aerialways', aerialways, '#E65100', 'name', '#E65100');
  addLayerSafe('osm-waterways', waterways, '#0277BD', 'name', '#0277BD');
}

/**
 * Step 1.4 — Loads OSM data (pistes, aerialways, streams) and adds them as map layers.
 * Results are cached in localStorage for 24 hours.
 */
export async function loadOsmLayers(map: maplibregl.Map): Promise<void> {
  try {
    let geojson = getCachedOsmData();

    if (!geojson) {
      geojson = await fetchOsmData();
      setCachedOsmData(geojson);
    }

    addOsmLayersToMap(map, geojson);
  } catch (err) {
    console.warn('Failed to load OSM layers:', err);
    // Graceful degradation — app works without OSM data
  }
}
