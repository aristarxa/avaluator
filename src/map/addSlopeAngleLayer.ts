import maplibregl from 'maplibre-gl';

/**
 * Slope-angle layer — OpenSlopeMap raster tiles proxied through Vite
 * to avoid CORS (openslopemap.org has no CORS headers).
 *
 * Dev + preview: Vite proxy  /tile-proxy/slope/{z}/{x}/{y}.png
 *                           → https://www.openslopemap.org/karten/gps/{z}/{x}/{y}.png
 *
 * Production (self-hosted): configure your reverse-proxy (nginx/caddy) to
 *   proxy_pass /tile-proxy/slope/ → https://www.openslopemap.org/karten/gps/
 *
 * Colour scheme (standard avalanche palette):
 *   white          < 27°  safe
 *   green           27–30°  caution begin
 *   yellow          30–34°  moderate
 *   orange          34–38°  critical
 *   red             38–45°  very steep
 *   violet/black    > 45°  extreme
 */

const SOURCE_ID = 'openslopemap-source';
const LAYER_ID  = 'openslopemap-layer';

const ATTRIBUTION = '© <a href="https://www.openslopemap.org" target="_blank">OpenSlopeMap</a>';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      // Proxied URL — no CORS issues in dev or prod (with reverse proxy)
      tiles: ['/tile-proxy/slope/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 7,
      maxzoom: 15,
      attribution: ATTRIBUTION
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
        'raster-brightness-min': 0.05,
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
