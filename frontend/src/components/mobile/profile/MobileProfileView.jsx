import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,

  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import MobileChangePasswordModal from './MobileChangePasswordModal';
import MobilePersonnelAccordion from './MobilePersonnelAccordion';
import PersonnelDossierEditModal from '../../personnel/PersonnelDossierEditModal';


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




export default function MobileProfileView({ onClose, onOpenLeaveModal }) {
  const { user, token, logout, refreshUser } = useAuth();
  const [personnelData, setPersonnelData] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [error, setError] = useState(null);

  // Modals inside Profile View
  const [isEditDossierOpen, setIsEditDossierOpen] = useState(false);
  const [savingDossier, setSavingDossier] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);

  // Visual Toast Feedback
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);

  // Upload Doc State
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadDocType, setUploadDocType] = useState('lisensi_stkp');
  const [uploadDocFile, setUploadDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const personnelId = user?.personnel_id;

  const loadProfileAndDocs = async () => {
    if (!personnelId) {

      return;
    }

    try {

      setError(null);

      // Load personnel detail and documents in parallel
      const [pRes, dRes] = await Promise.all([
        api.get(`/personnel/${personnelId}`).catch((e) => {
          console.warn('Gagal memuat profil personnel:', e.message);
          return { data: { data: user } };
        }),
        api.get(`/personnel/${personnelId}/documents`).catch((e) => {
          console.warn('Gagal memuat dokumen personnel:', e.message);
          return { data: { data: [] } };
        }),
      ]);

      const pData = pRes.data?.data || pRes.data || user;
      setPersonnelData(pData);

      const dData = dRes.data?.data || dRes.data || [];
      setDocuments(Array.isArray(dData) ? dData : []);
    } catch (err) {
      console.error('Error loadProfileAndDocs:', err);
      setError('Gagal memuat data profil');
    }
  };

  useEffect(() => {
    loadProfileAndDocs();
  }, [personnelId]);

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!uploadDocFile) {
      setUploadError('Pilih berkas dokumen terlebih dahulu');
      return;
    }

    setUploadingDoc(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('title', uploadDocTitle.trim() || uploadDocFile.name);
      formData.append('document_type', uploadDocType);
      formData.append('document', uploadDocFile);

      await api.post(`/personnel/${personnelId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsUploadDocOpen(false);
      setUploadDocTitle('');
      setUploadDocFile(null);
      setFeedbackSuccess('Dokumen berkas berhasil diunggah ke arsip pribadi.');
      await loadProfileAndDocs();
    } catch (err) {
      console.error('Error upload doc:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal mengunggah berkas'));
      setUploadError(msg);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Hapus dokumen ini dari arsip pribadi?')) return;

    setDeletingDocId(docId);
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      await api.delete(`/personnel/${personnelId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setFeedbackSuccess('Berkas dokumen berhasil dihapus dari arsip.');
    } catch (err) {
      console.error('Error delete doc:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menghapus dokumen.'));
      setFeedbackError(msg);
    } finally {
      setDeletingDocId(null);
    }
  };

  const openProtectedDoc = (doc) => {
    const rawUrl = doc.view_url || `/api/documents/${doc.id}/view`;
    const currentToken = token || localStorage.getItem('arff_token') || '';
    const separator = rawUrl.includes('?') ? '&' : '?';
    const authUrl = `${rawUrl}${separator}token=${encodeURIComponent(currentToken)}`;
    window.open(authUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveDossierMobile = async (formData) => {
    setSavingDossier(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      try {
        await api.put('/auth/profile', formData);
      } catch (errAuth) {
        if (personnelId) {
          await api.put(`/personnel/${personnelId}`, formData);
        } else {
          throw errAuth;
        }
      }
      setFeedbackSuccess('Data profil & kualifikasi Lapbul berhasil diperbarui.');
      setIsEditDossierOpen(false);
      await refreshUser();
      await loadProfileAndDocs();
    } catch (err) {
      console.error('Error simpan dossier mobile:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memperbarui data profil.'));
      setFeedbackError(msg);
      throw err;
    } finally {
      setSavingDossier(false);
    }
  };

  const activePersonnel = personnelData || user;

  return (
    <div className="space-y-3 pb-8">
      {/* Top Bar Sub-View */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -ml-1 text-slate-600 hover:text-slate-900 rounded-md transition-colors duration-100"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-tight leading-none">
              Profil Mandiri
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Identitas & Arsip Kepegawaian</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenLeaveModal && (
            <button
              type="button"
              onClick={onOpenLeaveModal}
              className="px-2 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-colors duration-100 flex items-center gap-1"
            >
              <Calendar className="w-3 h-3" />
              <span>+ Cuti Mandiri</span>
            </button>
          )}
        </div>
      </div>

      {feedbackSuccess && (
        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{typeof feedbackSuccess === 'string' ? feedbackSuccess : (feedbackSuccess?.message || 'Berhasil')}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {feedbackError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
            <span>{typeof feedbackError === 'string' ? feedbackError : (feedbackError?.message || 'Terjadi kesalahan')}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackError(null)}
            className="text-red-700 hover:text-red-900 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{typeof error === 'string' ? error : (error?.message || 'Gagal memuat data profil')}</span>
        </div>
      )}

      {/* Dossier Personel Versi Mobile: Accordion Lipat-Buka (100% Light Theme, Ergonomis Mobile) */}
      <MobilePersonnelAccordion
        personnel={activePersonnel}
        canEdit={true}
        onEditClick={() => setIsEditDossierOpen(true)}
        onChangePasswordClick={() => setIsPasswordOpen(true)}
      />

      {/* Card 2: DOKUMEN & SERTIFIKAT SAYA */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-tight">
              Dokumen & Sertifikat Saya
            </h3>
            <p className="text-xs text-slate-500">Arsip digital lisensi, diklat, dan MCU</p>
          </div>
          <button
            type="button"
            onClick={() => setIsUploadDocOpen(true)}
            className="px-2.5 py-1 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1 transition-colors duration-100 shadow-2xs"
          >
            <UploadCloud className="w-3 h-3" />
            <span>+ Upload</span>
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="p-4 text-center border border-dashed border-slate-200 rounded-lg text-slate-400 text-xs">
            Belum ada berkas dokumen kepegawaian yang diunggah.
          </div>
        ) : (
          <div className="space-y-1.5">
            {documents.map((doc) => (
              <div
                key={doc.id ?? `doc-${doc.file_name || doc.created_at || Math.random()}`}
                className="p-2 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs transition-colors duration-100 hover:bg-slate-100/70"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <div className="w-7 h-7 rounded-md bg-white border border-slate-200 text-red-600 flex items-center justify-center shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <p className="font-bold text-slate-800 text-xs truncate">
                      {doc.title || DOCUMENT_TYPE_LABELS[doc.document_type] || doc.file_name}
                    </p>
                    <span className="text-xs text-slate-500 font-sans block">
                      {DOCUMENT_TYPE_LABELS[doc.document_type] || 'Dokumen'} • <span className="font-mono tabular-nums">{formatBytes(doc.file_size)}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openProtectedDoc(doc)}
                    className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-50 text-blue-600 font-bold text-xs flex items-center gap-1 transition-colors duration-100 shadow-2xs"
                    title="Buka Berkas PDF"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Lihat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDocument(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors duration-100"
                    title="Hapus Dokumen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tombol Logout Sesi Operasional */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Akhiri sesi operasional dan keluar dari sistem?')) {
            logout();
          }
        }}
        className="w-full py-2.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-100 shadow-2xs"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Logout Sesi Operasional</span>
      </button>

      {/* Modal Edit Dossier & Kualifikasi Lapbul Mobile */}
      <PersonnelDossierEditModal
        isOpen={isEditDossierOpen}
        onClose={() => setIsEditDossierOpen(false)}
        personnel={activePersonnel}
        onSave={handleSaveDossierMobile}
        saving={savingDossier}
        isStaffAdmin={user?.role === 'admin'}
      />

      {/* Modal Change Password */}
      <MobileChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />

      {/* Modal Upload Dokumen Sub-Dialog */}
      {isUploadDocOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Upload Dokumen</h4>
              <button
                type="button"
                onClick={() => {
                  setIsUploadDocOpen(false);
                  setUploadError(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{typeof uploadError === 'string' ? uploadError : (uploadError?.message || 'Gagal mengunggah berkas')}</span>
              </div>
            )}

            <form onSubmit={handleUploadDocument} className="space-y-2 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-0.5">Jenis Dokumen *</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
                >
                  <option value="lisensi_stkp">Lisensi STKP</option>
                  <option value="sertifikat_diklat">Sertifikat Diklat</option>
                  <option value="medical_checkup">Medical Check-up (MCU)</option>
                  <option value="sk_tugas">Surat Keputusan (SK)</option>
                  <option value="dokumen_lain">Dokumen Lainnya</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-0.5">Judul Dokumen (Opsional)</label>
                <input
                  type="text"
                  value={uploadDocTitle}
                  onChange={(e) => setUploadDocTitle(e.target.value)}
                  placeholder="Misal: Sertifikat Fire Commander 2026"
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-0.5">Berkas (PDF / Foto) *</label>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  required
                  onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                  className="w-full p-1 border border-slate-300 rounded-lg bg-slate-50 text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-slate-200 file:text-slate-800 hover:file:bg-slate-300"
                />
              </div>

              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadDocOpen(false)}
                  disabled={uploadingDoc}
                  className="flex-1 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors duration-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadingDoc || !uploadDocFile}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100 flex items-center justify-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{uploadingDoc ? 'Mengunggah...' : 'Unggah'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
