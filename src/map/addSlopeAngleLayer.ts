import maplibregl from 'maplibre-gl';
import { registerSlopeProtocol } from './slopeProtocol';

/**
 * Slope-angle overlay — fully client-side, no external tile server.
 *
 * Uses a custom MapLibre protocol "slope://" that:
 *   - Fetches MapTiler terrain-rgb-v2 tiles (same key as base map)
 *   - Decodes elevation via mapbox encoding
 *   - Computes slope angle with Sobel operator
 *   - Renders CalTopo-compatible avalanche colour palette
 *
 * Requires VITE_MAPTILER_KEY in .env
 */

const SOURCE_ID = 'slope-source';
const LAYER_ID  = 'slope-layer';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (!apiKey) {
    console.warn('[Avalancher] VITE_MAPTILER_KEY not set — slope layer unavailable');
    return;
  }

  // Register custom protocol once
  registerSlopeProtocol(apiKey);

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      tiles: ['slope://{z}/{x}/{y}'],
      tileSize: 256,
      minzoom: 6,
      maxzoom: 14,
      attribution: 'Slope — вычислено на клиенте • DEM: © MapTiler'
    });
  }

  if (!map.getLayer(LAYER_ID)) {
    const beforeId = (
      map.getLayer('contours-minor') ? 'contours-minor' :
      map.getLayer('contours-major') ? 'contours-major' :
      undefined
    );

    map.addLayer(
      {
        id: LAYER_ID,
        type: 'raster',
        source: SOURCE_ID,
        layout: { visibility: 'none' },
        paint: {
          'raster-opacity': 0.8,
          'raster-fade-duration': 300
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
