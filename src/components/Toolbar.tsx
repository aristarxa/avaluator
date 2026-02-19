import React from 'react';
import { MD3 } from '../theme';

export type ActiveTool = 'draw' | 'weather' | null;

interface Props {
  activeTool: ActiveTool;
  onToolSelect: (tool: ActiveTool) => void;
  slopeAngleVisible: boolean;
  onToggleSlopeAngle: () => void;
}

const tools: { id: 'draw' | 'weather' | 'slope'; icon: string; label: string }[] = [
  { id: 'draw',    icon: '✏️',  label: 'Склон'  },
  { id: 'weather', icon: '❄️',  label: 'Погода' },
  { id: 'slope',   icon: '📐',  label: 'Уклон'  },
];

export default function Toolbar({ activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle }: Props) {
  return (
    <div style={{
      position: 'fixed',
      // On mobile: bottom center. On desktop: top-right vertical stack.
      bottom: 'env(safe-area-inset-bottom, 0px)',
      right: 0,
      left: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: '20px',
      zIndex: 20,
      pointerEvents: 'none',
    }}>
      {/* Mobile: horizontal pill */}
      <div className="toolbar-mobile" style={{
        display: 'flex',
        gap: '12px',
        padding: '10px 16px',
        background: MD3.surface,
        borderRadius: MD3.radiusFull,
        border: `1px solid ${MD3.outlineVariant}`,
        boxShadow: 'none',
        pointerEvents: 'auto',
      }}>
        {tools.map(({ id, icon, label }) => {
          const isSlope  = id === 'slope';
          const isActive = isSlope ? slopeAngleVisible : activeTool === id;
          return (
            <button
              key={id}
              onClick={() => isSlope ? onToggleSlopeAngle() : onToolSelect(id)}
              title={label}
              style={{
                width: '52px', height: '52px',
                borderRadius: '50%',
                border: 'none',
                background: isActive ? MD3.primaryContainer : MD3.surfaceVariant,
                color:      isActive ? MD3.onPrimaryContainer : MD3.onSurfaceVariant,
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: '2px',
                transition: 'background 0.18s',
                boxShadow: 'none',
                outline: isActive ? `2px solid ${MD3.primary}` : 'none',
                outlineOffset: '2px',
              }}
            >
              <span style={{ fontSize: '20px', lineHeight: 1 }}>{icon}</span>
              <span style={{
                fontSize: '9px', fontWeight: 600,
                letterSpacing: '0.3px',
                color: isActive ? MD3.primary : MD3.onSurfaceVariant,
                lineHeight: 1,
              }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Desktop FAB column — rendered separately, top-right */
export function DesktopFABs({ activeTool, onToolSelect, slopeAngleVisible, onToggleSlopeAngle }: Props) {
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
            onClick={() => isSlope ? onToggleSlopeAngle() : onToolSelect(id)}
            title={label}
            style={{
              width: '56px', height: '56px',
              borderRadius: '50%',
              border: 'none',
              background: isActive ? MD3.primary : MD3.surface,
              color:      isActive ? MD3.onPrimary : MD3.onSurfaceVariant,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              transition: 'background 0.18s',
              boxShadow: 'none',
              outline: `1px solid ${isActive ? MD3.primary : MD3.outlineVariant}`,
              outlineOffset: '-1px',
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
