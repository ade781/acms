import React from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import Button from './Button';

/**
 * Reusable 3-state data presenter: Loading, Error, Empty
 */
export default function StateView({
  loading = false,
  error = null,
  isEmpty = false,
  loadingText = 'Memuat data operasional...',
  emptyTitle = 'Belum Ada Data',
  emptyDescription = 'Tidak ada catatan atau item yang ditemukan pada shift ini.',
  emptyAction,
  onRetry,
  children,
}) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600">{loadingText}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center my-4 max-w-lg mx-auto">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h4 className="text-base font-bold text-red-900 mb-1">Terjadi Kendala Memuat Data</h4>
        <p className="text-xs text-red-700 mb-4">{error}</p>
        {onRetry && (
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={onRetry} className="bg-white">
            Coba Muat Ulang
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center my-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
          <Inbox className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-slate-800 mb-1">{emptyTitle}</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">{emptyDescription}</p>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  return <>{children}</>;
}
