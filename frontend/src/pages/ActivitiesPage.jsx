import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Check,
  X,
  Download,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import api from '../services/api';
import { downloadActivityReportPdf, fetchActivityReportPdfBlob } from '../services/reportService';
import Button from '../components/common/Button';
import { compressImageToWebP } from '../utils/imageCompressor';

// Import Modular Components & Utilities
import {
  OFFICIAL_ACTIVITY_CATEGORIES,
} from '../utils/activityCategories';
import ActivityTimelineList from '../components/activities/ActivityTimelineList';
import ActivityFormModal from '../components/activities/ActivityFormModal';
import ActivityDeleteModal from '../components/activities/ActivityDeleteModal';
import ActivityExportModal from '../components/activities/ActivityExportModal';
import ActivityPhotoModal from '../components/activities/ActivityPhotoModal';
import ActivityPdfPreviewModal from '../components/activities/ActivityPdfPreviewModal';


export default function ActivitiesPage() {
  const { user, isAdmin, isSupervisor, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const canManageActivity =
    isAdmin || isSupervisor || ['admin', 'chief', 'chief_assistant', 'supervisor', 'dept_head'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [toastMsg, setToastMsg] = useState(null);

  // Filter & Pagination
  const [selectedFilterCategory, setSelectedFilterCategory] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal Tambah / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('serah_terima');
  const [activityTime, setActivityTime] = useState(new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modal Konfirmasi Hapus
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteActivity, setTargetDeleteActivity] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Pratinjau Foto Lampiran
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  // Mode Tampilan: 'shift' (Shift Ini) | 'range' (Rentang Periode / Riwayat)
  const [viewMode, setViewMode] = useState('shift');
  const [rangePeriod, setRangePeriod] = useState('1month');

  // State Modal Konfigurasi Ekspor PDF Logbook Kegiatan
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('1month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportCategory, setExportCategory] = useState('ALL');
  const [exportTeam, setExportTeam] = useState('ALL');

  // State Modal Pratinjau Dokumen PDF Resmi
  const [previewPdfModalOpen, setPreviewPdfModalOpen] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [isLoadingPreviewPdf, setIsLoadingPreviewPdf] = useState(false);
  const [previewPdfError, setPreviewPdfError] = useState(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Bersihkan object URL PDF saat komponen unmount
  useEffect(() => {
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, [previewPdfUrl]);

  const fetchActivities = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (viewMode === 'shift') {
        endpoint = `/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`;
      } else {
        endpoint = `/activities?period=${rangePeriod || '1month'}`;
      }

      const res = await api.get(endpoint, { signal });
      const raw = res.data?.data ?? res.data?.activities ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setActivities(list);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Error fetching activities:', err);
      setError('Gagal memuat logbook kegiatan.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, activeDate, activeShiftNumber, activeTeam, rangePeriod]);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivities(controller.signal);
    return () => controller.abort();
  }, [fetchActivities]);

  // Label Periode untuk Header Pratinjau PDF
  const exportPeriodLabel = useMemo(() => {
    if (exportPeriod === '1week') return '1 Minggu Terakhir (7 Hari)';
    if (exportPeriod === '1month') return '1 Bulan Terakhir (30 Hari)';
    if (exportPeriod === '3months') return '3 Bulan Terakhir (Triwulan)';
    if (exportPeriod === '1year') return '1 Tahun Terakhir (Tahunan)';
    if (exportPeriod === 'custom') return `${exportStartDate || '...'} s/d ${exportEndDate || '...'}`;
    return 'Periode Logbook';
  }, [exportPeriod, exportStartDate, exportEndDate]);

  // Handler Buka Pratinjau Dokumen PDF
  const handleOpenPreviewPdf = async () => {
    setExportModalOpen(false);
    setPreviewPdfModalOpen(true);
    setIsLoadingPreviewPdf(true);
    setPreviewPdfError(null);
    try {
      const blob = await fetchActivityReportPdfBlob({
        period: exportPeriod,
        start_date: exportPeriod === 'custom' ? exportStartDate : '',
        end_date: exportPeriod === 'custom' ? exportEndDate : '',
        category: exportCategory,
        team: exportTeam,
      });
      const url = window.URL.createObjectURL(blob);
      setPreviewPdfUrl((prev) => {
        if (prev) window.URL.revokeObjectURL(prev);
        return url;
      });
    } catch (err) {
      console.error('Error generating PDF preview:', err);
      setPreviewPdfError('Gagal menyusun pratinjau dokumen PDF logbook kegiatan.');
    } finally {
      setIsLoadingPreviewPdf(false);
    }
  };

  // Handler Unduh Berkas PDF dari Modal Pratinjau
  const handleDownloadFromPreview = async () => {
    try {
      setIsDownloadingPdf(true);
      await downloadActivityReportPdf({
        period: exportPeriod,
        start_date: exportPeriod === 'custom' ? exportStartDate : '',
        end_date: exportPeriod === 'custom' ? exportEndDate : '',
        category: exportCategory,
        team: exportTeam,
      });
      setToastMsg('Dokumen rekapitulasi logbook kegiatan resmi berhasil diunduh.');
    } catch (err) {
      console.error('Gagal mengunduh PDF logbook kegiatan:', err);
      setToastMsg('Gagal mengunduh berkas logbook kegiatan. Silakan coba kembali.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleClosePreviewPdf = () => {
    setPreviewPdfModalOpen(false);
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    setPreviewPdfError(null);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setActivityType('serah_terima');
    setActivityTime(new Date().toTimeString().slice(0, 5));
    setDescription('');
    setResultNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (act) => {
    setEditingId(act.id);
    setTitle(act.title || '');
    setActivityType(act.activity_type || 'serah_terima');
    setActivityTime(act.activity_time ? act.activity_time.slice(0, 5) : new Date().toTimeString().slice(0, 5));
    setDescription(act.description || '');
    setResultNotes(act.result_notes || '');
    setPhotoFile(null);
    setPhotoPreview(act.attachment_url || null);
    setPhotoRemoved(false);
    setFormError(null);
    setModalOpen(true);
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFormError('Berkas harus berupa gambar (JPEG, PNG, WebP).');
        return;
      }
      setFormError(null);
      setCompressing(true);
      try {
        const compressedWebP = await compressImageToWebP(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.8,
        });
        setPhotoFile(compressedWebP);
        setPhotoPreview(URL.createObjectURL(compressedWebP));
        setPhotoRemoved(false);
      } catch (err) {
        setFormError(`Gagal memproses gambar: ${err.message}`);
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim()) {
      setFormError('Judul aktivitas dan uraian kegiatan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('shift_date', activeDate);
      formData.append('shift_number', String(activeShiftNumber));
      formData.append('team_group', cleanTeam(activeTeam));
      formData.append('activity_type', activityType);
      formData.append('activity_time', activityTime);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (resultNotes.trim()) {
        formData.append('result_notes', resultNotes.trim());
      }
      if (photoFile) {
        formData.append('photo', photoFile);
      } else if (editingId && photoRemoved) {
        formData.append('attachment_url', '');
      }

      if (editingId) {
        await api.put(`/activities/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setToastMsg('✓ Catatan kegiatan berhasil diperbarui.');
      } else {
        await api.post('/activities', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setToastMsg('✓ Kegiatan baru berhasil dicatat ke logbook shift.');
      }

      setModalOpen(false);
      fetchActivities();
    } catch (err) {
      const errMsg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : typeof err.response?.data === 'string'
          ? err.response.data
          : err.message || 'Gagal menyimpan catatan kegiatan.';
      setFormError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (act) => {
    setTargetDeleteActivity(act);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteActivity) return;
    setDeleting(true);
    try {
      await api.delete(`/activities/${targetDeleteActivity.id}`);
      setDeleteModalOpen(false);
      setTargetDeleteActivity(null);
      setToastMsg('✓ Kegiatan berhasil dihapus dari logbook.');
      fetchActivities();
    } catch (err) {
      const errMsg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : typeof err.response?.data === 'string'
          ? err.response.data
          : err.message || 'Terjadi kesalahan saat menghapus';
      setToastMsg(`Gagal menghapus kegiatan: ${errMsg}`);
    } finally {
      setDeleting(false);
    }
  };

  // Auto-dismiss toast feedback 3.5 detik
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Optimasi perhitungan jumlah kategori dengan useMemo
  const categoryCounts = useMemo(() => {
    const counts = { ALL: activities.length };
    for (const act of activities) {
      const type = act.activity_type || 'serah_terima';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }, [activities]);

  // Filtered & Paginated
  const filteredActivities = activities.filter((act) => {
    if (selectedFilterCategory === 'ALL') return true;
    return act.activity_type === selectedFilterCategory;
  });

  const totalPages = Math.ceil(filteredActivities.length / pageSize) || 1;
  const paginatedActivities = filteredActivities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Row 1: Header Halaman & Tombol Aksi Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap">
            Logbook Kegiatan Rutin
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            icon={Download}
            onClick={() => setExportModalOpen(true)}
          >
            Cetak Logbook PDF
          </Button>

          {canManageActivity && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreateModal}
            >
              Tambah Kegiatan
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: Unified Command Bar (Switcher Shift Berjalan + Dropdown Kategori) */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Segmented Switcher: Shift Berjalan vs Riwayat Periode */}
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => {
                setViewMode('shift');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                viewMode === 'shift'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Shift Berjalan
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('range');
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md transition-colors duration-100 cursor-pointer ${
                viewMode === 'range'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Riwayat & Arsip Periode
            </button>
          </div>

          {/* Dropdown Filter Kategori di samping Switcher Shift Berjalan */}
          <div className="relative inline-flex items-center">
            <select
              value={selectedFilterCategory}
              onChange={(e) => {
                setSelectedFilterCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-2.5 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 transition-colors duration-100 cursor-pointer appearance-none"
              aria-label="Filter Kategori Kegiatan"
            >
              <option value="ALL">Semua Kategori ({categoryCounts.ALL || 0})</option>
              {OFFICIAL_ACTIVITY_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.value] || 0;
                return (
                  <option key={cat.value} value={cat.value}>
                    {cat.label.split('(')[0].trim()} ({count})
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
          </div>
        </div>

        {/* Kontrol Periode jika dalam mode Riwayat & Arsip (Hanya 7 Hari, 30 Hari, Triwulan) */}
        {viewMode === 'range' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs flex-wrap">
              {[
                { id: '1week', label: '7 Hari Terakhir' },
                { id: '1month', label: '30 Hari Terakhir' },
                { id: '3months', label: '3 Bulan (Triwulan)' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setRangePeriod(p.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${
                    rangePeriod === p.id
                      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
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

      {/* Row 3: Immediate Timeline & Daftar Kegiatan Content */}
      <ActivityTimelineList
        activities={filteredActivities}
        paginatedActivities={paginatedActivities}
        canManageActivity={canManageActivity}
        activeTeam={activeTeam}
        loading={loading}
        error={error}
        onRetry={fetchActivities}
        onOpenEditModal={handleOpenEditModal}
        onOpenDeleteModal={handleOpenDeleteModal}
        onPreviewPhoto={(url) => setPreviewImageUrl(url)}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
      />

      {/* Modal Tambah / Edit Kegiatan */}
      <ActivityFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        editingId={editingId}
        activeShiftNumber={activeShiftNumber}
        activeTeam={activeTeam}
        activeDate={activeDate}
        activityTime={activityTime}
        setActivityTime={setActivityTime}
        activityType={activityType}
        setActivityType={setActivityType}
        title={title}
        setTitle={setTitle}
        description={description}
        setDescription={setDescription}
        resultNotes={resultNotes}
        setResultNotes={setResultNotes}
        photoPreview={photoPreview}
        setPhotoFile={setPhotoFile}
        setPhotoPreview={setPhotoPreview}
        setPhotoRemoved={setPhotoRemoved}
        handlePhotoSelect={handlePhotoSelect}
        onSubmit={handleSaveActivity}
        submitting={submitting}
        compressing={compressing}
        formError={formError}
      />

      {/* Modal Konfirmasi Hapus Kegiatan */}
      <ActivityDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        targetActivity={targetDeleteActivity}
        onConfirm={handleConfirmDelete}
        deleting={deleting}
      />

      {/* Modal Pratinjau Foto Penuh */}
      <ActivityPhotoModal
        photoUrl={previewImageUrl}
        onClose={() => setPreviewImageUrl(null)}
      />

      {/* Modal Konfigurasi Ekspor PDF Logbook Kegiatan Resmi */}
      <ActivityExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        exportPeriod={exportPeriod}
        setExportPeriod={setExportPeriod}
        exportStartDate={exportStartDate}
        setExportStartDate={setExportStartDate}
        exportEndDate={exportEndDate}
        setExportEndDate={setExportEndDate}
        exportCategory={exportCategory}
        setExportCategory={setExportCategory}
        exportTeam={exportTeam}
        setExportTeam={setExportTeam}
        onPreview={handleOpenPreviewPdf}
        isLoadingPreview={isLoadingPreviewPdf}
      />

      {/* Modal Pratinjau Dokumen PDF Resmi (Standard ACMS Preview & Download) */}
      <ActivityPdfPreviewModal
        isOpen={previewPdfModalOpen}
        onClose={handleClosePreviewPdf}
        previewPdfUrl={previewPdfUrl}
        isLoading={isLoadingPreviewPdf}
        error={previewPdfError}
        onRetry={handleOpenPreviewPdf}
        onDownload={handleDownloadFromPreview}
        isDownloading={isDownloadingPdf}
        periodLabel={exportPeriodLabel}
      />
    </div>
  );
}
