import React from 'react';
import { History, CheckCircle } from 'lucide-react';
import { TEAMS } from '../../utils/shiftHelper';
import StateView from '../common/StateView';
import { MONTH_NAMES } from '../../utils/leaveHelpers';
import LeaveTable from './LeaveTable';

export default function MonthlyLeaveHistoryView({
  monthlyLeaves = [],
  loading = false,
  error = null,
  onRetry,
  historyMonth = 1,
  setHistoryMonth,
  historyYear = 2026,
  setHistoryYear,
  historyTeam = 'ALL',
  setHistoryTeam,
  user,
  isAdmin = false,
  isSupervisor = false,
  onRequestCancelLeave,
}) {
  const now = new Date();

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-4 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Riwayat Izin & Cuti Bulanan
            </h4>
          </div>
        </div>

        {/* Filter Bulan, Tahun, dan Regu */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={historyMonth}
            onChange={(e) => setHistoryMonth(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-arff-primary"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={historyYear}
            onChange={(e) => setHistoryYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-arff-primary"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={historyTeam}
            onChange={(e) => setHistoryTeam(e.target.value)}
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
        <LeaveTable
          items={monthlyLeaves}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onRequestCancelLeave={onRequestCancelLeave}
          isOngoingOnly={false}
          emptyTitle="Tidak Ada Riwayat Cuti"
          emptySubtitle={`Tidak ditemukan catatan cuti atau izin pada periode ${MONTH_NAMES[historyMonth - 1]} ${historyYear}.`}
          emptyIcon={<CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />}
        />
      </StateView>
    </div>
  );
}
