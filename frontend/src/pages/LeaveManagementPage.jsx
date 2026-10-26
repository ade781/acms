import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  History,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import LeaveModal from '../components/forms/LeaveModal';

// Sub-komponen Modular
import OngoingLeavesView from '../components/leave/OngoingLeavesView';
import CurrentShiftAbsentsView from '../components/leave/CurrentShiftAbsentsView';
import MonthlyLeaveHistoryView from '../components/leave/MonthlyLeaveHistoryView';
import CancelLeaveModal from '../components/leave/CancelLeaveModal';

export default function LeaveManagementPage() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  // Default tab adalah 'ongoing' (Status Berjalan)
  const [activeTab, setActiveTab] = useState('ongoing'); // 'ongoing' | 'current' | 'monthly'

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [absentList, setAbsentList] = useState([]);
  const [supervisorName, setSupervisorName] = useState('');

  // Status Berjalan (Ongoing Leaves) State
  const [ongoingLeaves, setOngoingLeaves] = useState([]);
  const [ongoingTeam, setOngoingTeam] = useState('ALL');
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [ongoingError, setOngoingError] = useState(null);

  // Riwayat Cuti Bulanan State
  const now = new Date();
  const [historyMonth, setHistoryMonth] = useState(now.getMonth() + 1);
  const [historyYear, setHistoryYear] = useState(now.getFullYear());
  const [historyTeam, setHistoryTeam] = useState('ALL');
  const [monthlyLeaves, setMonthlyLeaves] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);

  // State Modal Pengajuan Cuti Mandiri
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);

  // State Konfirmasi Pembatalan Cuti Instan
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetCancelLeave, setTargetCancelLeave] = useState(null);
  const [cancelingLeave, setCancelingLeave] = useState(false);

  // Auto-dismiss timer untuk pesan sukses
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const fetchLeaveData = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    if (!options?.keepSuccessMsg) {
      setSuccessMsg(null);
    }

    try {
      const currentTeam = cleanTeam(activeTeam);

      const [pRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
      ]);

      const personnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel)
        ? pRes.data.personnel
        : (Array.isArray(pRes.data) ? pRes.data : []));
      setTeamPersonnel(personnel);

      const depData = depRes.data?.data || depRes.data;
      setSupervisorName(depData?.shift?.supervisor_name || depData?.supervisor_name || '');

      const existingAbsent = (depData?.deployments || []).filter(
        (d) => d.deployment_type === 'absent'
      );

      if (existingAbsent.length > 0) {
        setAbsentList(
          existingAbsent.map((d) => ({
            id: d.id,
            personnel_id: d.personnel_id,
            full_name: d.full_name,
            nip: d.nip,
            personnel_team: d.personnel_team,
            reason: d.absent_reason || 'cuti',
            notes: d.notes || '',
          }))
        );
      } else {
        setAbsentList([]);
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('Gagal memuat data pencatatan cuti personel.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  // Fetch data cuti yang berstatus 'berjalan' (aktif / belum kadaluarsa)
  const fetchOngoingLeaves = useCallback(async () => {
    setLoadingOngoing(true);
    setOngoingError(null);
    try {
      const res = await api.get('/deployments/leave-history', {
        params: {
          status: 'berjalan',
          team: ongoingTeam !== 'ALL' ? ongoingTeam : undefined,
        },
      });
      const data = res.data?.data || res.data || [];
      setOngoingLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching ongoing leaves:', err);
      setOngoingError('Gagal memuat data cuti yang sedang berjalan.');
    } finally {
      setLoadingOngoing(false);
    }
  }, [ongoingTeam]);

  useEffect(() => {
    fetchOngoingLeaves();
  }, [fetchOngoingLeaves]);

  // Fetch data riwayat cuti bulanan
  const fetchMonthlyLeaves = useCallback(async () => {
    setLoadingMonthly(true);
    setMonthlyError(null);
    try {
      const res = await api.get('/deployments/leave-history', {
        params: {
          month: historyMonth,
          year: historyYear,
          team: historyTeam,
        },
      });
      const data = res.data?.data || res.data || [];
      setMonthlyLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching leave history:', err);
      setMonthlyError('Gagal memuat riwayat cuti bulanan.');
    } finally {
      setLoadingMonthly(false);
    }
  }, [historyMonth, historyYear, historyTeam]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyLeaves();
    }
  }, [activeTab, fetchMonthlyLeaves]);

  // Buka modal konfirmasi pembatalan cuti
  const handleRequestCancelLeave = (abs) => {
    const person = teamPersonnel.find((p) => Number(p.id) === Number(abs.personnel_id));
    setTargetCancelLeave({
      id: abs.id,
      deployment_ids: abs.deployment_ids,
      personnel_id: abs.personnel_id,
      personnel_name: person?.full_name || abs.full_name || abs.personnel_name || `Personel #${abs.personnel_id}`,
      reason: abs.reason || abs.absent_reason,
      notes: abs.notes,
      start_date: abs.start_date,
      end_date: abs.end_date,
      days_count: abs.days_count,
    });
    setCancelModalOpen(true);
  };

  // Eksekusi pembatalan cuti instan ke backend
  const handleConfirmCancelLeave = async () => {
    if (!targetCancelLeave) return;
    setCancelingLeave(true);
    setError(null);
    try {
      if (targetCancelLeave.deployment_ids && targetCancelLeave.deployment_ids.length > 0) {
        await api.post('/deployments/leave/cancel', {
          deployment_ids: targetCancelLeave.deployment_ids,
          personnel_id: targetCancelLeave.personnel_id,
        });
      } else if (targetCancelLeave.id) {
        await api.delete(`/deployments/leave/${targetCancelLeave.id}`);
      } else {
        await api.post('/deployments/leave/cancel', {
          personnel_id: targetCancelLeave.personnel_id,
          shift_date: activeDate,
          shift_number: activeShiftNumber,
        });
      }
      setSuccessMsg(`Izin / Cuti untuk ${targetCancelLeave.personnel_name} berhasil dibatalkan. Personel dikembalikan ke status aktif berdinas.`);
      setCancelModalOpen(false);
      setTargetCancelLeave(null);
      fetchLeaveData({ keepSuccessMsg: true });
      fetchOngoingLeaves();
      if (activeTab === 'monthly') {
        fetchMonthlyLeaves();
      }
    } catch (err) {
      console.error('Error canceling leave:', err);
      setError(err.response?.data?.message || err.message || 'Gagal membatalkan cuti.');
    } finally {
      setCancelingLeave(false);
    }
  };

  return (
    <div>
      {/* Floating Viewport Toast Notifikasi */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="ml-2 hover:bg-emerald-700 p-0.5 rounded text-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 hover:bg-red-700 p-0.5 rounded text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info Shift */}
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={supervisorName}
        personnelStats={{
          total: teamPersonnel.length,
          duty: Math.max(0, teamPersonnel.length - absentList.length),
          absent: absentList.length,
          isPlotted: true,
        }}
      />

      {/* Tab Switcher: Status Berjalan (Default) vs Shift Berjalan vs Riwayat Cuti */}
      <div className="flex items-center gap-2 mb-4 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('ongoing')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 ${
            activeTab === 'ongoing'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
          <span>Status Berjalan</span>
          {ongoingLeaves.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
              {ongoingLeaves.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('current')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 ${
            activeTab === 'current'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Shift Berjalan</span>
          {absentList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-100 text-red-700 font-extrabold">
              {absentList.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('monthly')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 ${
            activeTab === 'monthly'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Riwayat Cuti</span>
        </button>
      </div>

      {/* KONTEN TAB 0: STATUS BERJALAN (DEFAULT) */}
      {activeTab === 'ongoing' && (
        <OngoingLeavesView
          ongoingLeaves={ongoingLeaves}
          loading={loadingOngoing}
          error={ongoingError}
          onRetry={fetchOngoingLeaves}
          ongoingTeam={ongoingTeam}
          setOngoingTeam={setOngoingTeam}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onOpenLeaveModal={() => setLeaveModalOpen(true)}
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* KONTEN TAB 1: SHIFT BERJALAN */}
      {activeTab === 'current' && (
        <CurrentShiftAbsentsView
          absentList={absentList}
          teamPersonnel={teamPersonnel}
          loading={loading}
          onRetry={fetchLeaveData}
          user={user}
          activeDate={activeDate}
          activeTeam={activeTeam}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onOpenLeaveModal={() => setLeaveModalOpen(true)}
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* KONTEN TAB 2: RIWAYAT CUTI BULANAN */}
      {activeTab === 'monthly' && (
        <MonthlyLeaveHistoryView
          monthlyLeaves={monthlyLeaves}
          loading={loadingMonthly}
          error={monthlyError}
          onRetry={fetchMonthlyLeaves}
          historyMonth={historyMonth}
          setHistoryMonth={setHistoryMonth}
          historyYear={historyYear}
          setHistoryYear={setHistoryYear}
          historyTeam={historyTeam}
          setHistoryTeam={setHistoryTeam}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onOpenLeaveModal={() => setLeaveModalOpen(true)}
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* Modal Dialog Mandiri Pengajuan Cuti Baru */}
      <LeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        onSuccess={() => {
          setSuccessMsg('Pengajuan izin/cuti dinas berhasil dicatat ke sistem.');
          fetchLeaveData({ keepSuccessMsg: true });
          fetchOngoingLeaves();
          if (activeTab === 'monthly') {
            fetchMonthlyLeaves();
          }
        }}
      />

      {/* Modal Konfirmasi Pembatalan Cuti Instan */}
      <CancelLeaveModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        targetLeave={targetCancelLeave}
        onConfirm={handleConfirmCancelLeave}
        deleting={cancelingLeave}
      />
    </div>
  );
}
