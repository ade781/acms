import React, { useState, useEffect, useCallback } from 'react';
import { Plus, RefreshCw, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam } from '../../utils/shiftHelper';
import MobileIncidentTimelineItem from '../../components/mobile/incidents/MobileIncidentTimelineItem';
import MobileIncidentModal from '../../components/mobile/incidents/MobileIncidentModal';
import MobileIncidentDetailModal from '../../components/mobile/incidents/MobileIncidentDetailModal';
import MobileIncidentExportModal from '../../components/mobile/incidents/MobileIncidentExportModal';

export default function MobileIncidents() {
  const { user, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const isLeader = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterScope, setFilterScope] = useState('shift'); // 'shift' | 'all'

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
  const totalIncidents = incidents.length;
  const isHighPriority = (lvl) => {
    const l = (lvl || '').toLowerCase();
    return l === 'kritis' || l === 'critical' || l === 'tinggi' || l === 'high';
  };
  const criticalCount = incidents.filter((i) => isHighPriority(i.priority_level)).length;
  const inProgressCount = incidents.filter(
    (i) => (i.status || '').toLowerCase() === 'dalam_proses' || (i.status || '').toLowerCase() === 'menunggu_tindak_lanjut'
  ).length;

  const filteredIncidents = incidents.filter((inc) => {
    if (filterPriority === 'ALL') return true;
    const l = (inc.priority_level || '').toLowerCase();
    if (filterPriority === 'kritis') return l === 'kritis' || l === 'critical';
    if (filterPriority === 'tinggi') return l === 'tinggi' || l === 'high';
    if (filterPriority === 'sedang') return l === 'sedang' || l === 'medium';
    if (filterPriority === 'rendah') return l === 'rendah' || l === 'low';
    return l === filterPriority.toLowerCase();
  });

  // Paginasi Kompak Mobile (6 insiden per halaman)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterScope, filterPriority]);

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-2 pb-6">
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

          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-100 flex items-center gap-1 text-xs font-bold border border-slate-200 px-2 py-1"
            title="Rekap Laporan Insiden"
            aria-label="Rekap Laporan Insiden"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Rekap</span>
          </button>

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


      {/* Toggle Filter Scope: Shift Ini vs Riwayat */}
      <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setFilterScope('shift')}
          className={`flex-1 py-1 rounded-md text-center transition-colors duration-100 ${filterScope === 'shift'
            ? 'bg-white text-slate-900 shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Shift Ini
        </button>
        <button
          type="button"
          onClick={() => setFilterScope('all')}
          className={`flex-1 py-1 rounded-md text-center transition-colors duration-100 ${filterScope === 'all'
            ? 'bg-white text-slate-900 shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
            }`}
        >
          Riwayat
        </button>
      </div>

      {/* Ringkasan Situasi Insiden Card (Kompak Tanpa Teks Filler) */}
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Total Kejadian</span>
          <span className="text-lg font-black font-mono tabular-nums text-slate-900 block leading-none">
            {totalIncidents}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Prioritas Siaga</span>
          <span className={`text-lg font-black font-mono tabular-nums block leading-none ${criticalCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {criticalCount}
          </span>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] font-bold text-slate-500 uppercase block">Status Aktif</span>
          <span className={`text-lg font-black font-mono tabular-nums block leading-none ${inProgressCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {inProgressCount}
          </span>
        </div>
      </div>

      {/* Filter Prioritas Chips if incidents exist */}
      {incidents.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {[
            { key: 'kritis', label: 'Kritis', match: (l) => l === 'kritis' || l === 'critical' },
            { key: 'tinggi', label: 'Tinggi', match: (l) => l === 'tinggi' || l === 'high' },
            { key: 'sedang', label: 'Sedang', match: (l) => l === 'sedang' || l === 'medium' },
            { key: 'rendah', label: 'Rendah', match: (l) => l === 'rendah' || l === 'low' },
          ].map(({ key, label, match }) => {
            const count = incidents.filter((i) => match((i.priority_level || '').toLowerCase())).length;
            if (count === 0) return null;
            const isActive = filterPriority === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setFilterPriority(isActive ? 'ALL' : key)}
                className={`px-2.5 py-1 rounded-full border whitespace-nowrap text-xs font-semibold transition-colors duration-100 ${isActive
                  ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {label} (<span className="font-mono tabular-nums">{count}</span>)
              </button>
            );
          })}
        </div>
      )}

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
            className="text-xs font-bold text-red-700 underline shrink-0 ml-2"
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
          <div>
            <h4 className="text-xs font-bold text-slate-900">
              Belum Ada Laporan Insiden
            </h4>
            <p className="text-xs text-slate-500 max-w-[270px] mx-auto mt-0.5 leading-snug">
              Belum ada laporan insiden pada shift ini.
            </p>
          </div>
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
        onSuccess={fetchIncidents}
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
        onStatusUpdated={fetchIncidents}
      />

      {/* Modal Rekapitulasi Insiden Mobile */}
      <MobileIncidentExportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
