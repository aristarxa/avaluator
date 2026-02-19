import React, { useState, useRef } from 'react';
import type { WeatherData, ElevationBand, WeatherScore } from '../types';
import { ALL_BANDS, defaultWeatherScore } from '../types';
import { calcWeatherBandScore } from '../services/riskCalculator';
import { MD3 } from '../theme';
import SidePanel from './SidePanel';

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
  { key: 'dangerLevel3',    label: 'Региональный уровень 3+',        desc: 'Уровень лавиноопасности ≥ 3' },
  { key: 'weakLayers',      label: 'Долгоживущие проблемы',          desc: 'Слабые слои (lawis.at)' },
  { key: 'slabAvalanche',   label: 'Лавины из доски',                desc: 'Признаки схода сегодня / вчера' },
  { key: 'instability',     label: 'Нестабильность снега',           desc: 'Вумфинг, трещины, гулкий звук' },
  { key: 'recentLoading',   label: 'Недавнее возрастание нагрузки',  desc: '≥ 30 см за 48 ч, ветер, дождь' },
  { key: 'criticalWarming', label: 'Критическое потепление',         desc: 'Потепление от 0 °С, мокрый снег' },
];

const scoreColor = (s: number): string =>
  s <= 1 ? MD3.riskGreen : s <= 3 ? MD3.riskYellow : MD3.riskRed;

export default function WeatherSheet({ weather, onSave, onClose, visible }: Props) {
  const [local,    setLocal]    = useState<WeatherData>(() => ({ ...weather }));
  const [expanded, setExpanded] = useState<ElevationBand | null>(null);
  const [isDesktop, setIsDesktop] = React.useState(false);
  const startYRef = useRef<number | null>(null);

  React.useEffect(() => { setLocal({ ...weather }); }, [weather]);

  React.useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  const updateField = (band: ElevationBand, key: keyof WeatherScore, value: boolean) =>
    setLocal(prev => ({ ...prev, [band]: { ...prev[band], [key]: value } }));

  const saveBand = (band: ElevationBand) => {
    const updated = { ...local, [band]: { ...local[band], lastUpdated: new Date().toISOString() } };
    setLocal(updated);
    setExpanded(null);
    onSave(updated);
  };

  const handleSaveAll = () => {
    const stamped = { ...local };
    for (const band of ALL_BANDS) {
      const ws = stamped[band];
      const hasFlags = ['dangerLevel3','weakLayers','slabAvalanche','instability','recentLoading','criticalWarming']
        .some(k => ws[k as keyof WeatherScore]);
      if (!ws.lastUpdated && hasFlags)
        stamped[band] = { ...ws, lastUpdated: new Date().toISOString() };
    }
    onSave(stamped);
  };

  const handleTouchStart = (e: React.TouchEvent) => { startYRef.current = e.touches[0].clientY; };
  const handleTouchEnd   = (e: React.TouchEvent) => {
    if (startYRef.current === null) return;
    if (e.changedTouches[0].clientY - startYRef.current > 60) onClose();
    startYRef.current = null;
  };

  const fmt = (iso: string | null) => {
    if (!iso) return null;
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const body = (
    <>
      <p style={{ fontSize: '13px', color: MD3.onSurfaceVariant, marginBottom: '20px', lineHeight: 1.5 }}>
        Сохраните диапазон — склоны перекрасятся автоматически
      </p>

      {ALL_BANDS.map(band => {
        const ws      = local[band] ?? defaultWeatherScore();
        const score   = calcWeatherBandScore(ws);
        const hasData = !!ws.lastUpdated;
        const isOpen  = expanded === band;
        const dot     = hasData ? scoreColor(score) : MD3.outlineVariant;

        return (
          <div key={band} style={{ marginBottom: '10px' }}>
            <button
              onClick={() => setExpanded(isOpen ? null : band)}
              style={{
                width: '100%', padding: '13px 16px',
                background: isOpen ? MD3.primaryContainer : MD3.surfaceContainer,
                border: isOpen ? `1.5px solid ${MD3.primary}` : `1px solid ${MD3.outlineVariant}`,
                borderRadius: isOpen ? `${MD3.radiusSmall} ${MD3.radiusSmall} 0 0` : MD3.radiusSmall,
                cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'all 0.18s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', background: dot,
                  flexShrink: 0
                }} />
                <span style={{ fontSize: '15px', fontWeight: 600, color: MD3.onSurface }}>{BAND_LABELS[band]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasData
                  ? <span style={{ fontSize: '12px', color: MD3.onSurfaceVariant }}>{score} б · {fmt(ws.lastUpdated)}</span>
                  : <span style={{ fontSize: '12px', color: MD3.outline }}>Не заполнено</span>
                }
                <span style={{
                  fontSize: '11px', color: MD3.outline,
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.18s'
                }}>▼</span>
              </div>
            </button>

            {isOpen && (
              <div style={{
                background: MD3.surfaceContainer,
                border: `1.5px solid ${MD3.primary}`,
                borderTop: 'none',
                borderRadius: `0 0 ${MD3.radiusSmall} ${MD3.radiusSmall}`,
                padding: '14px 16px 12px'
              }}>
                {CHECKLIST.map(({ key, label, desc }) => (
                  <div
                    key={key}
                    onClick={() => updateField(band, key, !ws[key as keyof WeatherScore])}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '10px 0',
                      borderBottom: `1px solid ${MD3.outlineVariant}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '6px',
                      flexShrink: 0, marginTop: '1px',
                      background: ws[key as keyof WeatherScore] ? MD3.primary : MD3.surface,
                      border: ws[key as keyof WeatherScore] ? 'none' : `2px solid ${MD3.outline}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s'
                    }}>
                      {ws[key as keyof WeatherScore] && (
                        <span style={{ color: MD3.onPrimary, fontSize: '13px', fontWeight: 700 }}>✓</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: MD3.onSurface }}>{label}</div>
                      <div style={{ fontSize: '12px', color: MD3.onSurfaceVariant, marginTop: '2px' }}>{desc}</div>
                    </div>
                  </div>
                ))}
                <button onClick={() => saveBand(band)} style={{
                  marginTop: '12px', width: '100%', padding: '12px',
                  fontSize: '14px', fontWeight: 600,
                  background: MD3.primary, color: MD3.onPrimary,
                  border: 'none', borderRadius: MD3.radiusSmall,
                  cursor: 'pointer', boxShadow: 'none'
                }}>Сохранить и пересчитать ↑</button>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={handleSaveAll} style={{
        width: '100%', padding: '14px', fontSize: '15px', fontWeight: 600,
        background: MD3.onSurface, color: MD3.surface,
        border: 'none', borderRadius: MD3.radiusMedium,
        cursor: 'pointer', marginTop: '8px', boxShadow: 'none'
      }}>Сохранить все диапазоны</button>
    </>
  );

  if (isDesktop) {
    return (
      <SidePanel title="Погодные условия" onClose={onClose} visible={visible}>
        {body}
      </SidePanel>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: visible ? 'auto' : 'none' }}>
      {visible && (
        <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.32)' }} />
      )}
      <div
        onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          background: MD3.surface,
          borderRadius: '28px 28px 0 0',
          padding: '0 20px 40px',
          maxHeight: '88vh', overflowY: 'auto',
          boxShadow: '0 -1px 0 ' + MD3.outlineVariant,
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.2,0,0,1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
          <div style={{ width: '32px', height: '4px', borderRadius: '2px', background: MD3.outlineVariant }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: MD3.onSurface, margin: 0 }}>Погода</h2>
          <button onClick={onClose} style={iconBtnStyle}>✕</button>
        </div>
        {body}
      </div>
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '50%',
  border: 'none', background: MD3.surfaceVariant,
  cursor: 'pointer', fontSize: '14px',
  color: MD3.onSurfaceVariant,
  display: 'flex', alignItems: 'center', justifyContent: 'center'
};
