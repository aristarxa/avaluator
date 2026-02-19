import maplibregl from 'maplibre-gl';
import { DEM_SOURCE_ID } from './addElevationLayers';

/**
 * Slope-angle overlay — reuses the shared 'dem' raster-dem source
 * already added by addElevationLayers().
 *
 * Rendered as a second hillshade layer with high exaggeration and
 * avalanche-palette colours. Inserted BEFORE contour lines so that
 * labels and numbers stay on top at all times.
 *
 * No extra network requests — no new source, no proxy needed.
 */

const LAYER_ID = 'slope-hillshade-layer';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  // DEM source must already exist (addElevationLayers called first)
  if (!map.getSource(DEM_SOURCE_ID)) {
    console.warn('[Avalancher] slope layer: DEM source not ready, skipping');
    return;
  }

  if (!map.getLayer(LAYER_ID)) {
    // Always insert before contour lines so labels/numbers remain on top
    const beforeId = map.getLayer('contours-minor') ? 'contours-minor' : undefined;

    map.addLayer(
      {
        id: LAYER_ID,
        type: 'hillshade',
        source: DEM_SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          // Red = steep/dangerous, green = gentle, orange = mid
          'hillshade-shadow-color':         '#C62828',
          'hillshade-highlight-color':      '#A5D6A7',
          'hillshade-accent-color':         '#FF6F00',
          'hillshade-exaggeration':         1.0,
          'hillshade-illumination-direction': 315,
          'hillshade-illumination-anchor':  'map'
        }
      },
      beforeId
    );
  }
}

export function toggleSlopeAngleLayer(map: maplibregl.Map): boolean {
  if (!map.getLayer(LAYER_ID)) return false;
  const current = (map.getLayoutProperty(LAYER_ID, 'visibility') ?? 'none') as string;
  const next = current === 'visible' ? 'none' : 'visible';
  map.setLayoutProperty(LAYER_ID, 'visibility', next);
  return next === 'visible';
}

export const SLOPE_LAYER_ID = LAYER_ID;
