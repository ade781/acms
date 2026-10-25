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
  ArrowLeft,
} from 'lucide-react';
import api from '../services/api';
import { downloadIncidentReportPdf } from '../services/reportService';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';

export default function HalamanLaporanInsiden() {
  const navigate = useNavigate();

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
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
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
  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await downloadIncidentReportPdf({
        period,
        start_date: period === 'custom' ? startDate : '',
        end_date: period === 'custom' ? endDate : '',
        category: filterCategory,
        status: filterStatus,
      });
    } catch (err) {
      console.error('Gagal mengunduh PDF insiden:', err);
    } finally {
      setIsExporting(false);
    }
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
      {/* Top Header: Navigasi Back & Tombol Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/incidents')}
          >
            Kembali
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Laporan Rekapitulasi Insiden
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Unit Airport Rescue & Fire Fighting (PKP-PK) • Bandara Internasional Yogyakarta (YIA)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchSummaryReport}
            disabled={loading}
          >
            Segarkan
          </Button>

          <Button
            variant="danger"
            size="sm"
            icon={Download}
            onClick={handleExportPdf}
            loading={isExporting}
            disabled={isExporting}
          >
            {isExporting ? 'Mengunduh...' : 'Unduh PDF Resmi'}
          </Button>
        </div>
      </div>

      {/* Filter Bar: Preset Periode & Rentang Tanggal Kustom */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-600 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Periode:
            </span>
            {[
              { id: '1month', label: '1 Bulan Terakhir (Default)' },
              { id: '3months', label: '3 Bulan' },
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-100 ${
                  period === p.id
                    ? 'bg-red-600 text-white shadow-xs font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nomor laporan/lokasi..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-100"
            />
          </div>
        </div>

        {/* Input Rentang Tanggal Kustom */}
        {period === 'custom' && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 font-medium">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-100"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentPage(1);
                fetchSummaryReport();
              }}
            >
              Terapkan Filter
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards: Ringkasan Situasi Insiden */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Insiden</span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {reportData.stats?.total || 0}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Periode: {reportData.startDate || '-'} s.d. {reportData.endDate || '-'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-red-600 uppercase">Siaga I (Kritis)</span>
            <span className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-red-700">
            {reportData.stats?.kritis || 0}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Prioritas Tinggi & Kritis
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-amber-600 uppercase">Dalam Penanganan</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-amber-700">
            {(reportData.stats?.dalam_proses || 0) + (reportData.stats?.menunggu_tindak_lanjut || 0)}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Proses & Tindak Lanjut
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Selesai / Terkendali</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {reportData.stats?.selesai || 0}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Penanganan Selesai Penuh
          </span>
        </div>
      </div>

      {/* LAYER 1: TABEL DAFTAR RINGKASAN KEJADIAN */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Daftar Rekapitulasi Kejadian (Layer 1)
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Klik baris insiden untuk membuka Layer 2 (Detail kronologi, tindakan, koordinasi ATC & foto TKP)
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Menampilkan {filteredList.length} kejadian
          </span>
        </div>

        <StateView
          loading={loading}
          error={error}
          isEmpty={filteredList.length === 0}
          emptyTitle="Nihil Laporan Insiden"
          emptyDescription="Tidak terdapat catatan kejadian darurat atau insiden operasional pada periode yang dipilih."
          onRetry={fetchSummaryReport}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">No. Laporan</th>
                  <th className="py-3 px-4">Waktu Kejadian</th>
                  <th className="py-3 px-4">Klasifikasi & Judul</th>
                  <th className="py-3 px-4">Lokasi Area</th>
                  <th className="py-3 px-4">Prioritas</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedList.map((inc) => (
                  <tr
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-100 group"
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
                    <td className="py-3 px-4 text-slate-900 font-semibold max-w-xs">
                      <div className="truncate">{inc.title}</div>
                      <div className="text-[10.5px] text-slate-400 font-normal">
                        {inc.aircraft_info || 'Non-Aircraft'}
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
                          setSelectedIncident(inc);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors duration-100"
                        title="Buka Rincian Layer 2"
                      >
                        <Eye className="w-4 h-4" />
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

      {/* LAYER 2: MODAL DETAIL INSIDEN KOMPREHENSIF */}
      {selectedIncident && (
        <Modal
          isOpen={Boolean(selectedIncident)}
          onClose={() => {
            setSelectedIncident(null);
            setActivePhoto(null);
          }}
          title={`Detail Insiden Operasional: ${selectedIncident.report_number || `INC-${selectedIncident.id}`}`}
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Header Status & Klasifikasi */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Judul & Klasifikasi
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedIncident.title}
                </h4>
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(selectedIncident.priority_level)}
                {getStatusBadge(selectedIncident.status)}
              </div>
            </div>

            {/* Grid Informasi Waktu & Lokasi */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Tanggal Kejadian</span>
                <span className="font-semibold text-slate-900">{selectedIncident.incident_date}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Waktu Alarm</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {(selectedIncident.incident_time || '').slice(0, 5)} WIB
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Waktu Tiba TKP</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {selectedIncident.activation_time ? `${selectedIncident.activation_time.slice(0, 5)} WIB` : '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Lokasi / Area</span>
                <span className="font-semibold text-slate-900">{selectedIncident.location || '-'}</span>
              </div>
            </div>

            {/* Asal Informasi, Pesawat, & Koordinasi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Asal Informasi (ATC/Tower)</span>
                <p className="font-medium text-slate-800">{selectedIncident.source_info || 'Radio HT Tower ATC'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pesawat / Objek</span>
                <p className="font-medium text-slate-800">{selectedIncident.aircraft_info || 'Non-Pesawat'}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pihak Terkoordinasi</span>
                <p className="font-medium text-slate-800">{selectedIncident.coordinated_parties || 'ATC YIA, Avsec, AMC'}</p>
              </div>
            </div>

            {/* Kronologis Kejadian */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Uraian Kronologis Kejadian
              </span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                {selectedIncident.chronology || 'Tidak ada catatan kronologi.'}
              </div>
            </div>

            {/* Tindakan Penanganan & Kondisi Terakhir TKP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tindakan Penanganan Operasional
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 min-h-[60px] whitespace-pre-wrap">
                  {selectedIncident.action_taken || 'Telah dilakukan tindakan penanganan darurat sesuai SOP ARFF.'}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-600" />
                  Kondisi Terakhir TKP
                </span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 min-h-[60px] whitespace-pre-wrap">
                  {selectedIncident.last_condition || 'Area dinyatakan aman, bersih, dan terkendali.'}
                </div>
              </div>
            </div>

            {/* Galeri Foto Dokumentasi TKP */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                Foto Dokumentasi TKP ({selectedIncident.attachments?.length || 0})
              </span>
              {(!selectedIncident.attachments || selectedIncident.attachments.length === 0) ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                  Tidak ada berkas lampiran foto untuk kejadian ini.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {selectedIncident.attachments.map((att, aIdx) => (
                    <div
                      key={att.id || aIdx}
                      onClick={() => setActivePhoto(att.file_path)}
                      className="group relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:border-red-500 transition-colors duration-100"
                    >
                      <img
                        src={att.file_path}
                        alt={`Lampiran ${aIdx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-150"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-100">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Zoom Foto */}
            {activePhoto && (
              <div
                className="fixed inset-0 z-60 bg-slate-900/80 flex items-center justify-center p-4"
                onClick={() => setActivePhoto(null)}
              >
                <div className="relative max-w-3xl max-h-[85vh] bg-black rounded-xl overflow-hidden shadow-2xl">
                  <button
                    type="button"
                    onClick={() => setActivePhoto(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-800/80 text-white hover:bg-slate-700"
                    aria-label="Tutup Pratinjau Foto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <img
                    src={activePhoto}
                    alt="Foto TKP Pembesaran"
                    className="w-full h-auto max-h-[80vh] object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
