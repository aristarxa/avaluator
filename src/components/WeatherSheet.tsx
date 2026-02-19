import React, { useState, useRef } from 'react';
import type { WeatherData, ElevationBand, WeatherScore } from '../types';
import { ALL_BANDS, defaultWeatherScore } from '../types';
import { calcWeatherBandScore } from '../services/riskCalculator';
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
  { key: 'criticalWarming', label: 'Критическое потепление',         desc: 'От 0 °С, мокрый снег' },
];

const scoreColor = (s: number) =>
  s <= 1 ? 'var(--c-risk-green)' : s <= 3 ? 'var(--c-risk-yellow)' : 'var(--c-risk-red)';

export default function WeatherSheet({ weather, onSave, onClose, visible }: Props) {
  const [local,     setLocal]     = useState<WeatherData>(() => ({ ...weather }));
  const [expanded,  setExpanded]  = useState<ElevationBand | null>(null);
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
      const hasFlags = (Object.keys(ws) as (keyof WeatherScore)[])
        .filter(k => k !== 'lastUpdated')
        .some(k => ws[k]);
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
      <p style={{ fontSize: '13px', color: 'var(--c-label-2)', lineHeight: 1.5, letterSpacing: '-.1px' }}>
        Сохраните диапазон — склоны перекрасятся автоматически
      </p>

      {ALL_BANDS.map(band => {
        const ws      = local[band] ?? defaultWeatherScore();
        const score   = calcWeatherBandScore(ws);
        const hasData = !!ws.lastUpdated;
        const isOpen  = expanded === band;
        const dotClr  = hasData ? scoreColor(score) : 'var(--c-label-3)';

        return (
          <div key={band}>
            <button
              className={`accordion-btn${isOpen ? ' open' : ''}`}
              onClick={() => setExpanded(isOpen ? null : band)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotClr, flexShrink: 0 }} />
                <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.2px', color: 'var(--c-label)' }}>
                  {BAND_LABELS[band]}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasData
                  ? <span style={{ fontSize: '12px', color: 'var(--c-label-2)' }}>{score} б · {fmt(ws.lastUpdated)}</span>
                  : <span style={{ fontSize: '12px', color: 'var(--c-label-3)' }}>Не заполнено</span>
                }
                <span style={{
                  fontSize: '10px', color: 'var(--c-label-3)',
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform var(--t-fast)'
                }}>▼</span>
              </div>
            </button>

            {isOpen && (
              <div className="accordion-body">
                {CHECKLIST.map(({ key, label, desc }) => {
                  const checked = !!ws[key as keyof WeatherScore];
                  return (
                    <div
                      key={key}
                      className={`check-row${checked ? ' checked' : ''}`}
                      style={{ borderRadius: 'var(--r-sm)', marginBottom: '4px' }}
                      onClick={() => updateField(band, key, !ws[key as keyof WeatherScore])}
                    >
                      <div className={`check-box${checked ? ' checked' : ''}`}>
                        {checked && <span className="check-tick">✓</span>}
                      </div>
                      <div>
                        <div className="check-title">{label}</div>
                        <div className="check-desc">{desc}</div>
                      </div>
                    </div>
                  );
                })}
                <button
                  className="btn-primary"
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={() => saveBand(band)}
                >
                  Сохранить и пересчитать
                </button>
              </div>
            )}
          </div>
        );
      })}

      <button className="btn-secondary" style={{ width: '100%' }} onClick={handleSaveAll}>
        Сохранить все диапазоны
      </button>
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
      {visible && <div className="sheet-backdrop" onClick={onClose} />}
      <div
        className="sheet"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ transform: visible ? 'translateY(0)' : 'translateY(100%)', transition: 'transform var(--t-spring)' }}
      >
        <div className="sheet-handle" />
        <header className="sheet-header">
          <span className="sheet-title">Погода</span>
          <button className="btn-icon" onClick={onClose} aria-label="Закрыть">✕</button>
        </header>
        <div className="sheet-body">{body}</div>
      </div>
    </div>
  );
}
