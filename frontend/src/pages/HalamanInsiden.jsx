import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Plane,
  Eye,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldAlert,
  Camera,
  X,
  Plus,
  Check,
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import IncidentModal from '../components/forms/IncidentModal';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';

export default function HalamanInsiden() {
  const navigate = useNavigate();
  const { activeDate, activeShiftNumber, activeTeam, user, isChief, isAdmin, isSupervisor } = useAuth();
  const canReport = isChief || isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  // Filter Periode: '1month' (default), '3months', '1year', 'custom'
  const [period, setPeriod] = useState('1month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Status & Filter Kategori tambahan
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Data State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [reportData, setReportData] = useState({
    startDate: '',
    endDate: '',
    stats: { total: 0, selesai: 0, dalam_proses: 0, menunggu_tindak_lanjut: 0, kritis: 0 },
    incidents: [],
  });

  // Layer 2: Detail Modal Insiden Interaktif
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [activePhoto, setActivePhoto] = useState(null);

  // Pagination Layer 1
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchSummaryReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (period === 'custom') {
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
      } else {
        params.period = period;
      }
      if (filterCategory !== 'ALL') params.category = filterCategory;
      if (filterStatus !== 'ALL') params.status = filterStatus;

      const res = await api.get('/incidents/summary-report', { params });
      const data = res.data?.data || res.data;
      if (data) {
        setReportData(data);
      }
    } catch (err) {
      console.error('Error fetching incident summary report:', err);
      setError('Gagal memuat rekapitulasi laporan insiden operasional.');
    } finally {
      setLoading(false);
    }
  }, [period, startDate, endDate, filterCategory, filterStatus]);

  useEffect(() => {
    fetchSummaryReport();
  }, [fetchSummaryReport]);

  // Handler Download PDF Rekapitulasi Resmi
  const handleExportPdf = () => {
    const token = localStorage.getItem('arff_token') || localStorage.getItem('token') || '';
    const queryParams = new URLSearchParams();
    if (period === 'custom') {
      if (startDate) queryParams.set('start_date', startDate);
      if (endDate) queryParams.set('end_date', endDate);
    } else {
      queryParams.set('period', period);
    }
    if (filterCategory !== 'ALL') queryParams.set('category', filterCategory);
    if (filterStatus !== 'ALL') queryParams.set('status', filterStatus);
    if (token) queryParams.set('token', token);

    const pdfUrl = `/api/incidents/summary-report/pdf?${queryParams.toString()}`;
    window.open(pdfUrl, '_blank');
  };

  // Filter teks pencarian (Layer 1)
  const filteredList = (reportData.incidents || []).filter((inc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (inc.report_number || '').toLowerCase().includes(q) ||
      (inc.title || '').toLowerCase().includes(q) ||
      (inc.location || '').toLowerCase().includes(q) ||
      (inc.aircraft_info || '').toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
          Selesai Ditangani
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

  return (
    <div className="space-y-6">
      {/* Top Header: Navigasi & Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Laporan Insiden & Kejadian
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Unit Airport Rescue & Fire Fighting (PKP-PK) • Bandara Internasional Yogyakarta (YIA)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchSummaryReport}
            disabled={loading}
          >
            Muat Ulang
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExportPdf}
          >
            Cetak PDF Resmi (A4)
          </Button>
          {canReport && (
            <Button
              variant="danger"
              size="sm"
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
            className="text-emerald-500 hover:text-emerald-700 p-0.5 cursor-pointer"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter Bar Panel: Preset 1 Bulan, 3 Bulan, 1 Tahun, Rentang Kustom */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-slate-500" />
              Periode Rekap:
            </span>
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setPeriod('1month');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                  period === '1month'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Bulan (Default)
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod('3months');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                  period === '3months'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                3 Bulan
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod('1year');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                  period === '1year'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1 Tahun
              </button>
              <button
                type="button"
                onClick={() => {
                  setPeriod('custom');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                  period === 'custom'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Rentang Kustom
              </button>
            </div>
          </div>

          {/* Tanggal Kustom Input (Muncul jika period === 'custom') */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Mulai:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
                />
              </div>
              <span className="text-slate-400">s.d.</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Filter Baris Kedua: Status & Search Box */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Status:</span>
            <div className="flex items-center gap-1 text-xs">
              {['ALL', 'dalam_proses', 'selesai', 'menunggu_tindak_lanjut'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setFilterStatus(st);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors duration-100 cursor-pointer ${
                    filterStatus === st
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {st === 'ALL' ? 'Semua' : (st === 'selesai' ? 'Selesai' : (st === 'dalam_proses' ? 'Proses' : 'Tindak Lanjut'))}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full sm:w-72">
            <InputField
              id="searchIncidentSummary"
              placeholder="Cari nomor, judul, armada, lokasi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              icon={Search}
            />
          </div>
        </div>
      </div>

      {/* Ringkasan Statistik Periode Terpilih */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Total Insiden / Kejadian</span>
          <span className="text-2xl font-black text-slate-900 block leading-tight">
            {reportData.stats?.total || 0}
          </span>
          <span className="text-[10px] text-slate-500 block">
            Periode: {reportData.startDate} s.d. {reportData.endDate}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Selesai Ditangani</span>
          <span className="text-2xl font-black text-emerald-600 block leading-tight">
            {reportData.stats?.selesai || 0}
          </span>
          <span className="text-[10px] text-emerald-700 block">Area aman terkendali</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Dalam Penanganan</span>
          <span className="text-2xl font-black text-amber-600 block leading-tight">
            {reportData.stats?.dalam_proses || 0}
          </span>
          <span className="text-[10px] text-amber-700 block">Investigasi / Operasi Berjalan</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 block">Prioritas Siaga I & II</span>
          <span className={`text-2xl font-black block leading-tight ${reportData.stats?.kritis > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {reportData.stats?.kritis || 0}
          </span>
          <span className="text-[10px] text-red-700 block">Kondisi Siaga Operasional</span>
        </div>
      </div>

      {/* LAYER 1: Tabel Kejadian Ringkas */}
      <StateView
        loading={loading}
        error={error}
        isEmpty={filteredList.length === 0}
        emptyTitle="Tidak Ada Insiden Tercatat"
        emptyDescription="Seluruh situasi operasional pada periode yang dipilih berada dalam kondisi aman terkendali."
        onRetry={fetchSummaryReport}
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Daftar Rekapitulasi Kejadian (Layer 1)
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan {filteredList.length} kejadian
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4 text-center w-12">No</th>
                  <th className="py-3 px-4">No. Laporan</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Shift & Regu</th>
                  <th className="py-3 px-4">Klasifikasi / Judul</th>
                  <th className="py-3 px-4">Lokasi Kejadian</th>
                  <th className="py-3 px-4">Armada / Pesawat</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi (Layer 2)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedList.map((inc, idx) => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="hover:bg-slate-50/80 transition-colors duration-100 cursor-pointer"
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-red-700 whitespace-nowrap">
                      {inc.report_number || `INC-${String(inc.id).padStart(4, '0')}`}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{inc.incident_date}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {(inc.incident_time || '').slice(0, 5)} WIB
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-800">
                        Regu {formatTeam(inc.team_group || 'Alpha')}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Shift #{inc.shift_number || 1}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 line-clamp-1">{inc.title}</div>
                      <div className="mt-0.5">{getPriorityBadge(inc.priority_level)}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="flex items-center gap-1 text-slate-800 font-medium">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[150px]">{inc.location || '-'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span className="flex items-center gap-1">
                        <Plane className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[140px] text-[11px]">
                          {inc.aircraft_info || 'Non-Pesawat'}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {getStatusBadge(inc.status)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIncident(inc);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 bg-white hover:bg-slate-100 font-semibold text-[11px] transition-colors duration-100 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Rincian</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Halaman {currentPage} dari {totalPages}</span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      </StateView>

      {/* Incident Input Modal untuk Personel / Admin */}
      {modalOpen && (
        <IncidentModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={(msg) => {
            fetchSummaryReport();
            setToastMsg(msg || 'Laporan insiden berhasil dicatat ke sistem.');
          }}
        />
      )}

      {/* LAYER 2: Modal Detail Insiden Interaktif (Slide-Over / Modal) */}
      {selectedIncident && (
        <Modal
          isOpen={Boolean(selectedIncident)}
          onClose={() => setSelectedIncident(null)}
          title={`Rincian Kejadian: ${selectedIncident.report_number || `INC-${selectedIncident.id}`}`}
          subtitle={`Shift #${selectedIncident.shift_number || 1} • Regu ${formatTeam(selectedIncident.team_group || 'Alpha')} • ${selectedIncident.incident_date}`}
          maxWidth="max-w-3xl"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setSelectedIncident(null)}
              >
                Tutup Rincian
              </Button>
              <Button
                variant="primary"
                icon={ExternalLink}
                onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
              >
                Buka Layar Penuh
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header Ringkas */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                  Judul & Klasifikasi:
                </span>
                <h4 className="text-sm font-bold text-slate-900">{selectedIncident.title}</h4>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(selectedIncident.priority_level)}
                {getStatusBadge(selectedIncident.status)}
              </div>
            </div>

            {/* Grid Informasi Detail */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 block mb-0.5 text-[10.5px]">Tanggal & Jam</span>
                <span className="font-semibold text-slate-800">
                  {selectedIncident.incident_date} {selectedIncident.incident_time}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 text-[10.5px]">Lokasi Peristiwa</span>
                <span className="font-semibold text-slate-800">
                  {selectedIncident.location || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 text-[10.5px]">Tipe Pesawat / Armada</span>
                <span className="font-semibold text-slate-800">
                  {selectedIncident.aircraft_info || 'Non-Pesawat'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5 text-[10.5px]">Petugas Pelapor</span>
                <span className="font-semibold text-slate-800">
                  {selectedIncident.reporter_name || 'Petugas ARFF'}
                </span>
              </div>
            </div>

            {/* Asal Informasi & Koordinasi Terkait */}
            {(selectedIncident.source_info || selectedIncident.coordinated_parties) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200">
                <div>
                  <span className="text-slate-500 block mb-0.5 text-[10.5px] font-bold">
                    Asal Informasi Kejadian (ATC / Sisi Udara):
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedIncident.source_info || '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block mb-0.5 text-[10.5px] font-bold">
                    Pihak yang Dikoordinasikan:
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedIncident.coordinated_parties || '-'}
                  </span>
                </div>
              </div>
            )}

            {/* Kronologi Kejadian */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block">
                Uraian Kronologis Kejadian:
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedIncident.chronology || '-'}
              </div>
            </div>

            {/* Tindakan Penanganan Operasional */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block">
                Tindakan Penanganan Operasional (Firefighting & Rescue):
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedIncident.action_taken || 'Belum ada catatan tindakan khusus.'}
              </div>
            </div>

            {/* Kondisi Terakhir Lokasi */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block">
                Kondisi Terakhir Lokasi / Runway:
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed whitespace-pre-wrap">
                {selectedIncident.last_condition || 'Area telah dinyatakan aman terkendali.'}
              </div>
            </div>

            {/* Foto Bukti Dokumentasi TKP (Layer 2) */}
            {selectedIncident.attachments && selectedIncident.attachments.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide block flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-red-600" />
                  Foto Dokumentasi TKP ({selectedIncident.attachments.length} Berkas):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {selectedIncident.attachments.map((att) => (
                    <div
                      key={att.id}
                      onClick={() => setActivePhoto(att.file_path || att.file_url)}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity duration-100"
                    >
                      <img
                        src={att.file_path || att.file_url}
                        alt={att.file_name || 'Lampiran insiden'}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Modal Zoom Foto Tunggal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-xl overflow-hidden p-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
              <span className="text-xs font-bold text-slate-800">
                Pratinjau Foto Bukti Kejadian
              </span>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[75vh] overflow-hidden flex items-center justify-center bg-slate-900 rounded-lg">
              <img
                src={activePhoto}
                alt="Foto Bukti"
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
