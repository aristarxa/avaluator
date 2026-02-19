/**
 * Desktop side panel — shown on screens wider than 768px.
 * Renders the same content as SlopeSheet / WeatherSheet but
 * as a persistent right-side panel instead of a bottom sheet.
 */
import React from 'react';
import { MD3 } from '../theme';
import type { SlopePolygon, WeatherData } from '../types';

interface Props {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  visible: boolean;
}

export default function SidePanel({ children, title, onClose, visible }: Props) {
  if (!visible) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: '380px',
      background: MD3.surface,
      borderLeft: `1px solid ${MD3.outlineVariant}`,
      display: 'flex', flexDirection: 'column',
      zIndex: 30,
      transform: visible ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.28s cubic-bezier(0.2,0,0,1)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 20px 16px',
        borderBottom: `1px solid ${MD3.outlineVariant}`,
        position: 'sticky', top: 0,
        background: MD3.surface,
        zIndex: 1,
      }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: MD3.onSurface }}>{title}</span>
        <button
          onClick={onClose}
          style={{
            width: '40px', height: '40px', borderRadius: '50%',
            border: 'none', background: MD3.surfaceVariant,
            cursor: 'pointer', fontSize: '16px',
            color: MD3.onSurfaceVariant,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>
      {/* Body */}
      <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}
