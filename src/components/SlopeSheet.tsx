import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { SlopePolygon, Resort, Steepness, RiskColor } from '../types';
import { defaultSlopeScore } from '../types';
import { calculateRiskColor } from '../services/riskCalculator';
import { storageService } from '../services/storage';
import { MD3 } from '../theme';
import SidePanel from './SidePanel';

interface Props {
  slope: SlopePolygon | null;
  onSave: (slope: SlopePolygon) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const RESORTS: Resort[] = ['Роза', 'Лаура', 'Альпика', 'Красная Поляна'];

const RISK_META: Record<RiskColor, { label: string; color: string; bg: string }> = {
  gray:   { label: 'Нет данных',     color: MD3.riskGray,   bg: MD3.riskGrayBg   },
  green:  { label: 'Низкий риск',    color: MD3.riskGreen,  bg: MD3.riskGreenBg  },
  yellow: { label: 'Умеренный риск', color: MD3.riskYellow, bg: MD3.riskYellowBg },
  red:    { label: 'Высокий риск',   color: MD3.riskRed,    bg: MD3.riskRedBg    },
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
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
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
  const risk = RISK_META[liveColor];

  const body = (
    <>
      {/* Risk badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '6px 14px', borderRadius: MD3.radiusFull,
        background: risk.bg,
        border: `1px solid ${risk.color}40`,
        marginBottom: '20px', transition: 'all 0.25s'
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: risk.color
        }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: risk.color }}>{risk.label}</span>
      </div>

      {/* Resort */}
      <Field label="Курорт">
        <select value={resort ?? ''} onChange={e => setResort((e.target.value as Resort) || null)} style={inputStyle}>
          <option value="">Выберите курорт…</option>
          {RESORTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {/* Name */}
      <Field label="Название">
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="Например: Северный цирк" style={inputStyle} />
      </Field>

      {/* Elevation */}
      <Field label="Высота (м)">
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="number" value={elevMin} onChange={e => handleElevMin(e.target.value)}
            placeholder="Нижняя" style={{ ...inputStyle, flex: 1 }} />
          <input type="number" value={elevMax} onChange={e => handleElevMax(e.target.value)}
            placeholder="Верхняя" style={{ ...inputStyle, flex: 1 }} />
        </div>
      </Field>

      <Divider label="Оценка склона" />

      {/* Steepness */}
      <Field label="Крутизна">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {([
            [0, 'Менее 30° — без риска'],
            [1, '30 – 35° (+1 балл)'],
            [2, 'Более 35° (+2 балла)']
          ] as [Steepness, string][]).map(([val, lbl]) => (
            <Chip key={val} active={steepness === val} onClick={() => handleSteepness(val)}>{lbl}</Chip>
          ))}
        </div>
      </Field>

      {/* Boolean checks */}
      {([
        [terrainTraps,  handleTraps,  'Ловушки рельефа (+1)',    'Овраги, деревья, скальные сбросы'],
        [convexShape,   handleConvex, 'Выпуклый склон (+1)',     'Нет опоры снизу или выпуклый рельеф'],
        [forestDensity, handleForest, 'Редколесье / альпика (+1)', 'Кроны не смыкаются, открытые зоны']
      ] as [boolean, (v: boolean) => void, string, string][]).map(([val, setter, title, desc]) => (
        <CheckRow key={title} checked={val} onToggle={() => setter(!val)} title={title} desc={desc} />
      ))}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
        {onDelete && slope && (
          <button onClick={() => { onDelete(slope.id); onClose(); }} style={deleteBtnStyle}>Удалить</button>
        )}
        <button onClick={handleSave} style={primaryBtnStyle}>Сохранить</button>
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
      {visible && <Scrim onClick={onClose} />}
      <div
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        style={sheetStyle(visible)}
      >
        <Handle />
        <SheetHeader title={slope?.name || 'Новый склон'} onClose={onClose} />
        <div style={{ padding: '0 0 8px' }}>{body}</div>
      </div>
    </div>
  );
}

// ─── Small shared sub-components ───────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0 18px' }}>
      <div style={{ flex: 1, height: '1px', background: MD3.outlineVariant }} />
      <span style={{ fontSize: '11px', fontWeight: 700, color: MD3.outline, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: MD3.outlineVariant }} />
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '11px 14px', borderRadius: MD3.radiusSmall, cursor: 'pointer',
      border: active ? `2px solid ${MD3.primary}` : `1px solid ${MD3.outlineVariant}`,
      background: active ? MD3.primaryContainer : MD3.surface,
      textAlign: 'left', fontSize: '14px',
      fontWeight: active ? 600 : 400,
      color: active ? MD3.primary : MD3.onSurfaceVariant,
      transition: 'all 0.15s'
    }}>{children}</button>
  );
}

function CheckRow({ checked, onToggle, title, desc }: {
  checked: boolean; onToggle: () => void; title: string; desc: string;
}) {
  return (
    <div onClick={onToggle} style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px 14px', borderRadius: MD3.radiusSmall,
      marginBottom: '8px',
      background: checked ? MD3.primaryContainer : MD3.surfaceContainer,
      border: checked ? `1px solid ${MD3.primary}40` : `1px solid transparent`,
      cursor: 'pointer', transition: 'all 0.15s'
    }}>
      <div style={{
        width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0, marginTop: '1px',
        background: checked ? MD3.primary : MD3.surface,
        border: checked ? 'none' : `2px solid ${MD3.outline}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s'
      }}>
        {checked && <span style={{ color: MD3.onPrimary, fontSize: '13px', fontWeight: 700 }}>✓</span>}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: '14px', color: MD3.onSurface }}>{title}</div>
        <div style={{ fontSize: '12px', color: MD3.onSurfaceVariant, marginTop: '2px' }}>{desc}</div>
      </div>
    </div>
  );
}

function Scrim({ onClick }: { onClick: () => void }) {
  return <div onClick={onClick} style={{
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.32)'
  }} />;
}

function Handle() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
      <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: MD3.outlineVariant }} />
    </div>
  );
}

function SheetHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: MD3.onSurface, margin: 0 }}>{title}</h2>
      <button onClick={onClose} style={iconBtnStyle}>✕</button>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const sheetStyle = (visible: boolean): React.CSSProperties => ({
  position: 'absolute', bottom: 0, left: 0, right: 0,
  background: MD3.surface,
  borderRadius: '28px 28px 0 0',
  padding: '0 20px 40px',
  maxHeight: '88vh', overflowY: 'auto',
  boxShadow: '0 -1px 0 ' + MD3.outlineVariant,
  transform: visible ? 'translateY(0)' : 'translateY(100%)',
  transition: 'transform 0.35s cubic-bezier(0.2,0,0,1)',
});

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: MD3.onSurfaceVariant, textTransform: 'uppercase',
  letterSpacing: '0.6px', marginBottom: '8px'
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: '15px',
  border: `1px solid ${MD3.outlineVariant}`,
  borderRadius: MD3.radiusSmall, outline: 'none',
  background: MD3.surfaceContainer,
  color: MD3.onSurface, boxSizing: 'border-box'
};

const primaryBtnStyle: React.CSSProperties = {
  flex: 1, padding: '14px', borderRadius: MD3.radiusMedium, border: 'none',
  background: MD3.primary, color: MD3.onPrimary,
  fontSize: '15px', fontWeight: 600, cursor: 'pointer',
  boxShadow: 'none'
};

const deleteBtnStyle: React.CSSProperties = {
  padding: '14px 18px', borderRadius: MD3.radiusMedium, border: 'none',
  background: MD3.errorContainer, color: MD3.error,
  fontSize: '15px', fontWeight: 600, cursor: 'pointer',
  boxShadow: 'none', flexShrink: 0
};

const iconBtnStyle: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '50%',
  border: 'none', background: MD3.surfaceVariant,
  cursor: 'pointer', fontSize: '14px',
  color: MD3.onSurfaceVariant,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
