import React from 'react';
import { CalendarCheck, CheckCircle, Trash2 } from 'lucide-react';
import { TEAMS } from '../../utils/shiftHelper';
import StateView from '../common/StateView';
import { cleanNotes, getReasonBadge } from '../../utils/leaveHelpers';

export default function OngoingLeavesView({
  ongoingLeaves = [],
  loading = false,
  error = null,
  onRetry,
  ongoingTeam = 'ALL',
  setOngoingTeam,
  user,
  isAdmin = false,
  isSupervisor = false,
  onRequestCancelLeave,
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Daftar Izin & Cuti Berjalan (Status Berjalan)
            </h4>
          </div>
        </div>

        {/* Filter Regu */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={ongoingTeam}
            onChange={(e) => setOngoingTeam(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-arff-primary"
          >
            <option value="ALL">Semua Regu</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>Regu {t}</option>
            ))}
          </select>
        </div>
      </div>

      <StateView loading={loading} error={error} onRetry={onRetry}>
        {ongoingLeaves.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">Tidak Ada Cuti yang Berjalan</p>
            <p className="text-slate-400 mt-0.5">
              Saat ini tidak ada personel operasional yang tercatat sedang dalam status cuti berjalan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 w-48">Periode Cuti</th>
                  <th className="py-3 px-4 w-28 text-center">Status</th>
                  <th className="py-3 px-4">Nama Personel & NIP</th>
                  <th className="py-3 px-4 w-28">Regu</th>
                  <th className="py-3 px-4 w-32">Kategori</th>
                  <th className="py-3 px-4">Keterangan / Alasan</th>
                  <th className="py-3 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {ongoingLeaves.map((item, idx) => {
                  const isMyOwnLeave = user?.personnel_id && Number(user.personnel_id) === Number(item.personnel_id);
                  const canDeleteThis = isAdmin || isSupervisor || isMyOwnLeave;
                  const dateDisplay = item.start_date && item.end_date && item.start_date !== item.end_date
                    ? `${item.start_date} s/d ${item.end_date}`
                    : (item.start_date || item.shift_date || '-');

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition-colors duration-100">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-800">
                        <div className="font-semibold">{dateDisplay}</div>
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                          Durasi: <span className="font-bold text-slate-700">{item.days_count || 1} Hari</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Berjalan
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {item.personnel_name || `Personel #${item.personnel_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NIP: {item.personnel_nip || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Regu {item.personnel_team || item.shift_team || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getReasonBadge(item.absent_reason)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-sm">
                        {cleanNotes(item.notes || item.raw_notes)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canDeleteThis ? (
                          <button
                            type="button"
                            onClick={() => onRequestCancelLeave(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-100 inline-flex items-center justify-center"
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
        )}
      </StateView>
    </div>
  );
}
