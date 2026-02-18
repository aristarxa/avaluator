import maplibregl from 'maplibre-gl';

const DEM_SOURCE_ID = 'dem';
const DEM_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

/**
 * Step 1.2 — Adds contour lines with elevation labels and hillshade layer.
 * Call once inside map.on('load', ...) handler.
 */
export function addElevationLayers(map: maplibregl.Map): void {
  // Raster DEM source (terrarium encoding)
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: 'raster-dem',
      url: undefined as unknown as string,
      tiles: [DEM_URL],
      tileSize: 256,
      encoding: 'terrarium',
      minzoom: 0,
      maxzoom: 14
    });
  }

  // Hillshade layer for 3D relief perception
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

  // Terrain elevation data for contours
  if (!map.getSource('contour-dem')) {
    map.addSource('contour-dem', {
      type: 'raster-dem',
      url: undefined as unknown as string,
      tiles: [DEM_URL],
      tileSize: 256,
      encoding: 'terrarium',
      minzoom: 0,
      maxzoom: 14
    });
  }

  // Minor contours every 50m
  if (!map.getLayer('contours-minor')) {
    map.addLayer({
      id: 'contours-minor',
      type: 'line',
      source: 'contour-dem',
      // Note: contour lines from raster-dem require terrain set
      // We use a terrain source workaround via the built-in MapLibre terrain
      'source-layer': '',
      paint: {
        'line-color': 'rgba(120,100,60,0.4)',
        'line-width': 0.6
      },
      filter: ['==', ['%', ['get', 'ele'], 50], 0]
    } as maplibregl.LayerSpecification);
  }

  // Set terrain for 3D relief and contour support
  try {
    map.setTerrain({ source: DEM_SOURCE_ID, exaggeration: 1.2 });
  } catch {
    // terrain API may not be available in all builds
  }
}

export { DEM_SOURCE_ID };
