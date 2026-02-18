import maplibregl from 'maplibre-gl';
import type { SlopePolygon, RiskColor } from '../types';

const SLOPES_SOURCE      = 'slopes';
const SLOPES_FILL_LAYER  = 'slopes-fill';
const SLOPES_LINE_LAYER  = 'slopes-line';
const SLOPES_LABEL_LAYER = 'slopes-label';

export const COLOR_MAP: Record<RiskColor, string> = {
  gray:   '#808080',
  green:  '#4CAF50',
  yellow: '#FFC107',
  red:    '#F44336'
};

function slopesToGeoJSON(slopes: SlopePolygon[]): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];

  for (const slope of slopes) {
    if (!slope.coordinates || slope.coordinates.length < 3) continue;

    // Build a clean closed ring: strip any existing closing point, then re-add
    let coords = slope.coordinates as [number, number][];
    const first = coords[0];
    const last  = coords[coords.length - 1];
    if (
      first && last &&
      Math.abs(first[0] - last[0]) < 1e-9 &&
      Math.abs(first[1] - last[1]) < 1e-9
    ) {
      coords = coords.slice(0, -1);
    }
    if (coords.length < 3) continue;
    const ring: [number, number][] = [...coords, coords[0]];

    features.push({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [ring] },
      properties: {
        id:     slope.id,
        name:   slope.name || '',
        color:  COLOR_MAP[slope.color] ?? COLOR_MAP.gray,
        resort: slope.resort ?? ''
      }
    });
  }

  return { type: 'FeatureCollection', features };
}

function ensureLayers(map: maplibregl.Map): void {
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
      paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.35 }
    });
  }

  if (!map.getLayer(SLOPES_LINE_LAYER)) {
    map.addLayer({
      id: SLOPES_LINE_LAYER,
      type: 'line',
      source: SLOPES_SOURCE,
      paint: { 'line-color': ['get', 'color'], 'line-width': 2.5, 'line-opacity': 1 }
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

export function initSlopesLayer(map: maplibregl.Map): void {
  // If style is already loaded — add immediately
  if (map.isStyleLoaded()) {
    ensureLayers(map);
  } else {
    map.once('styledata', () => ensureLayers(map));
  }
}

export function renderSlopes(map: maplibregl.Map, slopes: SlopePolygon[]): void {
  // Ensure layers exist before trying to set data
  ensureLayers(map);

  const geojson = slopesToGeoJSON(slopes);
  const source = map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (!source) {
    // Style not ready yet — wait one frame and retry once
    requestAnimationFrame(() => {
      const s = map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource | undefined;
      s?.setData(geojson);
    });
    return;
  }
  source.setData(geojson);
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
