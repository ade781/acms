import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  Trash2,
  ExternalLink,
  LogOut,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
  Edit3,
  Award,
  User,
  Compass,
  GraduationCap,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';
import { getErrorMessage } from '../../../utils/errorHelper';
import { formatIndoDate, formatTeam, formatRoleName } from '../../../utils/shiftHelper';
import MobileChangePasswordModal from './MobileChangePasswordModal';
import PersonnelDossierEditModal from '../../personnel/PersonnelDossierEditModal';

const DOCUMENT_TYPE_LABELS = {
  lisensi_stkp: 'Lisensi STKP',
  sertifikat_diklat: 'Sertifikat Diklat',
  medical_checkup: 'Medical Check-Up (MCU)',
  sk_tugas: 'Surat Keputusan (SK)',
  dokumen_lain: 'Dokumen Lainnya',
};

const ALL_ADDITIONAL_COMPETENCIES = [
  'SAR',
  'TOT',
  'Human Faktor',
  'K3 Kebakaran',
  'K3 Umum',
  'Uji Mutu Foam',
  'General Instructur Course',
  'First Aid',
  'Investigator',
  'Safety Manajement System',
  'Auditor',
];

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function calculateAge(birthDateStr) {
  if (!birthDateStr) return '-';
  try {
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    if (now.getDate() < birth.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return '-';
    return `${years} Thn ${months} Bln`;
  } catch {
    return '-';
  }
}

function calculateTenure(tmtDateStr) {
  if (!tmtDateStr) return '-';
  try {
    const tmt = new Date(tmtDateStr);
    if (isNaN(tmt.getTime())) return '-';
    const now = new Date();
    let years = now.getFullYear() - tmt.getFullYear();
    let months = now.getMonth() - tmt.getMonth();
    if (now.getDate() < tmt.getDate()) months -= 1;
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) return 'Baru';
    return `${years} Thn ${months} Bln`;
  } catch {
    return '-';
  }
}

function getStkpValidity(expiryDateStr) {
  if (!expiryDateStr) {
    return {
      isValid: null,
      percent: 0,
      label: 'Belum Diisi',
      timeText: 'Tanggal kedaluwarsa belum tercatat',
      statusType: 'neutral',
    };
  }

  try {
    const expiry = new Date(expiryDateStr);
    if (isNaN(expiry.getTime())) {
      return {
        isValid: null,
        percent: 0,
        label: 'Format Tidak Valid',
        timeText: '-',
        statusType: 'neutral',
      };
    }

    const now = new Date();
    expiry.setHours(23, 59, 59, 999);
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      return {
        isValid: false,
        percent: 0,
        label: 'Kedaluwarsa',
        timeText: 'Lisensi telah berakhir masa berlaku',
        statusType: 'danger',
      };
    }

    // Siklus STKP normal 5 tahun (1825 hari)
    const percent = Math.min(100, Math.max(8, Math.round((diffDays / 1825) * 100)));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);

    let timeText = '';
    if (years > 0) {
      timeText = `${years} Tahun ${months} Bulan tersisa`;
    } else if (months > 0) {
      timeText = `${months} Bulan tersisa`;
    } else {
      timeText = `${diffDays} Hari tersisa`;
    }

    const isWarning = diffDays <= 90;
    return {
      isValid: true,
      percent,
      label: isWarning ? 'Segera Perpanjang' : 'Aktif / Berlaku',
      timeText,
      statusType: isWarning ? 'warning' : 'success',
    };
  } catch {
    return {
      isValid: null,
      percent: 0,
      label: 'Error',
      timeText: '-',
      statusType: 'neutral',
    };
  }
}

export default function MobileProfileView({ onClose }) {
  const { user, token, logout, refreshUser } = useAuth();
  const [personnelData, setPersonnelData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);

  // Tab State: 'identity' | 'licenses' | 'documents'
  const [activeTab, setActiveTab] = useState('identity');

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
  const isPureAdmin = (user?.role === 'admin' || user?.role === 'administrator') && !personnelId;

  const loadProfileAndDocs = async () => {
    if (!personnelId) {
      if (isPureAdmin) {
        setPersonnelData(user);
        setDocuments([]);
      }
      return;
    }

    try {
      setError(null);
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
  }, [personnelId, isPureAdmin]);

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!personnelId) {
      setUploadError('Fitur upload berkas hanya diperuntukkan bagi personel operasional.');
      return;
    }
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
      setUploadError(getErrorMessage(err, 'Gagal mengunggah berkas'));
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!personnelId) return;
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
      setFeedbackError(getErrorMessage(err, 'Gagal menghapus dokumen.'));
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
      setFeedbackSuccess('Data profil & kualifikasi berhasil diperbarui.');
      setIsEditDossierOpen(false);
      await refreshUser();
      await loadProfileAndDocs();
    } catch (err) {
      console.error('Error simpan dossier mobile:', err);
      setFeedbackError(getErrorMessage(err, 'Gagal memperbarui data profil.'));
      throw err;
    } finally {
      setSavingDossier(false);
    }
  };

  const activePersonnel = personnelData || user;

  // Additional competencies
  let competencies = [];
  if (Array.isArray(activePersonnel?.additional_competencies)) {
    competencies = activePersonnel.additional_competencies;
  } else if (typeof activePersonnel?.additional_competencies === 'string') {
    try {
      competencies = JSON.parse(activePersonnel.additional_competencies);
    } catch {
      competencies = [];
    }
  }
  const ownedCompCount = Array.isArray(competencies) ? competencies.length : 0;

  // STKP Validity
  const stkpValidity = getStkpValidity(activePersonnel?.license_valid_until);

  // Monogram initials
  const fullName = activePersonnel?.full_name || activePersonnel?.name || user?.name || user?.username || 'Petugas ARFF';
  const nameParts = fullName.trim().split(/\s+/);
  const initials = nameParts.length === 1
    ? nameParts[0].substring(0, 2).toUpperCase()
    : (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();

  return (
    <div className="space-y-3 pb-8 font-sans">
      {/* 1. TOP SUB-VIEW NAVIGATION BAR */}
      <div className="flex items-center justify-between border-b border-[#E7E5E4] pb-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="p-1 -ml-1 text-[#57534E] hover:text-[#1C1917] rounded-lg hover:bg-stone-100 transition-colors duration-100 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xs font-bold text-[#1C1917] uppercase tracking-tight leading-none">
              Profil Mandiri
            </h2>
            <span className="text-[10px] text-[#78716C] font-mono leading-none mt-0.5 block">
              Dossier Personel ARFF YIA
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#FAF8F5] text-[#57534E] border border-[#E7E5E4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]"></span>
          ARFF YIA
        </span>
      </div>

      {/* FEEDBACK TOASTS */}
      {feedbackSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold truncate">
              {typeof feedbackSuccess === 'string' ? feedbackSuccess : feedbackSuccess?.message || 'Berhasil'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {feedbackError && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="truncate">{getErrorMessage(feedbackError)}</span>
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
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{getErrorMessage(error)}</span>
        </div>
      )}

      {/* 2. CARD IDENTITAS UTAMA (DOSSIER STRIP) */}
      {isPureAdmin ? (
        /* Card Khusus Administrator */
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-3.5 shadow-xs space-y-2.5 text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#EA580C]" />
              <h3 className="font-bold text-[#1C1917] uppercase tracking-tight text-xs">
                Profil Administrator Unit
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPasswordOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-semibold text-xs flex items-center gap-1 transition-colors duration-100 shadow-2xs cursor-pointer"
            >
              <Lock className="w-3 h-3 text-amber-700" />
              <span>Ubah Sandi</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E7E5E4]">
              <span className="text-[10px] text-[#78716C] block font-medium uppercase">Nama Akun</span>
              <span className="font-bold text-[#1C1917] text-xs block mt-0.5">
                {user?.name || user?.username}
              </span>
            </div>
            <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E7E5E4]">
              <span className="text-[10px] text-[#78716C] block font-medium uppercase">Username</span>
              <span className="font-bold text-[#1C1917] font-mono text-xs block mt-0.5">
                {user?.username}
              </span>
            </div>
            <div className="bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E7E5E4]">
              <span className="text-[10px] text-[#78716C] block font-medium uppercase">Wewenang Sistem</span>
              <span className="font-bold text-[#EA580C] text-xs block mt-0.5">
                Akses Penuh Pengelolaan & Konfigurasi Sistem
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Card Identitas Personel Operasional */
        <div className="bg-white rounded-2xl border border-[#E7E5E4] p-3.5 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] border border-[#FDBA74] text-[#EA580C] font-bold text-base flex items-center justify-center select-none shrink-0 shadow-2xs">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-[#1C1917] text-sm tracking-tight leading-snug truncate">
                    {activePersonnel?.full_name || fullName}
                  </h3>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                      activePersonnel?.is_active
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-stone-100 text-stone-600 border-stone-200'
                    }`}
                  >
                    {activePersonnel?.is_active ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#57534E] mt-0.5 font-mono tabular-nums">
                  <span>NIP: {activePersonnel?.nip || '-'}</span>
                  <span>•</span>
                  <span className="font-sans font-medium text-[#1C1917]">
                    {activePersonnel?.team_group === 'Non-Shift'
                      ? 'Non-Shift'
                      : formatTeam(activePersonnel?.team_group)}
                  </span>
                </div>
                <p className="text-xs text-[#EA580C] font-bold mt-0.5 truncate">
                  {formatRoleName(activePersonnel?.rank_position || activePersonnel?.user_role || 'Personel ARFF')}
                </p>
              </div>
            </div>
          </div>

          {/* Tombol Aksi di Bawah Identitas: Ubah Sandi & Edit Kualifikasi */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setIsPasswordOpen(true)}
              className="w-full py-1.5 px-2 rounded-xl border border-[#D6D0C2] bg-white hover:bg-stone-50 text-[#44403C] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors duration-100 shadow-2xs cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Ubah Sandi</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEditDossierOpen(true)}
              className="w-full py-1.5 px-2 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors duration-100 shadow-2xs cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Kualifikasi</span>
            </button>
          </div>

          {/* Quick 4 KPI Mini Bar */}
          <div className="grid grid-cols-4 gap-1 pt-2 border-t border-stone-100 bg-[#FAF8F5] p-2 rounded-xl text-center">
            <div className="border-r border-[#E7E5E4] pr-1">
              <span className="text-[10px] text-[#78716C] block font-medium">Rating</span>
              <span className="font-bold text-[#1C1917] text-xs block truncate">
                {activePersonnel?.cert_level ? `Lvl ${activePersonnel.cert_level}` : '-'}
              </span>
            </div>
            <div className="border-r border-[#E7E5E4] pr-1">
              <span className="text-[10px] text-[#78716C] block font-medium">Usia</span>
              <span className="font-mono tabular-nums font-bold text-[#1C1917] text-xs block truncate">
                {calculateAge(activePersonnel?.birth_date)}
              </span>
            </div>
            <div className="border-r border-[#E7E5E4] pr-1">
              <span className="text-[10px] text-[#78716C] block font-medium">Masa Kerja</span>
              <span className="font-mono tabular-nums font-bold text-[#1C1917] text-xs block truncate">
                {calculateTenure(activePersonnel?.tmt_date)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-[#78716C] block font-medium">Kompetensi</span>
              <span className="font-mono tabular-nums font-bold text-emerald-800 text-xs block truncate">
                {ownedCompCount}/11
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. SEGMENTED SPLIT-TABS SWITCHER (THE CORE INNOVATION) */}
      {!isPureAdmin && (
        <div className="p-1 bg-[#EDEAE2] border border-[#D8D2C4] rounded-2xl grid grid-cols-3 gap-1 text-xs font-semibold">
          <button
            type="button"
            id="tab-btn-identitas"
            onClick={() => setActiveTab('identity')}
            className={`py-1.5 px-2 rounded-xl transition-colors duration-100 flex items-center justify-center gap-1.5 tap-target ${
              activeTab === 'identity'
                ? 'bg-white text-[#1C1917] font-bold shadow-xs border border-[#D8D2C4]/90'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-black/[0.02]'
            }`}
          >
            <User
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === 'identity' ? 'text-[#EA580C]' : 'text-stone-400'
              }`}
            />
            <span>Identitas</span>
          </button>

          <button
            type="button"
            id="tab-btn-lisensi"
            onClick={() => setActiveTab('licenses')}
            className={`py-1.5 px-2 rounded-xl transition-colors duration-100 flex items-center justify-center gap-1.5 tap-target ${
              activeTab === 'licenses'
                ? 'bg-white text-[#1C1917] font-bold shadow-xs border border-[#D8D2C4]/90'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-black/[0.02]'
            }`}
          >
            <Award
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === 'licenses' ? 'text-[#EA580C]' : 'text-stone-400'
              }`}
            />
            <span>Lisensi</span>
          </button>

          <button
            type="button"
            id="tab-btn-berkas"
            onClick={() => setActiveTab('documents')}
            className={`py-1.5 px-2 rounded-xl transition-colors duration-100 flex items-center justify-center gap-1.5 tap-target ${
              activeTab === 'documents'
                ? 'bg-white text-[#1C1917] font-bold shadow-xs border border-[#D8D2C4]/90'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-black/[0.02]'
            }`}
          >
            <FileText
              className={`w-3.5 h-3.5 shrink-0 ${
                activeTab === 'documents' ? 'text-[#EA580C]' : 'text-stone-400'
              }`}
            />
            <span>Berkas</span>
          </button>
        </div>
      )}

      {/* 4. TAB CONTENTS */}

      {/* TAB PANEL 1: IDENTITAS & KEPEGAWAIAN */}
      {!isPureAdmin && activeTab === 'identity' && (
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3.5 shadow-xs space-y-2.5 animate-in fade-in duration-100 text-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="font-bold text-[#1C1917] text-xs">Identitas & Kepegawaian</h4>
              <p className="text-[11px] text-[#78716C]">Biodata, TMT, Status & Pendidikan Formal</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl">
              <span className="text-[10px] text-[#78716C] block uppercase font-medium">Tempat Lahir</span>
              <span className="font-semibold text-[#1C1917] text-xs mt-0.5 block truncate">
                {activePersonnel?.birth_place || '-'}
              </span>
            </div>
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl">
              <span className="text-[10px] text-[#78716C] block uppercase font-medium">Tanggal Lahir</span>
              <span className="font-mono tabular-nums font-semibold text-[#1C1917] text-xs mt-0.5 block truncate">
                {formatIndoDate(activePersonnel?.birth_date, { shortMonth: true })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl">
              <span className="text-[10px] text-[#78716C] block uppercase font-medium">Status Karyawan</span>
              <span className="font-semibold text-[#1C1917] text-xs mt-0.5 block truncate">
                {activePersonnel?.employment_status || 'Karyawan Organik'}
              </span>
            </div>
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl">
              <span className="text-[10px] text-[#78716C] block uppercase font-medium">TMT Karyawan</span>
              <span className="font-mono tabular-nums font-semibold text-[#1C1917] text-xs mt-0.5 block truncate">
                {formatIndoDate(activePersonnel?.tmt_date, { shortMonth: true })}
              </span>
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl space-y-1.5">
            <div className="flex items-center gap-1.5 text-[#44403C] font-semibold text-xs">
              <GraduationCap className="w-3.5 h-3.5 text-stone-500" />
              <span>Pendidikan Formal</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-200/60">
              <div>
                <span className="text-[10px] text-[#78716C] block uppercase font-medium">Dimiliki</span>
                <span className="font-semibold text-[#1C1917] text-xs mt-0.5 block truncate">
                  {activePersonnel?.education_owned || '-'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#78716C] block uppercase font-medium">Diakui Perusahaan</span>
                <span className="font-semibold text-[#1C1917] text-xs mt-0.5 block truncate">
                  {activePersonnel?.education_recognized || '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB PANEL 2: LISENSI & 11 KOMPETENSI (WITH TACTICAL METER BAR) */}
      {!isPureAdmin && activeTab === 'licenses' && (
        <div className="space-y-3 animate-in fade-in duration-100 text-xs">
          {/* Card Lisensi STKP Utama dengan Meter Bar Validitas */}
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                  <Award className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1C1917] text-xs">Lisensi STKP ARFF</h4>
                  <p className="text-[11px] text-[#78716C]">Masa Berlaku Lisensi Resmi</p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  stkpValidity.statusType === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : stkpValidity.statusType === 'warning'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-red-50 text-red-800 border-red-300'
                }`}
              >
                {stkpValidity.label}
              </span>
            </div>

            {/* Tactical Meter Bar */}
            <div className="p-2.5 bg-[#FFFDF9] border border-amber-200/90 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-amber-950 font-mono">
                  {activePersonnel?.cert_level ? `RATING LEVEL ${activePersonnel.cert_level}` : 'RATING STKP'}
                </span>
                <span className="font-mono tabular-nums text-xs font-bold text-stone-700">
                  {stkpValidity.timeText}
                </span>
              </div>

              {/* Progress bar sisa masa berlaku */}
              <div className="w-full bg-stone-200/80 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    stkpValidity.statusType === 'success'
                      ? 'bg-emerald-600'
                      : stkpValidity.statusType === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${stkpValidity.percent}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[10px] font-mono text-[#78716C] pt-0.5">
                <span>NO: {activePersonnel?.license_number || '-'}</span>
                <span>KEDALUWARSA: {formatIndoDate(activePersonnel?.license_valid_until, { shortMonth: true })}</span>
              </div>
            </div>

            {/* Riwayat Jenjang (Basic, Junior, Senior) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-[#44403C] block uppercase font-mono tracking-wide">
                Riwayat Jenjang Kualifikasi
              </span>

              {/* Senior */}
              <div className="p-2 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#1C1917] block">Senior ARFF</span>
                  <span className="text-[10px] font-mono text-[#78716C]">
                    No: {activePersonnel?.cert_senior_no || '-'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#57534E] bg-white border border-[#E7E5E4] px-2 py-0.5 rounded-lg">
                  {activePersonnel?.cert_senior_lemdik || '-'}
                </span>
              </div>

              {/* Junior */}
              <div className="p-2 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#1C1917] block">Junior ARFF</span>
                  <span className="text-[10px] font-mono text-[#78716C]">
                    No: {activePersonnel?.cert_junior_no || '-'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#57534E] bg-white border border-[#E7E5E4] px-2 py-0.5 rounded-lg">
                  {activePersonnel?.cert_junior_lemdik || '-'}
                </span>
              </div>

              {/* Basic */}
              <div className="p-2 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-[#1C1917] block">Basic ARFF</span>
                  <span className="text-[10px] font-mono text-[#78716C]">
                    No: {activePersonnel?.cert_basic_no || '-'}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-[#57534E] bg-white border border-[#E7E5E4] px-2 py-0.5 rounded-lg">
                  {activePersonnel?.cert_basic_lemdik || '-'}
                </span>
              </div>
            </div>

            {/* Lisensi Salvage & General Refreshing */}
            <div className="p-2.5 bg-[#FAF8F5] border border-[#E7E5E4] rounded-xl space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-[#1C1917]">Lisensi & Refreshing Salvage</span>
                <span className="font-mono text-[10px] text-emerald-700 font-bold">
                  {formatIndoDate(activePersonnel?.salvage_license_valid_until, { shortMonth: true })}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[#78716C]">
                No: {activePersonnel?.salvage_license_no || '-'} • Lemdik: {activePersonnel?.salvage_lemdik || '-'}
              </p>
            </div>
          </div>

          {/* Card 11 Kompetensi Tambahan (Grid Chips 2-Kolom) */}
          <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3.5 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0">
                  <Compass className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1C1917] text-xs">11 Kompetensi Pendukung</h4>
                  <p className="text-[11px] text-[#78716C]">Kualifikasi Khusus Rescue & Airport Safety</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                {ownedCompCount} / 11 Dimiliki
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {ALL_ADDITIONAL_COMPETENCIES.map((comp) => {
                const isOwned = competencies.includes(comp);
                return (
                  <div
                    key={comp}
                    className={`p-1.5 rounded-xl border flex items-center justify-between transition-colors duration-100 ${
                      isOwned
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950 font-semibold'
                        : 'border-[#E7E5E4] bg-[#FAF8F5] text-stone-400'
                    }`}
                  >
                    <span className="text-[11px] truncate pr-1">{comp}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                        isOwned ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-400'
                      }`}
                    >
                      {isOwned ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-300" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB PANEL 3: DOKUMEN & BERKAS SAYA */}
      {(!isPureAdmin && activeTab === 'documents') || isPureAdmin ? (
        <div className="bg-white border border-[#E7E5E4] rounded-2xl p-3.5 shadow-xs space-y-2.5 animate-in fade-in duration-100 text-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <div>
              <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-tight">
                Dokumen & Arsip Sertifikat
              </h3>
              <p className="text-[11px] text-[#78716C]">Berkas digital resmi terverifikasi</p>
            </div>
            {!isPureAdmin && (
              <button
                type="button"
                onClick={() => setIsUploadDocOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-bold flex items-center gap-1 transition-colors duration-100 shadow-2xs cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>+ Upload</span>
              </button>
            )}
          </div>

          {isPureAdmin ? (
            <div className="p-4 text-center border border-dashed border-[#D6D0C2] rounded-xl text-[#78716C] text-xs">
              Arsip berkas STKP dan diklat operasional dikhususkan untuk personel regu operasional.
            </div>
          ) : documents.length === 0 ? (
            <div className="p-5 text-center border border-dashed border-[#D6D0C2] rounded-xl text-stone-400 text-xs space-y-1">
              <FileText className="w-6 h-6 mx-auto text-stone-300" />
              <p className="font-semibold text-stone-600">Belum ada dokumen yang diunggah</p>
              <p className="text-[11px]">Gunakan tombol + Upload untuk mengarsipkan sertifikat atau lisensi STKP.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {documents.map((doc) => (
                <div
                  key={doc.id ?? `doc-${doc.file_name || doc.created_at || Math.random()}`}
                  className="p-2 rounded-xl border border-[#E7E5E4] bg-[#FAF8F5] flex items-center justify-between text-xs hover:bg-stone-100/70 transition-colors duration-100"
                >
                  <div className="flex items-center gap-2 truncate pr-2">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[#E7E5E4] text-[#EA580C] flex items-center justify-center shrink-0 shadow-2xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="truncate min-w-0">
                      <p className="font-bold text-[#1C1917] text-xs truncate">
                        {doc.title || DOCUMENT_TYPE_LABELS[doc.document_type] || doc.file_name}
                      </p>
                      <span className="text-[10px] text-[#78716C] font-mono block">
                        {DOCUMENT_TYPE_LABELS[doc.document_type] || 'Dokumen'} •{' '}
                        <span className="tabular-nums">{formatBytes(doc.file_size)}</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openProtectedDoc(doc)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#D6D0C2] hover:bg-stone-50 text-[#1C1917] hover:text-[#EA580C] font-bold text-[11px] flex items-center gap-1 transition-colors duration-100 shadow-2xs cursor-pointer"
                      title="Buka Berkas PDF"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Lihat</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingDocId === doc.id}
                      className="p-1 rounded-lg text-stone-400 hover:text-red-600 transition-colors duration-100 cursor-pointer"
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
      ) : null}

      {/* 5. TOMBOL LOGOUT SESI OPERASIONAL */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm('Akhiri sesi operasional dan keluar dari sistem?')) {
            logout();
          }
        }}
        className="w-full py-2.5 rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-100 shadow-2xs cursor-pointer"
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Logout Sesi Operasional</span>
      </button>

      {/* Modal Edit Dossier & Kualifikasi */}
      {!isPureAdmin && (
        <PersonnelDossierEditModal
          isOpen={isEditDossierOpen}
          onClose={() => setIsEditDossierOpen(false)}
          personnel={activePersonnel}
          onSave={handleSaveDossierMobile}
          saving={savingDossier}
          isStaffAdmin={user?.role === 'admin'}
        />
      )}

      {/* Modal Ubah Kata Sandi */}
      <MobileChangePasswordModal
        isOpen={isPasswordOpen}
        onClose={() => setIsPasswordOpen(false)}
      />

      {/* Modal Upload Dokumen Sub-Dialog */}
      {isUploadDocOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-4 pb-8 safe-pb animate-in fade-in duration-100"
            onClick={() => {
              setIsUploadDocOpen(false);
              setUploadError(null);
            }}
          >
            <div
              className="w-full max-w-sm bg-white rounded-3xl border border-[#E7E5E4] p-4 space-y-3 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-tight">Upload Dokumen</h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadDocOpen(false);
                    setUploadError(null);
                  }}
                  className="text-stone-400 hover:text-stone-700 text-sm font-bold p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {uploadError && (
                <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{getErrorMessage(uploadError)}</span>
                </div>
              )}

              <form onSubmit={handleUploadDocument} className="space-y-2.5 text-xs">
                <div>
                  <label className="text-xs font-bold text-[#57534E] block mb-0.5">Jenis Dokumen *</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full p-2 border border-[#D6D0C2] rounded-xl bg-[#FAF8F5] text-[#1C1917] text-xs outline-none focus:border-[#EA580C] transition-colors duration-100"
                  >
                    <option value="lisensi_stkp">Lisensi STKP</option>
                    <option value="sertifikat_diklat">Sertifikat Diklat</option>
                    <option value="medical_checkup">Medical Check-up (MCU)</option>
                    <option value="sk_tugas">Surat Keputusan (SK)</option>
                    <option value="dokumen_lain">Dokumen Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#57534E] block mb-0.5">Judul Dokumen (Opsional)</label>
                  <input
                    type="text"
                    value={uploadDocTitle}
                    onChange={(e) => setUploadDocTitle(e.target.value)}
                    placeholder="Misal: Sertifikat Fire Commander 2026"
                    className="w-full p-2 border border-[#D6D0C2] rounded-xl bg-[#FAF8F5] text-[#1C1917] text-xs outline-none focus:border-[#EA580C] transition-colors duration-100"
                  >
                  </input>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#57534E] block mb-0.5">Berkas (PDF / Foto) *</label>
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    required
                    onChange={(e) => setUploadDocFile(e.target.files?.[0] || null)}
                    className="w-full p-1.5 border border-[#D6D0C2] rounded-xl bg-[#FAF8F5] text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#EDEAE2] file:text-[#1C1917] hover:file:bg-stone-300"
                  />
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploadDocOpen(false);
                      setUploadError(null);
                    }}
                    disabled={uploadingDoc}
                    className="flex-1 py-2 rounded-xl border border-[#D6D0C2] bg-white hover:bg-stone-50 text-[#57534E] font-bold text-xs transition-colors duration-100 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingDoc || !uploadDocFile}
                    className="flex-1 py-2 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{uploadingDoc ? 'Mengunggah...' : 'Unggah'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
