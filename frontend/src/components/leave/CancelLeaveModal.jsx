import React from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { getReasonBadge } from '../../utils/leaveHelpers';

export default function CancelLeaveModal({
  isOpen = false,
  onClose,
  targetLeave = null,
  onConfirm,
  deleting = false,
  loading = false,
}) {
  if (!isOpen || !targetLeave) return null;

  const isDeleting = deleting || loading;
  const dateDisplay = targetLeave.start_date && targetLeave.end_date && targetLeave.start_date !== targetLeave.end_date
    ? `${targetLeave.start_date} s/d ${targetLeave.end_date}`
    : (targetLeave.start_date || targetLeave.shift_date || 'Shift Aktif');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Konfirmasi Pembatalan Cuti / Izin"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            Kembali
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            loading={isDeleting}
          >
            Ya, Batalkan Cuti Ini
          </Button>
        </>
      }
    >
      <div className="space-y-3 text-xs text-slate-700">
        <p>
          Apakah Anda yakin ingin membatalkan pengajuan cuti ini? Personel yang bersangkutan akan dikembalikan ke status aktif berdinas.
        </p>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
          <div className="font-bold text-slate-900 text-sm">
            {targetLeave.personnel_name || targetLeave.full_name || targetLeave.name || `Personel #${targetLeave.personnel_id}`}
          </div>
          <div className="text-slate-600 flex items-center gap-2">
            <span>Periode: <strong className="font-mono tabular-nums text-slate-800">{dateDisplay}</strong></span>
            {targetLeave.days_count && (
              <span className="text-xs text-slate-500 font-sans">
                (<span className="font-mono tabular-nums">{targetLeave.days_count}</span> Hari)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-slate-500">Kategori:</span>
            {getReasonBadge(targetLeave.absent_reason || targetLeave.reason)}
          </div>
        </div>
        <p className="text-slate-500 text-xs">
          Tindakan ini akan menghapus catatan izin/cuti untuk seluruh rentang tanggal pengajuan yang berkaitan.
        </p>
      </div>
    </Modal>
  );
}
