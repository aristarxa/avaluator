import maplibregl from 'maplibre-gl';

/**
 * Slope-angle layer using Terrain RGB DEM + MapLibre hillshade.
 *
 * Source: AWS Terrarium elevation tiles (s3.amazonaws.com/elevation-tiles-prod)
 *   - Completely free, public domain, CORS enabled
 *   - Resolution: up to zoom 15 (~4 m/pixel)
 *
 * Rendering: MapLibre `hillshade` layer type which uses raster-dem
 *   natively — no proxy, no CORS issues, works in dev and prod.
 *
 * Avalanche colour palette (approximate via hillshade shadow/highlight):
 *   The hillshade layer visualises the steepness/relief of the terrain.
 *   For full degree-accurate slope colouring, a raster-color source
 *   with a compute shader is required (MapLibre 5+).
 *
 * Colour tweaks:
 *   shadow-color  → red tones  (steep, dangerous)
 *   highlight-color → green tones (gentle slopes)
 *   exaggeration  → 1.0 makes relief prominent
 */

const DEM_SOURCE_ID  = 'terrarium-dem';
const LAYER_ID       = 'slope-hillshade-layer';

const TERRARIUM_TILES = [
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
];

const ATTRIBUTION =
  '© <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Terrain Tiles / AWS</a>';

export function addSlopeAngleLayer(map: maplibregl.Map): void {
  if (!map.getSource(DEM_SOURCE_ID)) {
    map.addSource(DEM_SOURCE_ID, {
      type: 'raster-dem',
      tiles: TERRARIUM_TILES,
      tileSize: 256,
      minzoom: 0,
      maxzoom: 15,
      encoding: 'terrarium',
      attribution: ATTRIBUTION
    });
  }

  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: 'hillshade',
      source: DEM_SOURCE_ID,
      layout: { visibility: 'none' },
      paint: {
        // Shadow = steep/dangerous slopes → red
        'hillshade-shadow-color': '#C62828',
        // Highlight = gentle slopes → light green
        'hillshade-highlight-color': '#A5D6A7',
        // Accent = mid slopes → orange
        'hillshade-accent-color': '#FF6F00',
        // Strong exaggeration to make steep vs flat obvious
        'hillshade-exaggeration': 1.0,
        // Sun from NW — standard cartographic convention
        'hillshade-illumination-direction': 315,
        'hillshade-illumination-anchor': 'map'
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
