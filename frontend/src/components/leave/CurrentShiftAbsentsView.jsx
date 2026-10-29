import React from 'react';
import { UserX, CheckCircle, Trash2 } from 'lucide-react';
import StateView from '../common/StateView';
import { extractDateRange, cleanNotes, getReasonBadge } from '../../utils/leaveHelpers';

export default function CurrentShiftAbsentsView({
  absentList = [],
  teamPersonnel = [],
  loading = false,
  onRetry,
  user,
  activeDate = '',
  activeTeam = 'Alpha',
  isAdmin = false,
  isSupervisor = false,
  onRequestCancelLeave,
}) {
  return (
    <StateView loading={loading} onRetry={onRetry}>
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-arff-primary flex items-center justify-center flex-shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Daftar Personel Izin / Cuti Dinas (Shift Berjalan)
              </h4>
            </div>
          </div>
        </div>

        {/* TABEL KOMPAK DAFTAR CUTI & IZIN PERSONEL SHIFT BERJALAN */}
        {absentList.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">Seluruh Personel Hadir</p>
            <p className="text-slate-400 mt-0.5">
              Tidak ada personel regu yang tercatat cuti atau berhalangan pada shift ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4">Nama Personel & NIP</th>
                  <th className="py-3 px-4 w-28">Regu</th>
                  <th className="py-3 px-4 w-36">Kategori Izin</th>
                  <th className="py-3 px-4 w-44">Rentang Tanggal</th>
                  <th className="py-3 px-4">Keterangan / Alasan</th>
                  <th className="py-3 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {absentList.map((abs, idx) => {
                  const person = teamPersonnel.find((p) => Number(p.id) === Number(abs.personnel_id));
                  const isMyOwnLeave = user?.personnel_id && Number(user.personnel_id) === Number(abs.personnel_id);
                  const canDeleteThis = isAdmin || isSupervisor || isMyOwnLeave;
                  const pTeam = person?.team_group || abs.personnel_team || activeTeam;

                  return (
                    <tr key={abs.id || idx} className="hover:bg-slate-50/70 transition-colors duration-100">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {person?.full_name || abs.full_name || `Personel #${abs.personnel_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          NIP: {person?.nip || abs.nip || '-'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Regu {pTeam}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getReasonBadge(abs.reason)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 text-[11px]">
                        {extractDateRange(abs.notes, activeDate)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">
                        {cleanNotes(abs.notes)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {canDeleteThis ? (
                          <button
                            type="button"
                            onClick={() => onRequestCancelLeave(abs)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-100 inline-flex items-center justify-center"
                            title="Batalkan cuti ini dan kembalikan personel ke dinas aktif"
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
      </div>
    </StateView>
  );
}
