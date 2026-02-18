import React from 'react';

export type ActiveTool = 'draw' | 'weather' | null;

interface Props {
  activeTool: ActiveTool;
  onToolSelect: (tool: ActiveTool) => void;
  slopeAngleVisible: boolean;
  onToggleSlopeAngle: () => void;
}

const DrawIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="3,21 12,3 21,21 12,17" />
    <line x1="3" y1="21" x2="12" y2="17" />
  </svg>
);

const WeatherIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
    <line x1="8" y1="19" x2="8" y2="21" />
    <line x1="8" y1="13" x2="8" y2="15" />
    <line x1="16" y1="19" x2="16" y2="21" />
    <line x1="16" y1="13" x2="16" y2="15" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="12" y1="15" x2="12" y2="17" />
  </svg>
);

const SlopeAngleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 20 L21 4" />
    <path d="M3 20 L21 20" />
    <path d="M21 4 L21 20" />
  </svg>
);

export default function Toolbar({ activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle }: Props) {
  const handleDraw = () => onToolSelect(activeTool === 'draw' ? null : 'draw');
  const handleWeather = () => onToolSelect(activeTool === 'weather' ? null : 'weather');

  return (
    <div style={{
      position: 'fixed',
      bottom: '32px',
      left: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      zIndex: 20
    }}>
      {/* Slope angle toggle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={onToggleSlopeAngle}
          style={toolBtnStyle(slopeAngleVisible)}
          aria-label="Углы склонов"
          title="Тепловая разметка углов"
        >
          <SlopeAngleIcon />
        </button>
        <span style={labelStyle}>Углы</span>
      </div>

      {/* Draw slopes */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={handleDraw}
          style={toolBtnStyle(activeTool === 'draw')}
          aria-label="Разметка склона"
        >
          <DrawIcon />
        </button>
        <span style={labelStyle}>Разметка</span>
      </div>

      {/* Weather conditions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
        <button
          onClick={handleWeather}
          style={toolBtnStyle(activeTool === 'weather')}
          aria-label="Погодные условия"
        >
          <WeatherIcon />
        </button>
        <span style={labelStyle}>Погода</span>
      </div>
    </div>
  );
}

function toolBtnStyle(active: boolean): React.CSSProperties {
  return {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    border: active ? '3px solid #1565C0' : '2px solid rgba(255,255,255,0.6)',
    background: active ? 'rgba(21,101,192,0.15)' : 'rgba(255,255,255,0.92)',
    boxShadow: active
      ? '0 0 0 3px rgba(21,101,192,0.25), 0 3px 10px rgba(0,0,0,0.2)'
      : '0 2px 8px rgba(0,0,0,0.2)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: active ? '#1565C0' : '#1a1a2e',
    transition: 'all 0.15s ease'
  };
}

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  color: 'rgba(255,255,255,0.9)',
  textShadow: '0 1px 3px rgba(0,0,0,0.6)',
  fontWeight: 600,
  letterSpacing: '0.3px',
  userSelect: 'none'
};
