import React, { useRef, useState, useCallback, useEffect } from 'react';
import maplibregl from 'maplibre-gl';

import MapView, { type MapViewHandle } from './components/MapView';
import Toolbar, { type ActiveTool } from './components/Toolbar';
import SlopeSheet from './components/SlopeSheet';
import WeatherSheet from './components/WeatherSheet';
import InstallPrompt from './components/InstallPrompt';

import { addElevationLayers } from './map/addElevationLayers';
import { addSlopeAngleLayer, toggleSlopeAngleLayer } from './map/addSlopeAngleLayer';
import { loadOsmLayers } from './map/loadOsmLayers';
import { initSlopesLayer, renderSlopes, onSlopeClick, SLOPES_FILL_LAYER } from './map/slopesLayer';

import { DrawingTool } from './tools/DrawingTool';
import { storageService } from './services/storage';
import { calculateRiskColor } from './services/riskCalculator';

import type { SlopePolygon, WeatherData } from './types';
import { defaultSlopeScore } from './types';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function App() {
  const mapViewRef     = useRef<MapViewHandle>(null);
  const drawingToolRef = useRef<DrawingTool | null>(null);
  const slopesRef      = useRef<SlopePolygon[]>([]);
  const isDrawingRef   = useRef(false);
  const mapRef         = useRef<maplibregl.Map | null>(null);

  const [activeTool,        setActiveTool]       = useState<ActiveTool>(null);
  const [slopeAngleVisible, setSlopeAngleVisible] = useState(false);
  const [selectedSlope,     setSelectedSlope]     = useState<SlopePolygon | null>(null);
  const [weatherOpen,       setWeatherOpen]       = useState(false);
  const [weather,           setWeather]           = useState<WeatherData>(
    () => storageService.getWeather()
  );

  const syncMap = useCallback((map: maplibregl.Map) => {
    const all = storageService.getSlopes();
    slopesRef.current = all;
    renderSlopes(map, all);
  }, []);

  const recalcAndRender = useCallback((currentWeather: WeatherData) => {
    const map = mapRef.current;
    if (!map) return;
    const slopes = storageService.getSlopes().map(s => ({
      ...s, color: calculateRiskColor(s, currentWeather)
    }));
    slopes.forEach(s => storageService.saveSlope(s));
    slopesRef.current = slopes;
    renderSlopes(map, slopes);
  }, []);

  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map;

    // 1. Background: terrain + hillshade
    addElevationLayers(map);
    addSlopeAngleLayer(map);

    // 2. Slopes layer — must be added BEFORE OSM so it sits on top
    //    initSlopesLayer waits for styledata internally
    initSlopesLayer(map);

    // 3. OSM — loaded async; safeBeforeId inside loadOsmLayers handles
    //    the case where slopes-fill doesn't exist yet at fetch-complete time
    loadOsmLayers(map, SLOPES_FILL_LAYER);

    // 4. Drawing tool — preview layers added last = always on top
    drawingToolRef.current = new DrawingTool(map, (coordinates) => {
      const id = uuid();
      const newSlope: SlopePolygon = {
        id, name: '', resort: null,
        elevationMin: null, elevationMax: null,
        coordinates,
        slopeScore: defaultSlopeScore(),
        color: 'gray'
      };
      storageService.saveSlope(newSlope);
      syncMap(map);
      isDrawingRef.current = false;
      setActiveTool(null);
      setTimeout(() => setSelectedSlope(newSlope), 80);
    });

    // 5. Slope click handler
    onSlopeClick(map, (slope) => {
      if (isDrawingRef.current) return;
      const fresh = storageService.getSlopes().find(s => s.id === slope.id);
      setSelectedSlope(fresh ?? slope);
    }, () => slopesRef.current);

    // 6. Initial render of persisted slopes
    syncMap(map);
  }, [syncMap]);

  const handleToolSelect = useCallback((tool: ActiveTool) => {
    const drawing = drawingToolRef.current;
    if (tool === 'draw') {
      if (!drawing) return;
      isDrawingRef.current = true;
      drawing.activate();
      setActiveTool('draw');
    } else {
      drawing?.isActive() && drawing.deactivate();
      isDrawingRef.current = false;
      setActiveTool(tool);
      if (tool === 'weather') setWeatherOpen(true);
    }
  }, []);

  useEffect(() => {
    if (activeTool !== 'draw') {
      isDrawingRef.current = false;
      drawingToolRef.current?.isActive() && drawingToolRef.current.deactivate();
    }
  }, [activeTool]);

  const handleToggleSlopeAngle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setSlopeAngleVisible(toggleSlopeAngleLayer(map));
  }, []);

  const handleSaveSlope = useCallback((slope: SlopePolygon) => {
    const map = mapRef.current;
    const stored  = storageService.getSlopes().find(s => s.id === slope.id);
    const coords  = stored?.coordinates ?? slope.coordinates;
    const updated: SlopePolygon = {
      ...slope,
      coordinates: coords,
      color: calculateRiskColor(
        { ...slope, coordinates: coords },
        storageService.getWeather()
      )
    };
    storageService.saveSlope(updated);
    if (map) syncMap(map);
    setSelectedSlope(null);
  }, [syncMap]);

  const handleDeleteSlope = useCallback((id: string) => {
    const map = mapRef.current;
    storageService.deleteSlope(id);
    if (map) syncMap(map);
    setSelectedSlope(null);
  }, [syncMap]);

  const handleSaveWeather = useCallback((data: WeatherData) => {
    storageService.saveWeather(data);
    setWeather(data);
    recalcAndRender(data);
    setWeatherOpen(false);
    setActiveTool(null);
  }, [recalcAndRender]);

  const handleCloseWeather = useCallback(() => {
    setWeatherOpen(false);
    if (activeTool === 'weather') setActiveTool(null);
  }, [activeTool]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <MapView ref={mapViewRef} onMapLoad={handleMapLoad} />

      <Toolbar
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        slopeAngleVisible={slopeAngleVisible}
        onToggleSlopeAngle={handleToggleSlopeAngle}
      />

      <InstallPrompt />

      {activeTool === 'draw' && (
        <div style={{
          position: 'fixed', top: '16px', left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(21,101,192,0.92)', color: '#fff',
          padding: '10px 20px', borderRadius: '20px',
          fontSize: '14px', fontWeight: 600, zIndex: 25,
          pointerEvents: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.3)'
        }}>
          Нажмите на карту — рисуйте склон. Замкните на первую точку.
        </div>
      )}

      <SlopeSheet
        slope={selectedSlope}
        onSave={handleSaveSlope}
        onClose={() => setSelectedSlope(null)}
        onDelete={handleDeleteSlope}
      />

      <WeatherSheet
        weather={weather}
        onSave={handleSaveWeather}
        onClose={handleCloseWeather}
        visible={weatherOpen}
      />
    </div>
  );
}
