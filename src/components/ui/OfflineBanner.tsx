'use client';
import { useState, useEffect } from 'react';

export default function OfflineBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const goOffline = () => setOnline(false);
    const goOnline = () => setOnline(true);
    
    setOnline(navigator.onLine);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (online) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 99998,
      background: 'rgba(239,68,68,.95)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      color: '#fff',
      textAlign: 'center',
      padding: '8px 16px',
      fontSize: '12px',
      fontWeight: 700,
      fontFamily: 'Barlow, sans-serif',
      letterSpacing: '.3px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    }}>
      <span style={{ fontSize: '14px' }}>📡</span>
      You're offline — scores won't sync until reconnected
    </div>
  );
}
