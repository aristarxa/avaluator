import React from 'react';

export type ActiveTool = 'draw' | 'weather' | null;

interface Props {
  activeTool: ActiveTool;
  onToolSelect: (tool: ActiveTool) => void;
  slopeAngleVisible: boolean;
  onToggleSlopeAngle: () => void;
}

const tools: {
  id: 'draw' | 'weather' | 'slope';
  icon: string;   // Material Symbol ligature
  label: string;
}[] = [
  { id: 'draw',    icon: 'edit',             label: 'Склон'  },
  { id: 'weather', icon: 'ac_unit',          label: 'Погода' },
  { id: 'slope',   icon: 'landscape',        label: 'Уклон'  },
];

/** Mobile: MD3 Navigation Bar */
export default function Toolbar({
  activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle
}: Props) {
  return (
    <nav className="m3-nav-bar" role="navigation" aria-label="Главная навигация">
      {tools.map(({ id, icon, label }) => {
        const isSlope  = id === 'slope';
        const isActive = isSlope ? slopeAngleVisible : activeTool === id;
        return (
          <button
            key={id}
            className={`m3-nav-item${isActive ? ' active' : ''}`}
            onClick={() => isSlope ? onToggleSlopeAngle() : onToolSelect(id)}
            aria-label={label}
            aria-pressed={isActive}
          >
            <span className="nav-indicator" />
            <span className={`material-symbols-rounded nav-icon${isActive ? ' filled' : ''}`}>
              {icon}
            </span>
            <span className="m3-nav-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** Desktop: MD3 FAB column (top-right) */
export function DesktopFABs({
  activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle
}: Props) {
  return (
    <div style={{
      position: 'fixed',
      top: '16px', right: '16px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      zIndex: 20,
    }}>
      {tools.map(({ id, icon, label }) => {
        const isSlope  = id === 'slope';
        const isActive = isSlope ? slopeAngleVisible : activeTool === id;
        return (
          <button
            key={id}
            className={`m3-fab${isActive ? ' active' : ''}`}
            onClick={() => isSlope ? onToggleSlopeAngle() : onToolSelect(id)}
            title={label}
            aria-label={label}
            aria-pressed={isActive}
          >
            <span className={`material-symbols-rounded${isActive ? ' filled' : ''}`}
              style={{ fontSize: '24px' }}>
              {icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}
