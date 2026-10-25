import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  KeyRound,
  Edit3,
  UploadCloud,
  FileText,
  ExternalLink,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award,
  BookOpen,
  Hash,
  Clock,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatTeam, formatRoleName } from '../../utils/shiftHelper';
import PersonnelDossier from '../personnel/PersonnelDossier';
import PersonnelDossierEditModal from '../personnel/PersonnelDossierEditModal';

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

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function DesktopProfileModal({ isOpen, onClose }) {
  const { user, token, refreshUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-forms toggle
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Edit Profile Form State
  const [editFormData, setEditFormData] = useState({
    nip: '',
    birth_date: '',
    formal_education: '',
    cert_level: 'Junior',
    cert_number: '',
    cert_expiry_date: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Change Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Upload Document Form State
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('lisensi_stkp');
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Feedback Toast State
  const [feedbackSuccess, setFeedbackSuccess] = useState(null);
  const [feedbackError, setFeedbackError] = useState(null);

  const personnelId = user?.personnel_id;
  const isPureAdmin = (user?.role === 'admin' || user?.role === 'administrator') && !personnelId;

  // Load profile and documents data
  const loadData = async () => {
    try {
      setLoading(true);
      const meRes = await api.get('/auth/me');
      const me = meRes.data?.data || meRes.data || user;
      setProfileData(me);

      let rawCert = me.cert_level || 'Junior';
      if (rawCert.includes('Senior')) rawCert = 'Senior';
      else if (rawCert.includes('Junior')) rawCert = 'Junior';
      else if (rawCert.includes('Basic')) rawCert = 'Basic';

      setEditFormData({
        nip: me.nip || '',
        birth_date: me.birth_date ? String(me.birth_date).split('T')[0] : '',
        formal_education: me.formal_education || '',
        cert_level: rawCert,
        cert_number: me.cert_number || '',
        cert_expiry_date: me.cert_expiry_date ? String(me.cert_expiry_date).split('T')[0] : '',
      });

      const pId = me.personnel_id || personnelId;
      if (pId) {
        try {
          const docRes = await api.get(`/personnel/${pId}/documents`);
          const docList = docRes.data?.data || docRes.data || [];
          setDocuments(Array.isArray(docList) ? docList : []);
        } catch (docErr) {
          console.warn('Gagal memuat dokumen personel:', docErr.message);
          setDocuments([]);
        }
      } else {
        setDocuments([]);
      }
    } catch (err) {
      console.error('Gagal mengambil data profil:', err);
      setProfileData(user);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFeedbackSuccess(null);
      setFeedbackError(null);
      setIsEditingProfile(false);
      setIsChangingPassword(false);
      setIsUploadingDoc(false);
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handler Edit Profil
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    const payload = {
      nip: editFormData.nip ? editFormData.nip.trim() : null,
      birth_date: editFormData.birth_date || null,
      formal_education: editFormData.formal_education ? editFormData.formal_education.trim() : null,
      cert_level: editFormData.cert_level,
      cert_number: editFormData.cert_number ? editFormData.cert_number.trim() : null,
      cert_expiry_date: editFormData.cert_expiry_date || null,
    };

    try {
      try {
        await api.put('/auth/profile', payload);
      } catch (errAuth) {
        if (personnelId) {
          await api.put(`/personnel/${personnelId}`, payload);
        } else {
          throw errAuth;
        }
      }

      setFeedbackSuccess('Data profil & kredensial berhasil diperbarui.');
      setIsEditingProfile(false);
      await refreshUser();
      await loadData();
    } catch (err) {
      console.error('Error simpan profil:', err);
      setFeedbackError(err.response?.data?.message || err.message || 'Gagal memperbarui data profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handler Simpan Dossier Mandiri (Lapbul 16 Atribut + 11 Kompetensi)
  const handleSaveDossierModal = async (formData) => {
    setSavingProfile(true);
    setFeedbackSuccess(null);
    setFeedbackError(null);
    try {
      try {
        await api.put('/auth/profile', formData);
      } catch (errAuth) {
        const pId = profileData?.personnel_id || personnelId;
        if (pId) {
          await api.put(`/personnel/${pId}`, formData);
        } else {
          throw errAuth;
        }
      }
      setFeedbackSuccess('Data profil & kualifikasi Lapbul berhasil diperbarui.');
      setIsEditingDossier(false);
      await refreshUser();
      await loadData();
    } catch (err) {
      console.error('Error simpan dossier:', err);
      setFeedbackError(err.response?.data?.message || err.message || 'Gagal memperbarui data profil.');
      throw err;
    } finally {
      setSavingProfile(false);
    }
  };

  // Handler Ubah Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setFeedbackSuccess(null);
    setFeedbackError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setFeedbackError('Semua kolom kata sandi wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setFeedbackError('Password baru minimal terdiri dari 6 karakter.');
      return;
    }

    if (newPassword === '123456') {
      setFeedbackError('Password baru tidak boleh menggunakan password default (123456).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedbackError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setFeedbackSuccess('Kata sandi akun Anda berhasil diperbarui!');
      setIsChangingPassword(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err) {
      console.error('Error change password:', err);
      setFeedbackError(err.response?.data?.message || err.message || 'Gagal memperbarui password.');
    } finally {
      setSavingPassword(false);
    }
  };

  // Handler Upload Dokumen
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    setFeedbackSuccess(null);
    setFeedbackError(null);

    if (!docFile) {
      setFeedbackError('Silakan pilih berkas dokumen terlebih dahulu.');
      return;
    }

    // Validasi ukuran maks 5 MB
    const maxSizeBytes = 5 * 1024 * 1024;
    if (docFile.size > maxSizeBytes) {
      setFeedbackError('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    const currentPId = profileData?.personnel_id || personnelId;
    if (!currentPId) {
      setFeedbackError('Akun Administrator Unit tidak memiliki relasi berkas personel.');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('title', docTitle.trim() || docFile.name);
      formData.append('document_type', docType);
      formData.append('document', docFile);

      await api.post(`/personnel/${currentPId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFeedbackSuccess('Dokumen berkas berhasil diunggah ke arsip pribadi.');
      setIsUploadingDoc(false);
      setDocTitle('');
      setDocFile(null);
      await loadData();
    } catch (err) {
      console.error('Error upload doc:', err);
      setFeedbackError(err.response?.data?.message || err.message || 'Gagal mengunggah berkas dokumen.');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Handler Hapus Dokumen
  const handleDeleteDocument = async (docId) => {
    const currentPId = profileData?.personnel_id || personnelId;
    if (!currentPId) return;

    if (!window.confirm('Apakah Anda yakin ingin menghapus berkas dokumen ini dari arsip?')) {
      return;
    }

    setDeletingDocId(docId);
    setFeedbackSuccess(null);
    setFeedbackError(null);

    try {
      await api.delete(`/personnel/${currentPId}/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      setFeedbackSuccess('Berkas dokumen berhasil dihapus dari arsip.');
    } catch (err) {
      console.error('Error delete doc:', err);
      setFeedbackError(err.response?.data?.message || err.message || 'Gagal menghapus dokumen.');
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

  const activeUser = profileData || user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
              {activeUser?.name ? activeUser.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                Profil Mandiri & Kredensial
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {formatRoleName(activeUser?.role)} {activeUser?.team_group ? `• ${formatTeam(activeUser.team_group)}` : ''} • Bandara Internasional Yogyakarta
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors duration-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Tutup jendela profil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {/* Visual Feedback Toast (GEMINI.md Rule 10) */}
          {feedbackSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold">{feedbackSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackSuccess(null)}
                className="text-emerald-700 hover:text-emerald-900 font-bold px-1.5 py-0.5"
              >
                ×
              </button>
            </div>
          )}

          {feedbackError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{feedbackError}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedbackError(null)}
                className="text-red-700 hover:text-red-900 font-bold px-1.5 py-0.5"
              >
                ×
              </button>
            </div>
          )}

          {/* Form Ubah Password (Inline Card/Dropdown) */}
          {isChangingPassword && (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                  <KeyRound className="w-4 h-4 text-amber-700" />
                  <span>Ubah Kata Sandi Akun</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="text-amber-800 hover:text-amber-950 text-xs font-bold px-2 py-1"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSavePassword} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password Saat Ini *
                    </label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Password saat ini"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password Baru * (Min 6 Karakter)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password baru yang aman"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Konfirmasi Password Baru *
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi password baru"
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(false)}
                    disabled={savingPassword}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors duration-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors duration-100 flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>{savingPassword ? 'Menyimpan...' : 'Simpan Kata Sandi'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Form Edit Data Profil (Inline Card/Dropdown) */}
          {isEditingProfile && !isPureAdmin && (
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
                  <Edit3 className="w-4 h-4 text-slate-700" />
                  <span>Edit Data Profil & Kredensial STKP</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-slate-600 hover:text-slate-900 text-xs font-bold px-2 py-1"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap (Terkunci Sesuai Akun)
                    </label>
                    <input
                      type="text"
                      value={activeUser?.full_name || activeUser?.name || ''}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 font-semibold cursor-not-allowed min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NIP (Nomor Induk Pegawai)
                    </label>
                    <input
                      type="text"
                      value={editFormData.nip}
                      onChange={(e) => setEditFormData({ ...editFormData, nip: e.target.value })}
                      placeholder="Masukkan NIP"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tanggal Lahir
                    </label>
                    <input
                      type="date"
                      value={editFormData.birth_date}
                      onChange={(e) => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Pendidikan Terakhir
                    </label>
                    <input
                      type="text"
                      value={editFormData.formal_education}
                      onChange={(e) => setEditFormData({ ...editFormData, formal_education: e.target.value })}
                      placeholder="Contoh: SMA/SMK, D3 Teknik, S1"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kualifikasi STKP
                    </label>
                    <select
                      value={editFormData.cert_level}
                      onChange={(e) => setEditFormData({ ...editFormData, cert_level: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Basic">Basic Fire Fighter</option>
                      <option value="Junior">Junior Fire Fighter</option>
                      <option value="Senior">Senior Fire Fighter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nomor Registrasi Lisensi STKP
                    </label>
                    <input
                      type="text"
                      value={editFormData.cert_number}
                      onChange={(e) => setEditFormData({ ...editFormData, cert_number: e.target.value })}
                      placeholder="Contoh: STKP-2024-XXX"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Masa Berlaku Lisensi STKP
                    </label>
                    <input
                      type="date"
                      value={editFormData.cert_expiry_date}
                      onChange={(e) => setEditFormData({ ...editFormData, cert_expiry_date: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono text-slate-900 min-h-[40px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    disabled={savingProfile}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors duration-100"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition-colors duration-100 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{savingProfile ? 'Menyimpan...' : 'Simpan Data'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CARD 1: PROFIL & KREDENSIAL */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                  CARD 1
                </span>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Profil & Kredensial Personel
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword((prev) => !prev);
                    setIsEditingProfile(false);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 hover:bg-amber-100 text-xs font-semibold flex items-center gap-1.5 transition-colors duration-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Kunci Ubah Password</span>
                </button>
              </div>
            </div>

            {/* Layout Tampilan Kartu 1 */}
            {isPureAdmin ? (
              /* Khusus Administrator Murni */
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 block">Nama Lengkap / Akun</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">
                    {activeUser?.name || activeUser?.username}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 block">Username Sistem</span>
                  <span className="font-bold text-slate-900 font-mono text-sm block mt-0.5">
                    {activeUser?.username}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 block">Peran & Tanggung Jawab</span>
                  <span className="font-bold text-red-700 text-sm block mt-0.5">
                    Administrator Unit ARFF
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[10px] font-medium text-slate-500 block">Status Akses</span>
                  <span className="font-bold text-emerald-700 text-sm block mt-0.5">
                    Akses Penuh Seluruh Sistem & Konfigurasi
                  </span>
                </div>
              </div>
            ) : (
              /* Personel Lapangan / Operasional Menggunakan Dossier 3-Tab Terpadu */
              <PersonnelDossier
                personnel={activeUser}
                canEdit={true}
                onEditClick={() => setIsEditingDossier(true)}
              />
            )}
          </div>

          {/* CARD 2: DOKUMEN & SERTIFIKAT SAYA */}
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
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors duration-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-red-400"
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
                          {DOCUMENT_TYPE_LABELS[doc.document_type] || 'Dokumen'} • {formatBytes(doc.file_size)} • {formatDateIndo(doc.created_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openProtectedDoc(doc)}
                        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-blue-700 font-semibold text-xs flex items-center gap-1 transition-colors duration-100 shadow-2xs"
                        title="Buka Berkas PDF"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Lihat Dokumen</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(doc.id)}
                        disabled={deletingDocId === doc.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors duration-100"
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
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors duration-100 cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Modal Edit Kualifikasi Dossier Mandiri */}
      <PersonnelDossierEditModal
        isOpen={isEditingDossier}
        onClose={() => setIsEditingDossier(false)}
        personnel={activeUser}
        onSave={handleSaveDossierModal}
        saving={savingProfile}
        isStaffAdmin={activeUser?.role === 'admin'}
      />
    </div>
  );
}
