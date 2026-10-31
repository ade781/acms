import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  FileUp,
  Key,
  CheckCircle2,
  PenTool,
  Upload,
  Trash2,
  FileText,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatTeam, formatRoleName, mapRankPositionToRole } from '../utils/shiftHelper';
import { buildAuthenticatedFileUrl } from '../utils/fileHelper';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import UploadDocumentModal from '../components/personnel/UploadDocumentModal';
import ResetPasswordConfirmModal from '../components/personnel/ResetPasswordConfirmModal';
import ConfirmActionModal from '../components/personnel/ConfirmActionModal';
import PersonnelDossier from '../components/personnel/PersonnelDossier';
import PersonnelDossierEditModal from '../components/personnel/PersonnelDossierEditModal';

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

export default function PersonnelDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isSupervisor } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personnel, setPersonnel] = useState(null);

  // Signature state
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [signatureError, setSignatureError] = useState(null);
  const [signatureSuccess, setSignatureSuccess] = useState(null);

  // Document state
  const [uploadDocModalOpen, setUploadDocModalOpen] = useState(false);
  const [docError, setDocError] = useState(null);
  const [docSuccess, setDocSuccess] = useState(null);

  // Dossier Edit Modal State
  const [dossierEditOpen, setDossierEditOpen] = useState(false);
  const [savingDossier, setSavingDossier] = useState(false);

  // Reset Password State
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  // Confirm Action Modal State (menggantikan seluruh dialog browser native window.confirm)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    message: '',
    confirmText: 'Ya, Lanjutkan',
    variant: 'danger',
    action: null,
    loading: false,
  });

  // Global Toast Feedback State
  const [globalSuccess, setGlobalSuccess] = useState(null);
  const [globalError, setGlobalError] = useState(null);

  const isOwner = Boolean(
    (user?.personnel_id && Number(user.personnel_id) === Number(id)) ||
    (user?.id && personnel?.user_id && Number(user.id) === Number(personnel.user_id)) ||
    (user?.name && personnel?.full_name && String(user.name).trim().toLowerCase() === String(personnel.full_name).trim().toLowerCase())
  );

  const canEdit = isOwner || isAdmin;
  const canUploadDoc = isOwner || isAdmin;

  const fetchPersonnelDetail = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/personnel/${id}`, { signal });
      const data = res.data?.data || res.data?.personnel || res.data;
      setPersonnel(data);
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching personnel detail:', err);
      const rawErr = err.response?.data?.message || err.message;
      setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat profil personel.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchPersonnelDetail(controller.signal);
    return () => controller.abort();
  }, [id]);

  // Request Delete Personnel (In-App Confirm Modal)
  const requestDeletePersonnel = () => {
    if (!personnel) return;
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Data Anggota?',
      subtitle: 'Tindakan ini permanen dan tidak dapat dibatalkan',
      message: `PERINGATAN: Apakah Anda yakin ingin menghapus data anggota "${personnel.full_name}"?\n\nTindakan ini akan menghapus profil personel, seluruh dokumen fisik & catatan terkait, serta akun login yang terhubung. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus Anggota',
      variant: 'danger',
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        setGlobalSuccess(null);
        setGlobalError(null);
        try {
          await api.delete(`/personnel/${id}`);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          navigate('/personnel');
        } catch (err) {
          console.error('Error deleting personnel:', err);
          const rawErr = err.response?.data?.message || err.message;
          const errMsg = typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal menghapus data personel.');
          setGlobalError(errMsg);
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  const handleResetPassword = async () => {
    setResettingPassword(true);
    setGlobalSuccess(null);
    setGlobalError(null);
    try {
      const res = await api.post(`/personnel/${id}/reset-password`);
      const rawMsg = res.data?.message;
      setGlobalSuccess(typeof rawMsg === 'string' ? rawMsg : (rawMsg?.message || `Kata sandi ${personnel.full_name} berhasil direset ke bawaan (123456).`));
      setResetPasswordModalOpen(false);
      fetchPersonnelDetail();
    } catch (err) {
      console.error('Error reset password:', err);
      const rawErr = err.response?.data?.message || err.message;
      setGlobalError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal mereset kata sandi personel.'));
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSaveDossier = async (formData) => {
    setSavingDossier(true);
    setGlobalSuccess(null);
    setGlobalError(null);
    try {
      await api.put(`/personnel/${id}`, formData);
      setGlobalSuccess('Data kualifikasi & dossier personel berhasil diperbarui.');
      setDossierEditOpen(false);
      fetchPersonnelDetail();
    } finally {
      setSavingDossier(false);
    }
  };

  // Logika Kelayakan Tanda Tangan: Hanya Dept Head, Chief, dan Chief Assistant
  const targetRole =
    personnel?.user_role || (personnel?.rank_position ? mapRankPositionToRole(personnel.rank_position) : '');
  const isEligibleForSignature = ['dept_head', 'chief', 'chief_assistant'].includes(targetRole);

  const currentUserRole = user?.role;
  const canUploadSignature =
    ['admin', 'dept_head', 'chief', 'chief_assistant'].includes(currentUserRole) &&
    (isAdmin ||
      user?.personnel_id === Number(id) ||
      (user?.name &&
        personnel?.full_name &&
        user.name.trim().toLowerCase() === personnel.full_name.trim().toLowerCase()) ||
      ['admin', 'dept_head', 'chief'].includes(currentUserRole));

  const handleUploadSignature = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSignatureError(null);
    setSignatureSuccess(null);
    setUploadingSignature(true);

    const formData = new FormData();
    formData.append('signature', file);

    try {
      await api.post(`/personnel/${id}/signature`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSignatureSuccess('Spesimen tanda tangan digital resmi berhasil disimpan.');
      fetchPersonnelDetail();
    } catch (err) {
      console.error('Error upload signature:', err);
      const rawErr = err.response?.data?.message || err.message;
      setSignatureError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal mengunggah tanda tangan.'));
    } finally {
      setUploadingSignature(false);
      e.target.value = '';
    }
  };

  // Request Delete Signature (In-App Confirm Modal)
  const requestDeleteSignature = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Spesimen Tanda Tangan?',
      subtitle: 'Tanda tangan digital resmi akan dihapus dari sistem',
      message: 'Apakah Anda yakin ingin menghapus spesimen tanda tangan digital resmi ini?',
      confirmText: 'Ya, Hapus Tanda Tangan',
      variant: 'danger',
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        setSignatureError(null);
        setSignatureSuccess(null);
        try {
          await api.delete(`/personnel/${id}/signature`);
          setSignatureSuccess('Spesimen tanda tangan digital berhasil dihapus.');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchPersonnelDetail();
        } catch (err) {
          console.error('Error delete signature:', err);
          const rawErr = err.response?.data?.message || err.message;
          setSignatureError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal menghapus tanda tangan.'));
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  // Request Delete Document (In-App Confirm Modal)
  const requestDeleteDocument = (doc) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Berkas Dokumen?',
      subtitle: 'Berkas arsip dokumen akan dihapus dari profil personel',
      message: `Apakah Anda yakin ingin menghapus berkas dokumen "${doc.title || 'Dokumen'}" ini dari profil personel?`,
      confirmText: 'Ya, Hapus Berkas',
      variant: 'danger',
      loading: false,
      action: async () => {
        setConfirmModal((prev) => ({ ...prev, loading: true }));
        setDocError(null);
        setDocSuccess(null);
        try {
          await api.delete(`/personnel/${id}/documents/${doc.id}`);
          setDocSuccess('Berkas dokumen berhasil dihapus.');
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          fetchPersonnelDetail();
        } catch (err) {
          console.error('Error delete document:', err);
          const rawErr = err.response?.data?.message || err.message;
          setDocError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal menghapus dokumen.'));
          setConfirmModal((prev) => ({ ...prev, loading: false }));
        }
      },
    });
  };

  return (
    <div>
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/personnel')}
        >
          Kembali ke Katalog Personel
        </Button>
      </div>

      <StateView loading={loading} error={typeof error === 'string' ? error : error?.message || null} onRetry={() => window.location.reload()}>
        {personnel && (
          <div className="space-y-6">
            {/* Global Visual Toast Feedbacks */}
            {globalSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-semibold">{typeof globalSuccess === 'string' ? globalSuccess : globalSuccess?.message || 'Operasi berhasil'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {globalError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <span>{typeof globalError === 'string' ? globalError : globalError?.message || 'Terjadi kesalahan'}</span>
                <button
                  type="button"
                  onClick={() => setGlobalError(null)}
                  className="text-red-700 hover:text-red-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Dossier Personel 3-Tab: Identitas & Kepegawaian, STKP & Salvage, 11 Kompetensi Tambahan */}
            <PersonnelDossier
              personnel={personnel}
              canEdit={canEdit}
              onEditClick={() => setDossierEditOpen(true)}
            />

            {/* Account & Role Strip */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Akun Login Sistem & Otorisasi Dinas
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {(isAdmin || isSupervisor) && (
                    <Button
                      variant="danger"
                      size="xs"
                      icon={Trash2}
                      onClick={requestDeletePersonnel}
                    >
                      Hapus Anggota
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-xs">Username Login</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {personnel.username || '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-xs">Role Sistem (Akses)</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {formatRoleName(personnel.user_role || (personnel.team_group === 'Non-Shift' ? 'admin' : targetRole))}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-xs">Penempatan Regu</span>
                  <span className="font-bold text-slate-900 mt-1 block">
                    {personnel.team_group === 'Non-Shift' ? 'Non-Shift (Administrasi)' : formatTeam(personnel.team_group)}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-xs">Kata Sandi</span>
                    <span className="text-slate-500 font-mono mt-1 block">••••••••</span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="outline"
                      size="xs"
                      icon={Key}
                      onClick={() => setResetPasswordModalOpen(true)}
                      className="text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                    >
                      Reset
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Spesimen Tanda Tangan Digital Resmi (Khusus Dept Head, Chief, & Chief Assistant) */}
            {isEligibleForSignature && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-arff-primary" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Spesimen Tanda Tangan Digital Resmi</h3>
                    </div>
                  </div>

                  {personnel.signature_url && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terverifikasi
                    </span>
                  )}
                </div>

                {signatureSuccess && (
                  <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between">
                    <span>{typeof signatureSuccess === 'string' ? signatureSuccess : signatureSuccess?.message || 'Tanda tangan berhasil disimpan'}</span>
                    <button type="button" onClick={() => setSignatureSuccess(null)} className="font-bold">✕</button>
                  </div>
                )}
                {signatureError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between">
                    <span>{typeof signatureError === 'string' ? signatureError : signatureError?.message || 'Gagal memproses tanda tangan'}</span>
                    <button type="button" onClick={() => setSignatureError(null)} className="font-bold">✕</button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Kotak Pratinjau Tanda Tangan */}
                  <div className="w-full sm:w-64 h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center p-3 relative overflow-hidden">
                    {personnel.signature_url ? (
                      <img
                        src={buildAuthenticatedFileUrl(personnel.signature_url)}
                        alt={`Tanda tangan ${personnel.full_name}`}
                        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                      />
                    ) : (
                      <div className="text-center p-3">
                        <PenTool className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                        <span className="text-xs text-slate-400 block font-medium">Belum ada tanda tangan</span>
                      </div>
                    )}
                  </div>

                  {/* Kontrol Aksi & Petunjuk */}
                  <div className="flex-1 space-y-3">
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tanda tangan digital ini digunakan pada formulir serah terima shift dinas, validasi ploting armada, serta lembar pengesahan laporan berkala ARFF YIA.
                    </p>

                    {canUploadSignature ? (
                      <div className="flex items-center gap-3 flex-wrap">
                        <input
                          type="file"
                          id="signatureFileInput"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleUploadSignature}
                          disabled={uploadingSignature}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Upload}
                          onClick={() => document.getElementById('signatureFileInput')?.click()}
                          loading={uploadingSignature}
                        >
                          {personnel.signature_url ? 'Ganti Tanda Tangan' : 'Unggah Tanda Tangan'}
                        </Button>

                        {personnel.signature_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            icon={Trash2}
                            onClick={requestDeleteSignature}
                            className="text-red-600 hover:bg-red-50 hover:border-red-200"
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 italic">
                        Hanya pimpinan bersangkutan atau Administrator yang dapat mengubah spesimen ini.
                      </div>
                    )}

                    <span className="text-xs text-slate-400 block">
                      Format didukung: PNG (latar transparan disarankan), WebP, atau JPEG (Maks. 5 MB).
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Alert Dokumen */}
            {docSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{typeof docSuccess === 'string' ? docSuccess : docSuccess?.message || 'Dokumen berhasil diproses'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDocSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {docError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <span>{typeof docError === 'string' ? docError : docError?.message || 'Gagal memproses dokumen'}</span>
                <button
                  type="button"
                  onClick={() => setDocError(null)}
                  className="text-red-700 hover:text-red-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Kartu Berkas & Dokumen Personel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-arff-primary" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Berkas & Dokumen Personel</h3>
                    <p className="text-xs text-slate-500">
                      Lisensi STKP, sertifikat diklat teknis, medical check-up (MCU), dan surat tugas resmi
                    </p>
                  </div>
                </div>

                {canUploadDoc && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Upload}
                    onClick={() => {
                      setDocError(null);
                      setDocSuccess(null);
                      setUploadDocModalOpen(true);
                    }}
                  >
                    Unggah Dokumen
                  </Button>
                )}
              </div>

              {personnel.documents && personnel.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {personnel.documents.map((doc, docIdx) => {
                    const canDeleteThisDoc = isAdmin || isOwner;

                    return (
                      <div
                        key={doc.id || `doc-${docIdx}`}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-100 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-red-100 text-arff-primary flex items-center justify-center shrink-0 mt-0.5">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate" title={typeof doc.title === 'string' ? doc.title : 'Dokumen'}>
                                {typeof doc.title === 'string' ? doc.title : 'Dokumen'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="info" size="sm">
                                  {typeof doc.document_type === 'string' ? (DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type) : 'Dokumen'}
                                </Badge>
                                <span className="text-xs font-mono tabular-nums text-slate-500">
                                  {formatBytes(doc.file_size)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-xs text-slate-500 flex-wrap gap-2">
                          <span title={doc.created_at ? new Date(doc.created_at).toLocaleString('id-ID') : ''}>
                            <span className="font-mono tabular-nums">{doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</span>
                            {doc.uploader_name && ` • Oleh ${doc.uploader_name}`}
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={buildAuthenticatedFileUrl(doc.view_url || `/api/documents/${doc.id}/view`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors duration-100"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>Lihat / Unduh</span>
                            </a>

                            {canDeleteThisDoc && (
                              <button
                                type="button"
                                onClick={() => requestDeleteDocument(doc)}
                                className="inline-flex items-center gap-1 p-1 rounded-md text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors duration-100"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                  <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    Belum ada berkas atau dokumen yang diunggah untuk personel ini.
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Unggah salinan lisensi STKP, sertifikat kompetensi, atau hasil medical check-up (MCU) dalam format PDF/gambar.
                  </p>
                  {canUploadDoc && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Upload}
                      onClick={() => {
                        setDocError(null);
                        setDocSuccess(null);
                        setUploadDocModalOpen(true);
                      }}
                      className="mt-3.5"
                    >
                      Unggah Berkas Sekarang
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </StateView>

      {/* Modal Unggah Berkas & Dokumen Personel (Modular with 10MB pre-validation) */}
      <UploadDocumentModal
        isOpen={uploadDocModalOpen}
        onClose={() => setUploadDocModalOpen(false)}
        personnelId={id}
        onSuccess={(msg) => {
          setDocSuccess(typeof msg === 'string' ? msg : msg?.message || 'Berkas dokumen berhasil diunggah.');
          fetchPersonnelDetail();
        }}
      />

      {/* Modal Konfirmasi Reset Password (Modular) */}
      <ResetPasswordConfirmModal
        isOpen={resetPasswordModalOpen}
        onClose={() => setResetPasswordModalOpen(false)}
        personnel={personnel}
        onConfirm={handleResetPassword}
        loading={resettingPassword}
      />

      {/* Modal Edit Dossier & Kualifikasi Lapbul */}
      <PersonnelDossierEditModal
        isOpen={dossierEditOpen}
        onClose={() => setDossierEditOpen(false)}
        personnel={personnel}
        onSave={handleSaveDossier}
        saving={savingDossier}
        isStaffAdmin={isAdmin || isSupervisor}
      />

      {/* Modal Konfirmasi Umum In-App (Pengganti window.confirm) */}
      <ConfirmActionModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={() => confirmModal.action && confirmModal.action()}
        title={confirmModal.title}
        subtitle={confirmModal.subtitle}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        variant={confirmModal.variant}
        loading={confirmModal.loading}
      />
    </div>
  );
}
