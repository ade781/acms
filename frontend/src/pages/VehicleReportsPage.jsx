import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  ChevronRight,
  X,
  Eye,
  Download,
  ExternalLink,
  HelpCircle,
  AlertCircle,
  Pencil,
  Wrench,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { downloadVehicleReportPdf } from '../services/reportService';
import { formatIndoDate } from '../utils/shiftHelper';
import { buildAuthenticatedFileUrl, downloadBlob } from '../utils/fileHelper';
import Button from '../components/common/Button';
import StateView from '../components/common/StateView';
import Modal from '../components/common/Modal';
import VehicleMaintenanceModal from '../components/forms/VehicleMaintenanceModal';

export default function VehicleReportsPage() {
  const navigate = useNavigate();

  // State Filter Periode
  const [selectedPeriod, setSelectedPeriod] = useState('1month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // State Feedback Notifikasi Visual (Toast)
  const [toastMsg, setToastMsg] = useState(null);

  // Auto-dismiss Toast setelah 4 detik
  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  // State Data
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Modal Detail Timeline
  const [selectedVehicleDetail, setSelectedVehicleDetail] = useState(null);

  // State Modal CRUD Catatan Pemeliharaan / Kendala
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceInitialData, setMaintenanceInitialData] = useState(null);

  // State Modal Pratinjau Dokumen PDF
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);


  // Helper Ekstraksi Pesan Error dari Blob Response
  const extractBlobErrorMessage = async (errorOrBlob, fallbackMsg = 'Terjadi kesalahan pada dokumen PDF.') => {
    try {
      const blob = errorOrBlob?.response?.data instanceof Blob
        ? errorOrBlob.response.data
        : errorOrBlob instanceof Blob
          ? errorOrBlob
          : null;
      if (blob) {
        const text = await blob.text();
        try {
          const json = JSON.parse(text);
          return json.message || json.error || text || fallbackMsg;
        } catch {
          return text || fallbackMsg;
        }
      }
      return errorOrBlob?.response?.data?.message || errorOrBlob?.message || fallbackMsg;
    } catch {
      return fallbackMsg;
    }
  };

  // Bersihkan object URL saat komponen unmount
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  // Handler Buka Pratinjau PDF
  const handleOpenPreview = async () => {
    setIsPreviewModalOpen(true);
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const query = new URLSearchParams({
        period: isCustomMode && startDate && endDate ? 'custom' : selectedPeriod,
      });
      if (isCustomMode && startDate) query.append('start_date', startDate);
      if (isCustomMode && endDate) query.append('end_date', endDate);

      const res = await api.get(`/reports/vehicles/pdf?${query.toString()}`, {
        responseType: 'blob',
      });

      // Validasi apakah response blob adalah JSON (error terbungkus blob)
      if (res.data instanceof Blob && (res.data.type === 'application/json' || res.headers?.['content-type']?.includes('application/json'))) {
        const errorMsg = await extractBlobErrorMessage(res.data, 'Gagal memuat pratinjau dokumen PDF armada.');
        throw new Error(errorMsg);
      }

      if (res.data.size === 0) {
        throw new Error('Dokumen PDF kosong atau tidak ditemukan.');
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error('Error generating PDF preview:', err);
      const errMsg = await extractBlobErrorMessage(err, 'Gagal memuat pratinjau dokumen PDF armada.');
      setPreviewError(errMsg);
      setToastMsg({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleClosePreview = () => {
    setIsPreviewModalOpen(false);
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    setPreviewError(null);
  };

  // Fetch Report Data
  const fetchReport = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      if (isCustomMode && startDate && endDate) {
        query = `?start_date=${startDate}&end_date=${endDate}`;
      } else {
        query = `?period=${selectedPeriod}`;
      }

      const res = await api.get(`/readiness/transitions-report${query}`, { signal });
      setReportData(res.data?.data || null);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching transitions report:', err);
      const errMsg =
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : typeof err.response?.data === 'string'
            ? err.response.data
            : err.message || 'Gagal memuat laporan transisi kesiapan armada.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, isCustomMode, startDate, endDate]);

  useEffect(() => {
    const controller = new AbortController();
    fetchReport(controller.signal);
    return () => controller.abort();
  }, [fetchReport]);

  // Sinkronisasi data selectedVehicleDetail saat reportData diperbarui
  useEffect(() => {
    if (selectedVehicleDetail && reportData?.vehicles) {
      const updated = reportData.vehicles.find((v) => v.id === selectedVehicleDetail.id);
      if (updated) {
        setSelectedVehicleDetail(updated);
      }
    }
  }, [reportData]);

  const handlePeriodChange = (periodKey) => {
    setIsCustomMode(false);
    setSelectedPeriod(periodKey);
  };

  const handleOpenCustomMode = () => {
    setIsCustomMode(true);
    if (!startDate && reportData?.period_info?.start_date) {
      setStartDate(reportData.period_info.start_date);
    }
    if (!endDate && reportData?.period_info?.end_date) {
      setEndDate(reportData.period_info.end_date);
    }
  };

  const handleApplyCustomDate = (e) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setToastMsg({
        type: 'error',
        text: 'Silakan tentukan tanggal awal (Dari) dan tanggal akhir (Sampai).',
      });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setToastMsg({
        type: 'error',
        text: 'Tanggal awal (Dari) tidak boleh lebih besar dari tanggal akhir (Sampai).',
      });
      return;
    }
    setIsCustomMode(true);
    fetchReport();
    setToastMsg({
      type: 'success',
      text: `Menampilkan laporan armada untuk rentang kustom: ${startDate} s/d ${endDate}.`,
    });
  };

  const handlePrint = async () => {
    try {
      setIsExporting(true);
      await downloadVehicleReportPdf({
        period: isCustomMode && startDate && endDate ? 'custom' : selectedPeriod,
        start_date: isCustomMode ? startDate : '',
        end_date: isCustomMode ? endDate : '',
      });
      setToastMsg({
        type: 'success',
        text: 'Dokumen PDF Laporan Kesiapan Armada berhasil diunduh.',
      });
    } catch (err) {
      console.error('Gagal mengunduh PDF armada:', err);
      const errMsg = await extractBlobErrorMessage(err, 'Gagal mengunduh dokumen PDF armada.');
      setToastMsg({
        type: 'error',
        text: errMsg,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Handler Unduh Dokumen Lampiran PDF
  const handleDownloadDocument = async (docUrl, docName) => {
    if (!docUrl) return;
    try {
      setToastMsg({ type: 'info', text: 'Mengunduh berkas PDF...' });
      const res = await api.get(docUrl, {
        responseType: 'blob',
      });

      // Validasi apakah response blob adalah JSON (error terbungkus blob)
      if (res.data instanceof Blob && (res.data.type === 'application/json' || res.headers?.['content-type']?.includes('application/json'))) {
        const errorMsg = await extractBlobErrorMessage(res.data, 'Berkas PDF tidak ditemukan atau gagal diunduh.');
        throw new Error(errorMsg);
      }

      const blob = new Blob([res.data], { type: 'application/pdf' });
      downloadBlob(blob, docName || 'Dokumen_Lampiran.pdf');
      setToastMsg({ type: 'success', text: 'Berkas PDF berhasil diunduh.' });
    } catch (err) {
      console.error('Error downloading document:', err);
      const errMsg = await extractBlobErrorMessage(err, 'Gagal mengunduh berkas lampiran.');
      setToastMsg({
        type: 'error',
        text: errMsg,
      });
      // Fallback: direct browser download via authenticated URL with download query
      const authUrl = buildAuthenticatedFileUrl(docUrl) + (docUrl.includes('?') ? '&download=1' : '?download=1');
      const link = document.createElement('a');
      link.href = authUrl;
      link.setAttribute('download', docName || 'Dokumen_Lampiran.pdf');
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Handler Buka Modal Edit Pemeliharaan
  const handleOpenEditMaintenance = (item) => {
    const rawId = item.maintenance_id || item.id || null;
    const rawDesc = item.issue_description || item.justification || item.notes || '';
    const cleanDesc = rawDesc.replace(/^\[.*?\]\s*/, '').trim();

    setMaintenanceInitialData({
      id: rawId,
      vehicle_id: item.vehicle_id || selectedVehicleDetail?.id,
      start_date: item.start_date || item.shift_date,
      start_shift_number: item.start_shift_number || item.shift_number || 1,
      start_team_group: item.start_team_group || item.team_group || 'Alpha',
      reported_by_id: item.reported_by_id || null,
      issue_description: cleanDesc,
      status: item.status === 'resolved' || item.is_resolved ? 'resolved' : 'ongoing',
      end_date: item.end_date || item.resolved_date || '',
      end_shift_number: item.end_shift_number || item.resolved_shift_number || 1,
      end_team_group: item.end_team_group || item.resolved_team_group || 'Alpha',
      resolved_by_id: item.resolved_by_id || null,
      resolution_notes: item.resolution_notes || '',
      technician_vendor: item.technician_vendor || '',
      document_url: item.document_url || '',
      document_name: item.document_name || '',
    });
    setIsMaintenanceModalOpen(true);
  };

  const vehicles = reportData?.vehicles || [];
  const summary = reportData?.summary || {
    total_vehicles: 0,
    total_transitions: 0,
    currently_serviceable: 0,
    currently_unserviceable: 0,
    currently_unreported: 0,
  };
  const currentlyUnreported =
    summary.currently_unreported ??
    Math.max(
      0,
      (summary.total_vehicles || 0) -
      (summary.currently_serviceable || 0) -
      (summary.currently_unserviceable || 0)
    );
  const periodInfo = reportData?.period_info;

  const filteredVehicles = vehicles.filter((v) => {
    const rawStatus = (v.current_status || v.status || 'belum_dilaporkan').toLowerCase();
    if (filterStatus === 'serviceable' && rawStatus !== 'serviceable') return false;
    if (filterStatus === 'unserviceable' && rawStatus !== 'unserviceable') return false;
    if (
      filterStatus === 'belum_dilaporkan' &&
      rawStatus !== 'belum_dilaporkan' &&
      rawStatus !== ''
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Toast Feedback Notifikasi Visual */}
      {toastMsg && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold shadow-xs transition-colors duration-100 ${toastMsg.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}
        >
          <div className="flex items-center gap-2.5">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>
              {typeof toastMsg?.text === 'string'
                ? toastMsg.text
                : toastMsg?.text?.message || 'Pemberitahuan'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-1 rounded-md hover:bg-black/5 text-current cursor-pointer transition-colors duration-100"
            title="Tutup Notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Executive Document Control Card + Integrated Horizontal Metric Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Row: Title & Document Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate('/vehicles')}
            >
              Kembali
            </Button>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                Laporan Kesiapan & Transisi Status Armada
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-sans">
                Periode:{' '}
                <span className="font-mono tabular-nums font-semibold text-slate-700">
                  {isCustomMode && startDate && endDate
                    ? `${startDate} s.d. ${endDate}`
                    : periodInfo
                      ? `${periodInfo.start_date} s.d. ${periodInfo.end_date}`
                      : selectedPeriod}
                </span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="font-mono tabular-nums font-semibold text-slate-700">
                  {summary.total_transitions}
                </span>{' '}
                Periode Kendala
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden flex-wrap">
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={handleOpenPreview}
              loading={isLoadingPreview}
              disabled={isLoadingPreview}
            >
              {isLoadingPreview ? 'Memuat PDF...' : 'Pratinjau PDF'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handlePrint}
              loading={isExporting}
              disabled={isExporting}
            >
              {isExporting ? 'Mengunduh...' : 'Unduh PDF Resmi'}
            </Button>
          </div>
        </div>

        {/* Bottom Row: Interactive 3-Column Tabular Ledger Strip (Status Kesiapan Baku) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60 text-xs font-sans">
          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'serviceable' ? 'ALL' : 'serviceable')}
            className={`px-4 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors duration-100 ${filterStatus === 'serviceable'
              ? 'bg-white shadow-2xs font-bold ring-1 ring-emerald-300'
              : 'hover:bg-slate-100/60'
              }`}
          >
            <div className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span className="font-semibold">Serviceable</span>
            </div>
            <span className="font-black text-emerald-700 font-mono tabular-nums">
              {summary.currently_serviceable} Unit
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'unserviceable' ? 'ALL' : 'unserviceable')}
            className={`px-4 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors duration-100 ${filterStatus === 'unserviceable'
              ? 'bg-white shadow-2xs font-bold ring-1 ring-red-300'
              : 'hover:bg-slate-100/60'
              }`}
          >
            <div className="flex items-center gap-2 text-slate-600">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              <span className="font-semibold">Unserviceable</span>
            </div>
            <span className="font-black text-red-700 font-mono tabular-nums">
              {summary.currently_unserviceable} Unit
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus(filterStatus === 'belum_dilaporkan' ? 'ALL' : 'belum_dilaporkan')}
            className={`px-4 py-2.5 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors duration-100 ${filterStatus === 'belum_dilaporkan'
              ? 'bg-white shadow-2xs font-bold ring-1 ring-slate-300'
              : 'hover:bg-slate-100/60'
              }`}
          >
            <div className="flex items-center gap-2 text-slate-600">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Belum Dicek</span>
            </div>
            <span
              className={`font-black font-mono tabular-nums ${currentlyUnreported > 0 ? 'text-amber-700' : 'text-slate-600'
                }`}
            >
              {currentlyUnreported} Unit
            </span>
          </button>
        </div>
      </div>

      {/* Tabel Data Rekapitulasi Armada */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 print:hidden">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900 font-sans">
              Daftar Rekapitulasi Kesiapan Armada
            </h3>
            {filterStatus !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 font-sans flex items-center gap-1">
                <span>Filter:</span>
                <span className="font-bold">
                  {filterStatus === 'serviceable'
                    ? 'Serviceable'
                    : filterStatus === 'unserviceable'
                      ? 'Unserviceable'
                      : 'Belum Dicek'}
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className="ml-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Hapus Filter"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Samping Kanan: Switcher Periode & Tombol Catat Pemeliharaan (Hanya Ikon) */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Periode Switcher Segmented Control */}
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs flex-wrap font-sans">
              <button
                type="button"
                onClick={() => handlePeriodChange('1month')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${!isCustomMode && selectedPeriod === '1month'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                1 Bulan (Default)
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('3months')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${!isCustomMode && selectedPeriod === '3months'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                3 Bulan
              </button>
              <button
                type="button"
                onClick={() => handlePeriodChange('1year')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${!isCustomMode && selectedPeriod === '1year'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                1 Tahun
              </button>
              <button
                type="button"
                onClick={handleOpenCustomMode}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${isCustomMode
                  ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Rentang Kustom
              </button>
            </div>

            {/* Tombol Catat Pemeliharaan (Hanya Ikon) */}
            <button
              type="button"
              onClick={() => {
                setMaintenanceInitialData(null);
                setIsMaintenanceModalOpen(true);
              }}
              title="Catat Pemeliharaan / Kendala Armada"
              aria-label="Catat Pemeliharaan / Kendala Armada"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-700 hover:text-slate-900 shadow-2xs transition-colors duration-100 cursor-pointer flex items-center justify-center"
            >
              <Wrench className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Input Rentang Tanggal Kustom (Jika Mode Kustom Aktif) */}
        {isCustomMode && (
          <form
            onSubmit={handleApplyCustomDate}
            className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-3 text-xs font-sans print:hidden"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-mono tabular-nums focus:ring-1 focus:ring-red-600 outline-none transition-colors duration-100 bg-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-mono tabular-nums focus:ring-1 focus:ring-red-600 outline-none transition-colors duration-100 bg-white"
              />
            </div>

            <Button type="submit" variant="primary" size="sm" loading={loading}>
              Terapkan Rentang
            </Button>
          </form>
        )}

        <StateView
          loading={loading}
          error={error}
          isEmpty={filteredVehicles.length === 0}
          emptyTitle="Tidak Ada Data Armada"
          emptyDescription="Belum ada catatan kesiapan armada yang sesuai dengan filter pada rentang periode ini."
          onRetry={fetchReport}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-xs">
                  <th className="py-3 px-4">Nama Armada</th>
                  <th className="py-3 px-4 text-center">
                    {periodInfo?.is_current_period === false ? 'Status Akhir Periode' : 'Status Saat Ini'}
                  </th>
                  <th className="py-3 px-4">Periode Unserviceable</th>
                  <th className="py-3 px-4">Riwayat Terakhir</th>
                  <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => {
                  const rawStatus = v.current_status || v.status || 'belum_dilaporkan';
                  const isCurrentUnserv = rawStatus === 'unserviceable';
                  const isCurrentServ = rawStatus === 'serviceable';
                  const periodCount = Number(v.period_count ?? v.transition_count ?? 0);
                  const ongoingCount = Number(v.ongoing_issues_count ?? (isCurrentUnserv ? 1 : 0));

                  const rawPeriods = v.issue_periods || v.transitions || [];
                  const sortedPeriods = [...rawPeriods].sort((a, b) => {
                    const dateA = new Date(a.start_date || a.shift_date || 0).getTime();
                    const dateB = new Date(b.start_date || b.shift_date || 0).getTime();
                    return dateB - dateA;
                  });
                  const latestPeriod = sortedPeriods[0];
                  const latestDesc =
                    latestPeriod?.issue_description ||
                    latestPeriod?.justification ||
                    v.incident_logs?.[0]?.justification ||
                    v.incident_logs?.[0]?.notes;

                  return (
                    <tr
                      key={v.id || v.code_name || `veh-rep-${v.vehicle_name}`}
                      className="hover:bg-slate-50/80 transition-colors duration-100"
                    >
                      {/* Nama Armada (1 Baris Murni) */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{v.vehicle_name}</span>
                      </td>

                      {/* Status Terkini */}
                      <td className="py-2.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${isCurrentUnserv
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : isCurrentServ
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${isCurrentUnserv
                              ? 'bg-red-600'
                              : isCurrentServ
                                ? 'bg-emerald-600'
                                : 'bg-slate-400'
                              }`}
                          />
                          <span>
                            {isCurrentUnserv
                              ? 'Unserviceable'
                              : isCurrentServ
                                ? 'Serviceable'
                                : 'Belum Dicek'}
                          </span>
                        </span>
                      </td>

                      {/* Jumlah (Periode Unserviceable - 1 Baris Murni) */}
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {periodCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <span className="font-mono tabular-nums">{periodCount}</span> Periode
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            0 Periode
                          </span>
                        )}
                      </td>

                      {/* Riwayat (Riwayat Terakhir - 1 Baris Uraian Saja) */}
                      <td className="py-2.5 px-4 max-w-md">
                        {latestDesc ? (
                          <span
                            className="text-xs text-slate-700 font-medium truncate block"
                            title={latestDesc}
                          >
                            {latestDesc}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            -
                          </span>
                        )}
                      </td>

                      {/* Aksi Detail */}
                      <td className="py-2.5 px-4 text-right print:hidden whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicleDetail(v)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-300 hover:bg-red-50/50 text-slate-700 hover:text-red-700 text-xs font-semibold inline-flex items-center gap-1 transition-colors duration-100 cursor-pointer"
                        >
                          <span>Riwayat</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </StateView>
      </div>

      {/* Modal Detail Kronologis Transisi Armada */}
      {selectedVehicleDetail && (
        <Modal
          isOpen={Boolean(selectedVehicleDetail)}
          onClose={() => setSelectedVehicleDetail(null)}
          title={
            <div className="flex items-center gap-2.5 flex-wrap">
              <span>
                Riwayat Periode Kendala: {selectedVehicleDetail.vehicle_name}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${selectedVehicleDetail.current_status === 'unserviceable'
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : selectedVehicleDetail.current_status === 'serviceable'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${selectedVehicleDetail.current_status === 'unserviceable'
                    ? 'bg-red-600'
                    : selectedVehicleDetail.current_status === 'serviceable'
                      ? 'bg-emerald-600'
                      : 'bg-slate-400'
                    }`}
                />
                <span>
                  {selectedVehicleDetail.current_status === 'unserviceable'
                    ? 'Unserviceable'
                    : selectedVehicleDetail.current_status === 'serviceable'
                      ? 'Serviceable'
                      : 'Belum Dicek'}
                </span>
              </span>
            </div>
          }
          subtitle={`Periode ${formatIndoDate(periodInfo?.start_date, { shortMonth: true })} s.d. ${formatIndoDate(periodInfo?.end_date, { shortMonth: true })}`}
          maxWidth="max-w-4xl"
          footer={
            <div className="flex items-center justify-end w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedVehicleDetail(null)}>
                Tutup
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs font-sans">
            {(() => {
              const rawPeriods = selectedVehicleDetail.issue_periods || selectedVehicleDetail.transitions || [];

              // Urutkan dari yang paling baru di paling atas
              const sortedPeriods = [...rawPeriods].sort((a, b) => {
                const dateA = new Date(a.start_date || a.shift_date || 0).getTime();
                const dateB = new Date(b.start_date || b.shift_date || 0).getTime();
                if (dateB !== dateA) return dateB - dateA;

                const shiftA = Number(a.start_shift_number || a.shift_number || 0);
                const shiftB = Number(b.start_shift_number || b.shift_number || 0);
                if (shiftB !== shiftA) return shiftB - shiftA;

                return (b.period_number || b.id || 0) - (a.period_number || a.id || 0);
              });

              return (
                <div className="space-y-4">
                  {sortedPeriods.length > 0 ? (
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
                      {sortedPeriods.map((item, idx) => {
                        const isOngoing = item.status === 'ongoing' || !item.is_resolved;
                        return (
                          <div
                            key={item.maintenance_id || item.id || idx}
                            className={`p-4 sm:p-5 rounded-2xl border bg-white space-y-3.5 shadow-xs transition-colors duration-100 ${isOngoing ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                              }`}
                          >
                            {/* Header Card Periode */}
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                                  Periode #<span className="font-mono tabular-nums">{item.period_number || idx + 1}</span>
                                </span>
                                {item.is_carried_from_prior && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    Carry-Over
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Status Badge Tegas Tanpa Metrik Downtime */}
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${isOngoing
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    }`}
                                >
                                  {isOngoing ? (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                                      <span>Dalam Penanganan</span>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Selesai</span>
                                    </>
                                  )}
                                </span>

                                {/* Tombol Aksi: Buka/Unduh Dokumen PDF, Edit & Hapus */}
                                <div className="flex items-center gap-1.5">
                                  {/* Tombol Dokumen PDF (di samping tombol edit) */}
                                  {item.document_url ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadDocument(item.document_url, item.document_name)}
                                      className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 transition-colors duration-100 cursor-pointer inline-flex items-center justify-center"
                                      title={`Dokumen: ${item.document_name || 'Dokumen_Lampiran.pdf'}`}
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setToastMsg({
                                          type: 'info',
                                          text: 'Belum ada dokumen lampiran pada catatan ini. Anda dapat mengunggahnya melalui tombol Edit.',
                                        });
                                        handleOpenEditMaintenance(item);
                                      }}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors duration-100 cursor-pointer inline-flex items-center justify-center"
                                      title="Dokumen (Belum ada berkas terunggah, klik untuk unggah)"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditMaintenance(item)}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors duration-100 cursor-pointer"
                                    title="Edit Catatan Kendala & Pemeliharaan"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Baris Log: Mulai Kendala & Status Pemulihan */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                  Mulai Kendala:
                                </p>
                                <p className="font-semibold text-slate-800 mt-1">
                                  {formatIndoDate(item.start_date || item.shift_date, { shortMonth: true })} | Shift{' '}
                                  <span className="font-mono tabular-nums">
                                    {item.start_shift_number || item.shift_number || 1}
                                  </span>{' '}
                                  ({item.start_team_group || item.team_group || 'Alpha'})
                                </p>
                                <p className="text-slate-600 text-xs mt-1">
                                  Pelapor: <span className="font-medium text-slate-800">{item.reported_by || '-'}</span>
                                </p>
                              </div>

                              <div
                                className={`p-3 rounded-xl border ${isOngoing
                                  ? 'bg-amber-50/40 border-amber-200 text-amber-900'
                                  : 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                                  }`}
                              >
                                <p className="text-xs font-bold uppercase tracking-wider opacity-75">
                                  Status Pemulihan:
                                </p>
                                {!isOngoing && (item.resolved_date || item.end_date) ? (
                                  <>
                                    <p className="font-semibold mt-1">
                                      {formatIndoDate(item.resolved_date || item.end_date, { shortMonth: true })} | Shift{' '}
                                      <span className="font-mono tabular-nums">
                                        {item.resolved_shift_number || item.end_shift_number || 1}
                                      </span>{' '}
                                      ({item.resolved_team_group || item.end_team_group || 'Alpha'})
                                    </p>
                                    <p className="text-xs opacity-80 mt-1">
                                      Dipulihkan oleh:{' '}
                                      <span className="font-medium">
                                        {item.resolved_by || item.technician_vendor || '-'}
                                      </span>
                                    </p>
                                    {item.technician_vendor && item.technician_vendor !== item.resolved_by && (
                                      <p className="text-xs opacity-80 mt-0.5">
                                        Teknisi/Bengkel: <span className="font-medium">{item.technician_vendor}</span>
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <p className="font-semibold text-amber-900 mt-1">
                                      Sedang Dalam Penanganan
                                    </p>
                                    {item.technician_vendor ? (
                                      <p className="text-xs text-amber-800 mt-1">
                                        Teknisi/Bengkel: <span className="font-medium">{item.technician_vendor}</span>
                                      </p>
                                    ) : (
                                      <p className="text-xs text-amber-700/80 mt-1">
                                        Unit pemeliharaan / log shift berjalan
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {/* 2 Kolom: Uraian Kendala & Tindakan Perbaikan / Suku Cadang */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-0.5">
                              {/* Kolom Kiri: Uraian Kendala */}
                              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                <strong className="font-bold block text-xs uppercase tracking-wider text-slate-700">
                                  Uraian Kendala Operasional:
                                </strong>

                                {/* Temuan Awal Lapangan PIC jika ada */}
                                {item.field_justification && item.field_justification !== item.issue_description && (
                                  <div className="text-xs text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/70">
                                    <span className="font-semibold text-amber-800 block text-xs mb-0.5">
                                      Temuan Lapangan (PIC):
                                    </span>
                                    {item.field_justification}
                                  </div>
                                )}

                                {/* Uraian Kendala Operasional / SPK */}
                                <div className="text-xs text-slate-800 leading-relaxed">
                                  {item.issue_description || item.justification || (!item.field_justification ? 'Tidak ada catatan uraian khusus.' : null)}
                                </div>

                                {item.notes &&
                                  item.notes !== item.issue_description &&
                                  item.notes !== item.resolution_notes &&
                                  item.notes !== item.field_justification && (
                                    <p className="text-xs text-slate-500 italic pt-1.5 border-t border-slate-200/70">
                                      <strong className="not-italic text-slate-600">Catatan Tambahan:</strong> {item.notes}
                                    </p>
                                  )}
                              </div>

                              {/* Kolom Kanan: Tindakan Perbaikan */}
                              <div className={`p-3.5 rounded-xl border space-y-2 ${isOngoing ? 'bg-amber-50/30 border-amber-200/80' : 'bg-emerald-50/30 border-emerald-200/80'
                                }`}>
                                <strong className={`font-bold block text-xs uppercase tracking-wider ${isOngoing ? 'text-amber-800' : 'text-emerald-700'
                                  }`}>
                                  Tindakan Perbaikan / Suku Cadang:
                                </strong>

                                {item.resolution_notes ? (
                                  <div className="text-xs text-slate-800 leading-relaxed">
                                    {item.resolution_notes}
                                  </div>
                                ) : isOngoing ? (
                                  <div className="text-xs text-amber-800 italic">
                                    Armada masih dalam proses penanganan / belum ada catatan penyelesaian perbaikan.
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 italic">
                                    Telah dinyatakan pulih / serviceable pada shift berjalan.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="text-xs font-semibold text-slate-700">
                        Nihil Riwayat Kendala Armada
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Tidak ada catatan kendala atau transisi unserviceable pada rentang periode ini.
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </Modal>
      )
      }

      {/* Modal Form CRUD Catatan Kendala & Pemeliharaan Armada */}
      <VehicleMaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => {
          setIsMaintenanceModalOpen(false);
          setMaintenanceInitialData(null);
        }}
        initialData={maintenanceInitialData}
        vehicles={vehicles}
        onSuccess={(msg) => {
          setToastMsg({ type: 'success', text: msg });
          fetchReport();
        }}
      />

      {/* Modal Pratinjau Dokumen PDF Resmi */}
      {
        isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/70 animate-in fade-in duration-150 font-sans">
            <div className="bg-white w-full max-w-5xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
              {/* Header Modal */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-arff-primary flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Pratinjau Dokumen PDF Laporan Armada
                    </h3>
                    <p className="text-xs text-slate-500">
                      Periode:{' '}
                      <span className="font-mono tabular-nums">
                        {isCustomMode
                          ? `${startDate} s/d ${endDate}`
                          : periodInfo
                            ? `${periodInfo.start_date} s/d ${periodInfo.end_date}`
                            : selectedPeriod}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {previewPdfUrl && (
                    <Button
                      variant="primary"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => window.open(previewPdfUrl, '_blank')}
                      title="Buka PDF di tab baru browser"
                    >
                      Buka Tab Baru
                    </Button>
                  )}
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors duration-100 ml-1 cursor-pointer"
                    title="Tutup Pratinjau"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Area Pratinjau Dokumen */}
              <div className="flex-1 bg-slate-100 p-2 sm:p-4 flex flex-col items-center justify-center overflow-hidden">
                {isLoadingPreview ? (
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-500 text-xs py-16">
                    <RefreshCw className="w-8 h-8 animate-spin text-red-600" />
                    <p className="font-semibold text-slate-700 text-sm">
                      Menyusun & Merender Dokumen PDF...
                    </p>
                  </div>
                ) : previewError ? (
                  <div className="p-6 text-center text-xs space-y-3">
                    <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                    <p className="font-bold text-slate-800 text-sm">
                      {typeof previewError === 'string'
                        ? previewError
                        : 'Gagal memuat pratinjau dokumen PDF armada.'}
                    </p>
                    <Button variant="outline" size="sm" onClick={handleOpenPreview}>
                      Coba Muat Ulang
                    </Button>
                  </div>
                ) : previewPdfUrl ? (
                  <iframe
                    src={`${previewPdfUrl}#toolbar=1&navpanes=0`}
                    title="Pratinjau PDF Laporan Armada"
                    className="w-full h-full rounded-xl border border-slate-300 shadow-inner bg-white"
                  />
                ) : null}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
