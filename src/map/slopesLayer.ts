import maplibregl from 'maplibre-gl';
import type { SlopePolygon, RiskColor } from '../types';

const SLOPES_SOURCE      = 'slopes';
const SLOPES_FILL_LAYER  = 'slopes-fill';
const SLOPES_LINE_LAYER  = 'slopes-line';
const SLOPES_LABEL_LAYER = 'slopes-label';

const COLOR_MAP: Record<RiskColor, string> = {
  gray:   '#808080',
  green:  '#4CAF50',
  yellow: '#FFC107',
  red:    '#F44336'
};

/**
 * Always returns a properly closed ring.
 * Avoids float-precision comparison — just always appends first point.
 * MapLibre/GeoJSON spec requires first === last; duplicates are harmless.
 */
function closedRing(coords: [number, number][]): [number, number][] {
  if (coords.length < 3) return coords;
  return [...coords, coords[0]];  // always close — GeoJSON spec requires it
}

function slopesToGeoJSON(slopes: SlopePolygon[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: slopes
      .filter(s => s.coordinates.length >= 3)
      .map(slope => {
        // Coordinates from DrawingTool are [lng, lat] — correct for GeoJSON.
        // But if stored coordinates are already closed (first===last), strip the
        // duplicate before re-closing, to avoid invalid rings.
        let coords = slope.coordinates as [number, number][];
        const first = coords[0];
        const last  = coords[coords.length - 1];
        if (
          first && last &&
          Math.abs(first[0] - last[0]) < 1e-10 &&
          Math.abs(first[1] - last[1]) < 1e-10
        ) {
          coords = coords.slice(0, -1);  // strip already-closed point
        }

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Polygon' as const,
            coordinates: [closedRing(coords)]
          },
          properties: {
            id:     slope.id,
            name:   slope.name || '',
            color:  COLOR_MAP[slope.color] ?? COLOR_MAP.gray,
            resort: slope.resort ?? ''
          }
        };
      })
  };
}

export function initSlopesLayer(map: maplibregl.Map): void {
  if (!map.getSource(SLOPES_SOURCE)) {
    map.addSource(SLOPES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }

  if (!map.getLayer(SLOPES_FILL_LAYER)) {
    map.addLayer({
      id: SLOPES_FILL_LAYER,
      type: 'fill',
      source: SLOPES_SOURCE,
      paint: {
        'fill-color':   ['get', 'color'],
        'fill-opacity': 0.35
      }
    });
  }

  if (!map.getLayer(SLOPES_LINE_LAYER)) {
    map.addLayer({
      id: SLOPES_LINE_LAYER,
      type: 'line',
      source: SLOPES_SOURCE,
      paint: {
        'line-color':   ['get', 'color'],
        'line-width':   2.5,
        'line-opacity': 1
      }
    });
  }

  if (!map.getLayer(SLOPES_LABEL_LAYER)) {
    map.addLayer({
      id: SLOPES_LABEL_LAYER,
      type: 'symbol',
      source: SLOPES_SOURCE,
      layout: {
        'text-field':     ['get', 'name'],
        'text-size':      12,
        'text-font':      ['Open Sans Regular'],
        'text-anchor':    'center',
        'text-max-width': 10
      },
      paint: {
        'text-color':      '#1a1a2e',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 2
      }
    });
  }
}

export function renderSlopes(map: maplibregl.Map, slopes: SlopePolygon[]): void {
  const source = map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!source) return;
  source.setData(slopesToGeoJSON(slopes));
}

export function onSlopeClick(
  map: maplibregl.Map,
  callback: (slope: SlopePolygon) => void,
  getSlopesRef: () => SlopePolygon[]
): void {
  map.on('click', SLOPES_FILL_LAYER, (e) => {
    if (!e.features?.length) return;
    const id = e.features[0].properties?.id as string | undefined;
    if (!id) return;
    const slope = getSlopesRef().find(s => s.id === id);
    if (slope) {
      e.originalEvent.stopPropagation();  // prevent DrawingTool from also receiving click
      callback(slope);
    }
  });

  map.on('mouseenter', SLOPES_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', SLOPES_FILL_LAYER, () => { map.getCanvas().style.cursor = ''; });
}
