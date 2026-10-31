import React, { useState, useEffect } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import api from '../../services/api';

const DOCUMENT_TYPE_LABELS = {
  lisensi_stkp: 'Lisensi STKP',
  sertifikat_diklat: 'Sertifikat Diklat',
  medical_checkup: 'Medical Check-Up (MCU)',
  sk_tugas: 'Surat Keputusan (SK)',
  dokumen_lain: 'Dokumen Lainnya',
};

const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function UploadDocumentModal({
  isOpen,
  onClose,
  personnelId,
  onSuccess,
}) {
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('lisensi_stkp');
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setDocTitle('');
      setDocType('lisensi_stkp');
      setDocFile(null);
      setDocError(null);
      setUploadingDoc(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0] || null;
    setDocError(null);

    if (!selectedFile) {
      setDocFile(null);
      return;
    }

    // Pre-validasi ukuran berkas sisi klien (Maks. 10 MB)
    if (selectedFile.size > MAX_DOC_SIZE_BYTES) {
      setDocError(
        `Ukuran berkas (${formatBytes(selectedFile.size)}) melebihi batas maksimum 10 MB. Silakan pilih berkas dokumen yang lebih kecil.`
      );
      setDocFile(null);
      e.target.value = '';
      return;
    }

    setDocFile(selectedFile);
  };

  const handleUploadDocument = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!docFile) {
      setDocError('Silakan pilih berkas dokumen untuk diunggah (PDF atau gambar).');
      return;
    }

    if (docFile.size > MAX_DOC_SIZE_BYTES) {
      setDocError(
        `Ukuran berkas (${formatBytes(docFile.size)}) melebihi batas maksimum 10 MB.`
      );
      return;
    }

    setUploadingDoc(true);
    setDocError(null);

    const formData = new FormData();
    formData.append('document', docFile);
    formData.append('title', docTitle.trim() || docFile.name);
    formData.append('document_type', docType);

    try {
      await api.post(`/personnel/${personnelId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (onSuccess) {
        onSuccess('Berkas dokumen personel berhasil diunggah.');
      }
      onClose();
    } catch (err) {
      console.error('Error upload document:', err);
      setDocError(err.response?.data?.message || err.message || 'Gagal mengunggah dokumen.');
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!uploadingDoc) onClose();
      }}
      title="Unggah Berkas & Dokumen Personel"
      subtitle="Tambahkan salinan lisensi STKP, sertifikat diklat, atau dokumen kesehatan"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploadingDoc}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleUploadDocument}
            loading={uploadingDoc}
          >
            Unggah Berkas
          </Button>
        </>
      }
    >
      <form onSubmit={handleUploadDocument} className="space-y-4">
        {docError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{docError}</span>
          </div>
        )}

        <InputField
          label="Judul / Nama Dokumen"
          placeholder="Contoh: Lisensi STKP Senior Fire Fighter 2024"
          value={docTitle}
          onChange={(e) => setDocTitle(e.target.value)}
          helperText="Jika dikosongkan, nama berkas asli akan digunakan otomatis."
        />

        <SelectField
          label="Kategori / Jenis Dokumen"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          options={Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => ({
            value: k,
            label: v,
          }))}
          required
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Pilih Berkas Dokumen <span className="text-red-500">*</span>
          </label>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-100 text-center">
            <input
              type="file"
              id="documentFileInputModal"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploadingDoc}
            />
            <label
              htmlFor="documentFileInputModal"
              className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
            >
              <Upload className="w-6 h-6 text-slate-400" />
              <span className="text-xs font-semibold text-arff-primary hover:underline">
                {docFile ? docFile.name : 'Pilih berkas dari perangkat'}
              </span>
              <span className="text-xs text-slate-400">
                Format didukung: PDF, WebP, PNG, atau JPEG (Maks. 10 MB)
              </span>
            </label>
            {docFile && (
              <div className="mt-2 text-xs font-mono text-emerald-700 font-semibold bg-emerald-50 py-1 px-2 rounded-md inline-block">
                {docFile.name} ({formatBytes(docFile.size)})
              </div>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
