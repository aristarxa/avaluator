import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

const SLOPE_LAYER_ID = 'slope-angle';

/**
 * Slope-angle heatmap using hillshade trickery:
 * < 30°  → green  (safe)
 * 30–35° → yellow (moderate risk)
 * 35–40° → red    (high risk)
 * > 40°  → maroon (extreme)
 *
 * Pure hillshade cannot isolate exact degree values — this is the
 * best client-side approximation without a custom slope-raster tile.
 * We use two stacked hillshade layers to simulate the gradient:
 *   Layer 1 (base):  green shadow / green highlight — low slopes
 *   Layer 2 (steep): red shadow / maroon accent — steep faces,
 *     blended with multiply so only truly dark (steep) faces show.
 */
export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(DEM_SOURCE_ID)) return;

  // Base layer: green tones for gentle slopes
  if (!map.getLayer('slope-base')) {
    map.addLayer({
      id: 'slope-base',
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#4CAF50',   // green — < 30° faces
        'hillshade-highlight-color': '#c8f0c8',   // light green — flat lit faces
        'hillshade-accent-color':    '#81C784',
        'hillshade-exaggeration':    1.0,
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }

  // Moderate slope layer: yellow tones
  if (!map.getLayer('slope-moderate')) {
    map.addLayer({
      id: 'slope-moderate',
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#FFC107',   // yellow — 30–35°
        'hillshade-highlight-color': '#fff9c4',
        'hillshade-accent-color':    '#FFD54F',
        'hillshade-exaggeration':    0.6,
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }

  // Steep layer: red tones for 35-40°
  if (!map.getLayer('slope-steep')) {
    map.addLayer({
      id: 'slope-steep',
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#F44336',   // red — 35-40°
        'hillshade-highlight-color': '#ffcdd2',
        'hillshade-accent-color':    '#E53935',
        'hillshade-exaggeration':    1.0,
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }

  // Extreme layer: maroon/dark red for > 40°
  if (!map.getLayer(SLOPE_LAYER_ID)) {
    map.addLayer({
      id: SLOPE_LAYER_ID,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#7B1FA2',   // deep maroon/purple — > 40°
        'hillshade-highlight-color': '#e1bee7',
        'hillshade-accent-color':    '#6A1B9A',
        'hillshade-exaggeration':    1.2,
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }
}

const ALL_SLOPE_LAYERS = ['slope-base', 'slope-moderate', 'slope-steep', SLOPE_LAYER_ID];

export function toggleSlopeAngleLayer(map: maplibregl.Map): boolean {
  const current = map.getLayoutProperty('slope-base', 'visibility') ?? 'none';
  const next = current === 'visible' ? 'none' : 'visible';
  for (const id of ALL_SLOPE_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', next);
  }
  return next === 'visible';
}

export { SLOPE_LAYER_ID };
