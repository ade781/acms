import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ShieldAlert, AlertTriangle, RefreshCw, AlertCircle, Search, CheckCircle2, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam } from '../../utils/shiftHelper';
import MobileIncidentTimelineItem from '../../components/mobile/incidents/MobileIncidentTimelineItem';
import MobileIncidentModal from '../../components/mobile/incidents/MobileIncidentModal';
import MobileIncidentDetailModal from '../../components/mobile/incidents/MobileIncidentDetailModal';
import MobileIncidentReportModal from '../../components/mobile/incidents/MobileIncidentReportModal';

export default function MobileInsiden() {
  const navigate = useNavigate();
  const { user, isChief, isAdmin, isSupervisor, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const canManage = isChief || isAdmin || isSupervisor;

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterScope, setFilterScope] = useState('shift'); // 'shift' | 'all'

  const fetchIncidents = useCallback(async () => {
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
      const res = await api.get('/incidents', { params });
      const list = Array.isArray(res.data?.incidents)
        ? res.data.incidents
        : Array.isArray(res.data)
        ? res.data
        : [];
      setIncidents(list);
    } catch (err) {
      console.error('Error fetching incidents:', err);
      setError('Gagal memuat daftar insiden operasional.');
    } finally {
      setLoading(false);
    }
  }, [filterScope, activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchIncidents();
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

  return (
    <div className="space-y-2 pb-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 leading-tight">
            Pemantauan & Laporan Insiden
          </h3>
          <p className="text-[10px] text-slate-500 font-medium">
            Shift {activeShiftNumber} • Regu {activeTeam}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsReportModalOpen(true)}
            className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-100 flex items-center gap-1 text-[10px] font-bold border border-slate-200 px-2 py-0.5"
            title="Rekap Laporan Insiden"
            aria-label="Rekap Laporan Insiden"
          >
            <FileText className="w-3.5 h-3.5 text-slate-600" />
            <span>Rekap</span>
          </button>

          <button
            type="button"
            onClick={fetchIncidents}
            disabled={loading}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-100"
            title="Muat Ulang"
            aria-label="Muat Ulang Insiden"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lapor Insiden</span>
            </button>
          )}
        </div>
      </div>

      {/* Toggle Filter Scope: Shift Ini vs Semua Riwayat */}
      <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[10px] font-semibold">
        <button
          type="button"
          onClick={() => setFilterScope('shift')}
          className={`flex-1 py-1 rounded-md text-center transition-colors duration-100 ${
            filterScope === 'shift'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Shift Ini ({activeTeam})
        </button>
        <button
          type="button"
          onClick={() => setFilterScope('all')}
          className={`flex-1 py-1 rounded-md text-center transition-colors duration-100 ${
            filterScope === 'all'
              ? 'bg-white text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua Riwayat
        </button>
      </div>

      {/* Ringkasan Situasi Insiden Card */}
      <div className="grid grid-cols-3 gap-1.5 text-xs">
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs space-y-0.5">
          <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Total Kejadian</span>
          <span className="text-base font-black text-slate-900 block leading-tight">
            {totalIncidents}
          </span>
          <span className="text-[8.5px] text-slate-500 font-medium block">
            {filterScope === 'shift' ? 'Shift Ini' : 'Semua'}
          </span>
        </div>

        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs space-y-0.5">
          <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Prioritas Siaga</span>
          <span className={`text-base font-black block leading-tight ${criticalCount > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {criticalCount}
          </span>
          <span className="text-[8.5px] text-slate-500 font-medium block">Siaga I & II</span>
        </div>

        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs space-y-0.5">
          <span className="text-[8.5px] font-bold text-slate-500 uppercase block">Status Aktif</span>
          <span className={`text-base font-black block leading-tight ${inProgressCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {inProgressCount}
          </span>
          <span className="text-[8.5px] text-slate-500 font-medium block">Dalam Proses</span>
        </div>
      </div>

      {/* Filter Prioritas Chips if incidents exist */}
      {incidents.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[9px]">
          <button
            type="button"
            onClick={() => setFilterPriority('ALL')}
            className={`px-2 py-0.5 rounded-full border whitespace-nowrap font-semibold transition-colors duration-100 ${
              filterPriority === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({incidents.length})
          </button>
          {['kritis', 'tinggi', 'sedang', 'rendah'].map((p) => {
            const count = incidents.filter((i) => (i.priority_level || '').toLowerCase() === p).length;
            if (count === 0) return null;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPriority(p)}
                className={`px-2 py-0.5 rounded-full border whitespace-nowrap font-semibold uppercase transition-colors duration-100 ${
                  filterPriority === p
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p} ({count})
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
            <span className="text-[10.5px] leading-tight">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchIncidents}
            className="text-[10px] font-bold text-red-700 underline shrink-0 ml-2"
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
              Kondisi Sisi Udara Aman Terkendali
            </h4>
            <p className="text-[10px] text-slate-500 max-w-[270px] mx-auto mt-0.5 leading-snug">
              Belum ada laporan insiden pada shift ini. Seluruh pergerakan dan fasilitas operasional berjalan normal.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10.5px] shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Laporan Kejadian</span>
            </button>
          )}
        </div>
      )}

      {/* Incident List */}
      {!loading && filteredIncidents.length > 0 && (
        <div className="space-y-1.5">
          {filteredIncidents.map((inc) => (
            <MobileIncidentTimelineItem
              key={inc.id}
              incident={inc}
              onClick={() => handleOpenDetail(inc)}
            />
          ))}
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
        canManage={canManage}
        onStatusUpdated={fetchIncidents}
      />

      {/* Modal Rekapitulasi Insiden Mobile */}
      <MobileIncidentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
