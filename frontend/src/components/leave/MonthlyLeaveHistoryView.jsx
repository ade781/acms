import React, { useMemo } from 'react';
import { History, CheckCircle } from 'lucide-react';
import { TEAMS, cleanTeam } from '../../utils/shiftHelper';
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

  // Pengelompokan paket cuti lintas bulan agar rentang tanggal tetap utuh dan durasi hari tidak terpotong
  const groupedMonthlyLeaves = useMemo(() => {
    if (!Array.isArray(monthlyLeaves) || monthlyLeaves.length === 0) return [];

    const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    const packageMap = new Map();

    for (const item of monthlyLeaves) {
      if (!item) continue;

      // Filter regu jika dipilih spesifik
      if (historyTeam && historyTeam !== 'ALL') {
        const itemTeam = cleanTeam(item.personnel_team || item.shift_team || item.team);
        if (itemTeam !== historyTeam) continue;
      }

      // Ekstrak rentang tanggal resmi dari notes database jika tersedia (paket cuti utuh)
      const match = (item.notes || item.raw_notes || '').match(
        /\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i
      );

      const startDate = match ? match[1] : (item.start_date || item.shift_date);
      const endDate = match ? match[2] : (item.end_date || item.shift_date);

      // Hitung durasi hari penuh dari selisih tanggal (mencegah terpotong lintas bulan)
      let fullDays = item.days_count || 1;
      if (startDate && endDate) {
        const s = new Date(startDate);
        const e = new Date(endDate);
        const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
        if (diff > 0) {
          fullDays = diff;
        }
      }

      const pId = item.personnel_id;
      const reason = item.absent_reason || item.reason || 'cuti';
      const packageKey = `${pId}_${reason}_${startDate}_${endDate}`;

      if (packageMap.has(packageKey)) {
        const existing = packageMap.get(packageKey);
        // Gabungkan seluruh deployment_ids dari semua pecahan hari/bulan
        const existingDepIds = Array.isArray(existing.deployment_ids)
          ? existing.deployment_ids
          : [existing.id].filter(Boolean);
        const newDepIds = Array.isArray(item.deployment_ids)
          ? item.deployment_ids
          : [item.id].filter(Boolean);

        const mergedIds = Array.from(new Set([...existingDepIds, ...newDepIds]));
        existing.deployment_ids = mergedIds;

        // Pertahankan durasi hari penuh terbesar
        if (fullDays > existing.days_count) {
          existing.days_count = fullDays;
        }
      } else {
        const initialDepIds = Array.isArray(item.deployment_ids)
          ? item.deployment_ids
          : [item.id].filter(Boolean);

        const isOngoing = Boolean(endDate && endDate >= todayStr);

        packageMap.set(packageKey, {
          ...item,
          start_date: startDate,
          end_date: endDate,
          days_count: fullDays,
          deployment_ids: initialDepIds,
          is_ongoing: isOngoing,
          status: isOngoing ? 'berjalan' : 'selesai',
        });
      }
    }

    return Array.from(packageMap.values());
  }, [monthlyLeaves, historyTeam]);

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
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>

          <select
            value={historyYear}
            onChange={(e) => setHistoryYear(Number(e.target.value))}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono tabular-nums font-semibold text-slate-700 bg-white transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 cursor-pointer"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <select
            value={historyTeam}
            onChange={(e) => setHistoryTeam(e.target.value)}
            className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white transition-colors duration-100 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 cursor-pointer"
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
          items={groupedMonthlyLeaves}
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