import React, { useState } from 'react';
import { UploadCloud, FileText, ExternalLink, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { formatIndoDate } from '../../utils/shiftHelper';

const DOCUMENT_TYPE_LABELS = {
  lisensi_stkp: 'Lisensi STKP',
  sertifikat_diklat: 'Sertifikat Diklat',
  medical_checkup: 'Medical Check-Up (MCU)',
  sk_tugas: 'Surat Keputusan (SK)',
  dokumen_lain: 'Dokumen Lainnya',
};

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Card 2: Dokumen & Sertifikat Saya
 * Menangani upload berkas, list dokumen, lihat, dan hapus berkas.
 */
export default function ProfileDocumentsCard({
  documents,
  setDocuments,
  personnelId,
  isPureAdmin,
  token,
  onSuccess,
  onError,
  reloadProfile
}) {
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('lisensi_stkp');
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Handler Upload Dokumen
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    onError(null);
    onSuccess(null);

    if (!docFile) {
      onError('Silakan pilih berkas dokumen terlebih dahulu.');
      return;
    }

    const maxSizeBytes = 5 * 1024 * 1024;
    if (docFile.size > maxSizeBytes) {
      onError('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    if (!personnelId) {
      onError('Akun Administrator Unit tidak memiliki relasi berkas personel.');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('title', docTitle.trim() || docFile.name);
      formData.append('document_type', docType);
      formData.append('document', docFile);

      await api.post(`/personnel/${personnelId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onSuccess('Dokumen berkas berhasil diunggah ke arsip pribadi.');
      setIsUploadingDoc(false);
      setDocTitle('');
      setDocFile(null);
      await reloadProfile();
    } catch (err) {
      console.error('Error upload doc:', err);
      onError(err.response?.data?.message || err.message || 'Gagal mengunggah berkas dokumen.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handler Hapus Dokumen
  const handleDeleteDocument = async (docId) => {
    if (!personnelId) return;

    if (!window.confirm('Apakah Anda yakin ingin menghapus berkas dokumen ini dari arsip?')) {
      return;
    }

    setDeletingDocId(docId);
    onError(null);
    onSuccess(null);

    try {
      await api.delete(`/personnel/${personnelId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      onSuccess('Berkas dokumen berhasil dihapus dari arsip.');
    } catch (err) {
      console.error('Error delete doc:', err);
      onError(err.response?.data?.message || err.message || 'Gagal menghapus dokumen.');
    } finally {
      setDeletingDocId(null);
    }
  };

  // Handler Buka Dokumen Terproteksi
  const openProtectedDoc = (doc) => {
    const rawUrl = doc.view_url || `/api/documents/${doc.id}/view`;
    const currentToken = token || localStorage.getItem('arff_token') || '';
    const separator = rawUrl.includes('?') ? '&' : '?';
    const authUrl = `${rawUrl}${separator}token=${encodeURIComponent(currentToken)}`;
    window.open(authUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
            CARD 2
          </span>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
            Dokumen & Sertifikat Saya
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Arsip berkas ijazah, lisensi STKP, sertifikat diklat, dan medical check-up (maks. 5 MB per berkas)
          </p>
        </div>

        {!isPureAdmin && (
          <button
            type="button"
            onClick={() => setIsUploadingDoc((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors duration-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>+ Upload Dokumen</span>
          </button>
        )}
      </div>

      {/* Form Upload Dokumen Baru (Inline) */}
      {isUploadingDoc && !isPureAdmin && (
        <div className="bg-red-50/50 border border-red-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-red-200">
            <h4 className="text-xs font-bold text-red-950 uppercase tracking-wide flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-red-600" />
              <span>Upload Berkas Dokumen Kepegawaian</span>
            </h4>
            <button
              type="button"
              onClick={() => setIsUploadingDoc(false)}
              className="text-red-800 hover:text-red-950 text-xs font-bold px-2 py-0.5"
            >
              Batal
            </button>
          </div>

          <form onSubmit={handleUploadDocument} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Dokumen *
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="lisensi_stkp">Lisensi STKP</option>
                  <option value="sertifikat_diklat">Sertifikat Diklat</option>
                  <option value="medical_checkup">Medical Check-Up (MCU)</option>
                  <option value="sk_tugas">Surat Keputusan (SK)</option>
                  <option value="dokumen_lain">Dokumen Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Dokumen (Opsional)
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="Contoh: Sertifikat Diklat Fire Officer 2026"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Berkas (PDF / Gambar, Maks 5 MB) *
                </label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  required
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-1 text-xs text-slate-900 min-h-[40px] file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-red-200">
              <button
                type="button"
                onClick={() => setIsUploadingDoc(false)}
                disabled={uploadingDoc}
                className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors duration-100"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={uploadingDoc || !docFile}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors duration-100 flex items-center gap-1.5"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{uploadingDoc ? 'Mengunggah Berkas...' : 'Unggah Dokumen'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Dokumen Terunduh */}
      {isPureAdmin ? (
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
          Akun Administrator Unit tidak memiliki berkas lisensi teknis personal. Pengelolaan arsip dokumen seluruh personel operasional dapat diakses melalui modul <strong className="text-slate-900">Data Personel</strong>.
        </div>
      ) : documents.length === 0 ? (
        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
          Belum ada arsip berkas dokumen atau sertifikat yang diunggah.
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 flex items-center justify-between text-xs transition-colors duration-100"
            >
              <div className="flex items-center gap-3 truncate pr-3">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-red-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <p className="font-bold text-slate-900 text-xs truncate">
                    {doc.title || DOCUMENT_TYPE_LABELS[doc.document_type] || doc.file_name}
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    {DOCUMENT_TYPE_LABELS[doc.document_type] || 'Dokumen'} • {formatBytes(doc.file_size)} • {formatIndoDate(doc.created_at, { shortMonth: true })}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openProtectedDoc(doc)}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-700 font-semibold text-xs flex items-center gap-1 transition-colors duration-100 shadow-2xs cursor-pointer"
                  title="Buka Berkas PDF"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Lihat Dokumen</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteDocument(doc.id)}
                  disabled={deletingDocId === doc.id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-100 cursor-pointer"
                  title="Hapus Dokumen"
                  aria-label="Hapus Dokumen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

