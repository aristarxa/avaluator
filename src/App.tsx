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
import { initSlopesLayer, renderSlopes, onSlopeClick } from './map/slopesLayer';

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

/** Central helper: read all slopes from storage, render to map */
function syncSlopesToMap(map: maplibregl.Map, slopesRef: React.MutableRefObject<SlopePolygon[]>) {
  const all = storageService.getSlopes();
  slopesRef.current = all;
  renderSlopes(map, all);
}

export default function App() {
  const mapViewRef    = useRef<MapViewHandle>(null);
  const drawingToolRef = useRef<DrawingTool | null>(null);
  const slopesRef     = useRef<SlopePolygon[]>([]);
  const isDrawingRef  = useRef(false);
  // Keep a ref to the map so callbacks always have fresh access
  const mapRef        = useRef<maplibregl.Map | null>(null);

  const [activeTool,        setActiveTool]        = useState<ActiveTool>(null);
  const [slopeAngleVisible, setSlopeAngleVisible]  = useState(false);
  const [selectedSlope,     setSelectedSlope]      = useState<SlopePolygon | null>(null);
  const [weatherOpen,       setWeatherOpen]        = useState(false);
  const [weather,           setWeather]            = useState<WeatherData>(() => storageService.getWeather());

  // ── recalc all colors & re-render ──────────────────────────────
  const recalcAndRender = useCallback((currentWeather: WeatherData) => {
    const map = mapRef.current;
    if (!map) return;
    const slopes = storageService.getSlopes().map(s => ({
      ...s,
      color: calculateRiskColor(s, currentWeather)
    }));
    slopes.forEach(s => storageService.saveSlope(s));
    slopesRef.current = slopes;
    renderSlopes(map, slopes);
  }, []);

  // ── map load ───────────────────────────────────────────────────
  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    mapRef.current = map;

    addElevationLayers(map);
    addSlopeAngleLayer(map);
    loadOsmLayers(map);
    initSlopesLayer(map);

    // Render persisted slopes immediately
    syncSlopesToMap(map, slopesRef);

    // Slope polygon click handler
    onSlopeClick(map, (slope) => {
      if (isDrawingRef.current) return;
      // Re-read fresh data from storage in case it was updated
      const fresh = storageService.getSlopes().find(s => s.id === slope.id);
      setSelectedSlope(fresh ?? slope);
    }, () => slopesRef.current);

    // Drawing tool
    drawingToolRef.current = new DrawingTool(map, (coordinates) => {
      const newSlope: SlopePolygon = {
        id: uuid(),
        name: '',
        resort: null,
        elevationMin: null,
        elevationMax: null,
        coordinates,
        slopeScore: defaultSlopeScore(),
        color: 'gray'
      };
      // Save first, then sync map, then open sheet
      storageService.saveSlope(newSlope);
      syncSlopesToMap(map, slopesRef);
      isDrawingRef.current = false;
      setActiveTool(null);
      // Small delay so sheet opens after drawing cursor resets
      setTimeout(() => setSelectedSlope(newSlope), 50);
    });
  }, []);

  // ── tool selection ─────────────────────────────────────────────
  const handleToolSelect = useCallback((tool: ActiveTool) => {
    const drawing = drawingToolRef.current;
    if (tool === 'draw') {
      if (!drawing) return;
      isDrawingRef.current = true;
      drawing.activate();
      setActiveTool('draw');
    } else {
      if (drawing?.isActive()) drawing.deactivate();
      isDrawingRef.current = false;
      setActiveTool(tool);
      if (tool === 'weather') setWeatherOpen(true);
    }
  }, []);

  useEffect(() => {
    if (activeTool !== 'draw') {
      isDrawingRef.current = false;
      if (drawingToolRef.current?.isActive()) drawingToolRef.current.deactivate();
    }
  }, [activeTool]);

  // ── slope angle toggle ─────────────────────────────────────────
  const handleToggleSlopeAngle = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setSlopeAngleVisible(toggleSlopeAngleLayer(map));
  }, []);

  // ── save slope ─────────────────────────────────────────────────
  const handleSaveSlope = useCallback((slope: SlopePolygon) => {
    const map = mapRef.current;
    const updatedColor = calculateRiskColor(slope, storageService.getWeather());
    const updated: SlopePolygon = { ...slope, color: updatedColor };
    storageService.saveSlope(updated);
    if (map) syncSlopesToMap(map, slopesRef);
    setSelectedSlope(null);
  }, []);

  // ── delete slope ───────────────────────────────────────────────
  const handleDeleteSlope = useCallback((id: string) => {
    const map = mapRef.current;
    storageService.deleteSlope(id);
    if (map) syncSlopesToMap(map, slopesRef);
    setSelectedSlope(null);
  }, []);

  // ── save weather ───────────────────────────────────────────────
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
