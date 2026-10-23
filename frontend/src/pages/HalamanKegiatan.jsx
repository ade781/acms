import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import TextareaField from '../components/common/TextareaField';
import Badge from '../components/common/Badge';

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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Modal Konfirmasi Hapus
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [targetDeleteActivity, setTargetDeleteActivity] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Modal Pratinjau Foto Lampiran
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`
      );
      const list = Array.isArray(res.data?.activities)
        ? res.data.activities
        : Array.isArray(res.data)
        ? res.data
        : [];
      setActivities(list);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Gagal memuat logbook kegiatan shift.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setActivityType('serah_terima');
    setActivityTime(new Date().toTimeString().slice(0, 5));
    setDescription('');
    setResultNotes('');
    setPhotoFile(null);
    setPhotoPreview(null);
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
    setFormError(null);
    setModalOpen(true);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setFormError('Berkas harus berupa gambar (JPEG, PNG, WebP).');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      setFormError(null);
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
    <div>
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Logbook Kegiatan Rutin
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pencatatan dan dokumentasi dinas operasional ARFF YIA
          </p>
        </div>

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
          Semua ({activities.length})
        </button>
        {OFFICIAL_ACTIVITY_CATEGORIES.map((cat) => {
          const count = activities.filter((a) => a.activity_type === cat.value).length;
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
        <div className="space-y-4">
          {paginatedActivities.map((act) => (
            <div
              key={act.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors duration-100"
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                    {act.activity_time ? act.activity_time.slice(0, 5) : '-'} WIB
                  </span>
                  <span className="text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded">
                    {getCategoryLabel(act.activity_type)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono hidden sm:inline">
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
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDeleteModal(act)}
                        className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-100"
                        title="Hapus Kegiatan"
                        aria-label="Hapus Kegiatan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-col md:flex-row gap-4 items-start">
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{act.title}</h4>
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
                      className="group relative cursor-pointer rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video md:aspect-4/3 flex items-center justify-center hover:opacity-90 transition-opacity"
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
          ))}

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
        </div>
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
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveActivity} loading={submitting}>
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
    </div>
  );
}
