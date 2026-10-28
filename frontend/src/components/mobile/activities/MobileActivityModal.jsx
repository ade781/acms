import React, { useState, useEffect } from 'react';
import { Camera, X, Check, AlertCircle, Clock, Tag } from 'lucide-react';
import api from '../../../services/api';
import { ACTIVITY_CATEGORIES } from './MobileActivityTimelineItem';
import { cleanTeam } from '../../../utils/shiftHelper';
import { compressImageToWebP } from '../../../utils/imageCompressor';

export default function MobileActivityModal({
  isOpen,
  onClose,
  onSuccess,
  shiftDate,
  shiftNumber,
  teamGroup,
  editingActivity = null,
}) {
  const [activityTime, setActivityTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().slice(0, 5);
  });
  const [activityType, setActivityType] = useState('serah_terima');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [resultNotes, setResultNotes] = useState('');

  // Photo upload states
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);

  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sinkronisasi data saat modal dibuka untuk tambah atau edit
  useEffect(() => {
    if (!isOpen) return;
    if (editingActivity) {
      setActivityTime(
        editingActivity.activity_time
          ? editingActivity.activity_time.slice(0, 5)
          : new Date().toTimeString().slice(0, 5)
      );
      setActivityType(editingActivity.activity_type || 'serah_terima');
      setTitle(editingActivity.title || '');
      setDescription(editingActivity.description || '');
      setResultNotes(editingActivity.result_notes || '');
      setSelectedPhoto(null);
      setPhotoPreview(editingActivity.attachment_url || null);
      setPhotoRemoved(false);
      setErrorMsg('');
    } else {
      setActivityTime(new Date().toTimeString().slice(0, 5));
      setActivityType('serah_terima');
      setTitle('');
      setDescription('');
      setResultNotes('');
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setPhotoRemoved(false);
      setErrorMsg('');
    }
  }, [isOpen, editingActivity]);

  if (!isOpen) return null;

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Harap pilih berkas gambar yang sah (JPEG, PNG, WebP).');
        return;
      }
      setErrorMsg('');
      setCompressing(true);
      try {
        const compressedWebP = await compressImageToWebP(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.8,
        });
        setSelectedPhoto(compressedWebP);
        setPhotoPreview(URL.createObjectURL(compressedWebP));
        setPhotoRemoved(false);
      } catch (err) {
        setErrorMsg(`Gagal memproses gambar: ${err?.message || 'Format tidak valid'}`);
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleRemovePhoto = () => {
    setSelectedPhoto(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Nama atau judul kegiatan wajib diisi.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Uraian kronologis pelaksanaan kegiatan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('shift_date', shiftDate);
      formData.append('shift_number', String(shiftNumber || 1));
      formData.append('team_group', cleanTeam(teamGroup) || 'Alpha');
      formData.append('activity_time', activityTime);
      formData.append('activity_type', activityType);
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      if (resultNotes.trim()) {
        formData.append('result_notes', resultNotes.trim());
      }
      if (selectedPhoto) {
        formData.append('photo', selectedPhoto);
      } else if (editingActivity && photoRemoved) {
        formData.append('attachment_url', '');
      }

      if (editingActivity) {
        await api.put(`/activities/${editingActivity.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onSuccess?.('✓ Catatan kegiatan berhasil diperbarui.');
      } else {
        await api.post('/activities', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        onSuccess?.('✓ Kegiatan operasional berhasil dicatat ke logbook.');
      }

      onClose();
    } catch (err) {
      console.error('Error simpan kegiatan:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan kegiatan.'));
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              {editingActivity ? 'Edit Kegiatan Shift' : 'Catat Kegiatan Shift'}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[10.5px] flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="leading-tight">
              {typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'Gagal menyimpan kegiatan.')}
            </span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-2 pr-0.5 text-xs">
          {/* Waktu Pelaksanaan */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Waktu Pelaksanaan (WIB) *
            </label>
            <div className="relative">
              <input
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
                required
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
          </div>

          {/* Kategori Baku Operasional */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Kategori Baku Operasional *
            </label>
            <select
              value={activityType}
              onChange={(e) => setActivityType(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
            >
              {Object.entries(ACTIVITY_CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Judul Kegiatan */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Nama / Judul Kegiatan *
            </label>
            <input
              type="text"
              placeholder="Contoh: Latihan Drill Uji Pancar Foam Tender 01"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
            />
          </div>

          {/* Uraian Kronologis Pelaksanaan */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Uraian Kronologis Pelaksanaan *
            </label>
            <textarea
              rows={2}
              placeholder="Uraikan jalannya pelaksanaan kegiatan, armada yang terlibat, dan rangkaian proses..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100 leading-snug"
            />
          </div>

          {/* Hasil Pelaksanaan & Catatan Khusus */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Hasil Pelaksanaan & Catatan Khusus (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Tekanan monitor normal 14 bar, respon personil sesuai standar..."
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100 leading-snug"
            />
          </div>

          {/* Foto Dokumentasi Kegiatan */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 block">
              Foto Dokumentasi Kegiatan (Opsional)
            </label>

            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors duration-100">
                <Camera className="w-4 h-4 text-slate-500" />
                <span className="truncate">
                  {selectedPhoto ? selectedPhoto.name : 'Pilih / Ambil Foto'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
              </label>

              {photoPreview && (
                <div className="relative w-10 h-10 rounded-lg border border-slate-300 bg-slate-100 overflow-hidden shrink-0">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5 text-[8px] leading-none"
                    title="Hapus foto"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            {selectedPhoto && (
              <p className="text-[9px] text-slate-500 italic">
                Berkas siap diunggah: {selectedPhoto.name} ({(selectedPhoto.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </div>

          {/* Tombol Simpan Kegiatan */}
          <button
            type="submit"
            disabled={submitting || compressing}
            className="w-full mt-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors duration-100"
          >
            {submitting ? (
              <span>Menyimpan Kegiatan...</span>
            ) : compressing ? (
              <span>Mengompres Foto...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{editingActivity ? 'Simpan Perubahan Kegiatan' : 'Simpan Kegiatan Shift'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
