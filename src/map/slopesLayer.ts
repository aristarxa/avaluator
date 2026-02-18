import maplibregl from 'maplibre-gl';
import type { SlopePolygon, RiskColor } from '../types';

const SLOPES_SOURCE = 'slopes';
const SLOPES_FILL_LAYER = 'slopes-fill';
const SLOPES_LINE_LAYER = 'slopes-line';
const SLOPES_LABEL_LAYER = 'slopes-label';

const COLOR_MAP: Record<RiskColor, string> = {
  gray:   '#808080',
  green:  '#4CAF50',
  yellow: '#FFC107',
  red:    '#F44336'
};

function closedRing(coords: [number, number][]): [number, number][] {
  if (coords.length < 2) return coords;
  const first = coords[0];
  const last  = coords[coords.length - 1];
  // Only add closing point if not already closed
  if (first[0] === last[0] && first[1] === last[1]) return coords;
  return [...coords, first];
}

function slopesToGeoJSON(slopes: SlopePolygon[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: slopes
      .filter(s => s.coordinates.length >= 3)  // skip invalid polygons
      .map(slope => ({
        type: 'Feature' as const,
        // Do NOT set Feature.id when using promoteId — causes conflict.
        // id is carried only in properties.
        geometry: {
          type: 'Polygon' as const,
          coordinates: [closedRing(slope.coordinates)]
        },
        properties: {
          id:     slope.id,
          name:   slope.name || '',
          color:  COLOR_MAP[slope.color] ?? COLOR_MAP.gray,
          resort: slope.resort ?? ''
        }
      }))
  };
}

export function initSlopesLayer(map: maplibregl.Map): void {
  if (!map.getSource(SLOPES_SOURCE)) {
    map.addSource(SLOPES_SOURCE, {
      type: 'geojson',
      // promoteId removed — caused conflict with Feature.id
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
        'fill-opacity': 0.4
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
        'line-width':   2,
        'line-opacity': 0.9
      }
    });
  }

  if (!map.getLayer(SLOPES_LABEL_LAYER)) {
    map.addLayer({
      id: SLOPES_LABEL_LAYER,
      type: 'symbol',
      source: SLOPES_SOURCE,
      layout: {
        'text-field':      ['get', 'name'],
        'text-size':       12,
        'text-font':       ['Open Sans Regular'],
        'text-anchor':     'center',
        'text-max-width':  10
      },
      paint: {
        'text-color':       '#1a1a2e',
        'text-halo-color':  'rgba(255,255,255,0.9)',
        'text-halo-width':  2
      }
    });
  }
}

export function renderSlopes(map: maplibregl.Map, slopes: SlopePolygon[]): void {
  if (!map.getSource(SLOPES_SOURCE)) return;
  const geojson = slopesToGeoJSON(slopes);
  (map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource).setData(geojson);
}

export function onSlopeClick(
  map: maplibregl.Map,
  callback: (slope: SlopePolygon) => void,
  getSlopesRef: () => SlopePolygon[]
): void {
  map.on('click', SLOPES_FILL_LAYER, (e) => {
    if (!e.features || e.features.length === 0) return;
    const id = e.features[0].properties?.id as string | undefined;
    if (!id) return;
    const slope = getSlopesRef().find(s => s.id === id);
    if (slope) callback(slope);
  });

  map.on('mouseenter', SLOPES_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', SLOPES_FILL_LAYER, () => { map.getCanvas().style.cursor = ''; });
}
