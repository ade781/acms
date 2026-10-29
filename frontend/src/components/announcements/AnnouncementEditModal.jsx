import React, { useState, useEffect } from 'react';
import { AlertCircle, Pin } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import TextareaField from '../common/TextareaField';

export default function AnnouncementEditModal({
  isOpen,
  onClose,
  announcement,
  onSubmit,
  updating
}) {
  const [title, setTitle] = useState('');
  const [circularNumber, setCircularNumber] = useState('');
  const [publishedDate, setPublishedDate] = useState('');
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || '');
      setCircularNumber(announcement.circular_number || '');
      setPublishedDate(
        announcement.published_date
          ? announcement.published_date.replace(' ', 'T').slice(0, 16)
          : ''
      );
      setDescription(announcement.description || '');
      setIsPinned(Boolean(announcement.is_pinned === 1 || announcement.is_pinned === true));
      setFormError(null);
    }
  }, [announcement]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setFormError('Judul surat edaran dinas wajib diisi.');
      return;
    }

    try {
      await onSubmit({
        id: announcement.id,
        title,
        circularNumber,
        publishedDate,
        description,
        isPinned
      });
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal memperbarui surat edaran.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Surat Edaran / Pengumuman"
      subtitle={circularNumber || 'Pembaruan Dokumen Dinas'}
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={updating}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={updating}>
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{typeof formError === 'string' ? formError : (formError?.message || 'Terjadi kesalahan.')}</span>
          </div>
        )}

        <InputField
          label="Judul Edaran / Pengumuman"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contoh: Instruksi Pengisian Checklist Kesiapan Armada & Roster Shift"
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Nomor Surat Edaran (Opsional)"
            value={circularNumber}
            onChange={(e) => setCircularNumber(e.target.value)}
            placeholder="Contoh: ED.04/ARFF-YIA/X/2026"
          />

          <InputField
            label="Tanggal & Waktu Terbit (WIB)"
            type="datetime-local"
            value={publishedDate}
            onChange={(e) => setPublishedDate(e.target.value)}
            required
          />
        </div>

        <TextareaField
          label="Ringkasan / Uraian Singkat (Opsional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tuliskan poin penting surat edaran ini secara ringkas..."
          rows={3}
        />

        {/* Opsi Sematkan / Pinned */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-900">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded text-slate-900 border-slate-300 focus:ring-slate-500 transition-colors duration-100"
            />
            <span className="flex items-center gap-1.5">
              <Pin className="w-3.5 h-3.5 text-slate-700" />
              Sematkan di Posisi Teratas (Pin)
            </span>
          </label>
          <p className="text-[11px] text-slate-500 mt-1 pl-6">
            Pengumuman yang disematkan akan selalu berada di posisi paling atas daftar pengumuman dinas.
          </p>
        </div>
      </form>
    </Modal>
  );
}

