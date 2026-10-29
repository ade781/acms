import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  KeyRound,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Award,
  BookOpen,
  Hash,
  Clock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatTeam, formatRoleName, formatIndoDate } from '../../utils/shiftHelper';
import PersonnelDossier from '../personnel/PersonnelDossier';
import PersonnelDossierEditModal from '../personnel/PersonnelDossierEditModal';
import ProfilePasswordCard from './ProfilePasswordCard';
import ProfileEditCard from './ProfileEditCard';
import ProfileDocumentsCard from './ProfileDocumentsCard';

const formatDateIndo = (dateStr) => formatIndoDate(dateStr, { day: 'numeric', month: 'short', year: 'numeric' });

export default function DesktopProfileModal({ isOpen, onClose }) {
  const { user, token, refreshUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sub-forms toggle
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
          <ProfilePasswordCard
            isOpen={isChangingPassword}
            onClose={() => setIsChangingPassword(false)}
            onSuccess={setFeedbackSuccess}
            onError={setFeedbackError}
          />

          {/* Form Edit Data Profil (Inline Card/Dropdown) */}
          <ProfileEditCard
            isOpen={isEditingProfile && !isPureAdmin}
            onClose={() => setIsEditingProfile(false)}
            activeUser={activeUser}
            editFormData={editFormData}
            setEditFormData={setEditFormData}
            onSubmit={handleSaveProfile}
            savingProfile={savingProfile}
            onOpenDossier={() => {
              setIsEditingProfile(false);
              setIsEditingDossier(true);
            }}
          />

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
                {!isPureAdmin && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDossier(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 text-xs font-semibold flex items-center gap-1.5 transition-colors duration-100 shadow-2xs focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
                  >
                    <Award className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Edit Kualifikasi & Kompetensi</span>
                  </button>
                )}
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
          <ProfileDocumentsCard
            documents={documents}
            setDocuments={setDocuments}
            personnelId={profileData?.personnel_id || personnelId}
            isPureAdmin={isPureAdmin}
            token={token}
            formatDateIndo={formatDateIndo}
            onSuccess={setFeedbackSuccess}
            onError={setFeedbackError}
            reloadProfile={loadData}
          />
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
