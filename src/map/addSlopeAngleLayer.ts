import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

const SLOPE_LAYER_ID = 'slope-angle';

/**
 * Slope-angle heatmap using stacked hillshade layers.
 *
 * MapLibre clamps hillshade-exaggeration to [0, 1].
 * We simulate relative intensity through layer order + exaggeration:
 *
 *   slope-base     green   exaggeration 0.5  — gentle <30°
 *   slope-moderate yellow  exaggeration 0.6  — moderate 30-35°
 *   slope-steep    red     exaggeration 0.8  — steep 35-40°
 *   slope-angle    maroon  exaggeration 1.0  — extreme >40° (max allowed)
 */
export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(DEM_SOURCE_ID)) return;

  const layers: [string, string, string, string, number][] = [
    ['slope-base',     '#4CAF50', '#c8f0c8', '#81C784', 0.5],
    ['slope-moderate', '#FFC107', '#fff9c4', '#FFD54F', 0.6],
    ['slope-steep',    '#F44336', '#ffcdd2', '#E53935', 0.8],
    ['slope-angle',    '#880E4F', '#f8bbd9', '#6A1B9A', 1.0],  // was 1.2 — capped to 1
  ];

  for (const [id, shadow, highlight, accent, exaggeration] of layers) {
    if (map.getLayer(id)) continue;
    map.addLayer({
      id,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'hillshade-shadow-color':           shadow,
        'hillshade-highlight-color':        highlight,
        'hillshade-accent-color':           accent,
        'hillshade-exaggeration':           exaggeration,
        'hillshade-illumination-anchor':    'map',
        'hillshade-illumination-direction': 335
      }
    });
  }
}

const ALL_SLOPE_LAYERS = ['slope-base', 'slope-moderate', 'slope-steep', SLOPE_LAYER_ID];

export function toggleSlopeAngleLayer(map: maplibregl.Map): boolean {
  const current = map.getLayer('slope-base')
    ? (map.getLayoutProperty('slope-base', 'visibility') ?? 'none')
    : 'none';
  const next = current === 'visible' ? 'none' : 'visible';
  for (const id of ALL_SLOPE_LAYERS) {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', next);
  }
  return next === 'visible';
}

export { SLOPE_LAYER_ID };
