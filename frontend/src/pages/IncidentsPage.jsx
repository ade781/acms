import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Download,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import {
  isEmergencyPriority,
  isCriticalPriority,
  getPriorityMeta,
  getStatusMeta,
} from '../utils/incidentHelper';
import api from '../services/api';
import { downloadIncidentReportPdf } from '../services/reportService';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import IncidentModal from '../components/forms/IncidentModal';

export default function IncidentsPage() {
  const navigate = useNavigate();
  const { activeDate, activeShiftNumber, activeTeam, user, isChief, isAdmin, isSupervisor } = useAuth();
  const canReport = isChief || isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMsg, setToastMsg] = useState(null);

  // Filter Cakupan: 'shift' (Shift Ini) vs 'range' (Riwayat Periode)
  const [filterScope, setFilterScope] = useState('shift');
  const [period, setPeriod] = useState('1month'); // '1week' | '1month' | '3months' | '1year' | 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown Triage / Filter Status Operasional & Prioritas
  const [filterTriage, setFilterTriage] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchIncidents = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filterScope === 'shift') {
        params.date = activeDate;
        params.shift = activeShiftNumber;
        params.team_group = cleanTeam(activeTeam);
      } else {
        if (period === 'custom') {
          if (startDate) params.start_date = startDate;
          if (endDate) params.end_date = endDate;
        } else {
          params.period = period;
        }
      }

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
  }, [filterScope, activeDate, activeShiftNumber, activeTeam, period, startDate, endDate]);

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

  // 4 Scorecard: Mutually Exclusive Berdasarkan Status Operasional Murni
  const statusStats = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : [];
    const total = list.length;
    const inProgress = list.filter((i) => (i.status || 'dalam_proses').toLowerCase() === 'dalam_proses').length;
    const pendingFollowUp = list.filter((i) => (i.status || '').toLowerCase() === 'menunggu_tindak_lanjut').length;
    const resolved = list.filter((i) => (i.status || '').toLowerCase() === 'selesai').length;
    return {
      total,
      inProgress,
      pendingFollowUp,
      resolved,
    };
  }, [incidents]);

  // Statistik prioritas untuk opsi dropdown
  const priorityStats = useMemo(() => {
    const list = Array.isArray(incidents) ? incidents : [];
    const critical = list.filter((i) => isCriticalPriority(i)).length;
    const emergency = list.filter((i) => isEmergencyPriority(i)).length;
    return { critical, emergency };
  }, [incidents]);

  // Handler Export PDF Laporan Rekapitulasi Insiden
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await downloadIncidentReportPdf({
        period: filterScope === 'shift' ? 'custom' : period,
        start_date: filterScope === 'shift' ? activeDate : (period === 'custom' ? startDate : ''),
        end_date: filterScope === 'shift' ? activeDate : (period === 'custom' ? endDate : ''),
        status: ['dalam_proses', 'menunggu_tindak_lanjut', 'selesai'].includes(filterTriage) ? filterTriage : 'ALL',
      });
      setToastMsg({
        type: 'success',
        text: 'Dokumen PDF Laporan Rekapitulasi Insiden berhasil diunduh.',
      });
    } catch (err) {
      console.error('Gagal mengunduh PDF insiden:', err);
      setToastMsg({
        type: 'error',
        text: 'Gagal mengunduh dokumen PDF laporan insiden. Silakan coba lagi.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const s = (inc.status || 'dalam_proses').toLowerCase();
      if (filterTriage === 'dalam_proses' && s !== 'dalam_proses') return false;
      if (filterTriage === 'menunggu_tindak_lanjut' && s !== 'menunggu_tindak_lanjut') return false;
      if (filterTriage === 'selesai' && s !== 'selesai') return false;
      if (filterTriage === 'emergency' && !isEmergencyPriority(inc)) return false;
      if (filterTriage === 'kritis' && !isCriticalPriority(inc)) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (inc.report_number || '').toLowerCase().includes(q) ||
        (inc.title || '').toLowerCase().includes(q) ||
        (inc.location || '').toLowerCase().includes(q) ||
        (inc.aircraft_info || '').toLowerCase().includes(q)
      );
    });
  }, [incidents, filterTriage, searchQuery]);

  const totalPages = Math.ceil(filteredIncidents.length / pageSize) || 1;
  const paginatedIncidents = filteredIncidents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getPriorityBadge = (lvl) => {
    const meta = getPriorityMeta(lvl);
    return <Badge variant={meta.badgeVariant} size="sm">{meta.shortLabel || meta.label}</Badge>;
  };

  const getStatusBadge = (st) => {
    const meta = getStatusMeta(st);
    const s = (st || 'dalam_proses').toLowerCase();
    if (s === 'selesai') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {meta.label}
        </span>
      );
    }
    if (s === 'menunggu_tindak_lanjut') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          {meta.label}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        {meta.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pemantauan & Laporan Insiden
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {filterScope === 'shift'
              ? `Shift #${activeShiftNumber} Regu ${activeTeam} (${activeDate})`
              : `Arsip & Rekapitulasi Periode: ${period === 'custom' ? `${startDate || '...'} s.d. ${endDate || '...'}` : period}`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={Download}
            onClick={handleExportPdf}
            loading={isExporting}
            disabled={isExporting}
          >
            {isExporting ? 'Mengunduh PDF...' : 'Ekspor PDF Laporan'}
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
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs transition-colors duration-100 ${
            toastMsg?.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg?.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold">
              {typeof toastMsg === 'string' ? toastMsg : (toastMsg?.text || toastMsg?.message || '')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-slate-400 hover:text-slate-700 p-0.5 transition-colors duration-100 cursor-pointer"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4 Scorecards Mutually Exclusive Berdasarkan Status Operasional Murni */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Insiden */}
        <button
          type="button"
          onClick={() => {
            setFilterTriage('ALL');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors duration-100 ${
            filterTriage === 'ALL'
              ? 'bg-white border-slate-400 shadow-xs ring-1 ring-slate-300'
              : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold">Total Insiden</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900">
            {statusStats.total}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Seluruh laporan tercatat</div>
        </button>

        {/* Card 2: Dalam Proses */}
        <button
          type="button"
          onClick={() => {
            setFilterTriage((prev) => (prev === 'dalam_proses' ? 'ALL' : 'dalam_proses'));
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors duration-100 ${
            filterTriage === 'dalam_proses'
              ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-1 ring-amber-300'
              : 'bg-white border-slate-200 shadow-2xs hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold">Dalam Proses</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-amber-700">
            {statusStats.inProgress}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Investigasi / penanganan</div>
        </button>

        {/* Card 3: Menunggu Tindak Lanjut */}
        <button
          type="button"
          onClick={() => {
            setFilterTriage((prev) => (prev === 'menunggu_tindak_lanjut' ? 'ALL' : 'menunggu_tindak_lanjut'));
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors duration-100 ${
            filterTriage === 'menunggu_tindak_lanjut'
              ? 'bg-rose-50/70 border-rose-400 shadow-xs ring-1 ring-rose-300'
              : 'bg-white border-slate-200 shadow-2xs hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-semibold">Menunggu Tindak Lanjut</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-rose-700">
            {statusStats.pendingFollowUp}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Perlu evaluasi lanjutan</div>
        </button>

        {/* Card 4: Selesai Ditangani */}
        <button
          type="button"
          onClick={() => {
            setFilterTriage((prev) => (prev === 'selesai' ? 'ALL' : 'selesai'));
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors duration-100 ${
            filterTriage === 'selesai'
              ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-300'
              : 'bg-white border-slate-200 shadow-2xs hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold">Selesai Ditangani</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-700">
            {statusStats.resolved}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">Penanganan tuntas</div>
        </button>
      </div>

      {/* Unified Command & Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          {/* Left: Scope Switcher + Dropdown Filter Status / Prioritas */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => {
                  setFilterScope('shift');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                  filterScope === 'shift'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Shift Ini
              </button>
              <button
                type="button"
                onClick={() => {
                  setFilterScope('range');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                  filterScope === 'range'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Riwayat & Arsip Periode
              </button>
            </div>

            {/* Dropdown Filter Status / Prioritas Sesuai AGENTS.md Rule 10 */}
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
                <optgroup label="Status Operasional (Mutually Exclusive)">
                  <option value="ALL">Semua Kasus ({statusStats.total})</option>
                  <option value="dalam_proses">Dalam Proses ({statusStats.inProgress})</option>
                  <option value="menunggu_tindak_lanjut">Menunggu Tindak Lanjut ({statusStats.pendingFollowUp})</option>
                  <option value="selesai">Selesai Ditangani ({statusStats.resolved})</option>
                </optgroup>
                <optgroup label="Tingkat Prioritas">
                  <option value="emergency">Prioritas Siaga I & II ({priorityStats.emergency})</option>
                  <option value="kritis">Siaga I / Kritis ({priorityStats.critical})</option>
                </optgroup>
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

        {/* Kontrol Periode jika dalam mode Riwayat & Arsip */}
        {filterScope === 'range' && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-slate-600 flex items-center gap-1 mr-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Periode:
              </span>
              <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs flex-wrap">
                {[
                  { id: '1week', label: '7 Hari Terakhir' },
                  { id: '1month', label: '30 Hari (Default)' },
                  { id: '3months', label: '3 Bulan (Triwulan)' },
                  { id: '1year', label: '1 Tahun' },
                  { id: 'custom', label: 'Rentang Kustom' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setPeriod(p.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                      period === p.id
                        ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Rentang Tanggal Kustom */}
            {period === 'custom' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Dari:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors duration-100"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Sampai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 text-xs font-mono tabular-nums border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors duration-100"
                  />
                </div>
              </div>
            )}
          </div>
        )}
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
              : 'Tidak ada data insiden yang sesuai dengan filter pencarian atau rentang periode yang dipilih.'
          }
          onRetry={fetchIncidents}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Laporan</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  {filterScope !== 'shift' && <th className="py-3 px-4">Regu / Shift</th>}
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
                    {filterScope !== 'shift' && (
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        <div>Regu {typeof inc.team_group === 'string' ? inc.team_group : 'Alpha'}</div>
                        <div className="text-xs text-slate-400">Shift <span className="font-mono tabular-nums">#{inc.shift_number || 1}</span></div>
                      </td>
                    )}
                    <td className="py-3 px-4 text-slate-900 font-semibold max-w-xs">
                      <div className="truncate">{typeof inc.title === 'string' ? inc.title : '-'}</div>
                      {inc.aircraft_info && inc.aircraft_info.trim() && inc.aircraft_info.toLowerCase() !== 'non-pesawat' ? (
                        <div className="text-xs text-slate-400 font-normal truncate">
                          {inc.aircraft_info}
                        </div>
                      ) : null}
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
          setToastMsg({
            type: 'success',
            text: toastText,
          });
          fetchIncidents();
        }}
      />
    </div>
  );
}
