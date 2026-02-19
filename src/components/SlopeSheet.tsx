import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SlopePolygon, Resort, Steepness, RiskColor } from '../types';
import { defaultSlopeScore } from '../types';
import { calculateRiskColor } from '../services/riskCalculator';
import { storageService } from '../services/storage';
import SidePanel from './SidePanel';

interface Props {
  slope: SlopePolygon | null;
  onSave: (slope: SlopePolygon) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const RESORTS: Resort[] = ['Роза', 'Лаура', 'Альпика', 'Красная Поляна'];

const RISK_META: Record<RiskColor, { label: string; color: string; bg: string }> = {
  gray:   { label: 'Нет данных',     color: 'var(--c-risk-gray)',   bg: 'var(--c-risk-gray-bg)'   },
  green:  { label: 'Низкий риск',    color: 'var(--c-risk-green)',  bg: 'var(--c-risk-green-bg)'  },
  yellow: { label: 'Умеренный риск', color: 'var(--c-risk-yellow)', bg: 'var(--c-risk-yellow-bg)' },
  red:    { label: 'Высокий риск',   color: 'var(--c-risk-red)',    bg: 'var(--c-risk-red-bg)'    },
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
  const [isDesktop,     setIsDesktop]     = useState(false);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

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
      ...slope, slopeScore: s,
      elevationMin: isNaN(eMin) ? null : eMin,
      elevationMax: isNaN(eMax) ? null : eMax,
    };
    setLiveColor(calculateRiskColor(draft, storageService.getWeather()));
  }, [slope, steepness, terrainTraps, convexShape, forestDensity, elevMin, elevMax]);

  const handleSteepness = (v: Steepness) => { setSteepness(v);     recompute({ steepness: v }); };
  const handleTraps     = (v: boolean)   => { setTerrainTraps(v);  recompute({ terrainTraps: v }); };
  const handleConvex    = (v: boolean)   => { setConvexShape(v);   recompute({ convexShape: v }); };
  const handleForest    = (v: boolean)   => { setForestDensity(v); recompute({ forestDensity: v }); };
  const handleElevMin   = (v: string)    => { setElevMin(v);       recompute({ elevMin: v }); };
  const handleElevMax   = (v: string)    => { setElevMax(v);       recompute({ elevMax: v }); };

  const handleSave = () => {
    if (!slope) return;
    onSave({
      ...slope, name, resort,
      elevationMin: elevMin ? parseInt(elevMin, 10) : null,
      elevationMax: elevMax ? parseInt(elevMax, 10) : null,
      slopeScore: { steepness, terrainTraps, convexShape, forestDensity }
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (e.changedTouches[0].clientY - startYRef.current > 60) onClose();
    startYRef.current = null;
  };

  const visible = slope !== null;
  const risk    = RISK_META[liveColor];

  const body = (
    <>
      {/* Risk badge */}
      <div
        className="risk-badge"
        style={{ background: risk.bg, color: risk.color, marginBottom: '4px' }}
      >
        <div className="risk-dot" style={{ background: risk.color }} />
        {risk.label}
      </div>

      {/* Resort */}
      <div className="form-group">
        <label className="form-label">Курорт</label>
        <select
          className="select-field"
          value={resort ?? ''}
          onChange={e => setResort((e.target.value as Resort) || null)}
        >
          <option value="">Выберите курорт…</option>
          {RESORTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Name */}
      <div className="form-group">
        <label className="form-label">Название</label>
        <input
          type="text" className="input-field"
          value={name} onChange={e => setName(e.target.value)}
          placeholder="Например: Северный цирк"
        />
      </div>

      {/* Elevation */}
      <div className="form-group">
        <label className="form-label">Высота (м)</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="number" className="input-field" value={elevMin}
            onChange={e => handleElevMin(e.target.value)} placeholder="Нижняя" />
          <input type="number" className="input-field" value={elevMax}
            onChange={e => handleElevMax(e.target.value)} placeholder="Верхняя" />
        </div>
      </div>

      {/* Divider */}
      <div className="section-divider">
        <div className="section-divider-line" />
        <span className="section-divider-text">Оценка склона</span>
        <div className="section-divider-line" />
      </div>

      {/* Steepness */}
      <div className="form-group">
        <label className="form-label">Крутизна</label>
        <div className="chip-row">
          {([
            [0, 'Менее 30° — без риска'],
            [1, '30 – 35° — +1 балл'],
            [2, 'Более 35° — +2 балла']
          ] as [Steepness, string][]).map(([val, lbl]) => (
            <button
              key={val}
              className={`chip${steepness === val ? ' selected' : ''}`}
              onClick={() => handleSteepness(val)}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {/* Boolean checks */}
      {([
        [terrainTraps,  handleTraps,  'Ловушки рельефа +1',      'Овраги, деревья, скальные сбросы'],
        [convexShape,   handleConvex, 'Выпуклый склон +1',      'Нет опоры снизу или выпуклый рельеф'],
        [forestDensity, handleForest, 'Редколесье / альпика +1', 'Кроны не смыкаются, открытые зоны']
      ] as [boolean, (v: boolean) => void, string, string][]).map(([val, setter, title, desc]) => (
        <div
          key={title}
          className={`check-row${val ? ' checked' : ''}`}
          onClick={() => setter(!val)}
        >
          <div className={`check-box${val ? ' checked' : ''}`}>
            {val && <span className="check-tick">✓</span>}
          </div>
          <div>
            <div className="check-title">{title}</div>
            <div className="check-desc">{desc}</div>
          </div>
        </div>
      ))}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
        {onDelete && slope && (
          <button className="btn-destruct" onClick={() => { onDelete(slope.id); onClose(); }}>
            Удалить
          </button>
        )}
        <button className="btn-primary" style={{ flex: 1 }} onClick={handleSave}>
          Сохранить
        </button>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <SidePanel title={slope?.name || 'Новый склон'} onClose={onClose} visible={visible}>
        {body}
      </SidePanel>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: visible ? 'auto' : 'none' }}>
      {visible && <div className="sheet-backdrop" onClick={onClose} />}
      <div
        className="sheet"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: `transform var(--t-spring)` }}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <span className="sheet-title">{slope?.name || 'Новый склон'}</span>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть">✕</button>
        </header>
        <div className="sheet-body">{body}</div>
      </div>
    </div>
  );
}
