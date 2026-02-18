import maplibregl from 'maplibre-gl';
import type { SlopePolygon, RiskColor } from '../types';

export const SLOPES_SOURCE      = 'slopes';
export const SLOPES_FILL_LAYER  = 'slopes-fill';
export const SLOPES_LINE_LAYER  = 'slopes-line';
export const SLOPES_LABEL_LAYER = 'slopes-label';

export const COLOR_MAP: Record<RiskColor, string> = {
  gray:   '#808080',
  green:  '#4CAF50',
  yellow: '#FFC107',
  red:    '#F44336'
};

function buildRing(coords: [number, number][]): [number, number][] {
  if (coords.length < 3) return coords;
  const first = coords[0];
  const last  = coords[coords.length - 1];
  const closed =
    Math.abs(first[0] - last[0]) < 1e-9 &&
    Math.abs(first[1] - last[1]) < 1e-9;
  const open = closed ? coords.slice(0, -1) : coords;
  if (open.length < 3) return coords;
  return [...open, open[0]];
}

function slopesToGeoJSON(slopes: SlopePolygon[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: slopes
      .filter(s => Array.isArray(s.coordinates) && s.coordinates.length >= 3)
      .map(slope => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Polygon' as const,
          coordinates: [buildRing(slope.coordinates as [number, number][])]
        },
        properties: {
          id:     slope.id,
          // Guard against null/empty name to avoid MapLibre 'Expected number' error
          name:   slope.name && slope.name.length > 0 ? slope.name : '',
          color:  COLOR_MAP[slope.color] ?? COLOR_MAP.gray,
          resort: slope.resort ?? ''
        }
      }))
  };
}

function addLayers(map: maplibregl.Map): void {
  if (!map.getSource(SLOPES_SOURCE)) {
    map.addSource(SLOPES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] }
    });
  }
  if (!map.getLayer(SLOPES_FILL_LAYER)) {
    map.addLayer({
      id: SLOPES_FILL_LAYER, type: 'fill', source: SLOPES_SOURCE,
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 }
    });
  }
  if (!map.getLayer(SLOPES_LINE_LAYER)) {
    map.addLayer({
      id: SLOPES_LINE_LAYER, type: 'line', source: SLOPES_SOURCE,
      paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 }
    });
  }
  if (!map.getLayer(SLOPES_LABEL_LAYER)) {
    map.addLayer({
      id: SLOPES_LABEL_LAYER, type: 'symbol', source: SLOPES_SOURCE,
      layout: {
        'text-field':     ['get', 'name'],
        'text-size':      12,
        'text-font':      ['Noto Sans Regular'],
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

export function initSlopesLayer(map: maplibregl.Map): void {
  if (map.isStyleLoaded()) {
    addLayers(map);
  } else {
    map.once('styledata', () => addLayers(map));
  }
}

export function renderSlopes(map: maplibregl.Map, slopes: SlopePolygon[]): void {
  // Ensure layers exist (idempotent)
  if (map.isStyleLoaded()) {
    addLayers(map);
    const src = map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource | undefined;
    if (src) {
      src.setData(slopesToGeoJSON(slopes));
      return;
    }
  }
  // Style not ready — wait and retry
  map.once('styledata', () => {
    addLayers(map);
    (map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource)
      ?.setData(slopesToGeoJSON(slopes));
  });
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
      e.originalEvent.stopPropagation();
      callback(slope);
    }
  });
  map.on('mouseenter', SLOPES_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
  map.on('mouseleave', SLOPES_FILL_LAYER, () => { map.getCanvas().style.cursor = ''; });
}
