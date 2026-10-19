import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Shield,
  Award,
  Calendar,
  FileUp,
  Info,
  Edit3,
  Key,
  CheckCircle2,
  PenTool,
  Upload,
  Trash2,
  FileText,
  FileCheck,
  ExternalLink,
  Download,
  Settings,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { cleanTeam, formatTeam, TEAMS, OPERATIONAL_ROLES, formatRoleName, mapRankPositionToRole } from '../utils/shiftHelper';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';

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


export default function HalamanDetailPersonel() {
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
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('lisensi_stkp');
  const [docFile, setDocFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState(null);
  const [docSuccess, setDocSuccess] = useState(null);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [rankPosition, setRankPosition] = useState('');
  const [teamGroup, setTeamGroup] = useState('Alpha');
  const [certLevel, setCertLevel] = useState('Junior');
  const [certNumber, setCertNumber] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [formalEducation, setFormalEducation] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('organik');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deletingPersonnel, setDeletingPersonnel] = useState(false);

  const isOwner = Boolean(
    (user?.personnel_id && Number(user.personnel_id) === Number(id)) ||
    (user?.id && personnel?.user_id && Number(user.id) === Number(personnel.user_id)) ||
    (user?.name && personnel?.full_name && String(user.name).trim().toLowerCase() === String(personnel.full_name).trim().toLowerCase())
  );

  const canEdit = isOwner || isAdmin;
  const canUploadDoc = isOwner || isAdmin;


  const fetchPersonnelDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/personnel/${id}`);
      const data = res.data?.data || res.data?.personnel || res.data;
      setPersonnel(data);
      if (data) {
        setFullName(data.full_name || '');
        setNip(data.nip || '');
        setRankPosition(data.rank_position || '');
        setTeamGroup(cleanTeam(data.team_group) || 'Alpha');
        setCertLevel(data.cert_level || 'Junior');
        setCertNumber(data.cert_number || '');
        setCertExpiryDate(data.cert_expiry_date ? data.cert_expiry_date.split('T')[0] : '');
        setBirthDate(data.birth_date ? data.birth_date.split('T')[0] : '');
        setFormalEducation(data.formal_education || '');
        setEmploymentStatus(data.employment_status || 'organik');
      }
    } catch (err) {
      console.error('Error fetching personnel detail:', err);
      setError('Gagal memuat profil personel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonnelDetail();
  }, [id]);

  const handleUpdatePersonnel = async (e) => {
    e.preventDefault();
    setFormError(null);
    if (!fullName.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/personnel/${id}`, {
        nip: nip.trim() || '-',
        full_name: fullName.trim(),
        rank_position: rankPosition.trim() || '-',
        team_group: teamGroup,
        cert_level: certLevel,
        cert_number: certNumber.trim() || '-',
        cert_expiry_date: certExpiryDate || null,
        birth_date: birthDate || null,
        formal_education: formalEducation.trim() || '-',
        employment_status: employmentStatus,
      });

      setEditModalOpen(false);
      fetchPersonnelDetail();
    } catch (err) {
      console.error('Error updating personnel:', err);
      setFormError(err.response?.data?.message || err.message || 'Gagal memperbarui data personel.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePersonnel = async () => {
    if (!personnel) return;
    const confirmMsg = `PERINGATAN: Apakah Anda yakin ingin menghapus data anggota "${personnel.full_name}"?\n\nTindakan ini akan menghapus profil personel, seluruh dokumen fisik & catatan terkait, serta akun login yang terhubung. Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingPersonnel(true);
    try {
      await api.delete(`/personnel/${id}`);
      alert(`Personel ${personnel.full_name} berhasil dihapus.`);
      navigate('/personnel');
    } catch (err) {
      console.error('Error deleting personnel:', err);
      const errMsg = err.response?.data?.message || 'Gagal menghapus data personel.';
      alert(errMsg);
      setDeletingPersonnel(false);
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
      setSignatureError(err.response?.data?.message || err.message || 'Gagal mengunggah tanda tangan.');
    } finally {
      setUploadingSignature(false);
      e.target.value = '';
    }
  };

  const handleDeleteSignature = async () => {
    if (!window.confirm('Hapus spesimen tanda tangan digital resmi ini?')) return;

    setSignatureError(null);
    setSignatureSuccess(null);
    setUploadingSignature(true);
    try {
      await api.delete(`/personnel/${id}/signature`);
      setSignatureSuccess('Spesimen tanda tangan digital berhasil dihapus.');
      fetchPersonnelDetail();
    } catch (err) {
      console.error('Error delete signature:', err);
      setSignatureError(err.response?.data?.message || err.message || 'Gagal menghapus tanda tangan.');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setDocError('Silakan pilih berkas dokumen untuk diunggah (PDF atau gambar).');
      return;
    }

    setUploadingDoc(true);
    setDocError(null);
    setDocSuccess(null);

    const formData = new FormData();
    formData.append('document', docFile);
    formData.append('title', docTitle.trim() || docFile.name);
    formData.append('document_type', docType);

    try {
      await api.post(`/personnel/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDocSuccess('Dokumen berkas personel berhasil diunggah.');
      setUploadDocModalOpen(false);
      setDocTitle('');
      setDocFile(null);
      fetchPersonnelDetail();
    } catch (err) {
      console.error('Error upload document:', err);
      setDocError(err.response?.data?.message || err.message || 'Gagal mengunggah dokumen.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Hapus berkas dokumen ini dari profil personel?')) return;

    setDeletingDocId(docId);
    setDocError(null);
    setDocSuccess(null);
    try {
      await api.delete(`/personnel/${id}/documents/${docId}`);
      setDocSuccess('Berkas dokumen berhasil dihapus.');
      fetchPersonnelDetail();
    } catch (err) {
      console.error('Error delete document:', err);
      setDocError(err.response?.data?.message || err.message || 'Gagal menghapus dokumen.');
    } finally {
      setDeletingDocId(null);
    }
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

      <StateView loading={loading} error={error} onRetry={() => window.location.reload()}>
        {personnel && (
          <div className="space-y-6">
            {/* Header Identity Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-red-100 text-arff-primary flex items-center justify-center font-bold text-xl select-none">
                  {personnel.full_name?.charAt(0) || <User className="w-8 h-8" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">{personnel.full_name}</h2>
                    <Badge variant={`team${cleanTeam(personnel.team_group) || 'Alpha'}`} size="md">
                      {formatTeam(personnel.team_group || 'Alpha')}
                    </Badge>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-1">
                    {personnel.rank_position || 'Anggota Unit PKP-PK'}
                  </p>
                  <p className="text-xs font-mono text-slate-500 mt-0.5">
                    NIP: <span className="font-bold text-slate-800">{personnel.nip || '-'}</span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-col sm:items-end gap-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Status Kepegawaian</span>
                  <span className="text-xs font-bold text-slate-800 capitalize px-2.5 py-1 bg-slate-100 rounded-md">
                    {personnel.employment_status || 'Organik'}
                  </span>
                </div>

                {(isAdmin || isSupervisor) && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={handleDeletePersonnel}
                    loading={deletingPersonnel}
                  >
                    Hapus Anggota
                  </Button>
                )}
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* License & Certification */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                  <Award className="w-5 h-5 text-arff-primary" />
                  <h3 className="text-sm font-bold text-slate-900">Lisensi & Pendidikan</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Tingkat Lisensi:</span>
                    <Badge variant="info" size="sm">
                      {personnel.cert_level || 'Junior'} Fire Fighter
                    </Badge>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Nomor Registrasi Lisensi:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {personnel.cert_number || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Masa Berlaku Lisensi:</span>
                    <span className="font-medium text-slate-800">
                      {personnel.cert_expiry_date ? new Date(personnel.cert_expiry_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Tanggal Lahir:</span>
                    <span className="font-medium text-slate-800">
                      {personnel.birth_date ? new Date(personnel.birth_date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Pendidikan Terakhir:</span>
                    <span className="font-medium text-slate-800">
                      {personnel.formal_education || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status & Operational Records */}
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 mb-4">
                  <Shield className="w-5 h-5 text-sky-600" />
                  <h3 className="text-sm font-bold text-slate-900">Kedinasan & Akun</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Status Aktif Dinas:</span>
                    <span className="font-semibold text-emerald-700">Aktif Berdinas</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Kesesuaian Regu:</span>
                    <span className="font-bold text-slate-800">{formatTeam(personnel.team_group)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500">Username Login:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {personnel.username || '-'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100 items-center">
                    <span className="text-slate-500">Peran Sistem (Role):</span>
                    <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-800 border-slate-200">
                      {formatRoleName(personnel.user_role || personnel.rank_position)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Status Kata Sandi:</span>
                    <span
                      className={`font-semibold ${
                        personnel.must_change_password
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {personnel.must_change_password
                        ? 'Default (123456) - Belum Diganti'
                        : 'Aman (Telah Diubah Mandiri)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Alert Signature */}
            {signatureSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>{signatureSuccess}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSignatureSuccess(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {signatureError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
                <span>{signatureError}</span>
                <button
                  type="button"
                  onClick={() => setSignatureError(null)}
                  className="text-red-700 hover:text-red-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Kartu Spesimen Tanda Tangan Digital Resmi (Khusus Dept Head, Chief, Chief Assistant) */}
            {isEligibleForSignature && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-5 h-5 text-arff-primary" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Spesimen Tanda Tangan Digital Resmi</h3>
                      <p className="text-[11px] text-slate-500">
                        Khusus pimpinan operasional (Dept. Head, Chief, dan Chief Assistant) untuk pengesahan dokumen & dinas
                      </p>
                    </div>
                  </div>
                  {personnel.signature_url && (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Terverifikasi
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Kotak Pratinjau Tanda Tangan */}
                  <div className="w-full sm:w-64 h-32 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 flex items-center justify-center p-3 relative overflow-hidden">
                    {personnel.signature_url ? (
                      <img
                        src={personnel.signature_url}
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
                            onClick={handleDeleteSignature}
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

                    <span className="text-[11px] text-slate-400 block">
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
                  <span>{docSuccess}</span>
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
                <span>{docError}</span>
                <button
                  type="button"
                  onClick={() => setDocError(null)}
                  className="text-red-700 hover:text-red-900 font-bold px-2 py-1"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* Pengaturan Data Profil (Khusus Pemilik Profil atau Admin) */}
            {canEdit && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-xs shrink-0">
                    <Settings className="w-5 h-5 text-arff-primary" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Pengaturan Data Profil</h4>
                    <p className="text-[11px] text-slate-500">
                      Perbarui NIP, nomor registrasi lisensi STKP, masa berlaku lisensi, tanggal lahir, dan pendidikan
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Settings}
                  onClick={() => setEditModalOpen(true)}
                  className="bg-white border-slate-300 hover:bg-slate-100 shrink-0"
                >
                  Edit Data Profil
                </Button>
              </div>
            )}

            {/* Kartu Berkas & Dokumen Personel */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-arff-primary" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Berkas & Dokumen Personel</h3>
                    <p className="text-[11px] text-slate-500">
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
                      setDocTitle('');
                      setDocFile(null);
                      setUploadDocModalOpen(true);
                    }}
                  >
                    Unggah Dokumen
                  </Button>
                )}
              </div>

              {personnel.documents && personnel.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {personnel.documents.map((doc) => {
                    const canDeleteThisDoc = isAdmin || isOwner;

                    return (
                      <div
                        key={doc.id}
                        className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors duration-100 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-red-100 text-arff-primary flex items-center justify-center shrink-0 mt-0.5">
                              <FileCheck className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 truncate" title={doc.title}>
                                {doc.title}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <Badge variant="info" size="sm">
                                  {DOCUMENT_TYPE_LABELS[doc.document_type] || doc.document_type}
                                </Badge>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {formatBytes(doc.file_size)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/70 text-[11px] text-slate-500 flex-wrap gap-2">
                          <span title={doc.created_at ? new Date(doc.created_at).toLocaleString('id-ID') : ''}>
                            {doc.created_at ? new Date(doc.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                            {doc.uploader_name && ` • Oleh ${doc.uploader_name}`}
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={doc.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors duration-100"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              <span>Lihat / Unduh</span>
                            </a>

                            {canDeleteThisDoc && (
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                disabled={deletingDocId === doc.id}
                                className="inline-flex items-center gap-1 p-1 rounded-md text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors duration-100 disabled:opacity-50"
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
                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
                  <FileUp className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">
                    Belum ada berkas atau dokumen yang diunggah untuk personel ini.
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
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
                        setDocTitle('');
                        setDocFile(null);
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

            {/* Info Pengisian Mandiri */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-xs text-slate-600 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />
                <span>
                  Personel dapat melengkapi data profil masing-masing (NIP, Jabatan, Nomor Lisensi, Tanggal Lahir, dan Pendidikan Terakhir) secara mandiri dengan menekan tombol <strong>"Lengkapi / Edit Profil"</strong> di atas.
                </span>
              </div>
            </div>
          </div>
        )}
      </StateView>


      {/* Modal Edit Data Personel */}
      {editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Lengkapi & Perbarui Data Personel"
          subtitle="Isi atau perbarui data kepegawaian, nomor lisensi, tanggal lahir, dan pendidikan"
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                {(isAdmin || isSupervisor) && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={Trash2}
                    onClick={handleDeletePersonnel}
                    loading={deletingPersonnel}
                    disabled={saving}
                  >
                    Hapus Anggota
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={saving || deletingPersonnel}>
                  Batal
                </Button>
                <Button variant="primary" onClick={handleUpdatePersonnel} loading={saving} disabled={deletingPersonnel}>
                  Simpan Profil
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleUpdatePersonnel} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Nama Lengkap & Gelar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!isAdmin}
                required
              />

              <InputField
                label="NIP (Nomor Induk Pegawai)"
                placeholder="Contoh: 20240123 atau -"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Jabatan Operasional (Role)"
                id="rankPosition"
                value={rankPosition}
                onChange={(e) => setRankPosition(e.target.value)}
                options={OPERATIONAL_ROLES.map((r) => ({
                  value: r.rank_position,
                  label: r.label,
                }))}
                required
                disabled={!isAdmin && !isSupervisor}
              />

              <SelectField
                label="Regu Kedinasan"
                value={teamGroup}
                onChange={(e) => setTeamGroup(e.target.value)}
                options={TEAMS.map((t) => ({ value: cleanTeam(t), label: formatTeam(t) }))}
                disabled={!isAdmin && !isSupervisor}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Tingkat Lisensi PKP-PK"
                value={certLevel}
                onChange={(e) => setCertLevel(e.target.value)}
                options={[
                  { value: 'Basic', label: 'Basic Fire Fighter' },
                  { value: 'Junior', label: 'Junior Fire Fighter' },
                  { value: 'Senior', label: 'Senior Fire Fighter' },
                ]}
              />

              <InputField
                label="Nomor Registrasi Lisensi"
                placeholder="Contoh: LIS-ARFF-2024-001 atau -"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Masa Berlaku Lisensi"
                type="date"
                value={certExpiryDate}
                onChange={(e) => setCertExpiryDate(e.target.value)}
              />

              <InputField
                label="Tanggal Lahir"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Pendidikan Terakhir"
                placeholder="Contoh: SMA/SMK, D3 Penerbangan, S1"
                value={formalEducation}
                onChange={(e) => setFormalEducation(e.target.value)}
              />

              <SelectField
                label="Status Kepegawaian"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                options={[
                  { value: 'organik', label: 'Organik (Karyawan Tetap)' },
                  { value: 'outsourcing', label: 'Outsourcing / Kontrak' },
                ]}
                disabled={!isAdmin && !isSupervisor}
              />
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Unggah Berkas & Dokumen Personel */}
      {uploadDocModalOpen && (
        <Modal
          isOpen={uploadDocModalOpen}
          onClose={() => {
            if (!uploadingDoc) setUploadDocModalOpen(false);
          }}
          title="Unggah Berkas & Dokumen Personel"
          subtitle="Tambahkan salinan lisensi STKP, sertifikat diklat, atau dokumen kesehatan"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setUploadDocModalOpen(false)}
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
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {docError}
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
                  id="documentFileInput"
                  accept=".pdf,image/png,image/jpeg,image/webp"
                  onChange={(e) => setDocFile(e.target.files[0] || null)}
                  className="hidden"
                  disabled={uploadingDoc}
                />
                <label
                  htmlFor="documentFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center gap-1.5"
                >
                  <Upload className="w-6 h-6 text-slate-400" />
                  <span className="text-xs font-semibold text-arff-primary hover:underline">
                    {docFile ? docFile.name : 'Pilih berkas dari perangkat'}
                  </span>
                  <span className="text-[11px] text-slate-400">
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
      )}
    </div>
  );
}

