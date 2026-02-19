import React from 'react';

interface Props {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  visible: boolean;
}

export default function SidePanel({ children, title, onClose, visible }: Props) {
  if (!visible) return null;
  return (
    <aside className="m3-side-panel" aria-label={title}>
      {/* Header */}
      <header className="m3-sheet-header">
        <span className="m3-sheet-title">{title}</span>
        <button
          className="m3-icon-btn"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <span className="material-symbols-rounded">close</span>
        </button>
      </header>
      {/* Body */}
      <div className="m3-sheet-body" style={{ flex: 1 }}>
        {children}
      </div>
    </aside>
  );
}
