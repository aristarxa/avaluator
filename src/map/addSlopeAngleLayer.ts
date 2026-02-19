import maplibregl from 'maplibre-gl';

/**
 * Slope-angle overlay — OsmAnd Slope raster tiles.
 *
 * Source: tile.osmand.net/hd/slope/{z}/{x}/{y}.png
 *   - Free, no API key required
 *   - CORS enabled
 *   - Real degree-accurate slope colouring (CalTopo-compatible palette)
 *
 * Avalanche colour palette:
 *   transparent    < 27°  safe
 *   white          27–29°  caution start
 *   green          30–34°  moderate
 *   yellow         34–38°  elevated
 *   orange/red     38–45°  critical (peak avalanche release zone)
 *   violet         45–50°  very steep
 *   blue           50°+    extreme
 *
 * Layer is inserted BEFORE contour lines so labels/numbers stay on top.
 */

const SOURCE_ID = 'osmand-slope-source';
const LAYER_ID  = 'osmand-slope-layer';

// OsmAnd tile servers (round-robin load balancing)
const TILE_URLS = [
  'https://tile.osmand.net/hd/slope/{z}/{x}/{y}.png'
];

const ATTRIBUTION =
  '© <a href="https://osmand.net" target="_blank">OsmAnd</a>';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      tiles: TILE_URLS,
      tileSize: 256,
      minzoom: 4,
      maxzoom: 19,
      attribution: ATTRIBUTION
    });
  }

  if (!map.getLayer(LAYER_ID)) {
    // Insert before contour lines so elevation labels stay on top
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
          'raster-opacity': 0.75,
          'raster-fade-duration': 200
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
