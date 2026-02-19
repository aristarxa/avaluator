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

/**
 * MapTiler Outdoor-v2 — winter/mountain style with contours,
 * ski runs and terrain built-in.
 * Requires VITE_MAPTILER_KEY in .env
 */
function getStyleUrl(): string {
  const key = import.meta.env.VITE_MAPTILER_KEY as string | undefined;
  if (!key || key === 'your_maptiler_key_here') {
    console.warn(
      '[Avalancher] VITE_MAPTILER_KEY not set. '
      + 'Copy .env.example to .env and add your MapTiler key.'
    );
    // Fallback: OpenFreeMap (no key needed)
    return 'https://tiles.openfreemap.org/styles/liberty';
  }
  return `https://api.maptiler.com/maps/outdoor-v2/style.json?key=${key}`;
}

const MapView = forwardRef<MapViewHandle, Props>(({ onMapLoad, onMapClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<maplibregl.Map | null>(null);

  useImperativeHandle(ref, () => ({ getMap: () => mapRef.current }));

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getStyleUrl(),
      center: [40.03, 43.68],
      zoom: 13,
      minZoom: 8,
      maxZoom: 18,
      touchZoomRotate: true,
      dragRotate: false
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

      {/* Zoom controls — MD3 flat icon buttons */}
      <div style={{
        position: 'fixed',
        bottom: '96px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          style={zoomBtnStyle}
          aria-label="Приблизить"
        >+</button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          style={zoomBtnStyle}
          aria-label="Удалить"
        >−</button>
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';

const zoomBtnStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: `1px solid ${MD3.outlineVariant}`,
  background: MD3.surface,
  boxShadow: 'none',
  fontSize: '20px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: MD3.onSurface,
  lineHeight: 1,
  userSelect: 'none',
  WebkitUserSelect: 'none'
};

export default MapView;
