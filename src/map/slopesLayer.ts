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

function slopesToGeoJSON(slopes: SlopePolygon[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: slopes.map(slope => ({
      type: 'Feature',
      id: slope.id,
      geometry: {
        type: 'Polygon',
        coordinates: [slope.coordinates.length > 0
          ? [...slope.coordinates, slope.coordinates[0]]
          : []]
      },
      properties: {
        id: slope.id,
        name: slope.name || '',
        color: COLOR_MAP[slope.color] ?? COLOR_MAP.gray,
        resort: slope.resort ?? ''
      }
    }))
  };
}

/**
 * Step 2.4 — Initialize slope polygon layers on the map.
 */
export function initSlopesLayer(map: maplibregl.Map): void {
  if (!map.getSource(SLOPES_SOURCE)) {
    map.addSource(SLOPES_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id'
    });
  }

  if (!map.getLayer(SLOPES_FILL_LAYER)) {
    map.addLayer({
      id: SLOPES_FILL_LAYER,
      type: 'fill',
      source: SLOPES_SOURCE,
      paint: {
        'fill-color': ['get', 'color'],
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
        'line-color': ['get', 'color'],
        'line-width': 2,
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
        'text-field': ['get', 'name'],
        'text-size': 12,
        'text-font': ['Open Sans Regular'],
        'text-anchor': 'center',
        'text-max-width': 10
      },
      paint: {
        'text-color': '#1a1a2e',
        'text-halo-color': 'rgba(255,255,255,0.9)',
        'text-halo-width': 2
      }
    });
  }
}

/** Update the slope polygons displayed on the map. */
export function renderSlopes(map: maplibregl.Map, slopes: SlopePolygon[]): void {
  const source = map.getSource(SLOPES_SOURCE) as maplibregl.GeoJSONSource | undefined;
  if (source) {
    source.setData(slopesToGeoJSON(slopes));
  }
}

/** Register click handler for slope polygons. */
export function onSlopeClick(
  map: maplibregl.Map,
  callback: (slope: SlopePolygon) => void,
  getSlopesRef: () => SlopePolygon[]
): void {
  map.on('click', SLOPES_FILL_LAYER, (e) => {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    const id = feature.properties?.id as string;
    if (!id) return;
    const slope = getSlopesRef().find(s => s.id === id);
    if (slope) {
      e.preventDefault?.();
      callback(slope);
    }
  });

  // Change cursor on hover
  map.on('mouseenter', SLOPES_FILL_LAYER, () => {
    map.getCanvas().style.cursor = 'pointer';
  });
  map.on('mouseleave', SLOPES_FILL_LAYER, () => {
    map.getCanvas().style.cursor = '';
  });
}
