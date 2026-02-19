import maplibregl from 'maplibre-gl';

/**
 * Slope-angle layer — MapTiler Slope raster tiles.
 *
 * MapTiler Slope tiles use the standard avalanche colour palette:
 *   white          < 27°  safe
 *   green           27–30°  caution
 *   yellow          30–34°  moderate
 *   orange          34–38°  critical (most avalanche releases)
 *   red             38–45°  very steep
 *   violet/black    > 45°  extreme
 *
 * Requires VITE_MAPTILER_KEY in .env (same key used for base map).
 * CORS: MapTiler tiles have proper CORS headers — no proxy needed.
 */

const SOURCE_ID = 'maptiler-slope-source';
const LAYER_ID  = 'maptiler-slope-layer';

function getTileUrl(): string {
  const key = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (!key || key === 'your_maptiler_key_here') {
    console.warn('[Avalancher] VITE_MAPTILER_KEY not set — slope layer unavailable');
    return '';
  }
  return `https://api.maptiler.com/tiles/slope/{z}/{x}/{y}.png?key=${key}`;
}

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  const tileUrl = getTileUrl();
  if (!tileUrl) return;

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      tiles: [tileUrl],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 14,
      attribution: '© <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a>'
    });
  }

  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: 'raster',
      source: SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        'raster-opacity': 0.72,
        'raster-brightness-min': 0.02,
        'raster-fade-duration': 300
      }
    });
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
