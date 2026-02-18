import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    else setDismissed(true);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: '120px', right: '16px',
      background: '#1a1a2e', color: '#fff',
      padding: '12px 16px', borderRadius: '14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
      zIndex: 50, maxWidth: '220px',
      display: 'flex', flexDirection: 'column', gap: '10px'
    }}>
      <div style={{ fontSize: '13px', lineHeight: 1.4 }}>
        Установите Приложение для работы оффлайн
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleInstall}
          style={{ flex: 1, padding: '8px', background: '#1565C0', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >
          Установить
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
