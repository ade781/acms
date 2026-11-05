import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  History,
  CalendarCheck,
  Calendar,
} from 'lucide-react';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../utils/errorHelper';
import api from '../services/api';
import LeaveModal from '../components/forms/LeaveModal';

// Sub-komponen Modular
import OngoingLeavesView from '../components/leave/OngoingLeavesView';
import MonthlyLeaveHistoryView from '../components/leave/MonthlyLeaveHistoryView';
import CancelLeaveModal from '../components/leave/CancelLeaveModal';

export default function LeaveManagementPage() {
  const {
    user,
    activeDate,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  // 2 Tab Utama: 'ongoing' (Cuti Aktif & Berjalan) | 'monthly' (Riwayat Bulanan)
  const [activeTab, setActiveTab] = useState('ongoing');

  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Status Berjalan (Ongoing Leaves) State
  const [ongoingLeaves, setOngoingLeaves] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(false);
  const [ongoingError, setOngoingError] = useState(null);

  // Riwayat Cuti Bulanan State (WIB Asia/Jakarta)
  const nowParts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: 'numeric' }).formatToParts(new Date());
  const curMonthWib = Number(nowParts.find((p) => p.type === 'month')?.value || (new Date().getMonth() + 1));
  const curYearWib = Number(nowParts.find((p) => p.type === 'year')?.value || new Date().getFullYear());
  const [historyMonth, setHistoryMonth] = useState(curMonthWib);
  const [historyYear, setHistoryYear] = useState(curYearWib);
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

  // Pengambilan data cuti berjalan
  const loadInitialData = useCallback(async (signal) => {
    setLoadingOngoing(true);
    setError(null);
    setOngoingError(null);

    try {
      const res = await api.get('/deployments/leave-history', {
        params: { status: 'berjalan' },
        signal,
      });
      const data = res.data?.data || res.data || [];
      setOngoingLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Error fetching ongoing leaves:', err);
      const rawErr = err.response?.data?.message || err.message;
      setOngoingError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat data cuti yang sedang berjalan.'));
    } finally {
      setLoadingOngoing(false);
    }
  }, []);

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
  const handleRequestCancelLeave = (item) => {
    setTargetCancelLeave({
      id: item.id,
      deployment_ids: item.deployment_ids,
      personnel_id: item.personnel_id,
      personnel_name: item.personnel_name || item.full_name || item.name || `Personel #${item.personnel_id}`,
      reason: item.absent_reason || item.reason,
      notes: item.notes,
      start_date: item.start_date,
      end_date: item.end_date,
      days_count: item.days_count,
    });
    setCancelModalOpen(true);
  };

  // Eksekusi pembatalan cuti instan ke backend (skema paket terpadu)
  const handleConfirmCancelLeave = async () => {
    if (!targetCancelLeave) return;
    setCancelingLeave(true);
    setError(null);
    try {
      const payload = {
        personnel_id: targetCancelLeave.personnel_id,
        start_date: targetCancelLeave.start_date,
        end_date: targetCancelLeave.end_date,
      };

      if (Array.isArray(targetCancelLeave.deployment_ids) && targetCancelLeave.deployment_ids.length > 0) {
        payload.deployment_ids = targetCancelLeave.deployment_ids;
      } else if (targetCancelLeave.id) {
        payload.deployment_id = targetCancelLeave.id;
      }

      await api.post('/deployments/leave/cancel', payload);
      setSuccessMsg(`Izin / Cuti untuk ${targetCancelLeave.personnel_name} berhasil dibatalkan. Personel dikembalikan ke status aktif berdinas.`);
      window.dispatchEvent(new CustomEvent('arff:leave-updated'));
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
            className="ml-2 hover:bg-emerald-700 p-0.5 rounded text-emerald-100 cursor-pointer"
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
            className="ml-2 hover:bg-red-700 p-0.5 rounded text-red-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Segmented Workspace Header: Title + Action + Tab Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pencatatan Izin & Cuti
          </h2>
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

        {/* Tab Switcher: 2 Tab Utama (Cuti Aktif & Berjalan vs Riwayat Bulanan) */}
        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl border border-slate-200 w-fit flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('ongoing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${
              activeTab === 'ongoing'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Cuti Aktif & Berjalan</span>
            {ongoingLeaves.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-mono tabular-nums bg-amber-100 text-amber-800 font-extrabold">
                {ongoingLeaves.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${
              activeTab === 'monthly'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Riwayat Bulanan</span>
          </button>
        </div>
      </div>

      {/* KONTEN TAB 1: CUTI AKTIF & BERJALAN (DEFAULT) */}
      {activeTab === 'ongoing' && (
        <OngoingLeavesView
          ongoingLeaves={ongoingLeaves}
          loading={loadingOngoing}
          error={typeof ongoingError === 'string' ? ongoingError : ongoingError?.message || null}
          onRetry={loadInitialData}
          activeTeam={activeTeam}
          user={user}
          isAdmin={isAdmin}
          isSupervisor={isSupervisor}
          onRequestCancelLeave={handleRequestCancelLeave}
        />
      )}

      {/* KONTEN TAB 2: RIWAYAT BULANAN */}
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
          window.dispatchEvent(new CustomEvent('arff:leave-updated'));
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
