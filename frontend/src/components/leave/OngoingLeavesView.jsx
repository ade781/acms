import React, { useState, useMemo } from 'react';
import { CalendarCheck, CheckCircle, Trash2 } from 'lucide-react';
import { TEAMS, cleanTeam } from '../../utils/shiftHelper';
import StateView from '../common/StateView';
import { cleanNotes, getReasonBadge } from '../../utils/leaveHelpers';

/**
 * Helper penentu badge status cuti tri-state:
 * 1. "Sedang Berjalan" (hari ini di antara start_date dan end_date) - badge kuning/amber
 * 2. "Akan Datang" (start_date > hari ini) - badge biru/slate netral
 * 3. "Selesai" (end_date < hari ini) - badge hijau
 */
export const getLeaveStatusBadge = (item) => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const startDate = item.start_date || item.shift_date;
  const endDate = item.end_date || item.shift_date;

  if (startDate && startDate > today) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Akan Datang
      </span>
    );
  }

  if (endDate && endDate < today) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Selesai
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
      Sedang Berjalan
    </span>
  );
};

export default function OngoingLeavesView({
  ongoingLeaves = [],
  loading = false,
  error = null,
  onRetry,
  activeTeam = 'Alpha',
  user,
  isAdmin = false,
  isSupervisor = false,
  onRequestCancelLeave,
}) {
  const [filterScope, setFilterScope] = useState('ALL'); // 'ALL' | 'CURRENT' | 'SPECIFIC'
  const [specificTeam, setSpecificTeam] = useState('ALL');

  const currentTeam = cleanTeam(activeTeam) || 'Alpha';

  // Hitung jumlah cuti untuk regu shift aktif
  const currentShiftLeavesCount = useMemo(() => {
    return ongoingLeaves.filter((item) => {
      const itemTeam = cleanTeam(item.personnel_team || item.shift_team || item.team);
      return itemTeam === currentTeam;
    }).length;
  }, [ongoingLeaves, currentTeam]);

  // Filter daftar cuti berdasarkan scope yang dipilih
  const filteredLeaves = useMemo(() => {
    if (filterScope === 'CURRENT') {
      return ongoingLeaves.filter((item) => {
        const itemTeam = cleanTeam(item.personnel_team || item.shift_team || item.team);
        return itemTeam === currentTeam;
      });
    }
    if (filterScope === 'SPECIFIC' && specificTeam !== 'ALL') {
      return ongoingLeaves.filter((item) => {
        const itemTeam = cleanTeam(item.personnel_team || item.shift_team || item.team);
        return itemTeam === specificTeam;
      });
    }
    return ongoingLeaves;
  }, [ongoingLeaves, filterScope, currentTeam, specificTeam]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Daftar Izin & Cuti Berjalan
            </h4>
          </div>
        </div>

        {/* Quick-Filter Chips: Semua Regu vs Regu Shift Ini */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 text-xs">
            <button
              type="button"
              onClick={() => {
                setFilterScope('ALL');
                setSpecificTeam('ALL');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors duration-100 cursor-pointer ${
                filterScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Regu
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums bg-slate-200/70 text-slate-700 font-bold">
                {ongoingLeaves.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterScope('CURRENT');
                setSpecificTeam('ALL');
              }}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors duration-100 cursor-pointer ${
                filterScope === 'CURRENT'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Regu Shift Ini ({currentTeam})
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums bg-amber-100 text-amber-800 font-bold">
                {currentShiftLeavesCount}
              </span>
            </button>
          </div>

          <select
            value={specificTeam}
            onChange={(e) => {
              const val = e.target.value;
              setSpecificTeam(val);
              if (val !== 'ALL') {
                setFilterScope('SPECIFIC');
              } else {
                setFilterScope('ALL');
              }
            }}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 cursor-pointer"
          >
            <option value="ALL">Pilih Regu Lain...</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>Regu {t}</option>
            ))}
          </select>
        </div>
      </div>

      <StateView loading={loading} error={error} onRetry={onRetry}>
        {filteredLeaves.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">
              {filterScope === 'CURRENT'
                ? `Tidak Ada Cuti di Regu ${currentTeam}`
                : filterScope === 'SPECIFIC'
                ? `Tidak Ada Cuti di Regu ${specificTeam}`
                : 'Tidak Ada Cuti yang Berjalan'}
            </p>
            <p className="text-slate-400 mt-0.5">
              {filterScope === 'CURRENT'
                ? `Saat ini tidak ada personel Regu ${currentTeam} yang sedang dalam status cuti berjalan.`
                : filterScope === 'SPECIFIC'
                ? `Saat ini tidak ada personel Regu ${specificTeam} yang sedang dalam status cuti berjalan.`
                : 'Saat ini tidak ada personel operasional yang tercatat sedang dalam status cuti berjalan.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase text-xs tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-4 w-48">Periode Cuti</th>
                  <th className="py-3 px-4 w-36 text-center">Status</th>
                  <th className="py-3 px-4">Nama Personel & NIP</th>
                  <th className="py-3 px-4 w-28">Regu</th>
                  <th className="py-3 px-4 w-32">Kategori</th>
                  <th className="py-3 px-4">Keterangan / Alasan</th>
                  <th className="py-3 px-4 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLeaves.map((item, idx) => {
                  const isMyOwnLeave = user?.personnel_id && Number(user.personnel_id) === Number(item.personnel_id);
                  const canDeleteThis = isAdmin || isSupervisor || isMyOwnLeave;
                  const dateDisplay = item.start_date && item.end_date && item.start_date !== item.end_date
                    ? `${item.start_date} s/d ${item.end_date}`
                    : (item.start_date || item.shift_date || '-');

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
                      <td className="py-3 px-4 text-center">
                        {getLeaveStatusBadge(item)}
                      </td>
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
        )}
      </StateView>
    </div>
  );
}