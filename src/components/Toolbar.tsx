import React from 'react';

export type ActiveTool = 'draw' | 'weather' | null;

interface Props {
  activeTool: ActiveTool;
  onToolSelect: (tool: ActiveTool) => void;
  slopeAngleVisible: boolean;
  onToggleSlopeAngle: () => void;
}

const tools: { id: 'draw' | 'weather' | 'slope'; emoji: string; label: string }[] = [
  { id: 'draw',    emoji: '\u270F\uFE0F', label: 'Склон'  },
  { id: 'weather', emoji: '\u2744\uFE0F',  label: 'Погода' },
  { id: 'slope',   emoji: '\uD83D\uDCD0',  label: 'Уклон'  },
];

/** Mobile: iOS-style navigation tab bar */
export default function Toolbar({ activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle }: Props) {
  return (
    <nav className="nav-bar">
      {tools.map(({ id, emoji, label }) => {
        const isSlope  = id === 'slope';
        const isActive = isSlope ? slopeAngleVisible : activeTool === id;
        return (
          <button
            key={id}
            className={`nav-item${isActive ? ' active' : ''}`}
            onClick={() => isSlope ? onToggleSlopeAngle() : onToolSelect(id)}
            aria-label={label}
            aria-pressed={isActive}
          >
            <span className="nav-icon">{emoji}</span>
            <span className="nav-item-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Desktop: frosted-glass FAB column (top-right) */
export function DesktopFABs({ activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle }: Props) {
  return (
    <div style={{ position: 'fixed', top: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 20 }}>
      {tools.map(({ id, emoji, label }) => {
        const isSlope  = id === 'slope';
        const isActive = isSlope ? slopeAngleVisible : activeTool === id;
        return (
          <div key={id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <button
              className={`fab${isActive ? ' active' : ''}`}
              onClick={() => isSlope ? onToggleSlopeAngle() : onToolSelect(id)}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
            >
              <span style={{ fontSize: '20px' }}>{emoji}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
