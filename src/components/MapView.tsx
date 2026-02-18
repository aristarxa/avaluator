import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface MapViewHandle {
  getMap: () => maplibregl.Map | null;
}

interface Props {
  onMapLoad?: (map: maplibregl.Map) => void;
  onMapClick?: (e: maplibregl.MapMouseEvent) => void;
}

const MapView = forwardRef<MapViewHandle, Props>(({ onMapLoad, onMapClick }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [40.03, 43.68],
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      touchZoomRotate: true,
      dragRotate: false
    });

    mapRef.current = map;

    map.on('load', () => {
      onMapLoad?.(map);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;

    const handler = (e: maplibregl.MapMouseEvent) => onMapClick(e);
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [onMapClick]);

  const handleZoomIn = () => mapRef.current?.zoomIn();
  const handleZoomOut = () => mapRef.current?.zoomOut();

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Zoom controls */}
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
          onClick={handleZoomIn}
          style={zoomBtnStyle}
          aria-label="Приблизить"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={zoomBtnStyle}
          aria-label="Удалить"
        >
          −
        </button>
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';

const zoomBtnStyle: React.CSSProperties = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.95)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  fontSize: '22px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#1a1a2e',
  lineHeight: 1,
  userSelect: 'none',
  WebkitUserSelect: 'none'
};

export default MapView;
