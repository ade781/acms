import React from 'react';
import { CalendarCheck, CheckCircle } from 'lucide-react';
import { TEAMS } from '../../utils/shiftHelper';
import StateView from '../common/StateView';
import LeaveTable from './LeaveTable';

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
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400"
          >
            <option value="ALL">Semua Regu</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>Regu {t}</option>
            ))}
          </select>
        </div>
      </div>

      <StateView loading={loading} error={error} onRetry={onRetry}>
        <LeaveTable
          items={ongoingLeaves}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onRequestCancelLeave={onRequestCancelLeave}
          isOngoingOnly={true}
          emptyTitle="Tidak Ada Cuti yang Berjalan"
          emptySubtitle="Saat ini tidak ada personel operasional yang tercatat sedang dalam status cuti berjalan."
          emptyIcon={<CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />}
        />
      </StateView>
    </div>
  );
}
