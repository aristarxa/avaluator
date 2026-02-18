import maplibregl from 'maplibre-gl';

export const DEM_SOURCE_ID = 'dem';
export const DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * Adds hillshade + real contour lines via maplibre-contour.
 * Call once inside map.on('load', ...).
 */
export async function addElevationLayers(map: maplibregl.Map): Promise<void> {
  // Raster DEM source for hillshade & terrain
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

  // Hillshade layer
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

  // 3-D terrain exaggeration
  try {
    map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.2 });
  } catch { /* not all builds support setTerrain */ }

  // Contour lines via maplibre-contour
  try {
    // Named import — maplibre-contour exports DemSource as named export
    const mlcontour = await import('maplibre-contour');
    const DemSource = mlcontour.DemSource ?? (mlcontour as unknown as { default: { DemSource: unknown } }).default?.DemSource;
    if (!DemSource) throw new Error('DemSource not found in maplibre-contour');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const demSource = new (DemSource as any)({
      url: DEM_TILES_URL,
      encoding: 'terrarium',
      maxzoom: 14,
      worker: true,
      cacheSize: 100
    });

    demSource.setupMaplibre(maplibregl);

    if (!map.getSource('contour-source')) {
      map.addSource('contour-source', demSource.contourSource({
        overzoom: 1,
        thresholds: {
          11: [200, 1000],
          12: [100, 500],
          13: [50,  200],
          14: [25,  100]
        },
        elevationKey: 'ele',
        levelKey:     'level',
        contourLayer: 'contours'
      }));
    }

    // Minor contours
    if (!map.getLayer('contours-minor')) {
      map.addLayer({
        id: 'contours-minor',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['==', ['get', 'level'], 0],
        paint: { 'line-color': 'rgba(140,110,60,0.45)', 'line-width': 0.7 }
      });
    }

    // Major contours
    if (!map.getLayer('contours-major')) {
      map.addLayer({
        id: 'contours-major',
        type: 'line',
        source: 'contour-source',
        'source-layer': 'contours',
        filter: ['==', ['get', 'level'], 1],
        paint: { 'line-color': 'rgba(120,90,40,0.70)', 'line-width': 1.4 }
      });
    }

    // Elevation labels
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
    console.warn('[Avalancher] maplibre-contour unavailable, contours disabled:', err);
  }
}
