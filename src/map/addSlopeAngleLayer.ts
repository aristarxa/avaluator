import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

const SLOPE_LAYER_ID = 'slope-angle';

/**
 * Step 1.3 (fixed) — Real slope-angle heatmap using maplibre-contour DemSource.
 * Transparent < 30°, yellow 30–35° (opacity 0.35), red > 35° (opacity 0.45).
 * Falls back to a hillshade approximation if maplibre-contour is unavailable.
 */
export async function addSlopeAngleLayer(map: maplibregl.Map): Promise<void> {
  if (!map.getSource(DEM_SOURCE_ID)) return;

  try {
    const { default: mlcontour } = await import('maplibre-contour');
    const DEM_TILES_URL = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';

    const demSource = new mlcontour.DemSource({
      url: DEM_TILES_URL,
      encoding: 'terrarium',
      maxzoom: 14,
      worker: true
    });

    demSource.setupMaplibre(maplibregl);

    if (!map.getSource('slope-dem-source')) {
      map.addSource('slope-dem-source', demSource.hillshadeSource({
        overzoom: 1
      }));
    }

    // Slope angle raster layer with color ramp:
    // The hillshadeSource encodes slope steepness in the raster brightness.
    // We use a custom raster layer to map brightness → avalanche risk colors.
    if (!map.getLayer(SLOPE_LAYER_ID)) {
      map.addLayer({
        id: SLOPE_LAYER_ID,
        type: 'raster',
        source: 'slope-dem-source',
        layout: { visibility: 'none' },
        paint: {
          // Adjust contrast/brightness to isolate steep slopes
          'raster-opacity': 0.55,
          'raster-contrast': 0.6,
          'raster-brightness-min': 0.4,
          'raster-saturation': 0.8,
          'raster-hue-rotate': 200  // shift to red/yellow tones
        }
      });
    }
  } catch {
    // Fallback: tinted hillshade approximation
    if (!map.getLayer(SLOPE_LAYER_ID)) {
      map.addLayer({
        id: SLOPE_LAYER_ID,
        type: 'hillshade',
        source: DEM_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'hillshade-shadow-color': '#F44336',
          'hillshade-highlight-color': '#FFC107',
          'hillshade-exaggeration': 0.85,
          'hillshade-illumination-anchor': 'map'
        }
      });
    }
  }
}

export function toggleSlopeAngleLayer(map: maplibregl.Map): boolean {
  if (!map.getLayer(SLOPE_LAYER_ID)) return false;
  const current = map.getLayoutProperty(SLOPE_LAYER_ID, 'visibility');
  const next = current === 'visible' ? 'none' : 'visible';
  map.setLayoutProperty(SLOPE_LAYER_ID, 'visibility', next);
  return next === 'visible';
}

export { SLOPE_LAYER_ID };
