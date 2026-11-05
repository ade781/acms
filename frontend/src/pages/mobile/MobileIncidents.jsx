import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, RefreshCw, AlertCircle, CheckCircle2, ChevronDown, Check, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam } from '../../utils/shiftHelper';
import {
  calculateIncidentStats,
  isCriticalPriority,
  isHighPriority,
  isMediumPriority,
  isLowPriority,
} from '../../utils/incidentHelper';
import MobileIncidentTimelineItem from '../../components/mobile/incidents/MobileIncidentTimelineItem';
import MobileIncidentModal from '../../components/mobile/incidents/MobileIncidentModal';
import MobileIncidentDetailModal from '../../components/mobile/incidents/MobileIncidentDetailModal';

export default function MobileIncidents() {
  const { user, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const isLeader = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [filterTriage, setFilterTriage] = useState('ALL');
  const [filterScope, setFilterScope] = useState('shift'); // 'shift' | 'all'
  const [toastMsg, setToastMsg] = useState(null);

  // Auto-dismiss toast feedback 3.5 detik
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const fetchIncidents = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const params = filterScope === 'shift'
        ? {
          date: activeDate,
          shift: activeShiftNumber,
          team_group: cleanTeam(activeTeam),
        }
        : {};
      const res = await api.get('/incidents', { params, signal });
      const raw = res.data?.data ?? res.data?.incidents ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setIncidents(list);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching incidents:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memuat daftar insiden operasional.'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filterScope, activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    const controller = new AbortController();
    fetchIncidents(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchIncidents]);

  const handleOpenDetail = (inc) => {
    setSelectedIncident(inc);
    setIsDetailModalOpen(true);
  };

  // Metrics for summary
  const summaryStats = useMemo(() => calculateIncidentStats(incidents), [incidents]);

  // Statistik Status Operasional & Prioritas untuk Dropdown Triage
  const statusStats = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : [];
    const total = list.length;
    const inProgress = list.filter((i) => (i.status || 'dalam_proses').toLowerCase() === 'dalam_proses').length;
    const pendingFollowUp = list.filter((i) => (i.status || '').toLowerCase() === 'menunggu_tindak_lanjut').length;
    const resolved = list.filter((i) => (i.status || '').toLowerCase() === 'selesai').length;
    return { total, inProgress, pendingFollowUp, resolved };
  }, [incidents]);

  const priorityStats = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : [];
    const critical = list.filter((i) => isCriticalPriority(i)).length;
    const high = list.filter((i) => isHighPriority(i)).length;
    const medium = list.filter((i) => isMediumPriority(i)).length;
    const low = list.filter((i) => isLowPriority(i)).length;
    return { critical, high, medium, low };
  }, [incidents]);

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (filterTriage === 'ALL') return true;
      const s = (inc.status || 'dalam_proses').toLowerCase();
      if (filterTriage === 'dalam_proses') return s === 'dalam_proses';
      if (filterTriage === 'menunggu_tindak_lanjut') return s === 'menunggu_tindak_lanjut';
      if (filterTriage === 'selesai') return s === 'selesai';
      if (filterTriage === 'kritis') return isCriticalPriority(inc);
      if (filterTriage === 'tinggi') return isHighPriority(inc);
      if (filterTriage === 'sedang') return isMediumPriority(inc);
      if (filterTriage === 'rendah') return isLowPriority(inc);
      return true;
    });
  }, [incidents, filterTriage]);

  // Paginasi Kompak Mobile (6 insiden per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterScope, filterTriage]);

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-2 pb-6">
      {/* Toast Feedback Visual Instan */}
      {toastMsg && (
        <div
          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between shadow-xs ${
            toastMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold text-xs">
              {typeof toastMsg.text === 'string' ? toastMsg.text : (toastMsg.text?.message || 'Notifikasi')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 leading-tight">
            Laporan Insiden
          </h3>
        </div>

        <div className="flex items-center gap-1.5">
          {!isLeader && (
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
              Read-Only
            </span>
          )}

          {isLeader && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Laporan</span>
            </button>
          )}
        </div>
      </div>

      {/* Switcher Shift Berjalan + Dropdown Filter Status Operasional (AGENTS.md Butir 10) */}
      <div className="flex items-center gap-2">
        {/* Switcher Scope: Shift Ini vs Riwayat */}
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setFilterScope('shift')}
            className={`px-3 py-1.5 rounded-md text-center transition-colors duration-100 ${
              filterScope === 'shift'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shift Ini
          </button>
          <button
            type="button"
            onClick={() => setFilterScope('all')}
            className={`px-3 py-1.5 rounded-md text-center transition-colors duration-100 ${
              filterScope === 'all'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat
          </button>
        </div>

        {/* Dropdown Filter Status Operasional & Prioritas */}
        <div className="relative flex-1 min-w-0">
          <select
            value={filterTriage}
            onChange={(e) => setFilterTriage(e.target.value)}
            className="w-full pl-2.5 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors duration-100 cursor-pointer appearance-none truncate"
            aria-label="Filter Status Insiden"
          >
            <option value="ALL">Semua Kasus ({statusStats.total})</option>
            <optgroup label="Status Operasional">
              <option value="dalam_proses">Dalam Proses ({statusStats.inProgress})</option>
              <option value="menunggu_tindak_lanjut">Menunggu Tindak Lanjut ({statusStats.pendingFollowUp})</option>
              <option value="selesai">Selesai Ditangani ({statusStats.resolved})</option>
            </optgroup>
            <optgroup label="Tingkat Prioritas">
              <option value="kritis">Siaga I / Kritis ({priorityStats.critical})</option>
              <option value="tinggi">Siaga II / Tinggi ({priorityStats.high})</option>
              <option value="sedang">Prioritas Sedang ({priorityStats.medium})</option>
              <option value="rendah">Prioritas Rendah ({priorityStats.low})</option>
            </optgroup>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Ringkasan Situasi Insiden Card (Kompak Tanpa Teks Filler) */}
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Total Kejadian</span>
          <span className="text-lg font-black font-mono tabular-nums text-slate-900 block leading-none">
            {summaryStats.total}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Prioritas Siaga</span>
          <span className={`text-lg font-black font-mono tabular-nums block leading-none ${summaryStats.emergency > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {summaryStats.emergency}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Status Aktif</span>
          <span className={`text-lg font-black font-mono tabular-nums block leading-none ${summaryStats.inProgress > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {summaryStats.inProgress}
          </span>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs leading-tight">
              {typeof error === 'string' ? error : (error?.message || 'Gagal memuat daftar insiden operasional.')}
            </span>
          </div>
          <button
            type="button"
            onClick={fetchIncidents}
            className="text-xs font-bold text-red-700 underline shrink-0 ml-2 cursor-pointer"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && incidents.length === 0 && (
        <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-red-500 mb-1" />
          <p className="text-xs font-semibold text-slate-600">Memuat data insiden...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && incidents.length === 0 && (
        <div className="p-5 text-center bg-white rounded-lg border border-dashed border-slate-300 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-600">
            Belum ada laporan insiden pada shift ini.
          </p>
        </div>
      )}

      {/* Incident List */}
      {!loading && filteredIncidents.length > 0 && (
        <div className="space-y-1.5">
          {
            paginatedIncidents.map((inc, incIdx) => (
              <MobileIncidentTimelineItem
                key={inc.id ?? `inc-${inc.incident_time || incIdx}`}
                incident={inc}
                onClick={() => handleOpenDetail(inc)}
                showDate={filterScope === 'all'}
              />
            ))
          }

          {/* Paginasi Kompak Mobile */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs shadow-2xs mt-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors duration-100"
              >
                Sebelumnya
              </button>

              <span className="text-slate-600 font-medium">
                Halaman <strong className="font-mono text-slate-900">{currentPage}</strong> dari{' '}
                <strong className="font-mono text-slate-900">{totalPages}</strong>
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-md border border-slate-200 text-slate-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer transition-colors duration-100"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Lapor Insiden Baru */}
      <MobileIncidentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(msg) => {
          fetchIncidents();
          setToastMsg({
            type: 'success',
            text: typeof msg === 'string' ? msg : 'Laporan insiden berhasil dikirim.',
          });
        }}
        shiftDate={activeDate}
        shiftNumber={activeShiftNumber}
        teamGroup={activeTeam}
      />

      {/* Modal Detail Insiden */}
      <MobileIncidentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        incidentId={selectedIncident?.id}
        initialIncident={selectedIncident}
        canManage={isLeader}
        onStatusUpdated={(msg) => {
          fetchIncidents();
          setToastMsg({
            type: 'success',
            text: typeof msg === 'string' ? msg : 'Status penanganan insiden berhasil diperbarui.',
          });
        }}
      />
    </div>
  );
}
