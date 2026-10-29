import React from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatIndoDate } from '../../../utils/shiftHelper';

export default function ShiftActivitiesModal({
  isOpen,
  onClose,
  currentTeam = 'A',
  activeDate,
  activeShiftNumber = 1,
  activities = [],
  getShiftLabel = (s) => `Shift ${s}`,
  getAttachmentUrl = (u) => u
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Logbook Kegiatan Operasional • Regu ${currentTeam}`}
      subtitle={`${formatIndoDate(activeDate)} • ${getShiftLabel(activeShiftNumber)}`}
      maxWidth="max-w-2xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      {activities.length === 0 ? (
        <div className="py-8 text-center text-xs text-slate-500">
          Belum ada kegiatan operasional yang dicatat pada shift ini.
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          {activities.map((act, idx) => (
            <div
              key={act.id || `act-${idx}`}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-slate-900 text-sm">
                  {typeof act.title === 'string'
                    ? act.title
                    : typeof act.activity_name === 'string'
                    ? act.activity_name
                    : 'Kegiatan Operasional'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700">
                    {act.activity_type || act.category || 'Rutin'}
                  </span>
                  <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {String(act.activity_time || '-').slice(0, 5)} WIB
                  </span>
                </div>
              </div>
              {act.description && (
                <p className="text-slate-700 leading-relaxed">{act.description}</p>
              )}
              {act.result_notes && (
                <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">
                  <strong>Hasil / Tindak Lanjut:</strong> {act.result_notes}
                </div>
              )}
              {act.attachment_url && (
                <div className="pt-2">
                  <img
                    src={getAttachmentUrl(act.attachment_url)}
                    alt="Dokumentasi kegiatan"
                    className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
