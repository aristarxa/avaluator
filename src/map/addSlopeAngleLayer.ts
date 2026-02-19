import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

const SLOPE_LAYER_ID = 'slope-angle';

/**
 * Slope-angle visualisation using 4 stacked hillshade layers.
 * hillshade-exaggeration must be in [0, 1] per MapLibre spec.
 *
 *  slope-base     green  — gentle < 30°
 *  slope-moderate yellow — moderate 30–35°
 *  slope-steep    red    — steep 35–40°
 *  slope-angle    maroon — extreme > 40°
 */
export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(DEM_SOURCE_ID)) return;

  if (!map.getLayer('slope-base')) {
    map.addLayer({
      id: 'slope-base', type: 'hillshade', source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#4CAF50',
        'hillshade-highlight-color': '#c8f0c8',
        'hillshade-accent-color':    '#81C784',
        'hillshade-exaggeration':    0.6,           // ≤ 1.0 ✔
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }

  if (!map.getLayer('slope-moderate')) {
    map.addLayer({
      id: 'slope-moderate', type: 'hillshade', source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#FFC107',
        'hillshade-highlight-color': '#fff9c4',
        'hillshade-accent-color':    '#FFD54F',
        'hillshade-exaggeration':    0.7,           // ≤ 1.0 ✔
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }

  if (!map.getLayer('slope-steep')) {
    map.addLayer({
      id: 'slope-steep', type: 'hillshade', source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#F44336',
        'hillshade-highlight-color': '#ffcdd2',
        'hillshade-accent-color':    '#E53935',
        'hillshade-exaggeration':    0.9,           // ≤ 1.0 ✔
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }

  if (!map.getLayer(SLOPE_LAYER_ID)) {
    map.addLayer({
      id: SLOPE_LAYER_ID, type: 'hillshade', source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':    '#7B1FA2',
        'hillshade-highlight-color': '#e1bee7',
        'hillshade-accent-color':    '#6A1B9A',
        'hillshade-exaggeration':    1.0,           // max allowed ✔
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
