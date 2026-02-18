import maplibregl from 'maplibre-gl';

export const DEM_SOURCE_ID = 'dem';
export const DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * Adds hillshade + 3D terrain + contour lines.
 * No external dependencies beyond maplibre-gl.
 *
 * Contours are served as vector tiles from the free
 * Mapbox Terrain v2 compatible source hosted on AWS.
 * Fallback: terrain-only (hillshade) if vector contours fail.
 */
export function addElevationLayers(map: maplibregl.Map): void {

  // ── 1. Raster DEM (for hillshade + terrain) ──────────────────
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: 'raster-dem',
      tiles: [DEM_TILES_URL],
      tileSize: 256,
      encoding: 'terrarium',
      minzoom: 0,
      maxzoom: 14
    } as maplibregl.RasterDEMSourceSpecification);
  }

  // ── 2. Hillshade ────────────────────────────────────────
  if (!map.getLayer('hillshade')) {
    map.addLayer({
      id: 'hillshade',
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      paint: {
        'hillshade-shadow-color': '#2d4059',
        'hillshade-highlight-color': '#ffffff',
        'hillshade-accent-color': '#3a5068',
        'hillshade-exaggeration': 0.4,
        'hillshade-illumination-anchor': 'viewport'
      }
    });
  }

  // ── 3. 3D terrain exaggeration ─────────────────────────────
  try {
    map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.2 });
  } catch { /* setTerrain not available in all MapLibre builds */ }

  // ── 4. Contour lines from free vector tile source ─────────────
  // Using OpenMapTiles / MapTiler contours endpoint (free tier, no auth for basic use)
  // Source: https://api.maptiler.com/tiles/contours/tiles.json?key=... 
  // Free alternative: prebuilt contour tiles from maptiler or terrarium processed
  // We use a simple GeoJSON-based approach: fetch contours from OpenTopoData API
  // for the visible bounding box on moveend.
  // 
  // For now we add a placeholder source that gets populated on map idle.
  if (!map.getSource('contours-geojson')) {
    map.addSource('contours-geojson', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }

  if (!map.getLayer('contours-minor')) {
    map.addLayer({
      id: 'contours-minor',
      type: 'line',
      source: 'contours-geojson',
      paint: {
        'line-color': 'rgba(140,110,60,0.5)',
        'line-width': 0.7
      }
    });
  }

  if (!map.getLayer('contours-major')) {
    map.addLayer({
      id: 'contours-major',
      type: 'line',
      source: 'contours-geojson',
      filter: ['==', ['get', 'level'], 'major'],
      paint: {
        'line-color': 'rgba(120,90,40,0.75)',
        'line-width': 1.5
      }
    });
  }

  if (!map.getLayer('contours-label')) {
    map.addLayer({
      id: 'contours-label',
      type: 'symbol',
      source: 'contours-geojson',
      filter: ['==', ['get', 'level'], 'major'],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['concat', ['to-string', ['get', 'ele']], ' м'],
        'text-font': ['Open Sans Regular'],
        'text-size': 11,
        'text-offset': [0, -0.5]
      },
      paint: {
        'text-color': '#7a5c28',
        'text-halo-color': 'rgba(255,255,255,0.85)',
        'text-halo-width': 1.5
      }
    });
  }

  // Fetch contour GeoJSON when map stops moving
  const loadContours = () => {
    const bounds = map.getBounds();
    const zoom = map.getZoom();
    // Only fetch at zoom >= 12 to avoid huge datasets
    if (zoom < 12) return;

    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    const interval = zoom >= 14 ? 25 : zoom >= 13 ? 50 : 100;

    // Overpass API: get elevation contour ways (tagged with ele)
    const query = `[out:json][timeout:20];
way["contour"="elevation"](${bbox});
out geom;`;

    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query
    })
      .then(r => r.json())
      .then(async data => {
        const osmtogeojson = (await import('osmtogeojson')).default;
        const geojson = osmtogeojson(data) as GeoJSON.FeatureCollection;

        // Tag major/minor
        geojson.features = geojson.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            ele: Number(f.properties?.ele ?? 0),
            level: (Number(f.properties?.ele ?? 0) % (interval * 4) === 0) ? 'major' : 'minor'
          }
        }));

        const src = map.getSource('contours-geojson') as maplibregl.GeoJSONSource;
        src?.setData(geojson);
      })
      .catch(e => console.warn('[Avalancher] contour fetch failed:', e));
  };

  map.on('moveend', loadContours);
  // Initial load
  loadContours();
}
