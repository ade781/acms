import React, { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  CheckCircle,
  AlertCircle,
  Trash2,
  Calendar,
  Clock,
  History,
  Filter,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam, TEAMS } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import CutiModal from '../components/forms/CutiModal';

// Helper ekstrak rentang tanggal dari catatan cuti
const extractDateRange = (notes, activeDate) => {
  if (!notes) return activeDate || '-';
  const match = notes.match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
  if (match) {
    return `${match[1]} s/d ${match[2]}`;
  }
  return activeDate || '-';
};

// Helper membersihkan catatan dari string format tanggal agar tidak redundan
const cleanNotes = (notes) => {
  if (!notes) return '-';
  const cleaned = notes.replace(/\((?:Rentang:\s*)?[0-9]{4}-[0-9]{2}-[0-9]{2}\s*s\/?d\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\)/gi, '').trim();
  return cleaned || '-';
};

// Helper badge kategori izin / cuti
const getReasonBadge = (reason) => {
  switch (reason) {
    case 'cuti':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          Cuti Tahunan
        </span>
      );
    case 'sakit':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          Sakit
        </span>
      );
    case 'dinas':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          Dinas Luar
        </span>
      );
    case 'tukar_dinas':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Tukar Dinas
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
          {reason || 'Cuti'}
        </span>
      );
  }
};

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function HalamanCuti() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  // Default tab adalah 'ongoing' (Status Berjalan) sesuai instruksi pengguna
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
      personName: person?.full_name || abs.full_name || abs.personnel_name || `Personel #${abs.personnel_id}`,
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
      setSuccessMsg(`Izin / Cuti untuk ${targetCancelLeave.personName} berhasil dibatalkan. Personel dikembalikan ke status aktif berdinas.`);
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
                <p className="text-xs text-slate-500">
                  Rekapitulasi seluruh pengajuan cuti atau izin dinas yang sedang berlangsung aktif ({ongoingLeaves.length} pengajuan)
                </p>
              </div>
            </div>

            {/* Filter Regu & Tombol Ajukan */}
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
          </div>

          <StateView loading={loadingOngoing} error={ongoingError} onRetry={fetchOngoingLeaves}>
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
                                onClick={() => handleRequestCancelLeave(item)}
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
      )}

      {/* KONTEN TAB 1: SHIFT BERJALAN */}
      {activeTab === 'current' && (
        <StateView loading={loading} onRetry={fetchLeaveData}>
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
                  <p className="text-xs text-slate-500">
                    Rekapitulasi personel yang berhalangan dinas aktif pada shift berjalan ({absentList.length} orang)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {user?.personnel_id && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Calendar}
                    onClick={() => setLeaveModalOpen(true)}
                  >
                    + Ajukan Izin / Cuti Mandiri
                  </Button>
                )}
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
                                onClick={() => handleRequestCancelLeave(abs)}
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
      )}

      {/* KONTEN TAB 2: RIWAYAT CUTI BULANAN */}
      {activeTab === 'monthly' && (
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
                <p className="text-xs text-slate-500">
                  Data rekapitulasi cuti seluruh regu operasional pada bulan terpilih ({monthlyLeaves.length} catatan)
                </p>
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

              {user?.personnel_id && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={Calendar}
                  onClick={() => setLeaveModalOpen(true)}
                >
                  + Ajukan Cuti
                </Button>
              )}
            </div>
          </div>

          <StateView loading={loadingMonthly} error={monthlyError} onRetry={fetchMonthlyLeaves}>
            {monthlyLeaves.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Tidak Ada Riwayat Cuti</p>
                <p className="text-slate-400 mt-0.5">
                  Tidak ditemukan catatan cuti atau izin pada periode {MONTH_NAMES[historyMonth - 1]} {historyYear}.
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
                    {monthlyLeaves.map((item, idx) => {
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
                            {item.is_ongoing ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Berjalan
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                Selesai
                              </span>
                            )}
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
                                onClick={() => handleRequestCancelLeave(item)}
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
      )}

      {/* Modal Pengajuan Cuti / Izin Mandiri Rentang Tanggal (Self-Service Murni) */}
      <CutiModal
        isOpen={leaveModalOpen}
        onClose={() => setLeaveModalOpen(false)}
        user={user}
        activeDate={activeDate}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          fetchLeaveData({ keepSuccessMsg: true });
          fetchOngoingLeaves();
          if (activeTab === 'monthly') {
            fetchMonthlyLeaves();
          }
        }}
      />

      {/* Modal Konfirmasi Pembatalan Cuti Instan */}
      {cancelModalOpen && targetCancelLeave && (
        <Modal
          isOpen={cancelModalOpen}
          onClose={() => {
            if (!cancelingLeave) {
              setCancelModalOpen(false);
              setTargetCancelLeave(null);
            }
          }}
          title="Batalkan Pengajuan Izin / Cuti?"
          subtitle="Seluruh hari dalam pengajuan ini akan dibatalkan dan personel kembali aktif"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setCancelModalOpen(false);
                  setTargetCancelLeave(null);
                }}
                disabled={cancelingLeave}
              >
                Tutup
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmCancelLeave}
                loading={cancelingLeave}
              >
                Ya, Batalkan Cuti
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-700">
            <p>
              Apakah Anda yakin ingin membatalkan status izin/cuti untuk:
            </p>
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="font-bold text-slate-900 text-sm">
                {targetCancelLeave.personName}
              </div>
              <div className="text-slate-600 text-[11px] mt-0.5">
                Kategori: <span className="font-semibold uppercase">{targetCancelLeave.reason}</span>
                {targetCancelLeave.notes && ` — "${cleanNotes(targetCancelLeave.notes)}"`}
              </div>
              {(targetCancelLeave.start_date || targetCancelLeave.end_date) && (
                <div className="text-slate-700 font-mono text-[11px] mt-1 pt-1 border-t border-amber-200/60">
                  Periode: {targetCancelLeave.start_date} s/d {targetCancelLeave.end_date} ({targetCancelLeave.days_count || 1} Hari)
                </div>
              )}
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Setelah dibatalkan di server, seluruh hari dalam pengajuan ini akan dihapus dan personel otomatis tersedia kembali pada form ploting armada.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
