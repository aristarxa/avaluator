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
import { defaultWeatherData, defaultSlopeScore } from './types';

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export default function App() {
  const mapViewRef = useRef<MapViewHandle>(null);
  const drawingToolRef = useRef<DrawingTool | null>(null);
  const slopesRef = useRef<SlopePolygon[]>([]);
  // Track drawing mode in a ref to avoid stale closures in map handlers
  const isDrawingRef = useRef(false);

  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [slopeAngleVisible, setSlopeAngleVisible] = useState(false);
  const [selectedSlope, setSelectedSlope] = useState<SlopePolygon | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData>(() => storageService.getWeather());

  // ── Recalculate all slope colors and re-render ───────────────────
  const recalcAndRender = useCallback((currentWeather: WeatherData) => {
    const map = mapViewRef.current?.getMap();
    if (!map) return;
    const slopes = storageService.getSlopes().map(s => ({
      ...s,
      color: calculateRiskColor(s, currentWeather)
    }));
    slopes.forEach(s => storageService.saveSlope(s));
    slopesRef.current = slopes;
    renderSlopes(map, slopes);
  }, []);

  // ── Map load ─────────────────────────────────────────────────────
  const handleMapLoad = useCallback((map: maplibregl.Map) => {
    // async layers — fire and forget, they degrade gracefully
    addElevationLayers(map);
    addSlopeAngleLayer(map);
    loadOsmLayers(map);
    initSlopesLayer(map);

    const savedSlopes = storageService.getSlopes();
    slopesRef.current = savedSlopes;
    renderSlopes(map, savedSlopes);

    // Slope polygon click — guarded: skip when drawing tool is active
    onSlopeClick(
      map,
      (slope) => {
        if (isDrawingRef.current) return;  // ← fix: no sheet during drawing
        setSelectedSlope(slope);
      },
      () => slopesRef.current
    );

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
      storageService.saveSlope(newSlope);
      slopesRef.current = [...slopesRef.current, newSlope];
      renderSlopes(map, slopesRef.current);
      isDrawingRef.current = false;
      setSelectedSlope(newSlope);
      setActiveTool(null);
    });
  }, [recalcAndRender]);

  // ── Tool selection ───────────────────────────────────────────────
  const handleToolSelect = useCallback((tool: ActiveTool) => {
    const drawing = drawingToolRef.current;

    if (tool === 'draw') {
      if (!drawing) return;
      setActiveTool('draw');
      isDrawingRef.current = true;
      drawing.activate();
    } else {
      if (drawing?.isActive()) {
        drawing.deactivate();
      }
      isDrawingRef.current = false;
      setActiveTool(tool);
      if (tool === 'weather') setWeatherOpen(true);
    }
  }, []);

  useEffect(() => {
    if (activeTool !== 'draw') {
      isDrawingRef.current = false;
      if (drawingToolRef.current?.isActive()) {
        drawingToolRef.current.deactivate();
      }
    }
  }, [activeTool]);

  // ── Slope angle toggle ───────────────────────────────────────────
  const handleToggleSlopeAngle = useCallback(() => {
    const map = mapViewRef.current?.getMap();
    if (!map) return;
    const visible = toggleSlopeAngleLayer(map);
    setSlopeAngleVisible(visible);
  }, []);

  // ── Save slope ───────────────────────────────────────────────────
  const handleSaveSlope = useCallback((slope: SlopePolygon) => {
    const currentWeather = storageService.getWeather();
    const updated = { ...slope, color: calculateRiskColor(slope, currentWeather) };
    storageService.saveSlope(updated);
    slopesRef.current = storageService.getSlopes();
    const map = mapViewRef.current?.getMap();
    if (map) renderSlopes(map, slopesRef.current);
    setSelectedSlope(null);
  }, []);

  // ── Delete slope ─────────────────────────────────────────────────
  const handleDeleteSlope = useCallback((id: string) => {
    storageService.deleteSlope(id);
    slopesRef.current = storageService.getSlopes();
    const map = mapViewRef.current?.getMap();
    if (map) renderSlopes(map, slopesRef.current);
    setSelectedSlope(null);
  }, []);

  // ── Save weather ─────────────────────────────────────────────────
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
