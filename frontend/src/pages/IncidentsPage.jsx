import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Plus,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Check,
  X,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  Download,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import { downloadIncidentReportPdf } from '../services/reportService';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
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
  const [filterPriority, setFilterPriority] = useState('ALL');

  // State Modal Ekspor Dokumen Rekap PDF Terpadu
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('1month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportCategory, setExportCategory] = useState('ALL');
  const [exportStatus, setExportStatus] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

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
      if (filterPriority !== 'ALL') {
        params.priority = filterPriority;
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
  }, [filterScope, filterPriority, activeDate, activeShiftNumber, activeTeam]);

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

  const filteredIncidents = incidents.filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inc.report_number?.toLowerCase().includes(q) ||
      inc.title?.toLowerCase().includes(q) ||
      inc.location?.toLowerCase().includes(q) ||
      inc.aircraft_info?.toLowerCase().includes(q)
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Selesai
        </span>
      );
    }
    if (s === 'menunggu_tindak_lanjut') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Tindak Lanjut
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3 h-3 text-amber-600" />
        Dalam Proses
      </span>
    );
  };

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await downloadIncidentReportPdf({
        period: exportPeriod,
        start_date: exportPeriod === 'custom' ? exportStartDate : '',
        end_date: exportPeriod === 'custom' ? exportEndDate : '',
        category: exportCategory,
        status: exportStatus,
      });
      setToastMsg('Dokumen rekapitulasi laporan insiden resmi berhasil diunduh.');
      setExportModalOpen(false);
    } catch (err) {
      console.error('Gagal mengunduh PDF insiden:', err);
      setToastMsg('Gagal mengunduh berkas laporan insiden. Silakan coba kembali.');
    } finally {
      setIsExporting(false);
    }
  };

  const summaryStats = {
    total: incidents.length,
    critical: incidents.filter((i) => {
      const p = (i.priority || i.severity || '').toLowerCase();
      return p.includes('kritis') || p.includes('critical');
    }).length,
    inProgress: incidents.filter((i) => {
      const s = (i.status || '').toLowerCase();
      return s === 'dalam_proses' || s === 'menunggu_tindak_lanjut';
    }).length,
    resolved: incidents.filter((i) => (i.status || '').toLowerCase() === 'selesai').length,
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pemantauan & Laporan Insiden
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Shift {activeShiftNumber} • {formatTeam(activeTeam)} • Bandara Internasional Yogyakarta (YIA)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            icon={FileText}
            onClick={() => navigate('/incidents/reports')}
          >
            Rekap Laporan
          </Button>

          <Button
            variant="outline"
            icon={Download}
            onClick={() => setExportModalOpen(true)}
          >
            Cetak Rekap PDF
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
            <span className="font-semibold">{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Unified Triage & Search Command Bar (Merging KPIs + Scope + Priority + Search) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Scope Switcher + Inline Triage Counters */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex rounded-lg bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
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
                Shift Ini ({formatTeam(activeTeam)})
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

            {/* Inline Triage Summary Pills */}
            <div className="inline-flex items-center divide-x divide-slate-200 rounded-lg bg-slate-50 border border-slate-200 text-xs overflow-hidden">
              <div className="px-2.5 py-1 flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Total:</span>
                <span className="font-bold text-slate-900 tabular-nums">{summaryStats.total}</span>
              </div>
              <div className="px-2.5 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                <span className="text-red-700 font-medium">Kritis:</span>
                <span className="font-bold text-red-700 tabular-nums">{summaryStats.critical}</span>
              </div>
              <div className="px-2.5 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-800 font-medium">Proses:</span>
                <span className="font-bold text-amber-800 tabular-nums">{summaryStats.inProgress}</span>
              </div>
              <div className="px-2.5 py-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-800 font-medium">Selesai:</span>
                <span className="font-bold text-emerald-800 tabular-nums">{summaryStats.resolved}</span>
              </div>
            </div>
          </div>

          {/* Right: Search Box */}
          <div className="relative w-full lg:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor/judul/lokasi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-100"
            />
          </div>
        </div>

        {/* Bottom Row: Priority Triage Filter Chips */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            Prioritas:
          </span>
          {['ALL', 'kritis', 'tinggi', 'sedang', 'rendah'].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => {
                setFilterPriority(lvl);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold capitalize transition-colors duration-100 cursor-pointer ${
                filterPriority === lvl
                  ? 'bg-red-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {lvl === 'ALL' ? 'Semua Prioritas' : lvl}
            </button>
          ))}
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
          emptyAction={
            canReport ? (
              <Button variant="danger" size="sm" onClick={() => setModalOpen(true)}>
                Catat Insiden Sekarang
              </Button>
            ) : null
          }
          onRetry={fetchIncidents}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Laporan</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Regu / Shift</th>
                  <th className="py-3 px-4">Judul Kejadian</th>
                  <th className="py-3 px-4">Lokasi Area</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedIncidents.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors duration-100 group"
                  >
                    <td className="py-3 px-4 font-bold text-red-700 font-mono text-[11.5px]">
                      {inc.report_number || `INC-${inc.id}`}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      <div>{inc.incident_date}</div>
                      <div className="text-[10.5px] text-slate-400">
                        {(inc.incident_time || '').slice(0, 5)} WIB
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div>Regu {inc.team_group || 'Alpha'}</div>
                      <div className="text-[10.5px] text-slate-400">Shift #{inc.shift_number || 1}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-900 font-semibold max-w-xs">
                      <div className="truncate">{inc.title}</div>
                      <div className="text-[10.5px] text-slate-400 font-normal">
                        {inc.aircraft_info || 'Non-Pesawat'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{inc.location || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getPriorityBadge(inc.priority_level)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(inc.status)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incidents/${inc.id}`);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors duration-100"
                        title="Buka Detail Insiden"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
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
                Halaman {currentPage} dari {totalPages}
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
          setToastMsg(msg || 'Laporan insiden berhasil dikirimkan.');
          fetchIncidents();
        }}
      />

      {/* Modal Ekspor PDF Rekapitulasi Insiden Resmi */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => !isExporting && setExportModalOpen(false)}
        title="Cetak Rekapitulasi Laporan Insiden Resmi"
        subtitle="Unduh berkas PDF rekapitulasi data insiden bertandatangan pimpinan dinas ARFF YIA"
      >
        <div className="space-y-4">
          <SelectField
            label="Periode Rekapitulasi"
            value={exportPeriod}
            onChange={(e) => setExportPeriod(e.target.value)}
            options={[
              { value: '1month', label: '1 Bulan Terakhir (30 Hari)' },
              { value: '3months', label: '3 Bulan Terakhir (Triwulan)' },
              { value: '1year', label: '1 Tahun Terakhir (Tahunan)' },
              { value: 'custom', label: 'Rentang Tanggal Kustom' },
            ]}
          />

          {exportPeriod === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <InputField
                label="Tanggal Mulai"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
              <InputField
                label="Tanggal Selesai"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectField
              label="Filter Kategori Insiden"
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value)}
              options={[
                { value: 'ALL', label: 'Semua Kategori' },
                { value: 'aircraft_accident', label: 'Kecelakaan Pesawat (Accident)' },
                { value: 'aircraft_incident', label: 'Insiden Pesawat (Incident)' },
                { value: 'building_fire', label: 'Kebakaran Gedung/Fasilitas' },
                { value: 'fuel_spill', label: 'Tumpahan Bahan Bakar (Spill)' },
                { value: 'medical_emergency', label: 'Kedaruratan Medis' },
                { value: 'bomb_threat', label: 'Ancaman Bom / Keamanan' },
                { value: 'natural_disaster', label: 'Bencana Alam / Cuaca' },
                { value: 'other', label: 'Lain-lain / Khusus' },
              ]}
            />

            <SelectField
              label="Filter Status Penanganan"
              value={exportStatus}
              onChange={(e) => setExportStatus(e.target.value)}
              options={[
                { value: 'ALL', label: 'Semua Status' },
                { value: 'dalam_proses', label: 'Dalam Proses' },
                { value: 'menunggu_tindak_lanjut', label: 'Tindak Lanjut' },
                { value: 'selesai', label: 'Selesai' },
              ]}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Format Dokumen Cetak Standar D-OPS ARFF YIA:</p>
            <p className="text-[11px] text-blue-700">
              Dokumen PDF memuat nomor registrasi laporan, kronologi singkat, tindakan unit, matriks kategori keparahan, serta lembar tanda tangan dinas Section Head.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={isExporting}
              onClick={() => setExportModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="primary"
              icon={Download}
              loading={isExporting}
              disabled={isExporting || (exportPeriod === 'custom' && (!exportStartDate || !exportEndDate))}
              onClick={handleExportPdf}
            >
              {isExporting ? 'Memproses Dokumen PDF...' : 'Unduh Dokumen PDF'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
