import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  History,
  CalendarCheck,
  Calendar,
} from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import { getErrorMessage } from '../utils/errorHelper';
import api from '../services/api';
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

  // Pengambilan data awal terkoordinasi (Promise.allSettled & AbortController)
  const loadInitialData = useCallback(async (signal) => {
    setLoading(true);
    setLoadingOngoing(true);
    setError(null);
    setOngoingError(null);

    const currentTeam = cleanTeam(activeTeam);
    const results = await Promise.allSettled([
      api.get(`/personnel?team_group=${currentTeam}&is_active=1`, { signal }),
      api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal }),
      api.get('/deployments/leave-history', {
        params: {
          status: 'berjalan',
          team: ongoingTeam !== 'ALL' ? ongoingTeam : undefined,
        },
        signal,
      }),
    ]);

    // 1. Data Personel
    if (results[0].status === 'fulfilled') {
      const pRes = results[0].value;
      const personnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel)
          ? pRes.data.personnel
          : (Array.isArray(pRes.data) ? pRes.data : []));
      setTeamPersonnel(personnel);
    } else if (results[0].reason?.name !== 'CanceledError' && results[0].reason?.name !== 'AbortError') {
      console.error('Error fetching personnel:', results[0].reason);
      const rawErr = results[0].reason?.response?.data?.message || results[0].reason?.message;
      setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat data personel regu.'));
    }

    // 2. Data Penugasan & Izin Shift
    if (results[1].status === 'fulfilled') {
      const depRes = results[1].value;
      const depData = depRes.data?.data || depRes.data;

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
    } else if (results[1].reason?.name !== 'CanceledError' && results[1].reason?.name !== 'AbortError') {
      console.error('Error fetching current deployment:', results[1].reason);
      const rawErr = results[1].reason?.response?.data?.message || results[1].reason?.message;
      setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat data penugasan dinas saat ini.'));
    }

    // 3. Data Cuti Berjalan
    if (results[2].status === 'fulfilled') {
      const res = results[2].value;
      const data = res.data?.data || res.data || [];
      setOngoingLeaves(Array.isArray(data) ? data : []);
    } else if (results[2].reason?.name !== 'CanceledError' && results[2].reason?.name !== 'AbortError') {
      console.error('Error fetching ongoing leaves:', results[2].reason);
      const rawErr = results[2].reason?.response?.data?.message || results[2].reason?.message;
      setOngoingError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat data cuti yang sedang berjalan.'));
    }

    setLoading(false);
    setLoadingOngoing(false);
  }, [activeDate, activeShiftNumber, activeTeam, ongoingTeam]);

  useEffect(() => {
    const controller = new AbortController();
    loadInitialData(controller.signal);
    return () => controller.abort();
  }, [loadInitialData]);

  // Fetch data riwayat cuti bulanan
  const fetchMonthlyLeaves = useCallback(async (signal) => {
    setLoadingMonthly(true);
    setMonthlyError(null);
    try {
      const res = await api.get('/deployments/leave-history', {
        params: {
          month: historyMonth,
          year: historyYear,
          team: historyTeam,
        },
        signal,
      });
      const data = res.data?.data || res.data || [];
      setMonthlyLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Error fetching leave history:', err);
      const rawErr = err.response?.data?.message || err.message;
      setMonthlyError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat riwayat cuti bulanan.'));
    } finally {
      setLoadingMonthly(false);
    }
  }, [historyMonth, historyYear, historyTeam]);

  useEffect(() => {
    if (activeTab === 'monthly') {
      const controller = new AbortController();
      fetchMonthlyLeaves(controller.signal);
      return () => controller.abort();
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
      loadInitialData();
      if (activeTab === 'monthly') {
        fetchMonthlyLeaves();
      }
    } catch (err) {
      console.error('Error canceling leave:', err);
      const rawErr = err.response?.data?.message || err.response?.data?.error || err.message;
      setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal membatalkan cuti.'));
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
          <span>{typeof successMsg === 'string' ? successMsg : (successMsg?.message || 'Operasi berhasil')}</span>
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
          <span>{getErrorMessage(error, 'Terjadi kendala pada pengajuan cuti.')}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 hover:bg-red-700 p-0.5 rounded text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unified Segmented Workspace Header: Title + Inline Attendance Pills + Action + Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Pencatatan Izin & Cuti
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              Hadir Shift Ini: <span className="font-mono tabular-nums">{Math.max(0, teamPersonnel.length - absentList.length)}/{teamPersonnel.length}</span>
            </span>
            {absentList.length > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800">
                Izin/Cuti: <span className="font-mono tabular-nums">{absentList.length}</span>
              </span>
            )}
          </div>
          {user?.personnel_id && (
            <Button
              variant="primary"
              size="sm"
              icon={Calendar}
              onClick={() => setLeaveModalOpen(true)}
            >
              + Ajukan Cuti Mandiri
            </Button>
          )}
        </div>

        {/* Tab Switcher: Status Berjalan (Default) vs Shift Berjalan vs Riwayat Cuti */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl border border-slate-200 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ongoing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${activeTab === 'ongoing'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Status Berjalan</span>
            {ongoingLeaves.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums bg-amber-100 text-amber-800 font-extrabold">
                {ongoingLeaves.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${activeTab === 'current'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Shift Berjalan</span>
            {absentList.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums bg-red-100 text-red-700 font-extrabold">
                {absentList.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${activeTab === 'monthly'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Cuti</span>
          </button>
        </div>
      </div>

      {/* KONTEN TAB 0: STATUS BERJALAN (DEFAULT) */}
      {activeTab === 'ongoing' && (
        <OngoingLeavesView
          ongoingLeaves={ongoingLeaves}
          loading={loadingOngoing}
          error={typeof ongoingError === 'string' ? ongoingError : ongoingError?.message || null}
          onRetry={loadInitialData}
          ongoingTeam={ongoingTeam}
          setOngoingTeam={setOngoingTeam}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* KONTEN TAB 1: SHIFT BERJALAN */}
      {activeTab === 'current' && (
        <CurrentShiftAbsentsView
          absentList={absentList}
          teamPersonnel={teamPersonnel}
          loading={loading}
          onRetry={loadInitialData}
          user={user}
          activeDate={activeDate}
          activeTeam={activeTeam}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* KONTEN TAB 2: RIWAYAT CUTI BULANAN */}
      {activeTab === 'monthly' && (
        <MonthlyLeaveHistoryView
          monthlyLeaves={monthlyLeaves}
          loading={loadingMonthly}
          error={typeof monthlyError === 'string' ? monthlyError : monthlyError?.message || null}
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
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* Modal Dialog Mandiri Pengajuan Cuti Baru */}
      <LeaveModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        user={user}
        activeDate={activeDate}
        onSuccess={(customMsg) => {
          setSuccessMsg(typeof customMsg === 'string' ? customMsg : (customMsg?.message || 'Pengajuan izin/cuti dinas berhasil dicatat ke sistem.'));
          loadInitialData();
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
