import React, { useEffect, useState } from 'react';

export default function InstallPrompt() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos     = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
    const dismissed   = localStorage.getItem('install_prompt_dismissed');
    if (isIos && !isStandalone && !dismissed) setShow(true);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '100px', left: '16px', right: '16px',
      background: 'rgba(255,255,255,0.80)',
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
      borderRadius: '20px', padding: '16px 18px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      border: '1px solid rgba(255,255,255,0.6)',
      zIndex: 22, display: 'flex', alignItems: 'flex-start', gap: '14px'
    }}>
      <span style={{ fontSize: '28px', lineHeight: 1 }}>📲</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#1c1c1e', marginBottom: '3px' }}>Установить приложение</div>
        <div style={{ fontSize: '13px', color: 'rgba(60,60,67,0.6)', lineHeight: 1.4 }}>
          Нажмите <strong>Поделиться →</strong> затем <strong>«На экран Домой»</strong>
        </div>
      </div>
      <button
        onClick={() => { localStorage.setItem('install_prompt_dismissed', '1'); setShow(false); }}
        style={{
          background: 'none', border: 'none', fontSize: '18px',
          color: 'rgba(60,60,67,0.4)', cursor: 'pointer', padding: '0 4px'
        }}
      >✕</button>
    </div>
  );
}
