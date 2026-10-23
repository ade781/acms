import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function MobileCancelLeaveConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  personnelName = '',
  reason = 'cuti',
  loading = false,
}) {
  if (!isOpen) return null;

  const formatReason = (r) => {
    switch (r) {
      case 'cuti':
        return 'Cuti Tahunan';
      case 'sakit':
        return 'Sakit';
      case 'dinas':
        return 'Dinas Luar';
      case 'tukar_dinas':
        return 'Tukar Dinas';
      default:
        return r || 'Izin/Cuti';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Konfirmasi Pembatalan Cuti
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
            disabled={loading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            Batalkan pengajuan izin/cuti untuk{' '}
            <strong className="text-slate-900 font-bold">{personnelName || 'personel ini'}</strong>?
          </p>
          <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200 text-[11px] text-amber-900">
            <span className="font-semibold">Kategori Saat Ini: </span>
            <span className="uppercase font-bold">{formatReason(reason)}</span>
            <p className="mt-1 text-[10px] text-amber-800">
              Personel akan dikembalikan ke status aktif dinas dan siap diploting ke unit armada.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors duration-100"
          >
            Kembali
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors duration-100 disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Ya, Batalkan Cuti'}
          </button>
        </div>
      </div>
    </div>
  );
}
