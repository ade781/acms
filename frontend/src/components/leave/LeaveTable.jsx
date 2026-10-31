import React from 'react';
import { Trash2, CheckCircle } from 'lucide-react';
import { cleanNotes, getReasonBadge } from '../../utils/leaveHelpers';

export default function LeaveTable({
  items = [],
  user,
  isAdmin = false,
  isSupervisor = false,
  onRequestCancelLeave,
  isOngoingOnly = false,
  emptyTitle = 'Tidak Ada Data Cuti',
  emptySubtitle = 'Tidak ditemukan catatan cuti atau izin yang sesuai.',
  emptyIcon = null,
}) {
  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-500">
        {emptyIcon || <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />}
        <p className="font-semibold text-slate-700">{emptyTitle}</p>
        <p className="text-slate-400 mt-0.5">{emptySubtitle}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-left text-xs border-collapse">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs tracking-wider">
          <tr>
            <th className="py-3 px-3 text-center w-12">No</th>
            <th className="py-3 px-4 w-48">Periode Cuti</th>
            {!isOngoingOnly && <th className="py-3 px-4 w-28 text-center">Status</th>}
            <th className="py-3 px-4">Nama Personel & NIP</th>
            <th className="py-3 px-4 w-28">Regu</th>
            <th className="py-3 px-4 w-32">Kategori</th>
            <th className="py-3 px-4">Keterangan / Alasan</th>
            <th className="py-3 px-4 text-center w-20">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {items.map((item, idx) => {
            const isMyOwnLeave = user?.personnel_id && Number(user.personnel_id) === Number(item.personnel_id);
            const canDeleteThis = isAdmin || isSupervisor || isMyOwnLeave;
            const dateDisplay = item.start_date && item.end_date && item.start_date !== item.end_date
              ? `${item.start_date} s/d ${item.end_date}`
              : (item.start_date || item.shift_date || '-');
            const isOngoing = isOngoingOnly || Boolean(item.is_ongoing);

            return (
              <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors duration-100">
                <td className="py-3 px-3 text-center text-slate-400 font-mono tabular-nums text-xs">
                  {idx + 1}
                </td>
                <td className="py-3 px-4 font-mono tabular-nums text-xs text-slate-800">
                  <div className="font-semibold">{dateDisplay}</div>
                  <div className="text-xs text-slate-500 font-sans mt-0.5">
                    Durasi: <span className="font-bold font-mono tabular-nums text-slate-700">{item.days_count || 1}</span> Hari
                  </div>
                </td>
                {!isOngoingOnly && (
                  <td className="py-3 px-4 text-center">
                    {isOngoing ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Berjalan
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Selesai
                      </span>
                    )}
                  </td>
                )}
                <td className="py-3 px-4">
                  <div className="font-bold text-slate-900">
                    {item.personnel_name || item.full_name || item.name || `Personel #${item.personnel_id}`}
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums mt-0.5">
                    NIP: {item.personnel_nip || item.nip || '-'}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Regu {item.personnel_team || item.shift_team || item.team || '-'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {getReasonBadge(item.absent_reason || item.reason)}
                </td>
                <td className="py-3 px-4 text-slate-600 max-w-sm">
                  {cleanNotes(item.notes || item.raw_notes)}
                </td>
                <td className="py-3 px-4 text-center">
                  {canDeleteThis ? (
                    <button
                      type="button"
                      onClick={() => onRequestCancelLeave && onRequestCancelLeave(item)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-100 inline-flex items-center justify-center cursor-pointer"
                      title="Batalkan seluruh hari pengajuan cuti ini"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  ) : (
                    <span className="text-slate-300">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
