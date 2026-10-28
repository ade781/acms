import React, { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Komponen Banner Deteksi Jaringan Offline
 * Memantau ketersediaan koneksi internet (navigator.onLine & online/offline events)
 * Tampil di bagian atas layar untuk memberi tahu petugas saat berada di blind spot apron.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
      return !navigator.onLine;
    }
    return false;
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 w-full bg-amber-500 text-amber-950 px-3 py-1.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 border-b border-amber-600/20"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0 text-amber-950" />
      <span className="text-[11px] leading-tight text-center">
        Mode Offline: Koneksi internet terputus. Pastikan sinyal stabil sebelum menyimpan data.
      </span>
    </div>
  );
}
