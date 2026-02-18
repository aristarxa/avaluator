import maplibregl from 'maplibre-gl';

export const DEM_SOURCE_ID = 'dem';
const DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * Step 1.2 — Adds real contour lines (via maplibre-contour) + hillshade.
 * maplibre-contour computes isolines from raster DEM in the browser.
 * Call once inside map.on('load', ...).
 */
export async function addElevationLayers(map: maplibregl.Map): Promise<void> {
  // ── Raster DEM source ────────────────────────────────────────────
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

  // ── Hillshade (3-D relief) ───────────────────────────────────────
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

  // ── 3-D terrain ─────────────────────────────────────────────────
  try {
    map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.2 });
  } catch {
    // setTerrain not available in all builds
  }

  // ── Contour lines via maplibre-contour ──────────────────────────
  try {
    // Dynamic import so the app degrades gracefully if lib is absent
    const { default: mlcontour } = await import('maplibre-contour');

    const demSource = new mlcontour.DemSource({
      url: DEM_TILES_URL,
      encoding: 'terrarium',
      maxzoom: 14,
      worker: true
    });

    demSource.setupMaplibre(maplibregl);

    if (!map.getSource('contour-source')) {
      map.addSource('contour-source', demSource.contourSource({
        overzoom: 1,
        thresholds: {
          // zoom → contour interval (m)
          11: [200, 1000],
          12: [100, 500],
          13: [50, 200],
          14: [25, 100]
        },
        elevationKey: 'ele',
        levelKey: 'level',
        contourLayer: 'contours'
      }));
    }

    // Minor contours every 50 m
    if (!map.getLayer('contours-minor')) {
      map.addLayer({
        id: 'contours-minor',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['==', ['get', 'level'], 0],
        paint: {
          'line-color': 'rgba(140,110,60,0.45)',
          'line-width': 0.7
        }
      });
    }

    // Major contours (every 200 m) — thicker + labeled
    if (!map.getLayer('contours-major')) {
      map.addLayer({
        id: 'contours-major',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['==', ['get', 'level'], 1],
        paint: {
          'line-color': 'rgba(120,90,40,0.7)',
          'line-width': 1.4
        }
      });
    }

    // Elevation labels on major contours
    if (!map.getLayer('contours-label')) {
      map.addLayer({
        id: 'contours-label',
        type: 'symbol',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['==', ['get', 'level'], 1],
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
  } catch (err) {
    console.warn('maplibre-contour not available, contour lines disabled:', err);
  }
}
