import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Clock,
  FileCheck,
  AlertCircle,
  Camera,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  ImageIcon,
  Users,
  Megaphone,
  Truck,
  Wrench,
  Activity,
  Settings,
  Compass,
  AlertTriangle,
  Download,
  Calendar,
  Filter,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import { downloadActivityReportPdf } from '../services/reportService';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import TextareaField from '../components/common/TextareaField';
import Badge from '../components/common/Badge';
import { compressImageToWebP } from '../utils/imageCompressor';

export const OFFICIAL_ACTIVITY_CATEGORIES = [
  { value: 'serah_terima', label: 'Serah Terima Shift (Handover)' },
  { value: 'apel_briefing', label: 'Apel & Briefing Dinas' },
  { value: 'periksa_armada', label: 'Pemeriksaan Kendaraan & Uji Pancar' },
  { value: 'periksa_peralatan', label: 'Pemeriksaan Alat Operasional & Rescue' },
  { value: 'latihan_drill', label: 'Latihan Fisik & Drill Basah/Kering' },
  { value: 'pemeliharaan', label: 'Pemeliharaan Fasilitas & Kendaraan' },
  { value: 'sosialisasi_keselamatan', label: 'Edukasi & Inspeksi Runway/Apron' },
  { value: 'catatan_kendala', label: 'Catatan Khusus & Hambatan Dinas' },
];

export const getActivityCategoryMeta = (type) => {
  switch (type) {
    case 'serah_terima':
      return {
        icon: Users,
        badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        nodeBg: 'bg-indigo-600 text-white',
        nodeRing: 'ring-indigo-100',
        label: 'Serah Terima Shift',
      };
    case 'apel_briefing':
      return {
        icon: Megaphone,
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
        nodeBg: 'bg-blue-600 text-white',
        nodeRing: 'ring-blue-100',
        label: 'Apel & Briefing Dinas',
      };
    case 'periksa_armada':
      return {
        icon: Truck,
        badgeBg: 'bg-red-50 border-red-200 text-red-700',
        nodeBg: 'bg-red-600 text-white',
        nodeRing: 'ring-red-100',
        label: 'Uji Pancar & Armada',
      };
    case 'periksa_peralatan':
      return {
        icon: Wrench,
        badgeBg: 'bg-amber-50 border-amber-200 text-amber-800',
        nodeBg: 'bg-amber-600 text-white',
        nodeRing: 'ring-amber-100',
        label: 'Pemeriksaan Alat Rescue',
      };
    case 'latihan_drill':
      return {
        icon: Activity,
        badgeBg: 'bg-orange-50 border-orange-200 text-orange-700',
        nodeBg: 'bg-orange-600 text-white',
        nodeRing: 'ring-orange-100',
        label: 'Latihan / Fire Drill',
      };
    case 'pemeliharaan':
      return {
        icon: Settings,
        badgeBg: 'bg-teal-50 border-teal-200 text-teal-700',
        nodeBg: 'bg-teal-600 text-white',
        nodeRing: 'ring-teal-100',
        label: 'Pemeliharaan Fasilitas',
      };
    case 'sosialisasi_keselamatan':
      return {
        icon: Compass,
        badgeBg: 'bg-sky-50 border-sky-200 text-sky-700',
        nodeBg: 'bg-sky-600 text-white',
        nodeRing: 'ring-sky-100',
        label: 'Patroli Runway & Apron',
      };
    case 'catatan_kendala':
      return {
        icon: AlertTriangle,
        badgeBg: 'bg-rose-50 border-rose-200 text-rose-700',
        nodeBg: 'bg-rose-600 text-white',
        nodeRing: 'ring-rose-100',
        label: 'Catatan Kendala Dinas',
      };
    default:
      return {
        icon: ClipboardList,
        badgeBg: 'bg-slate-50 border-slate-200 text-slate-700',
        nodeBg: 'bg-slate-700 text-white',
        nodeRing: 'ring-slate-100',
        label: 'Kegiatan Operasional',
      };
  }
};

export default function HalamanKegiatan() {
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
  const [rangeStartDate, setRangeStartDate] = useState('');
  const [rangeEndDate, setRangeEndDate] = useState('');

  // State Modal Ekspor PDF Logbook Kegiatan
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportPeriod, setExportPeriod] = useState('1month');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportCategory, setExportCategory] = useState('ALL');
  const [exportTeam, setExportTeam] = useState('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let endpoint = '';
      if (viewMode === 'shift') {
        endpoint = `/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`;
      } else {
        if (rangePeriod === 'custom' && rangeStartDate && rangeEndDate) {
          endpoint = `/activities?start_date=${rangeStartDate}&end_date=${rangeEndDate}`;
        } else {
          endpoint = `/activities?period=${rangePeriod === 'custom' ? '1month' : rangePeriod}`;
        }
      }

      const res = await api.get(endpoint);
      const raw = res.data?.data ?? res.data?.activities ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setActivities(list);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Gagal memuat logbook kegiatan.');
    } finally {
      setLoading(false);
    }
  }, [viewMode, activeDate, activeShiftNumber, activeTeam, rangePeriod, rangeStartDate, rangeEndDate]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      await downloadActivityReportPdf({
        period: exportPeriod,
        start_date: exportPeriod === 'custom' ? exportStartDate : '',
        end_date: exportPeriod === 'custom' ? exportEndDate : '',
        category: exportCategory,
        team: exportTeam,
      });
      setToastMsg('Dokumen rekapitulasi logbook kegiatan resmi berhasil diunduh.');
      setExportModalOpen(false);
    } catch (err) {
      console.error('Gagal mengunduh PDF logbook kegiatan:', err);
      setToastMsg('Gagal mengunduh berkas logbook kegiatan. Silakan coba kembali.');
    } finally {
      setIsExporting(false);
    }
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
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan catatan kegiatan.');
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
      setToastMsg(`Gagal menghapus kegiatan: ${err.response?.data?.message || err.message}`);
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

  const getCategoryLabel = (type) => {
    const found = OFFICIAL_ACTIVITY_CATEGORIES.find((c) => c.value === type);
    return found ? found.label : (type || 'Aktivitas');
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher: Shift Ini vs Riwayat Periode */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 gap-3 flex-wrap">
        <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setViewMode('shift');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors duration-100 ${
              viewMode === 'shift'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Shift Berjalan ({activeTeam})
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode('range');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors duration-100 ${
              viewMode === 'range'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Riwayat & Arsip Periode
          </button>
        </div>

        {viewMode === 'range' && (
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
            Menampilkan aktivitas lintas sesi dinas
          </span>
        )}
      </div>

      {/* Kondisional Header: ShiftHeaderCard (Mode Shift) vs Filter Rentang Waktu (Mode Range) */}
      {viewMode === 'shift' ? (
        <ShiftHeaderCard
          shiftNumber={activeShiftNumber}
          shiftDate={activeDate}
          teamGroup={activeTeam}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Pilih Rentang Periode Aktivitas:
            </span>
            <div className="inline-flex gap-1.5 flex-wrap">
              {[
                { id: '1week', label: '7 Hari Terakhir' },
                { id: '1month', label: '30 Hari Terakhir' },
                { id: '3months', label: '3 Bulan (Triwulan)' },
                { id: 'custom', label: 'Rentang Kustom' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setRangePeriod(p.id);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors duration-100 ${
                    rangePeriod === p.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {rangePeriod === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <InputField
                label="Tanggal Mulai"
                type="date"
                value={rangeStartDate}
                onChange={(e) => setRangeStartDate(e.target.value)}
              />
              <InputField
                label="Tanggal Selesai"
                type="date"
                value={rangeEndDate}
                onChange={(e) => setRangeEndDate(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

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

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Logbook Kegiatan Rutin
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan dan dokumentasi dinas operasional ARFF YIA
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Filter Kategori */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-600 mr-2">Filter Kategori:</span>
        <button
          type="button"
          onClick={() => {
            setSelectedFilterCategory('ALL');
            setCurrentPage(1);
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-100 ${
            selectedFilterCategory === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Semua ({categoryCounts.ALL || 0})
        </button>
        {OFFICIAL_ACTIVITY_CATEGORIES.map((cat) => {
          const count = categoryCounts[cat.value] || 0;
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                setSelectedFilterCategory(cat.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-100 ${
                selectedFilterCategory === cat.value
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {cat.label.split('(')[0].trim()} {count > 0 && `(${count})`}
            </button>
          );
        })}
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={filteredActivities.length === 0}
        emptyTitle="Belum Ada Logbook Kegiatan"
        emptyDescription={
          canManageActivity
            ? "Catat aktivitas harian, apel regu, atau uji fungsi armada pada shift ini."
            : "Belum ada catatan aktivitas yang dilaporkan oleh Chief / Asisten Chief pada shift ini."
        }
        emptyAction={
          canManageActivity ? (
            <Button variant="primary" size="sm" onClick={handleOpenCreateModal}>
              Catat Kegiatan Pertama
            </Button>
          ) : null
        }
        onRetry={fetchActivities}
      >
        {/* Vertical Step Timeline Kronologis Logbook Resmi */}
        <div className="relative pl-6 sm:pl-8 before:absolute before:top-4 before:bottom-4 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200 space-y-6">
          {paginatedActivities.map((act) => {
            const meta = getActivityCategoryMeta(act.activity_type);
            const NodeIcon = meta.icon;
            return (
              <div key={act.id} className="relative group">
                {/* Simpul Timeline / Timeline Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full ${meta.nodeBg} ring-4 ${meta.nodeRing} flex items-center justify-center shadow-xs z-10 transition-transform duration-100 group-hover:scale-110`}
                  title={meta.label}
                >
                  <NodeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>

                {/* Card Logbook */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors duration-100 ml-1">
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {act.activity_time ? act.activity_time.slice(0, 5) : '-'} WIB
                      </span>
                      <span className={`text-xs font-bold border px-2.5 py-0.5 rounded ${meta.badgeBg}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                        Regu {formatTeam(act.team_group || activeTeam)}
                      </span>
                      {canManageActivity && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(act)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-100"
                            title="Edit Kegiatan"
                            aria-label="Edit Kegiatan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteModal(act)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-100"
                            title="Hapus Kegiatan"
                            aria-label="Hapus Kegiatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 mb-1.5">{act.title}</h4>
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {act.description}
                      </p>

                      {act.result_notes && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                          <strong className="text-slate-800 block mb-0.5">Hasil / Catatan Khusus:</strong>
                          <span>{act.result_notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Dokumentasi Foto */}
                    {act.attachment_url && (
                      <div className="w-full md:w-44 shrink-0">
                        <div
                          onClick={() => setPreviewImageUrl(act.attachment_url)}
                          className="group relative cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video md:aspect-4/3 flex items-center justify-center hover:opacity-95 transition-opacity"
                        >
                          <img
                            src={act.attachment_url}
                            alt="Foto Kegiatan"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-100 text-white text-xs font-semibold gap-1">
                            <Eye className="w-4 h-4" />
                            <span>Perbesar</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

          {/* Pagination Controls */}
          {filteredActivities.length > 0 && (
            <div className="px-5 py-3 border border-slate-200 bg-white rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 mt-4">
              <span>
                Menampilkan <strong className="text-slate-700">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                <strong className="text-slate-700">
                  {Math.min(currentPage * pageSize, filteredActivities.length)}
                </strong>{' '}
                dari <strong className="text-slate-700">{filteredActivities.length}</strong> kegiatan
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronLeft}
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  Sebelumnya
                </Button>
                <span className="text-xs font-semibold px-2">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  icon={ChevronRight}
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </StateView>

      {/* Modal Tambah / Edit Kegiatan */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Edit Catatan Kegiatan' : 'Catat Kegiatan Shift Operasional'}
          subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${activeDate}`}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting || compressing}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveActivity} loading={submitting || compressing}>
                {editingId ? 'Simpan Perubahan' : 'Simpan Logbook'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveActivity} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Waktu Pelaksanaan (WIB)"
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
                required
              />

              <SelectField
                label="Kategori Baku Operasional"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                options={OFFICIAL_ACTIVITY_CATEGORIES}
                required
              />
            </div>

            <InputField
              label="Judul Kegiatan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Apel Serah Terima Dinas Shift Pagi ke Siang"
              required
            />

            <TextareaField
              label="Uraian Pelaksanaan Kegiatan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan jalannya kegiatan, pengecekan personel, penyerahan kunci armada, dsb..."
              rows={3}
              required
            />

            <TextareaField
              label="Hasil & Catatan Khusus (Opsional)"
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              placeholder="Hasil running test pompa, kondisi tekanan air/foam, dsb..."
              rows={2}
            />

            {/* Input Foto Dokumentasi */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Foto Dokumentasi Kegiatan (Opsional)
              </label>
              <div className="flex items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-100 min-h-[40px]">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>{photoPreview ? 'Ganti Foto' : 'Pilih Foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    disabled={submitting}
                    className="hidden"
                  />
                </label>

                {photoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                      setPhotoRemoved(true);
                    }}
                    className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus Foto</span>
                  </button>
                )}
              </div>

              {photoPreview && (
                <div className="mt-2.5 relative w-36 h-24 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                  <img
                    src={photoPreview}
                    alt="Pratinjau Foto"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Konfirmasi Hapus Kegiatan (In-App Modal) */}
      {deleteModalOpen && targetDeleteActivity && (
        <Modal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          title="Konfirmasi Hapus Kegiatan"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
              >
                Batal
              </Button>
              <Button
                variant="danger"
                onClick={handleConfirmDelete}
                loading={deleting}
              >
                Hapus Permanen
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-slate-700">
            <p>
              Apakah Anda yakin ingin menghapus catatan kegiatan berikut dari logbook dinas?
            </p>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900">{targetDeleteActivity.title}</div>
              <div className="text-slate-500 mt-0.5">
                Pukul {targetDeleteActivity.activity_time ? targetDeleteActivity.activity_time.slice(0, 5) : '-'} WIB •{' '}
                {getCategoryLabel(targetDeleteActivity.activity_type)}
              </div>
            </div>
            <p className="text-slate-500">
              Lampiran foto yang tersimpan pada server juga akan dihapus secara permanen.
            </p>
          </div>
        </Modal>
      )}

      {/* Modal Pratinjau Foto Penuh */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end p-1">
              <button
                type="button"
                onClick={() => setPreviewImageUrl(null)}
                className="text-slate-500 hover:text-slate-800 p-1 rounded-lg"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={previewImageUrl}
              alt="Pratinjau Foto Penuh"
              className="max-h-[75vh] w-auto mx-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Modal Ekspor PDF Logbook Kegiatan Resmi */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => !isExporting && setExportModalOpen(false)}
        title="Cetak Rekapitulasi Logbook Kegiatan Resmi"
        subtitle="Unduh berkas PDF logbook rangkaian kegiatan dinas bertandatangan pimpinan dinas ARFF YIA"
      >
        <div className="space-y-4">
          <SelectField
            label="Periode Rekapitulasi"
            value={exportPeriod}
            onChange={(e) => setExportPeriod(e.target.value)}
            options={[
              { value: '1week', label: '1 Minggu Terakhir (7 Hari)' },
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
              label="Filter Kategori Kegiatan"
              value={exportCategory}
              onChange={(e) => setExportCategory(e.target.value)}
              options={[
                { value: 'ALL', label: 'Semua Kategori Aktivitas' },
                ...OFFICIAL_ACTIVITY_CATEGORIES.map((c) => ({
                  value: c.value,
                  label: c.label.split('(')[0].trim(),
                })),
              ]}
            />

            <SelectField
              label="Filter Regu Dinas"
              value={exportTeam}
              onChange={(e) => setExportTeam(e.target.value)}
              options={[
                { value: 'ALL', label: 'Seluruh Regu Dinas (A-D)' },
                { value: 'Alpha', label: 'Regu Alpha' },
                { value: 'Bravo', label: 'Regu Bravo' },
                { value: 'Charlie', label: 'Regu Charlie' },
                { value: 'Delta', label: 'Regu Delta' },
              ]}
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Format Dokumen Cetak Standar D-OPS ARFF YIA:</p>
            <p className="text-[11px] text-blue-700">
              Dokumen PDF memuat daftar kronologis aktivitas dinas, jam pelaksanaan (WIB), kategori kegiatan, uraian teknis hasil pelaksanaan, serta lembar tanda tangan dinas Section Head.
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
