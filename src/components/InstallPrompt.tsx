import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos       = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed   = localStorage.getItem('install_prompt_dismissed');
    if (isIos && !isStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '90px', left: '12px', right: '12px',
      background: 'rgba(255,255,255,.78)',
      backdropFilter: 'blur(40px) saturate(200%)',
      WebkitBackdropFilter: 'blur(40px) saturate(200%)',
      borderRadius: '18px',
      border: '1px solid rgba(255,255,255,.55)',
      padding: '14px 16px',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 22,
      display: 'flex', alignItems: 'flex-start', gap: '13px'
    }}>
      <span style={{ fontSize: '26px', lineHeight: 1, marginTop: '1px' }}>📲</span>
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'var(--font)', fontSize: '15px', fontWeight: 700,
          letterSpacing: '-.3px', color: 'var(--c-label)', marginBottom: '3px'
        }}>Установить приложение</div>
        <div style={{
          fontFamily: 'var(--font)', fontSize: '13px', lineHeight: 1.4,
          letterSpacing: '-.1px', color: 'var(--c-label-2)'
        }}>
          Нажмите <strong>Поделиться →</strong> затем <strong>«На экран Домой»</strong>
        </div>
      </div>
      <button
        onClick={() => { localStorage.setItem('install_prompt_dismissed', '1'); setShow(false); }}
        style={{
          background: 'none', border: 'none',
          fontSize: '16px', lineHeight: 1,
          color: 'var(--c-label-3)', cursor: 'pointer',
          padding: '2px 4px', marginTop: '1px'
        }}
      >✕</button>
    </div>
  );
}
