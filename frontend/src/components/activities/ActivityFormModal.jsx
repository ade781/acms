import React from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import { OFFICIAL_ACTIVITY_CATEGORIES } from '../../utils/activityCategories';

export default function ActivityFormModal({
  isOpen = false,
  onClose,
  editingId = null,
  activeShiftNumber = 1,
  activeTeam = 'Alpha',
  activeDate = '',
  activityTime = '',
  setActivityTime,
  activityType = 'apel_briefing',
  setActivityType,
  title = '',
  setTitle,
  description = '',
  setDescription,
  resultNotes = '',
  setResultNotes,
  photoPreview = null,
  setPhotoFile,
  setPhotoPreview,
  setPhotoRemoved,
  handlePhotoSelect,
  onSubmit,
  submitting = false,
  compressing = false,
  formError = null,
}) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? 'Edit Catatan Kegiatan' : 'Catat Kegiatan Shift Operasional'}
      subtitle={`Shift ${activeShiftNumber} | Regu ${activeTeam} | ${activeDate}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting || compressing}>
            Batal
          </Button>
          <Button variant="primary" onClick={onSubmit} loading={submitting || compressing}>
            {editingId ? 'Simpan Perubahan' : 'Simpan Logbook'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{typeof formError === 'string' ? formError : (formError?.message || 'Terjadi kesalahan.')}</span>
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
  );
}
