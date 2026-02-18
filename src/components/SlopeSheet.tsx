import React, { useState, useEffect, useRef } from 'react';
import type { SlopePolygon, Resort, Steepness } from '../types';
import { defaultSlopeScore } from '../types';

interface Props {
  slope: SlopePolygon | null;
  onSave: (slope: SlopePolygon) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

const RESORTS: Resort[] = ['Роза', 'Лаура', 'Альпика', 'Красная Поляна'];

export default function SlopeSheet({ slope, onSave, onClose, onDelete }: Props) {
  const [name, setName] = useState('');
  const [resort, setResort] = useState<Resort | null>(null);
  const [elevMin, setElevMin] = useState('');
  const [elevMax, setElevMax] = useState('');
  const [steepness, setSteepness] = useState<Steepness>(0);
  const [terrainTraps, setTerrainTraps] = useState(false);
  const [convexShape, setConvexShape] = useState(false);
  const [forestDensity, setForestDensity] = useState(false);

  const startYRef = useRef<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

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
  }, [slope]);

  const handleSave = () => {
    if (!slope) return;
    onSave({
      ...slope,
      name,
      resort,
      elevationMin: elevMin ? parseInt(elevMin, 10) : null,
      elevationMax: elevMax ? parseInt(elevMax, 10) : null,
      slopeScore: { steepness, terrainTraps, convexShape, forestDensity }
    });
  };

  // Swipe-down to close
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    const dy = e.changedTouches[0].clientY - startYRef.current;
    if (dy > 60) onClose();
    startYRef.current = null;
  };

  const visible = slope !== null;

  return (
    <div style={{
      position: 'fixed', inset: 0,
      zIndex: 30,
      pointerEvents: visible ? 'auto' : 'none'
    }}>
      {/* Backdrop */}
      {visible && (
        <div
          onClick={onClose}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }}
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          background: '#fff',
          borderRadius: '20px 20px 0 0',
          padding: '0 20px 32px',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0,0.67,0)'
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e0e0e0' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>
            {slope?.name ? slope.name : 'Новый склон'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Закрыть">✕</button>
        </div>

        {/* Resort */}
        <label style={labelStyle}>Курорт</label>
        <select
          value={resort ?? ''}
          onChange={e => setResort((e.target.value as Resort) || null)}
          style={inputStyle}
        >
          <option value="">Выберите курорт...</option>
          {RESORTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        {/* Name */}
        <label style={labelStyle}>Название склона</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Например: Северный цирк"
          style={inputStyle}
        />

        {/* Elevation */}
        <label style={labelStyle}>Высота (м)</label>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input
            type="number"
            value={elevMin}
            onChange={e => setElevMin(e.target.value)}
            placeholder="Нижняя"
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            type="number"
            value={elevMax}
            onChange={e => setElevMax(e.target.value)}
            placeholder="Верхняя"
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>

        {/* Slope score */}
        <div style={{ marginTop: '20px', marginBottom: '8px' }}>
          <h3 style={sectionTitleStyle}>Оценка склона</h3>
        </div>

        {/* Steepness radio */}
        <label style={labelStyle}>Крутизна склона</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {([
            [0, 'Менее 30° — нет дополнительного риска'],
            [1, 'От 30° до 35° (+1 балл)'],
            [2, 'Более 35° (+2 балла)']
          ] as [Steepness, string][]).map(([val, label]) => (
            <label key={val} style={radioLabelStyle}>
              <input
                type="radio"
                name="steepness"
                checked={steepness === val}
                onChange={() => setSteepness(val)}
                style={{ marginRight: '8px', accentColor: '#1565C0' }}
              />
              {label}
            </label>
          ))}
        </div>

        {/* Checkboxes */}
        {([
          [terrainTraps, setTerrainTraps, 'Ловушки рельефа (+1 балл)', 'Овраги, деревья, скальные сбросы и другие препятствия'],
          [convexShape, setConvexShape, 'Форма склона (+1 балл)', 'Склон выпуклый или не имеет опоры снизу'],
          [forestDensity, setForestDensity, 'Плотность леса (+1 балл)', 'Альпийская зона, редколесье, открытая часть леса']
        ] as [boolean, React.Dispatch<React.SetStateAction<boolean>>, string, string][]).map(([val, setter, title, desc]) => (
          <label key={title} style={checkLabelStyle}>
            <input
              type="checkbox"
              checked={val}
              onChange={e => setter(e.target.checked)}
              style={{ marginRight: '10px', accentColor: '#1565C0', width: '18px', height: '18px' }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a2e' }}>{title}</div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{desc}</div>
            </div>
          </label>
        ))}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          {onDelete && slope && (
            <button
              onClick={() => { onDelete(slope.id); onClose(); }}
              style={{ ...saveBtnStyle, background: '#F44336', flex: '0 0 auto', padding: '0 16px' }}
            >
              Удалить
            </button>
          )}
          <button onClick={handleSave} style={{ ...saveBtnStyle, flex: 1 }}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '12px', fontWeight: 600,
  color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px',
  marginBottom: '6px', marginTop: '14px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', fontSize: '15px',
  border: '1.5px solid #e0e0e0', borderRadius: '10px',
  outline: 'none', background: '#fafafa', color: '#1a1a2e',
  appearance: 'none', WebkitAppearance: 'none'
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px', fontWeight: 700, color: '#1a1a2e'
};
const radioLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center',
  fontSize: '14px', color: '#333', cursor: 'pointer',
  padding: '8px 12px', borderRadius: '8px',
  background: '#f5f5f5'
};
const checkLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start',
  cursor: 'pointer', padding: '10px 12px',
  borderRadius: '10px', background: '#f5f5f5',
  marginBottom: '8px'
};
const saveBtnStyle: React.CSSProperties = {
  padding: '14px', fontSize: '16px', fontWeight: 700,
  background: '#1565C0', color: '#fff',
  border: 'none', borderRadius: '12px',
  cursor: 'pointer', letterSpacing: '0.3px'
};
const closeBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '50%',
  border: 'none', background: '#f0f0f0',
  cursor: 'pointer', fontSize: '14px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: '#666'
};
