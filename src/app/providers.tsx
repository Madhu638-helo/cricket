'use client';
import { ToastProvider } from '@/components/ui/Toast';
import OfflineBanner from '@/components/ui/OfflineBanner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <OfflineBanner />
      {children}
    </ToastProvider>
  );
}
