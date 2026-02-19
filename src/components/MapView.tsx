import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MD3 } from '../theme';

export interface MapViewHandle {
  getMap: () => maplibregl.Map | null;
}

interface Props {
  onMapLoad?: (map: maplibregl.Map) => void;
  onMapClick?: (e: maplibregl.MapMouseEvent) => void;
}

// Winter-style map — no sprite (avoids 404), only glyphs needed for text labels
const WINTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  // sprite intentionally omitted — we use no icon layers, avoids @2x 404
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet'
    }
  },
  layers: [
    { id: 'background', type: 'background',
      paint: { 'background-color': '#e8eef4' } },

    // Water
    { id: 'water', type: 'fill',
      source: 'openmaptiles', 'source-layer': 'water',
      paint: { 'fill-color': '#a8c8e8', 'fill-opacity': 0.9 } },
    { id: 'waterway', type: 'line',
      source: 'openmaptiles', 'source-layer': 'waterway',
      paint: { 'line-color': '#7aabcf', 'line-width': 1.2 } },

    // Land cover
    { id: 'landcover-grass', type: 'fill',
      source: 'openmaptiles', 'source-layer': 'landcover',
      filter: ['in', 'class', 'grass', 'meadow', 'farmland'],
      paint: { 'fill-color': '#d8e8d0', 'fill-opacity': 0.6 } },
    { id: 'landcover-forest', type: 'fill',
      source: 'openmaptiles', 'source-layer': 'landcover',
      filter: ['in', 'class', 'wood', 'forest'],
      paint: { 'fill-color': '#b0c8a8', 'fill-opacity': 0.7 } },
    { id: 'landcover-rock', type: 'fill',
      source: 'openmaptiles', 'source-layer': 'landcover',
      filter: ['in', 'class', 'rock', 'ice', 'glacier', 'sand', 'scree'],
      paint: { 'fill-color': '#d0d8e0', 'fill-opacity': 0.8 } },

    // Park
    { id: 'park', type: 'fill',
      source: 'openmaptiles', 'source-layer': 'park',
      paint: { 'fill-color': '#c8dcc0', 'fill-opacity': 0.5 } },

    // Buildings
    { id: 'building', type: 'fill',
      source: 'openmaptiles', 'source-layer': 'building',
      paint: { 'fill-color': '#c4cdd8', 'fill-outline-color': '#a8b4c0', 'fill-opacity': 0.9 } },

    // Roads
    { id: 'road-motorway-casing', type: 'line',
      source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      paint: { 'line-color': '#7a9ab8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 14, 8] as maplibregl.DataDrivenPropertyValueSpecification<number> } },
    { id: 'road-motorway', type: 'line',
      source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['in', 'class', 'motorway', 'trunk'],
      paint: { 'line-color': '#aabfd8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 2, 14, 6] as maplibregl.DataDrivenPropertyValueSpecification<number> } },
    { id: 'road-primary', type: 'line',
      source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['in', 'class', 'primary', 'secondary'],
      paint: { 'line-color': '#c8d4e0',
        'line-width': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 14, 5] as maplibregl.DataDrivenPropertyValueSpecification<number> } },
    { id: 'road-minor', type: 'line',
      source: 'openmaptiles', 'source-layer': 'transportation',
      filter: ['in', 'class', 'tertiary', 'minor', 'service', 'track', 'path'],
      paint: { 'line-color': '#d8e0e8',
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 14, 3] as maplibregl.DataDrivenPropertyValueSpecification<number> } },

    // Boundaries
    { id: 'boundary', type: 'line',
      source: 'openmaptiles', 'source-layer': 'boundary',
      filter: ['<=', ['get', 'admin_level'], 4],
      paint: { 'line-color': '#8899aa', 'line-width': 1, 'line-dasharray': [4, 3] } },

    // Place labels
    { id: 'place-city', type: 'symbol',
      source: 'openmaptiles', 'source-layer': 'place',
      filter: ['in', 'class', 'city', 'town'],
      layout: {
        'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 11, 14, 14] as maplibregl.DataDrivenPropertyValueSpecification<number>,
        'text-anchor': 'center'
      },
      paint: { 'text-color': '#2a3a4a', 'text-halo-color': '#e8eef4', 'text-halo-width': 2 } },
    { id: 'place-village', type: 'symbol',
      source: 'openmaptiles', 'source-layer': 'place',
      filter: ['in', 'class', 'village', 'suburb', 'hamlet'],
      layout: {
        'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11, 'text-anchor': 'center'
      },
      paint: { 'text-color': '#3a4a5a', 'text-halo-color': '#e8eef4', 'text-halo-width': 1.5 } },

    // Road labels
    { id: 'road-label', type: 'symbol',
      source: 'openmaptiles', 'source-layer': 'transportation_name',
      layout: {
        'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 10, 'symbol-placement': 'line', 'text-max-angle': 30
      },
      paint: { 'text-color': '#4a5a6a', 'text-halo-color': '#e8eef4', 'text-halo-width': 1.5 } }
  ]
};

const MapView = forwardRef<MapViewHandle, Props>(({ onMapLoad, onMapClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  useImperativeHandle(ref, () => ({ getMap: () => mapRef.current }));

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: WINTER_STYLE,
      center: [40.03, 43.68],
      zoom: 13, minZoom: 10, maxZoom: 18,
      touchZoomRotate: true, dragRotate: false
    });
    mapRef.current = map;
    map.on('load', () => onMapLoad?.(map));
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;
    const h = (e: maplibregl.MapMouseEvent) => onMapClick(e);
    map.on('click', h);
    return () => { map.off('click', h); };
  }, [onMapClick]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {/* Zoom controls — MD3 icon buttons, no shadow */}
      <div style={{
        position: 'fixed', bottom: '96px', right: '16px',
        display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 10
      }}>
        <button onClick={() => mapRef.current?.zoomIn()}  style={zoomBtnStyle} aria-label="+">+</button>
        <button onClick={() => mapRef.current?.zoomOut()} style={zoomBtnStyle} aria-label="-">−</button>
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';

const zoomBtnStyle: React.CSSProperties = {
  width: '44px', height: '44px', borderRadius: '50%',
  border: `1px solid ${MD3.outlineVariant}`,
  background: MD3.surface,
  boxShadow: 'none',
  fontSize: '20px', fontWeight: 'bold', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: MD3.onSurface, lineHeight: 1,
  userSelect: 'none', WebkitUserSelect: 'none'
};

export default MapView;
