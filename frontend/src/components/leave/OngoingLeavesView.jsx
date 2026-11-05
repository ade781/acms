import React, { useState, useMemo } from 'react';
import { CalendarCheck, CheckCircle } from 'lucide-react';
import { TEAMS, cleanTeam } from '../../utils/shiftHelper';
import StateView from '../common/StateView';
import LeaveTable from './LeaveTable';

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
        <LeaveTable
          items={filteredLeaves}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onRequestCancelLeave={onRequestCancelLeave}
          isOngoingOnly={true}
          emptyTitle={
            filterScope === 'CURRENT'
              ? `Tidak Ada Cuti di Regu ${currentTeam}`
              : filterScope === 'SPECIFIC'
              ? `Tidak Ada Cuti di Regu ${specificTeam}`
              : 'Tidak Ada Cuti yang Berjalan'
          }
          emptySubtitle={
            filterScope === 'CURRENT'
              ? `Saat ini tidak ada personel Regu ${currentTeam} yang sedang dalam status cuti berjalan.`
              : filterScope === 'SPECIFIC'
              ? `Saat ini tidak ada personel Regu ${specificTeam} yang sedang dalam status cuti berjalan.`
              : 'Saat ini tidak ada personel operasional yang tercatat sedang dalam status cuti berjalan.'
          }
          emptyIcon={<CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />}
        />
      </StateView>
    </div>
  );
}
