import maplibregl from 'maplibre-gl';

export const DEM_SOURCE_ID = 'dem';

/**
 * DEM source — MapTiler Terrain RGB v2.
 * - Works from Russia (no AWS S3 block)
 * - CORS enabled
 * - Same API key as base map (VITE_MAPTILER_KEY)
 */
function getDemTilesUrl(): string {
  const key = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (!key) {
    console.warn('[Avalancher] VITE_MAPTILER_KEY not set — DEM unavailable');
    return '';
  }
  return `https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${key}`;
}

// Throttle contour fetches: wait at least 2s after map stops
let contourTimer: ReturnType<typeof setTimeout> | null = null;
// Track last fetched bbox to avoid duplicate fetches
let lastBbox = '';

export function addElevationLayers(map: maplibregl.Map): void {
  const demUrl = getDemTilesUrl();
  if (!demUrl) return;

  // ── Raster DEM source (shared by hillshade + slope layer) ──────────────
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: 'raster-dem',
      tiles: [demUrl],
      tileSize: 256,
      encoding: 'mapbox',   // MapTiler terrain-rgb-v2 uses mapbox encoding
      minzoom: 0,
      maxzoom: 14
    } as maplibregl.RasterDEMSourceSpecification);
  }

  // ── Hillshade — inserted BEFORE contour lines so labels stay on top ────
  if (!map.getLayer('hillshade')) {
    // beforeId = first contour layer; falls back to undefined (append) if not yet added
    const beforeId = map.getLayer('contours-minor') ? 'contours-minor' : undefined;
    map.addLayer(
      {
        id: 'hillshade',
        type: 'hillshade',
        source: DEM_SOURCE_ID,
        paint: {
          'hillshade-shadow-color':         '#2d4059',
          'hillshade-highlight-color':      '#ffffff',
          'hillshade-accent-color':         '#3a5068',
          'hillshade-exaggeration':         0.4,
          'hillshade-illumination-anchor':  'viewport'
        }
      },
      beforeId
    );
  }

  // ── 3D terrain (separate source — MapLibre requires it for setTerrain) ──
  if (!map.getSource('dem-terrain')) {
    map.addSource('dem-terrain', {
      type: 'raster-dem',
      tiles: [demUrl],
      tileSize: 256,
      encoding: 'mapbox',
      minzoom: 0,
      maxzoom: 14
    } as maplibregl.RasterDEMSourceSpecification);
  }
  try { map.setTerrain({ source: 'dem-terrain', exaggeration: 1.2 }); } catch { /* ok */ }

  // ── Contour GeoJSON source + layers ─────────────────────────────────────
  if (!map.getSource('contours-geojson')) {
    map.addSource('contours-geojson', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }
  if (!map.getLayer('contours-minor')) {
    map.addLayer({
      id: 'contours-minor', type: 'line', source: 'contours-geojson',
      filter: ['==', ['get', 'level'], 'minor'],
      paint: { 'line-color': 'rgba(140,110,60,0.45)', 'line-width': 0.7 }
    });
  }
  if (!map.getLayer('contours-major')) {
    map.addLayer({
      id: 'contours-major', type: 'line', source: 'contours-geojson',
      filter: ['==', ['get', 'level'], 'major'],
      paint: { 'line-color': 'rgba(120,90,40,0.70)', 'line-width': 1.5 }
    });
  }
  if (!map.getLayer('contours-label')) {
    map.addLayer({
      id: 'contours-label', type: 'symbol', source: 'contours-geojson',
      filter: ['==', ['get', 'level'], 'major'],
      layout: {
        'symbol-placement': 'line',
        'text-field': ['concat', ['to-string', ['get', 'ele']], ' м'],
        'text-font': ['Noto Sans Regular'],
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

  // ── Throttled contour fetch (zoom ≥ 12, 2s debounce, dedup by bbox) ─────
  const fetchContours = () => {
    if (contourTimer) clearTimeout(contourTimer);
    contourTimer = setTimeout(async () => {
      const zoom = map.getZoom();
      if (zoom < 12) return;

      const b = map.getBounds();
      const bbox = [
        b.getSouth().toFixed(4), b.getWest().toFixed(4),
        b.getNorth().toFixed(4), b.getEast().toFixed(4)
      ].join(',');
      if (bbox === lastBbox) return;
      lastBbox = bbox;

      const interval = zoom >= 14 ? 25 : zoom >= 13 ? 50 : 100;
      const query = `[out:json][timeout:20];
way["contour"="elevation"](${bbox});
out geom;`;

      try {
        const r = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST', body: query
        });
        if (!r.ok) return;
        const data = await r.json();
        const osmtogeojson = (await import('osmtogeojson')).default;
        const geojson = osmtogeojson(data) as GeoJSON.FeatureCollection;
        geojson.features = geojson.features.map(f => ({
          ...f,
          properties: {
            ...f.properties,
            ele: Number(f.properties?.ele ?? 0),
            level: (Number(f.properties?.ele ?? 0) % (interval * 4) === 0) ? 'major' : 'minor'
          }
        }));
        (map.getSource('contours-geojson') as maplibregl.GeoJSONSource)?.setData(geojson);
      } catch { /* network error — ignore */ }
    }, 2000);
  };

  map.on('moveend', fetchContours);
}
