import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SlopePolygon, Resort, Steepness, RiskColor } from '../types';
import { defaultSlopeScore } from '../types';
import { calculateRiskColor } from '../services/riskCalculator';
import { storageService } from '../services/storage';

interface Props {
  slope: SlopePolygon | null;
  onSave: (slope: SlopePolygon) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const RESORTS: Resort[] = ['Роза', 'Лаура', 'Альпика', 'Красная Поляна'];

const RISK_META: Record<RiskColor, { label: string; color: string; bg: string }> = {
  gray:   { label: 'Нет данных',        color: '#8E8E93', bg: 'rgba(142,142,147,0.15)' },
  green:  { label: 'Низкий риск',       color: '#34C759', bg: 'rgba(52,199,89,0.15)'  },
  yellow: { label: 'Умеренный риск',    color: '#FF9F0A', bg: 'rgba(255,159,10,0.15)' },
  red:    { label: 'Высокий риск',      color: '#FF3B30', bg: 'rgba(255,59,48,0.15)'  },
};

export default function SlopeSheet({ slope, onSave, onClose, onDelete }: Props) {
  const [name,          setName]          = useState('');
  const [resort,        setResort]        = useState<Resort | null>(null);
  const [elevMin,       setElevMin]       = useState('');
  const [elevMax,       setElevMax]       = useState('');
  const [steepness,     setSteepness]     = useState<Steepness>(0);
  const [terrainTraps,  setTerrainTraps]  = useState(false);
  const [convexShape,   setConvexShape]   = useState(false);
  const [forestDensity, setForestDensity] = useState(false);
  const [liveColor,     setLiveColor]     = useState<RiskColor>('gray');

  const startYRef = useRef<number | null>(null);

  // Populate form when slope changes
  useEffect(() => {
    if (!slope) return;
    setName(slope.name || '');
    setResort(slope.resort);
    setElevMin(slope.elevationMin !== null ? String(slope.elevationMin) : '');
    setElevMax(slope.elevationMax !== null ? String(slope.elevationMax) : '');
    const sc = slope.slopeScore ?? defaultSlopeScore();
    setSteepness(sc.steepness);
    setTerrainTraps(sc.terrainTraps);
    setConvexShape(sc.convexShape);
    setForestDensity(sc.forestDensity);
    setLiveColor(slope.color);
  }, [slope]);

  /** Recompute color whenever any scoring field changes */
  const recompute = useCallback((overrides: Partial<{
    steepness: Steepness; terrainTraps: boolean;
    convexShape: boolean; forestDensity: boolean;
    elevMin: string; elevMax: string;
  }>) => {
    if (!slope) return;
    const s = {
      steepness:     overrides.steepness     ?? steepness,
      terrainTraps:  overrides.terrainTraps  ?? terrainTraps,
      convexShape:   overrides.convexShape   ?? convexShape,
      forestDensity: overrides.forestDensity ?? forestDensity,
    };
    const eMin = parseInt(overrides.elevMin ?? elevMin, 10);
    const eMax = parseInt(overrides.elevMax ?? elevMax, 10);
    const draft: SlopePolygon = {
      ...slope,
      slopeScore:   s,
      elevationMin: isNaN(eMin) ? null : eMin,
      elevationMax: isNaN(eMax) ? null : eMax,
    };
    setLiveColor(calculateRiskColor(draft, storageService.getWeather()));
  }, [slope, steepness, terrainTraps, convexShape, forestDensity, elevMin, elevMax]);

  const handleSteepness = (v: Steepness)   => { setSteepness(v);     recompute({ steepness: v }); };
  const handleTraps     = (v: boolean)     => { setTerrainTraps(v);  recompute({ terrainTraps: v }); };
  const handleConvex    = (v: boolean)     => { setConvexShape(v);   recompute({ convexShape: v }); };
  const handleForest    = (v: boolean)     => { setForestDensity(v); recompute({ forestDensity: v }); };
  const handleElevMin   = (v: string)      => { setElevMin(v);       recompute({ elevMin: v }); };
  const handleElevMax   = (v: string)      => { setElevMax(v);       recompute({ elevMax: v }); };

  const handleSave = () => {
    if (!slope) return;
    onSave({
      ...slope,
      name,
      resort,
      elevationMin:  elevMin  ? parseInt(elevMin,  10) : null,
      elevationMax:  elevMax  ? parseInt(elevMax,  10) : null,
      slopeScore:    { steepness, terrainTraps, convexShape, forestDensity }
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (e.changedTouches[0].clientY - startYRef.current > 60) onClose();
    startYRef.current = null;
  };

  const visible = slope !== null;
  const risk = RISK_META[liveColor];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: visible ? 'auto' : 'none' }}>
      {visible && (
        <div onClick={onClose} style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(2px)'
        }} />
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: '28px 28px 0 0',
          padding: '0 20px 40px',
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 -1px 0 rgba(255,255,255,0.5) inset, 0 -8px 40px rgba(0,0,0,0.18)',
          border: '1px solid rgba(255,255,255,0.6)',
          borderBottom: 'none',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.4s cubic-bezier(0.32,0,0.67,0)'
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: '36px', height: '5px', borderRadius: '3px', background: 'rgba(60,60,67,0.3)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.3px' }}>
            {slope?.name ? slope.name : 'Новый склон'}
          </h2>
          <button onClick={onClose} style={glassCloseBtnStyle}>✕</button>
        </div>

        {/* Live risk badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          padding: '7px 14px', borderRadius: '20px',
          background: risk.bg, marginBottom: '20px',
          border: `1px solid ${risk.color}40`,
          transition: 'all 0.3s'
        }}>
          <div style={{
            width: '9px', height: '9px', borderRadius: '50%',
            background: risk.color,
            boxShadow: `0 0 6px ${risk.color}`
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: risk.color }}>{risk.label}</span>
        </div>

        {/* Resort */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Курорт</label>
          <select value={resort ?? ''} onChange={e => setResort((e.target.value as Resort) || null)} style={inputStyle}>
            <option value="">Выберите курорт…</option>
            {RESORTS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Name */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Название</label>
          <input
            type="text" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Например: Северный цирк"
            style={inputStyle}
          />
        </div>

        {/* Elevation */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Высота (м)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="number" value={elevMin} onChange={e => handleElevMin(e.target.value)}
              placeholder="Нижняя" style={{ ...inputStyle, flex: 1 }} />
            <input type="number" value={elevMax} onChange={e => handleElevMax(e.target.value)}
              placeholder="Верхняя" style={{ ...inputStyle, flex: 1 }} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: 'rgba(60,60,67,0.1)', margin: '4px 0 18px' }} />
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(60,60,67,0.5)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '12px' }}>
          Оценка склона
        </div>

        {/* Steepness */}
        <div style={fieldGroupStyle}>
          <label style={labelStyle}>Крутизна</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {([
              [0, 'Менее 30° — без риска'],
              [1, '30 – 35° (+1 балл)'],
              [2, 'Более 35° (+2 балла)']
            ] as [Steepness, string][]).map(([val, lbl]) => (
              <button
                key={val}
                onClick={() => handleSteepness(val)}
                style={{
                  padding: '12px 14px', borderRadius: '14px', cursor: 'pointer',
                  border: steepness === val ? '1.5px solid #007AFF' : '1.5px solid transparent',
                  background: steepness === val ? 'rgba(0,122,255,0.12)' : 'rgba(118,118,128,0.1)',
                  textAlign: 'left', fontSize: '14px', fontWeight: steepness === val ? 600 : 400,
                  color: steepness === val ? '#007AFF' : '#1c1c1e',
                  transition: 'all 0.15s'
                }}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* Checkboxes */}
        {([
          [terrainTraps,  handleTraps,  'Ловушки рельефа (+1)',  'Овраги, деревья, скальные сбросы'],
          [convexShape,   handleConvex, 'Выпуклый склон (+1)',   'Нет опоры снизу или выпуклый рельеф'],
          [forestDensity, handleForest, 'Редколесье / альпика (+1)', 'Кроны не смыкаются, открытые зоны']
        ] as [boolean, (v: boolean) => void, string, string][]).map(([val, setter, title, desc]) => (
          <div
            key={title}
            onClick={() => setter(!val)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '12px',
              padding: '12px 14px', borderRadius: '14px', marginBottom: '8px',
              background: val ? 'rgba(0,122,255,0.1)' : 'rgba(118,118,128,0.08)',
              border: val ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s'
            }}
          >
            <div style={{
              width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0, marginTop: '1px',
              background: val ? '#007AFF' : 'rgba(118,118,128,0.2)',
              border: val ? 'none' : '1px solid rgba(60,60,67,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s'
            }}>
              {val && <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1c1c1e' }}>{title}</div>
              <div style={{ fontSize: '12px', color: 'rgba(60,60,67,0.55)', marginTop: '2px' }}>{desc}</div>
            </div>
          </div>
        ))}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          {onDelete && slope && (
            <button
              onClick={() => { onDelete(slope.id); onClose(); }}
              style={{
                padding: '14px 16px', borderRadius: '16px', border: 'none',
                background: 'rgba(255,59,48,0.12)', color: '#FF3B30',
                fontSize: '15px', fontWeight: 600, cursor: 'pointer',
                flexShrink: 0
              }}
            >Удалить</button>
          )}
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: '15px', borderRadius: '16px', border: 'none',
              background: '#007AFF', color: '#fff',
              fontSize: '16px', fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,122,255,0.35)'
            }}
          >Сохранить</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: 'rgba(60,60,67,0.55)', textTransform: 'uppercase',
  letterSpacing: '0.5px', marginBottom: '8px'
};
const fieldGroupStyle: React.CSSProperties = { marginBottom: '16px' };
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: '15px',
  border: '1px solid rgba(60,60,67,0.18)',
  borderRadius: '14px', outline: 'none',
  background: 'rgba(118,118,128,0.08)',
  color: '#1c1c1e', boxSizing: 'border-box',
  WebkitAppearance: 'none'
};
const glassCloseBtnStyle: React.CSSProperties = {
  width: '30px', height: '30px', borderRadius: '50%',
  border: 'none', background: 'rgba(118,118,128,0.18)',
  cursor: 'pointer', fontSize: '13px', color: 'rgba(60,60,67,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
