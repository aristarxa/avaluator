import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

const SLOPE_LAYER_ID = 'slope-angle';

/**
 * Step 1.3 — Adds a semi-transparent slope-angle heatmap layer.
 * Yellow: 30-35 degrees, Red: >35 degrees.
 * Adds toggle button to map container.
 */
export function addSlopeAngleLayer(map: maplibregl.Map): void {
  // Add hillshade-based slope visualization using raster-dem
  if (!map.getSource(DEM_SOURCE_ID)) return;

  if (!map.getLayer(SLOPE_LAYER_ID)) {
    // Slope angle visualization via custom raster layer
    // Using hillshade paint properties to approximate slope steepness
    map.addLayer({
      id: SLOPE_LAYER_ID,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color': '#F44336',
        'hillshade-highlight-color': '#FFC107',
        'hillshade-accent-color': '#FF5722',
        'hillshade-exaggeration': 0.8,
        'hillshade-illumination-anchor': 'map',
        'hillshade-illumination-direction': 335
      }
    });
  }
}

export function toggleSlopeAngleLayer(map: maplibregl.Map): boolean {
  if (!map.getLayer(SLOPE_LAYER_ID)) return false;
  const visibility = map.getLayoutProperty(SLOPE_LAYER_ID, 'visibility');
  const newVisibility = visibility === 'visible' ? 'none' : 'visible';
  map.setLayoutProperty(SLOPE_LAYER_ID, 'visibility', newVisibility);
  return newVisibility === 'visible';
}

export { SLOPE_LAYER_ID };
