import React, { useState, useEffect } from 'react';
import { UploadCloud, AlertCircle, Pin, FileText } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import TextareaField from '../common/TextareaField';

const getCurrentDateTimeLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
};

export default function AnnouncementModal({
  isOpen,
  onClose,
  mode = 'create',
  initialData = null,
  onSubmit,
  submitting = false,
  loading = false
}) {
  const isEdit = mode === 'edit';
  const isSubmitting = submitting || loading;

  const [title, setTitle] = useState('');
  const [circularNumber, setCircularNumber] = useState('');
  const [publishedDate, setPublishedDate] = useState(getCurrentDateTimeLocal());
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (isEdit && initialData) {
        setTitle(initialData.title || '');
        setCircularNumber(initialData.circular_number || initialData.circularNumber || '');
        setPublishedDate(
          initialData.published_date
            ? initialData.published_date.replace(' ', 'T').slice(0, 16)
            : (initialData.publishedDate || getCurrentDateTimeLocal())
        );
        setDescription(initialData.description || '');
        setIsPinned(Boolean(initialData.is_pinned === 1 || initialData.is_pinned === true || initialData.isPinned));
        setPdfFile(null);
        setFormError(null);
      } else if (!isEdit) {
        setTitle('');
        setCircularNumber('');
        setPublishedDate(getCurrentDateTimeLocal());
        setDescription('');
        setIsPinned(false);
        setPdfFile(null);
        setFormError(null);
      }
    }
  }, [isOpen, isEdit, initialData]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        setFormError('Berkas harus berupa dokumen format PDF (.pdf).');
        setPdfFile(null);
        return;
      }
      setFormError(null);
      setPdfFile(file);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setFormError('Judul surat edaran dinas wajib diisi.');
      return;
    }
    if (!isEdit && !pdfFile) {
      setFormError('Berkas PDF surat edaran wajib diunggah.');
      return;
    }

    try {
      await onSubmit({
        id: initialData?.id,
        title,
        circularNumber,
        publishedDate,
        description,
        isPinned,
        pdfFile
      });

      if (!isEdit) {
        setTitle('');
        setCircularNumber('');
        setDescription('');
        setIsPinned(false);
        setPdfFile(null);
        setFormError(null);
      }
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
        err.message ||
        (isEdit ? 'Gagal memperbarui surat edaran.' : 'Gagal mempublikasikan surat edaran.')
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Surat Edaran / Pengumuman' : 'Unggah Surat Edaran / Pengumuman Resmi'}
      subtitle={
        isEdit
          ? (initialData?.circular_number || circularNumber || 'Pembaruan Dokumen Dinas')
          : 'Publikasikan instruksi kedinasan atau SOP untuk seluruh personel ARFF'
      }
      maxWidth="max-w-xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={isSubmitting}>
            {isEdit ? 'Simpan Perubahan' : 'Publikasikan Edaran'}
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
          rows={isEdit ? 3 : 2}
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

        {/* Berkas PDF */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
            {isEdit ? (
              <>Berkas Dokumen PDF Pengumuman (Opsional untuk pembaruan, Maks. 10 MB)</>
            ) : (
              <>
                Berkas Dokumen PDF Pengumuman (Maks. 10 MB) <span className="text-red-500">*</span>
              </>
            )}
          </label>
          {isEdit && initialData?.file_name && !pdfFile && (
            <div className="mb-2 p-2.5 rounded-lg bg-slate-100 border border-slate-200 flex items-center gap-2 text-xs text-slate-700">
              <FileText className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="truncate">Berkas saat ini: <strong>{initialData.file_name}</strong></span>
            </div>
          )}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-slate-400 bg-slate-50/50 transition-colors duration-100">
            <input
              type="file"
              id="announcement-modal-pdf-input"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label
              htmlFor="announcement-modal-pdf-input"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <UploadCloud className="w-8 h-8 text-slate-400" />
              <span className="text-xs font-bold text-slate-700">
                {pdfFile
                  ? pdfFile.name
                  : isEdit
                  ? 'Pilih berkas baru jika ingin memperbarui dokumen PDF'
                  : 'Pilih atau Seret Berkas Dokumen PDF'}
              </span>
              <span className="text-[11px] text-slate-400">
                Format resmi Portable Document Format (.pdf)
              </span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
