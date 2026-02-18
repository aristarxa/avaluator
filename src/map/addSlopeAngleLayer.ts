import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

const SLOPE_LAYER_ID = 'slope-angle';

/**
 * Adds a toggleable slope-angle visualisation layer.
 * Uses the existing raster-dem hillshade source with tinted paint
 * to highlight steep avalanche-prone zones (approx 30-35° / >35°).
 *
 * NOTE: Pure-CSS hillshade can't precisely isolate exact degree values.
 * A pixel-accurate angle map requires a custom WebGL shader or a
 * server-side slope raster — this is the best client-only approximation
 * without a paid tile provider.
 */
export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(DEM_SOURCE_ID)) return;
  if (map.getLayer(SLOPE_LAYER_ID)) return;

  map.addLayer({
    id: SLOPE_LAYER_ID,
    type: 'hillshade',
    source: DEM_SOURCE_ID,
    layout: { visibility: 'none' },
    paint: {
      // Red shadows → steep faces, yellow highlights → moderate slopes
      'hillshade-shadow-color':    '#F44336',  // red  — steep >35°
      'hillshade-highlight-color': '#FFC107',  // yellow — 30-35°
      'hillshade-accent-color':    '#FF7043',
      'hillshade-exaggeration':    0.9,
      'hillshade-illumination-anchor': 'map',
      'hillshade-illumination-direction': 335
    }
  });
}

export function toggleSlopeAngleLayer(map: maplibregl.Map): boolean {
  if (!map.getLayer(SLOPE_LAYER_ID)) return false;
  const current = map.getLayoutProperty(SLOPE_LAYER_ID, 'visibility');
  const next = current === 'visible' ? 'none' : 'visible';
  map.setLayoutProperty(SLOPE_LAYER_ID, 'visibility', next);
  return next === 'visible';
}

export { SLOPE_LAYER_ID };
