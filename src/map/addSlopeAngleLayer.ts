import maplibregl from 'maplibre-gl';

/**
 * Slope-angle layer — OpenSlopeMap WMTS raster tiles.
 *
 * Colour scheme (standard avalanche palette):
 *   white          < 27°  safe
 *   yellow / green  27–30°  caution begin
 *   yellow          30–34°  moderate
 *   orange          34–38°  critical (most avalanches release here)
 *   red             38–45°  very steep
 *   violet / black  > 45°  extreme
 *
 * Tile URL pattern (TMS, no auth required):
 *   https://www.openslopemap.org/karten/gps/{z}/{x}/{y}.png
 *   (gps = global pseudo-mercator tile set)
 *
 * Attribution: © openslopemap.org, data © NASA/SRTM + Copernicus DEM
 */

const SOURCE_ID = 'openslopemap-source';
const LAYER_ID  = 'openslopemap-layer';

// Attribution shown in map corner
const ATTRIBUTION = '© <a href="https://www.openslopemap.org" target="_blank">OpenSlopeMap</a>';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      tiles: [
        'https://www.openslopemap.org/karten/gps/{z}/{x}/{y}.png'
      ],
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
        // Show at 70 % opacity so base map (roads, labels) stay visible
        'raster-opacity': 0.70,
        // Slight brightness boost — slope tiles are dark by default
        'raster-brightness-min': 0.05,
        // Fade-in on tile load
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

// Keep the old ID export so existing toggle-button code still compiles
export const SLOPE_LAYER_ID = LAYER_ID;
