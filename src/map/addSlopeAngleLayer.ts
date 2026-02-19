import maplibregl from 'maplibre-gl';
import { registerSlopeProtocol } from './slopeProtocol';

const SOURCE_ID = 'slope-source';
const LAYER_ID  = 'slope-layer';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (!apiKey) {
    console.warn('[Avalancher] VITE_MAPTILER_KEY not set — slope layer unavailable');
    return;
  }

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
          'raster-opacity':     0.75,
          'raster-fade-duration': 400,
          // Bilienar interpolation — smooths pixel edges when zooming in
          'raster-resampling': 'linear'
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
