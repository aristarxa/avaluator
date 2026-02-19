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
    <aside className="side-panel" aria-label={title}>
      <header className="side-panel-header">
        <span className="sheet-title">{title}</span>
        <button className="btn-icon" onClick={onClose} aria-label="Закрыть">✕</button>
      </header>
      <div className="side-panel-body">{children}</div>
    </aside>
  );
}
