'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', durationMs = 3000) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, durationMs);
  }, []);

  const colors: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
    success: { bg: 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.3)', text: '#4ade80', icon: '✓' },
    error: { bg: 'rgba(239,68,68,.12)', border: 'rgba(239,68,68,.3)', text: '#f87171', icon: '✕' },
    info: { bg: 'rgba(96,165,250,.12)', border: 'rgba(96,165,250,.3)', text: '#93c5fd', icon: 'ℹ' },
    warning: { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.3)', text: '#fcd34d', icon: '⚠' },
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        width: '90%',
        maxWidth: '380px',
      }}>
        {toasts.map(toast => {
          const c = colors[toast.type];
          return (
            <div
              key={toast.id}
              style={{
                background: c.bg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${c.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                animation: 'toast-in .25s ease-out',
                pointerEvents: 'auto',
                boxShadow: '0 4px 20px rgba(0,0,0,.4)',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 800, color: c.text, flexShrink: 0, width: '20px', textAlign: 'center' }}>
                {c.icon}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: c.text, fontFamily: 'Barlow, sans-serif', lineHeight: 1.3 }}>
                {toast.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
