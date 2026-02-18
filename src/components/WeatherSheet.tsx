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
  { key: 'dangerLevel3',    label: 'Региональный уровень опасности 3+', desc: 'Уровень лавиноопасности 3 или выше' },
  { key: 'weakLayers',      label: 'Долгоживущие лавинные проблемы',    desc: 'Есть слабые слои (lawis.at)' },
  { key: 'slabAvalanche',   label: 'Лавины из доски',                   desc: 'Признаки схода сегодня / вчера' },
  { key: 'instability',     label: 'Нестабильность снега',              desc: 'Вумфинг, трещины, «барабанный» звук' },
  { key: 'recentLoading',   label: 'Недавнее возрастание нагрузки',     desc: 'За 48ч: ≥30 см снега, ветер, дождь' },
  { key: 'criticalWarming', label: 'Критическое потепление',            desc: 'Потепление от 0°С, мокрый снег' },
];

const scoreColor = (s: number) =>
  s <= 1 ? '#34C759' : s <= 3 ? '#FF9F0A' : '#FF3B30';

export default function WeatherSheet({ weather, onSave, onClose, visible }: Props) {
  const [local, setLocal] = useState<WeatherData>(() => ({ ...weather }));
  const [expanded, setExpanded] = useState<ElevationBand | null>(null);
  const startYRef = useRef<number | null>(null);

  React.useEffect(() => { setLocal({ ...weather }); }, [weather]);

  const updateField = (band: ElevationBand, key: keyof WeatherScore, value: boolean) => {
    setLocal(prev => ({
      ...prev,
      [band]: { ...prev[band], [key]: value }
    }));
  };

  /** Save band: stamp lastUpdated so risk calculator picks it up */
  const saveBand = (band: ElevationBand) => {
    const updated = {
      ...local,
      [band]: { ...local[band], lastUpdated: new Date().toISOString() }
    };
    setLocal(updated);
    setExpanded(null);
    // Auto-trigger recalc immediately
    onSave(updated);
  };

  const handleSaveAll = () => {
    // Stamp lastUpdated for any band that has at least one flag set but wasn't saved per-band
    const stamped = { ...local };
    for (const band of ALL_BANDS) {
      const ws = stamped[band];
      const hasFlags = ['dangerLevel3','weakLayers','slabAvalanche','instability','recentLoading','criticalWarming']
        .some(k => ws[k as keyof WeatherScore]);
      if (!ws.lastUpdated && hasFlags) {
        stamped[band] = { ...ws, lastUpdated: new Date().toISOString() };
      }
    }
    onSave(stamped);
  };

  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (e.changedTouches[0].clientY - startYRef.current > 60) onClose();
    startYRef.current = null;
  };

  const fmt = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1c1c1e', letterSpacing: '-0.3px' }}>Погода</h2>
          <button onClick={onClose} style={glassCloseBtnStyle}>✕</button>
        </div>
        <p style={{ fontSize: '13px', color: 'rgba(60,60,67,0.6)', marginBottom: '20px', lineHeight: 1.4 }}>
          Сохраните диапазон — склоны перекрасятся автоматически
        </p>

        {ALL_BANDS.map(band => {
          const ws   = local[band] ?? defaultWeatherScore();
          const score = calcWeatherBandScore(ws);
          const hasData = !!ws.lastUpdated;
          const isOpen  = expanded === band;
          const dot = hasData ? scoreColor(score) : 'rgba(60,60,67,0.2)';

          return (
            <div key={band} style={{ marginBottom: '10px' }}>
              <button
                onClick={() => setExpanded(isOpen ? null : band)}
                style={{
                  width: '100%', padding: '14px 16px',
                  background: isOpen
                    ? 'rgba(0,122,255,0.12)'
                    : 'rgba(118,118,128,0.12)',
                  border: isOpen ? '1px solid rgba(0,122,255,0.35)' : '1px solid transparent',
                  borderRadius: isOpen ? '18px 18px 0 0' : '18px',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '11px', height: '11px', borderRadius: '50%',
                    background: dot,
                    boxShadow: hasData ? `0 0 6px ${dot}99` : 'none'
                  }} />
                  <span style={{ fontSize: '15px', fontWeight: 600, color: '#1c1c1e' }}>{BAND_LABELS[band]}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {hasData
                    ? <span style={{ fontSize: '12px', color: 'rgba(60,60,67,0.55)' }}>{score} б · {fmt(ws.lastUpdated)}</span>
                    : <span style={{ fontSize: '12px', color: 'rgba(60,60,67,0.38)' }}>Не заполнено</span>
                  }
                  <span style={{
                    fontSize: '12px', color: 'rgba(60,60,67,0.4)',
                    display: 'inline-block',
                    transform: isOpen ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }}>▼</span>
                </div>
              </button>

              {isOpen && (
                <div style={{
                  background: 'rgba(0,122,255,0.06)',
                  border: '1px solid rgba(0,122,255,0.2)',
                  borderTop: 'none',
                  borderRadius: '0 0 18px 18px',
                  padding: '16px 16px 14px'
                }}>
                  {CHECKLIST.map(({ key, label, desc }) => (
                    <label key={key} style={{
                      display: 'flex', alignItems: 'flex-start',
                      gap: '12px', padding: '10px 0',
                      borderBottom: '1px solid rgba(60,60,67,0.08)',
                      cursor: 'pointer'
                    }}>
                      <div
                        onClick={() => updateField(band, key, !ws[key as keyof WeatherScore])}
                        style={{
                          width: '22px', height: '22px', borderRadius: '7px', flexShrink: 0, marginTop: '1px',
                          background: ws[key as keyof WeatherScore] ? '#007AFF' : 'rgba(118,118,128,0.18)',
                          border: ws[key as keyof WeatherScore] ? 'none' : '1px solid rgba(60,60,67,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s', cursor: 'pointer'
                        }}
                      >
                        {ws[key as keyof WeatherScore] && (
                          <span style={{ color: '#fff', fontSize: '13px', fontWeight: 700 }}>✓</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1c1c1e' }}>{label}</div>
                        <div style={{ fontSize: '12px', color: 'rgba(60,60,67,0.55)', marginTop: '2px' }}>{desc}</div>
                      </div>
                    </label>
                  ))}
                  <button onClick={() => saveBand(band)} style={{
                    marginTop: '14px', width: '100%', padding: '13px',
                    fontSize: '15px', fontWeight: 600,
                    background: '#007AFF', color: '#fff',
                    border: 'none', borderRadius: '14px', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(0,122,255,0.35)'
                  }}>
                    Сохранить и пересчитать ↑
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <button onClick={handleSaveAll} style={{
          width: '100%', padding: '15px', fontSize: '16px', fontWeight: 700,
          background: 'rgba(28,28,30,0.88)', color: '#fff',
          border: 'none', borderRadius: '16px', cursor: 'pointer',
          marginTop: '8px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)'
        }}>
          Сохранить все диапазоны
        </button>
      </div>
    </div>
  );
}

const glassCloseBtnStyle: React.CSSProperties = {
  width: '30px', height: '30px', borderRadius: '50%',
  border: 'none',
  background: 'rgba(118,118,128,0.18)',
  cursor: 'pointer', fontSize: '13px', color: 'rgba(60,60,67,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
