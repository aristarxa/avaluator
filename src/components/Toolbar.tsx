import React from 'react';

export type ActiveTool = 'draw' | 'weather' | null;

interface Props {
  activeTool: ActiveTool;
  onToolSelect: (tool: ActiveTool) => void;
  slopeAngleVisible: boolean;
  onToggleSlopeAngle: () => void;
}

export default function Toolbar({ activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle }: Props) {
  const tools: { id: ActiveTool | 'slope'; icon: string; label: string }[] = [
    { id: 'draw',    icon: '✏️',  label: 'Склон' },
    { id: 'weather', icon: '🌨️', label: 'Погода' },
    { id: 'slope',   icon: '📐',  label: 'Уклон' },
  ];

  return (
    <>
      {/* Floating pill toolbar */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '8px 10px',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(40px) saturate(180%)',
        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        borderRadius: '28px',
        boxShadow: '0 1px 0 rgba(255,255,255,0.6) inset, 0 8px 32px rgba(0,0,0,0.18)',
        border: '1px solid rgba(255,255,255,0.55)'
      }}>
        {tools.map(({ id, icon, label }) => {
          const isSlope  = id === 'slope';
          const isActive = isSlope ? slopeAngleVisible : activeTool === id;

          return (
            <button
              key={id}
              onClick={() => {
                if (isSlope) onToggleSlopeAngle();
                else onToolSelect(id as ActiveTool);
              }}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '3px',
                padding: '10px 18px',
                borderRadius: '20px',
                border: 'none',
                background: isActive
                  ? 'rgba(0,122,255,0.18)'
                  : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.18s',
                minWidth: '64px'
              }}
            >
              <span style={{ fontSize: '22px', lineHeight: 1 }}>{icon}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#007AFF' : 'rgba(60,60,67,0.75)',
                letterSpacing: '-0.1px',
                lineHeight: 1.2
              }}>{label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
