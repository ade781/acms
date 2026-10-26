import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Printer,
  Clock,
  Filter,
  FileText,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  X,
  Eye,
  Download,
  ExternalLink,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api';
import { downloadVehicleReportPdf } from '../services/reportService';
import Button from '../components/common/Button';
import StateView from '../components/common/StateView';
import Modal from '../components/common/Modal';

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function VehicleReportsPage() {
  const navigate = useNavigate();

  // State Filter Periode
  const [selectedPeriod, setSelectedPeriod] = useState('1month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

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

  // State Modal Pratinjau Dokumen PDF
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState(null);

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
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error('Error generating PDF preview:', err);
      setPreviewError('Gagal memuat pratinjau dokumen PDF armada.');
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
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      if (isCustomMode && startDate && endDate) {
        query = `?start_date=${startDate}&end_date=${endDate}`;
      } else {
        query = `?period=${selectedPeriod}`;
      }

      const res = await api.get(`/readiness/transitions-report${query}`);
      setReportData(res.data?.data || null);
    } catch (err) {
      console.error('Error fetching transitions report:', err);
      setError(err.response?.data?.message || err.message || 'Gagal memuat laporan transisi kelaikan armada.');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, isCustomMode, startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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
        text: 'Silakan tentukan tanggal awal (Dari) dan tanggal akhir (Sampai).'
      });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setToastMsg({
        type: 'error',
        text: 'Tanggal awal (Dari) tidak boleh lebih besar dari tanggal akhir (Sampai).'
      });
      return;
    }
    setIsCustomMode(true);
    fetchReport();
    setToastMsg({
      type: 'success',
      text: `Menampilkan laporan armada untuk rentang kustom: ${startDate} s/d ${endDate}.`
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
        text: 'Dokumen PDF Laporan Kesiapan Armada berhasil diunduh.'
      });
    } catch (err) {
      console.error('Gagal mengunduh PDF armada:', err);
      setToastMsg({
        type: 'error',
        text: 'Gagal mengunduh dokumen PDF armada. Pastikan koneksi server aktif dan coba kembali.'
      });
    } finally {
      setIsExporting(false);
    }
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

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notifikasi Visual */}
      {toastMsg && (
        <div
          className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold shadow-xs transition-colors duration-100 ${
            toastMsg.type === 'error'
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
            <span>{toastMsg.text}</span>
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

      {/* Tombol Kembali & Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate('/vehicles')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-red-700 transition-colors duration-100 cursor-pointer mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Kesiapan Armada</span>
          </button>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Laporan Kesiapan & Transisi Status Armada
          </h1>
          <p className="text-xs text-slate-500">
            Pemantauan frekuensi pergantian status kelaikan fisik armada dan fasilitas posko operasional ARFF YIA
          </p>
        </div>

        {/* Tombol Aksi: Pratinjau PDF, Cetak/Unduh, Segarkan */}
        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <Button
            variant="primary"
            size="sm"
            icon={Eye}
            onClick={handleOpenPreview}
            loading={isLoadingPreview}
            disabled={isLoadingPreview}
          >
            {isLoadingPreview ? 'Memuat PDF...' : 'Pratinjau PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handlePrint}
            loading={isExporting}
            disabled={isExporting}
          >
            {isExporting ? 'Mengunduh...' : 'Unduh PDF'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={RefreshCw}
            onClick={fetchReport}
            loading={loading}
          >
            Segarkan
          </Button>
        </div>
      </div>

      {/* Bar Filter Periode */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Filter Rentang Waktu:
            </span>
          </div>

          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handlePeriodChange('1month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${
                !isCustomMode && selectedPeriod === '1month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1 Bulan Terakhir (Default)
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('3months')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${
                !isCustomMode && selectedPeriod === '3months'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              3 Bulan
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('1year')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${
                !isCustomMode && selectedPeriod === '1year'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1 Tahun
            </button>
            <button
              type="button"
              onClick={handleOpenCustomMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 cursor-pointer ${
                isCustomMode
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Rentang Kustom
            </button>
          </div>
        </div>

        {/* Input Rentang Tanggal Kustom */}
        {isCustomMode && (
          <form
            onSubmit={handleApplyCustomDate}
            className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-red-600 outline-none transition-colors duration-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-red-600 outline-none transition-colors duration-100"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={loading}
            >
              Terapkan Rentang
            </Button>
          </form>
        )}
      </div>

      {/* Ringkasan Metrik / KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Unit Armada</span>
            <Truck className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{summary.total_vehicles}</p>
          <p className="text-[11px] text-slate-400">Unit operasional & posko</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Periode Kendala</span>
            <RefreshCw className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600">{summary.total_transitions}</p>
          <p className="text-[11px] text-slate-400">Siklus kendala tercatat</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Kondisi Siap (Saat Ini)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{summary.currently_serviceable}</p>
          <p className="text-[11px] text-emerald-600 font-medium">Serviceable Terverifikasi</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>
              {summary.currently_unserviceable > 0
                ? 'Kondisi Rusak (Saat Ini)'
                : currentlyUnreported > 0
                ? 'Belum Dicek (Shift Ini)'
                : 'Kondisi Rusak (Saat Ini)'}
            </span>
            {summary.currently_unserviceable > 0 ? (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            ) : currentlyUnreported > 0 ? (
              <HelpCircle className="w-4 h-4 text-slate-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <p
            className={`text-2xl font-black ${
              summary.currently_unserviceable > 0
                ? 'text-red-700'
                : currentlyUnreported > 0
                ? 'text-slate-700'
                : 'text-emerald-700'
            }`}
          >
            {summary.currently_unserviceable > 0
              ? summary.currently_unserviceable
              : currentlyUnreported > 0
              ? currentlyUnreported
              : 0}
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            {summary.currently_unserviceable > 0 ? (
              <span className="text-red-600">
                Unserviceable {currentlyUnreported > 0 && `(dan ${currentlyUnreported} belum dicek)`}
              </span>
            ) : currentlyUnreported > 0 ? (
              <span className="text-slate-500">Menunggu inspeksi PIC</span>
            ) : (
              <span className="text-emerald-600">Nihil Kendala (100% Siap)</span>
            )}
          </p>
        </div>
      </div>


      {/* Tabel Data Rekapitulasi Armada */}
      <StateView
        loading={loading}
        error={error}
        isEmpty={vehicles.length === 0}
        emptyTitle="Tidak Ada Data Armada"
        emptyDescription="Belum ada catatan log kesiapan armada pada rentang periode yang dipilih."
        onRetry={fetchReport}
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
                  <th className="py-3 px-4">Kode Unit</th>
                  <th className="py-3 px-4">Nama Armada & Spesifikasi</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 text-center">Status Saat Ini</th>
                  <th className="py-3 px-4 text-center">Periode Kendala</th>
                  <th className="py-3 px-4">Riwayat Kerusakan (Unserviceable)</th>
                  <th className="py-3 px-4 text-right print:hidden">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => {
                  const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
                  const rawStatus = v.current_status || v.status || 'belum_dilaporkan';
                  const isCurrentUnserv = rawStatus === 'unserviceable';
                  const isCurrentServ = rawStatus === 'serviceable';
                  const periodCount = Number(v.period_count ?? v.transition_count ?? 0);
                  const ongoingCount = Number(v.ongoing_issues_count ?? (isCurrentUnserv ? 1 : 0));

                  return (
                    <tr
                      key={v.id}
                      className="hover:bg-slate-50/80 transition-colors duration-100"
                    >
                      {/* Kode Unit */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-bold">
                            {v.code_name}
                          </span>
                        </div>
                      </td>

                      {/* Nama Armada & Plat */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{v.vehicle_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {v.license_plate || '-'}
                        </div>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-slate-100 text-slate-700">
                          {v.category || 'utama'}
                        </span>
                      </td>

                      {/* Status Terkini */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isCurrentUnserv
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isCurrentServ
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isCurrentUnserv
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

                      {/* Periode Kendala */}
                      <td className="py-3 px-4 text-center">
                        {periodCount > 0 ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              {periodCount} Periode Kendala
                            </span>
                            {ongoingCount > 0 ? (
                              <span className="text-[10px] text-red-600 font-medium mt-0.5">
                                {ongoingCount} Belum Pulih
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-medium mt-0.5">
                                Seluruhnya Selesai
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                            Nihil Kendala
                          </span>
                        )}
                      </td>

                      {/* Riwayat Kerusakan & Justifikasi */}
                      <td className="py-3 px-4 max-w-xs">
                        {v.incident_logs && v.incident_logs.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-red-700 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                              <span>{v.incident_logs.length} Kali Dilaporkan Mengalami Kendala</span>
                            </p>
                            <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                              Terakhir: "{v.incident_logs[v.incident_logs.length - 1].justification || v.incident_logs[v.incident_logs.length - 1].notes || '-'}"
                            </p>
                          </div>
                        ) : (
                          <span className="text-emerald-600 text-[11px] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>Tidak ada kendala pada periode ini</span>
                          </span>
                        )}
                      </td>

                      {/* Aksi Detail */}
                      <td className="py-3 px-4 text-right print:hidden">
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
        </div>
      </StateView>

      {/* Modal Detail Kronologis Transisi Armada */}
      {selectedVehicleDetail && (
        <Modal
          isOpen={Boolean(selectedVehicleDetail)}
          onClose={() => setSelectedVehicleDetail(null)}
          title={`Riwayat Periode Kendala: ${selectedVehicleDetail.code_name} - ${selectedVehicleDetail.vehicle_name}`}
          subtitle={`Detail log periode kendala fisik pada periode ${formatDateIndo(periodInfo?.start_date)} s.d. ${formatDateIndo(periodInfo?.end_date)}`}
          footer={
            <div className="flex justify-end w-full">
              <Button
                variant="outline"
                onClick={() => setSelectedVehicleDetail(null)}
              >
                Tutup
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Header Ringkas Kendaraan */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {selectedVehicleDetail.code_name}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      selectedVehicleDetail.current_status === 'unserviceable'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : selectedVehicleDetail.current_status === 'serviceable'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedVehicleDetail.current_status === 'unserviceable'
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
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedVehicleDetail.vehicle_name}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total Periode Kendala:</span>
                <span className="font-bold text-amber-600 text-sm">
                  {selectedVehicleDetail.period_count ?? selectedVehicleDetail.transition_count ?? 0} Periode
                </span>
              </div>
            </div>

            {/* List Kronologi Periode Kendala: 1 Periode = 1 Card */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Daftar Periode Kendala (Siklus Kerusakan & Pemulihan):
              </h5>

              {(selectedVehicleDetail.issue_periods || selectedVehicleDetail.transitions) && (selectedVehicleDetail.issue_periods || selectedVehicleDetail.transitions).length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {(selectedVehicleDetail.issue_periods || selectedVehicleDetail.transitions).map((item, idx) => {
                    const isOngoing = item.status === 'ongoing' || !item.is_resolved;
                    return (
                      <div
                        key={idx}
                        className={`p-3.5 rounded-xl border bg-white space-y-2 shadow-xs ${
                          isOngoing ? 'border-red-200 bg-red-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                              Periode #{item.period_number || idx + 1}
                            </span>
                            <span className="text-slate-400 text-xs">•</span>
                            <span className="text-slate-600 font-medium text-[11px]">
                              {item.unserviceable_shifts_count || 1} Shift Dinas Unserviceable
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                              isOngoing
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {isOngoing ? 'Masih Dalam Penanganan' : 'Pulih (Serviceable)'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-slate-50 border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Mulai Kendala (Unserviceable):</p>
                            <p className="font-semibold text-slate-800">
                              {formatDateIndo(item.start_date || item.shift_date)} | Shift {item.start_shift_number || item.shift_number} ({item.start_team_group || item.team_group})
                            </p>
                            <p className="text-slate-500 text-[10px] mt-0.5">
                              Pelapor: {item.reported_by || '-'}
                            </p>
                          </div>

                          <div className={`p-2 rounded border ${
                            isOngoing
                              ? 'bg-amber-50/40 border-amber-200 text-amber-900'
                              : 'bg-emerald-50/40 border-emerald-100 text-emerald-900'
                          }`}>
                            <p className="text-[10px] font-bold uppercase opacity-75">Status Pemulihan:</p>
                            {!isOngoing && item.resolved_date ? (
                              <>
                                <p className="font-semibold">
                                  {formatDateIndo(item.resolved_date)} | Shift {item.resolved_shift_number} ({item.resolved_team_group})
                                </p>
                                <p className="text-[10px] opacity-80 mt-0.5">
                                  Dipulihkan oleh: {item.resolved_by || '-'}
                                </p>
                              </>
                            ) : (
                              <p className="font-semibold text-red-700">
                                Belum pulih hingga akhir periode ini
                              </p>
                            )}
                          </div>
                        </div>

                        {item.justification && item.justification !== '-' && (
                          <div className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                            <strong className="text-slate-900 font-semibold block text-[10px] uppercase text-slate-500 mb-0.5">Justifikasi Kerusakan:</strong>
                            {item.justification}
                          </div>
                        )}

                        {item.notes && (
                          <p className="text-[10px] text-slate-500 italic">
                            <strong>Catatan Tambahan:</strong> {item.notes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Tidak ada catatan periode kendala pada rentang waktu ini. Armada beroperasi stabil dan prima.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Pratinjau Dokumen PDF Resmi */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-slate-900/70 animate-in fade-in duration-150">
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
                    Dokumen resmi kelaikan armada ARFF YIA • Periode: {isCustomMode ? `${startDate} s/d ${endDate}` : (periodInfo ? `${periodInfo.start_date} s/d ${periodInfo.end_date}` : selectedPeriod)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {previewPdfUrl && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => window.open(previewPdfUrl, '_blank')}
                      title="Buka PDF di tab baru browser"
                    >
                      Buka Tab Baru
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={Download}
                      onClick={handlePrint}
                      loading={isExporting}
                    >
                      Unduh PDF
                    </Button>
                  </>
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
                  <p className="font-semibold text-slate-700 text-sm">Menyusun & Merender Dokumen PDF...</p>
                  <p className="text-slate-400">Sinkronisasi data kelaikan 8 entitas armada & seluruh log transisi kendala</p>
                </div>
              ) : previewError ? (
                <div className="p-6 text-center text-xs space-y-3">
                  <AlertTriangle className="w-8 h-8 text-red-500 mx-auto" />
                  <p className="font-bold text-slate-800 text-sm">{previewError}</p>
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
      )}
    </div>
  );
}
