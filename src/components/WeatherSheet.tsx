import React, { useState, useRef } from 'react';
import type { WeatherData, ElevationBand, WeatherScore } from '../types';
import { ALL_BANDS, defaultWeatherScore } from '../types';
import { calcWeatherBandScore } from '../services/riskCalculator';

interface Props {
  weather: WeatherData;
  onSave: (data: WeatherData) => void;
  onClose: () => void;
  visible: boolean;
}

const BAND_LABELS: Record<ElevationBand, string> = {
  '1000-1300': '1000 – 1300 м',
  '1300-1600': '1300 – 1600 м',
  '1600-2000': '1600 – 2000 м',
  '2000+':     'Выше 2000 м'
};

const CHECKLIST: { key: keyof WeatherScore; label: string; desc: string }[] = [
  { key: 'dangerLevel3',    label: 'Региональный уровень лавиноопасности 3+', desc: 'Уровень лавиноопасности 3 или выше (+1 балл)' },
  { key: 'weakLayers',      label: 'Долгоживущие лавинные проблемы', desc: 'Есть слабые слои (lawis.at) (+1 балл)' },
  { key: 'slabAvalanche',   label: 'Лавины из доски', desc: 'Признаки схода досковых лавин сегодня/вчера (+1 балл)' },
  { key: 'instability',     label: 'Нестабильность снега', desc: 'Вумфинг, трещины, «барабанные» звуки (+1 балл)' },
  { key: 'recentLoading',   label: 'Недавнее возрастание нагрузки', desc: 'За 48ч: ≥ 30см снега, ветеровой перенос, дождь (+1 балл)' },
  { key: 'criticalWarming', label: 'Критическое потепление', desc: 'Повышение температуры от 0°С, мокрый снег (+1 балл)' },
];

const RISK_COLORS = { 0: '#4CAF50', 1: '#4CAF50', 2: '#FFC107', 3: '#FFC107', 4: '#FFC107', 5: '#F44336', 6: '#F44336' };

export default function WeatherSheet({ weather, onSave, onClose, visible }: Props) {
  const [local, setLocal] = useState<WeatherData>(() => ({ ...weather }));
  const [expanded, setExpanded] = useState<ElevationBand | null>(null);
  const startYRef = useRef<number | null>(null);

  // Sync when parent weather changes (e.g. initial load)
  React.useEffect(() => { setLocal({ ...weather }); }, [weather]);

  const toggleBand = (band: ElevationBand) =>
    setExpanded(prev => prev === band ? null : band);

  const updateField = (band: ElevationBand, key: keyof WeatherScore, value: boolean) => {
    setLocal(prev => ({
      ...prev,
      [band]: { ...prev[band], [key]: value }
    }));
  };

  const saveBand = (band: ElevationBand) => {
    setLocal(prev => ({
      ...prev,
      [band]: { ...prev[band], lastUpdated: new Date().toISOString() }
    }));
    setExpanded(null);
  };

  const handleSaveAll = () => {
    onSave(local);
    onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (e.changedTouches[0].clientY - startYRef.current > 60) onClose();
    startYRef.current = null;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: visible ? 'auto' : 'none' }}>
      {visible && (
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)' }} />
      )}

      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: '#fff', borderRadius: '20px 20px 0 0',
          padding: '0 20px 32px', maxHeight: '85vh', overflowY: 'auto',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32,0,0.67,0)'
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e0e0e0' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e' }}>Погодные условия</h2>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Закрыть">✕</button>
        </div>

        <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
          Заполните оценку для каждого диапазона высот. Система автоматически перекрасит склоны.
        </p>

        {ALL_BANDS.map(band => {
          const ws = local[band] ?? defaultWeatherScore();
          const score = calcWeatherBandScore(ws);
          const hasData = ws.lastUpdated !== null;
          const isOpen = expanded === band;
          const dotColor = hasData ? (RISK_COLORS[score as keyof typeof RISK_COLORS] ?? '#999') : '#ccc';

          return (
            <div key={band} style={{ marginBottom: '8px' }}>
              {/* Band header */}
              <button
                onClick={() => toggleBand(band)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: isOpen ? '#EEF2FF' : '#f5f5f5',
                  border: isOpen ? '1.5px solid #1565C0' : '1.5px solid transparent',
                  borderRadius: isOpen ? '12px 12px 0 0' : '12px',
                  cursor: 'pointer', display: 'flex',
                  justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a2e' }}>{BAND_LABELS[band]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {hasData && (
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {score} балл · {formatDate(ws.lastUpdated)}
                    </span>
                  )}
                  {!hasData && <span style={{ fontSize: '12px', color: '#aaa' }}>Не заполнено</span>}
                  <span style={{ fontSize: '18px', color: '#666', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌃</span>
                </div>
              </button>

              {/* Expanded form */}
              {isOpen && (
                <div style={{
                  background: '#fafbff', border: '1.5px solid #1565C0',
                  borderTop: 'none', borderRadius: '0 0 12px 12px',
                  padding: '16px 16px 12px'
                }}>
                  {CHECKLIST.filter(item => item.key !== 'lastUpdated').map(({ key, label, desc }) => (
                    <label key={key} style={checkLabelStyle}>
                      <input
                        type="checkbox"
                        checked={!!(ws[key as keyof WeatherScore])}
                        onChange={e => updateField(band, key, e.target.checked)}
                        style={{ marginRight: '10px', accentColor: '#1565C0', width: '18px', height: '18px', flexShrink: 0, marginTop: '2px' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a2e' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{desc}</div>
                      </div>
                    </label>
                  ))}
                  <button
                    onClick={() => saveBand(band)}
                    style={saveBandBtnStyle}
                  >
                    Сохранить диапазон
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={handleSaveAll} style={{ ...saveBtnStyle, marginTop: '16px' }}>
          Сохранить и пересчитать риски
        </button>
      </div>
    </div>
  );
}

const closeBtnStyle: React.CSSProperties = {
  width: '32px', height: '32px', borderRadius: '50%',
  border: 'none', background: '#f0f0f0', cursor: 'pointer',
  fontSize: '14px', color: '#666'
};
const checkLabelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', cursor: 'pointer',
  padding: '10px 0', borderBottom: '1px solid #eef'
};
const saveBandBtnStyle: React.CSSProperties = {
  marginTop: '12px', width: '100%', padding: '12px',
  fontSize: '14px', fontWeight: 700,
  background: '#1565C0', color: '#fff',
  border: 'none', borderRadius: '10px', cursor: 'pointer'
};
const saveBtnStyle: React.CSSProperties = {
  width: '100%', padding: '14px', fontSize: '16px',
  fontWeight: 700, background: '#1a1a2e', color: '#fff',
  border: 'none', borderRadius: '12px', cursor: 'pointer'
};
