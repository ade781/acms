import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Plus,
  Search,
  Check,
  X,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import IncidentModal from '../components/forms/IncidentModal';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const { activeDate, activeShiftNumber, activeTeam, user, isChief, isAdmin, isSupervisor } = useAuth();
  const canReport = isChief || isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [filterScope, setFilterScope] = useState('shift'); // 'shift' | 'all'
  const [filterTriage, setFilterTriage] = useState('ALL'); // 'ALL' | 'kritis' | 'in_progress' | 'resolved'

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchIncidents = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const params = filterScope === 'shift'
        ? { date: activeDate, shift: activeShiftNumber, team_group: cleanTeam(activeTeam) }
        : { limit: 50 };
      const res = await api.get('/incidents', { params, signal });
      const raw = res.data?.data ?? res.data?.incidents ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setIncidents(list);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Error fetching incidents:', err);
      setError('Gagal memuat daftar laporan insiden operasional.');
    } finally {
      setLoading(false);
    }
  }, [filterScope, activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    const controller = new AbortController();
    fetchIncidents(controller.signal);
    return () => controller.abort();
  }, [fetchIncidents]);

  // Auto-dismiss toast feedback 3.5 detik
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const summaryStats = {
    total: incidents.length,
    critical: incidents.filter((i) => {
      const p = (i.priority_level || i.priority || i.severity || '').toLowerCase();
      return p.includes('kritis') || p.includes('critical');
    }).length,
    inProgress: incidents.filter((i) => {
      const s = (i.status || '').toLowerCase();
      return s === 'dalam_proses' || s === 'menunggu_tindak_lanjut';
    }).length,
    resolved: incidents.filter((i) => (i.status || '').toLowerCase() === 'selesai').length,
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (filterTriage === 'kritis') {
      const p = (inc.priority_level || inc.priority || inc.severity || '').toLowerCase();
      if (!p.includes('kritis') && !p.includes('critical')) return false;
    } else if (filterTriage === 'in_progress') {
      const s = (inc.status || '').toLowerCase();
      if (s !== 'dalam_proses' && s !== 'menunggu_tindak_lanjut') return false;
    } else if (filterTriage === 'resolved') {
      const s = (inc.status || '').toLowerCase();
      if (s !== 'selesai') return false;
    }

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inc.report_number || '').toLowerCase().includes(q) ||
      (inc.title || '').toLowerCase().includes(q) ||
      (inc.location || '').toLowerCase().includes(q) ||
      (inc.aircraft_info || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPriorityBadge = (lvl) => {
    const l = (lvl || '').toLowerCase();
    if (l === 'kritis' || l === 'critical') return <Badge variant="unserviceable" size="sm">Siaga I (Kritis)</Badge>;
    if (l === 'tinggi' || l === 'high') return <Badge variant="pending" size="sm">Siaga II (Tinggi)</Badge>;
    if (l === 'sedang' || l === 'medium') return <Badge variant="info" size="sm">Sedang</Badge>;
    return <Badge variant="default" size="sm">Rendah</Badge>;
  };

  const getStatusBadge = (st) => {
    const s = (st || 'dalam_proses').toLowerCase();
    if (s === 'selesai') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Selesai
        </span>
      );
    }
    if (s === 'menunggu_tindak_lanjut') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Tindak Lanjut
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        Dalam Proses
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pemantauan & Laporan Insiden
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={FileText}
            onClick={() => navigate('/incidents/reports')}
          >
            Rekap Laporan
          </Button>

          {canReport && (
            <Button
              variant="danger"
              icon={Plus}
              onClick={() => setModalOpen(true)}
            >
              Tambah Insiden
            </Button>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{typeof toastMsg === 'string' ? toastMsg : (toastMsg?.text || toastMsg?.message || '')}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5 transition-colors duration-100"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unified Interactive Triage & Command Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Scope Switcher + Interactive Triage Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setFilterScope('shift');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors duration-100 cursor-pointer ${
                filterScope === 'shift'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Ini
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterScope('all');
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md transition-colors duration-100 cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Riwayat
            </button>
          </div>

          {/* Dropdown Filter Status / Prioritas Insiden */}
          <div className="relative inline-flex items-center">
            <select
              value={filterTriage}
              onChange={(e) => {
                setFilterTriage(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors duration-100 cursor-pointer appearance-none"
              aria-label="Filter Status Insiden"
            >
              <option value="ALL">Semua Status ({summaryStats.total})</option>
              <option value="kritis">Siaga I / Kritis ({summaryStats.critical})</option>
              <option value="in_progress">Dalam Proses ({summaryStats.inProgress})</option>
              <option value="resolved">Selesai ({summaryStats.resolved})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Right: Search Box */}
        <div className="relative w-full md:w-60">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor/judul/lokasi..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors duration-100"
          />
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <StateView
          loading={loading}
          error={error}
          isEmpty={filteredIncidents.length === 0}
          emptyTitle="Belum Ada Laporan Insiden"
          emptyDescription={
            filterScope === 'shift'
              ? `Tidak ada kejadian darurat atau insiden operasional pada Shift ${activeShiftNumber} Regu ${activeTeam}.`
              : 'Tidak ada data insiden yang sesuai dengan filter pencarian.'
          }
          onRetry={fetchIncidents}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Laporan</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Regu / Shift</th>
                  <th className="py-3 px-4">Judul Kejadian</th>
                  <th className="py-3 px-4">Lokasi Area</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedIncidents.map((inc) => (
                  <tr
                    key={inc.id || inc.report_number || `inc-${inc.incident_date}-${inc.incident_time}`}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-red-50/40 cursor-pointer transition-colors duration-100 group"
                  >
                    <td className="py-3 px-4 font-bold text-red-700 font-mono tabular-nums text-xs">
                      {inc.report_number || `INC-${inc.id || ''}`}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium font-mono tabular-nums">
                      <div>{typeof inc.incident_date === 'string' ? inc.incident_date : '-'}</div>
                      <div className="text-xs text-slate-400">
                        {typeof inc.incident_time === 'string' ? inc.incident_time.slice(0, 5) : ''} WIB
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div>Regu {typeof inc.team_group === 'string' ? inc.team_group : 'Alpha'}</div>
                      <div className="text-xs text-slate-400">Shift <span className="font-mono tabular-nums">#{inc.shift_number || 1}</span></div>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold max-w-xs">
                      <div className="truncate">{typeof inc.title === 'string' ? inc.title : '-'}</div>
                      <div className="text-xs text-slate-400 font-normal">
                        {typeof inc.aircraft_info === 'string' ? inc.aircraft_info : 'Non-Pesawat'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{typeof inc.location === 'string' ? inc.location : '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(inc.priority_level)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inc.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Halaman <span className="font-mono tabular-nums font-bold text-slate-700">{currentPage}</span> dari <span className="font-mono tabular-nums font-bold text-slate-700">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </StateView>
      </div>

      {/* Modal Tambah Insiden Baru */}
      <IncidentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        activeDate={activeDate}
        activeShiftNumber={activeShiftNumber}
        activeTeam={activeTeam}
        onSuccess={(msg) => {
          const toastText = typeof msg === 'string'
            ? msg
            : (msg?.message || 'Laporan insiden berhasil dikirimkan.');
          setToastMsg(toastText);
          fetchIncidents();
        }}
      />
    </div>
  );
}
