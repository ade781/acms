import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  User,
  Award,
  Compass,
  Check,
  AlertCircle,
} from 'lucide-react';
import { ALL_ADDITIONAL_COMPETENCIES } from './PersonnelDossier';
import { getErrorMessage } from '../../utils/errorHelper';

export default function PersonnelDossierEditModal({
  isOpen,
  onClose,
  personnel,
  onSave,
  saving = false,
  isStaffAdmin = false,
}) {
  const [activeTab, setActiveTab] = useState('identity');
  const [errorMsg, setErrorMsg] = useState(null);

  const [formData, setFormData] = useState({
    nip: '',
    full_name: '',
    birth_place: '',
    birth_date: '',
    tmt_date: '',
    employment_status: 'organik',
    formal_education: '',
    recognized_education: '',
    cert_level: 'Junior',
    cert_number: '',
    cert_expiry_date: '',
    basic_lemdik: '',
    basic_cert_number: '',
    junior_lemdik: '',
    junior_cert_number: '',
    senior_lemdik: '',
    senior_cert_number: '',
    salvage_license_number: '',
    salvage_expiry_date: '',
    refreshing_cert_number: '',
    refreshing_date: '',
    salvage_refreshing_cert_number: '',
    salvage_refreshing_date: '',
    additional_competencies: [],
  });

  const formatDateForInput = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (personnel && isOpen) {
      let comps = personnel.additional_competencies;
      if (typeof comps === 'string') {
        try { comps = JSON.parse(comps); } catch { comps = []; }
      }
      if (!Array.isArray(comps)) comps = [];

      setFormData({
        nip: personnel.nip || '',
        full_name: personnel.full_name || '',
        birth_place: personnel.birth_place || '',
        birth_date: formatDateForInput(personnel.birth_date),
        tmt_date: formatDateForInput(personnel.tmt_date),
        employment_status: personnel.employment_status || 'organik',
        formal_education: personnel.formal_education || '',
        recognized_education: personnel.recognized_education || '',
        cert_level: personnel.cert_level || 'Junior',
        cert_number: personnel.cert_number || '',
        cert_expiry_date: formatDateForInput(personnel.cert_expiry_date),
        basic_lemdik: personnel.basic_lemdik || '',
        basic_cert_number: personnel.basic_cert_number || '',
        junior_lemdik: personnel.junior_lemdik || '',
        junior_cert_number: personnel.junior_cert_number || '',
        senior_lemdik: personnel.senior_lemdik || '',
        senior_cert_number: personnel.senior_cert_number || '',
        salvage_license_number: personnel.salvage_license_number || '',
        salvage_expiry_date: formatDateForInput(personnel.salvage_expiry_date),
        refreshing_cert_number: personnel.refreshing_cert_number || '',
        refreshing_date: formatDateForInput(personnel.refreshing_date),
        salvage_refreshing_cert_number: personnel.salvage_refreshing_cert_number || '',
        salvage_refreshing_date: formatDateForInput(personnel.salvage_refreshing_date),
        additional_competencies: comps,
      });
      setErrorMsg(null);
    }
  }, [personnel, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCompetency = (comp) => {
    setFormData((prev) => {
      const exists = prev.additional_competencies.includes(comp);
      const updated = exists
        ? prev.additional_competencies.filter((c) => c !== comp)
        : [...prev.additional_competencies, comp];
      return { ...prev, additional_competencies: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await onSave(formData);
    } catch (err) {
      console.error('Error saving dossier:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan perubahan.'));
      setErrorMsg(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Edit Dossier & Kualifikasi Personel
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {personnel?.full_name} {personnel?.nip ? `(NIP: ${personnel.nip})` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors duration-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-white px-3 pt-2 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('identity')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors duration-100 cursor-pointer shrink-0 ${
              activeTab === 'identity'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Identitas & Kepegawaian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('licenses')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors duration-100 cursor-pointer shrink-0 ${
              activeTab === 'licenses'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>STKP & Salvage</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('competencies')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors duration-100 cursor-pointer shrink-0 ${
              activeTab === 'competencies'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>11 Kompetensi ({formData.additional_competencies.length})</span>
          </button>
        </div>

        {/* Form Body with Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{getErrorMessage(errorMsg, 'Gagal menyimpan perubahan berkas.')}</span>
            </div>
          )}

          {/* TAB 1: IDENTITAS & KEPEGAWAIAN */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isStaffAdmin && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Nama Lengkap</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                    />
                  </div>
                )}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">NIP</label>
                  <input
                    type="text"
                    name="nip"
                    value={formData.nip}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono transition-colors duration-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tempat Lahir</label>
                  <input
                    type="text"
                    name="birth_place"
                    value={formData.birth_place}
                    onChange={handleChange}
                    placeholder="Contoh: Kulon Progo"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                  <input
                    type="date"
                    name="birth_date"
                    value={formData.birth_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">TMT Karyawan (Mulai Tugas)</label>
                  <input
                    type="date"
                    name="tmt_date"
                    value={formData.tmt_date}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                  />
                </div>
                {isStaffAdmin && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Status Kepegawaian</label>
                    <select
                      name="employment_status"
                      value={formData.employment_status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                    >
                      <option value="organik">Organik</option>
                      <option value="aps">APS</option>
                      <option value="kontrak">Kontrak</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Pendidikan Dimiliki</label>
                  <input
                    type="text"
                    name="formal_education"
                    value={formData.formal_education}
                    onChange={handleChange}
                    placeholder="Contoh: S1 Teknik Elektro, SMA IPA"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Pendidikan Diakui</label>
                  <input
                    type="text"
                    name="recognized_education"
                    value={formData.recognized_education}
                    onChange={handleChange}
                    placeholder="Pendidikan yang diakui manajemen"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LISENSI STKP & SALVAGE */}
          {activeTab === 'licenses' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                <span className="font-bold text-amber-900 block mb-2">Lisensi STKP Utama</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Rating STKP</label>
                    <select
                      name="cert_level"
                      value={formData.cert_level}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                    >
                      <option value="Basic">Basic</option>
                      <option value="Junior">Junior</option>
                      <option value="Senior">Senior</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Nomor Lisensi STKP</label>
                    <input
                      type="text"
                      name="cert_number"
                      value={formData.cert_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Masa Berlaku STKP</label>
                    <input
                      type="date"
                      name="cert_expiry_date"
                      value={formData.cert_expiry_date}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors duration-100"
                    />
                  </div>
                </div>
              </div>

              {/* Basic, Junior, Senior Jenjang */}
              <div className="space-y-3 pt-2">
                <span className="font-bold text-slate-800 block">Riwayat Jenjang Kualifikasi STKP</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Lemdik Basic</label>
                    <input
                      type="text"
                      name="basic_lemdik"
                      value={formData.basic_lemdik}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">No. Sertifikat Basic</label>
                    <input
                      type="text"
                      name="basic_cert_number"
                      value={formData.basic_cert_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Lemdik Junior</label>
                    <input
                      type="text"
                      name="junior_lemdik"
                      value={formData.junior_lemdik}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">No. Sertifikat Junior</label>
                    <input
                      type="text"
                      name="junior_cert_number"
                      value={formData.junior_cert_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Lemdik Senior</label>
                    <input
                      type="text"
                      name="senior_lemdik"
                      value={formData.senior_lemdik}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">No. Sertifikat Senior</label>
                    <input
                      type="text"
                      name="senior_cert_number"
                      value={formData.senior_cert_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Salvage & General Refreshing */}
              <div className="space-y-3 pt-2">
                <span className="font-bold text-slate-800 block">Salvage & General Refreshing</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Nomor Lisensi Salvage</label>
                    <input
                      type="text"
                      name="salvage_license_number"
                      value={formData.salvage_license_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Masa Berlaku Salvage</label>
                    <input
                      type="date"
                      name="salvage_expiry_date"
                      value={formData.salvage_expiry_date}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">No. Sertifikat Refreshing Salvage</label>
                    <input
                      type="text"
                      name="salvage_refreshing_cert_number"
                      value={formData.salvage_refreshing_cert_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Tanggal Refreshing Salvage</label>
                    <input
                      type="date"
                      name="salvage_refreshing_date"
                      value={formData.salvage_refreshing_date}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">No. Sertifikat Refreshing STKP</label>
                    <input
                      type="text"
                      name="refreshing_cert_number"
                      value={formData.refreshing_cert_number}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[11px] mb-1">Tanggal / Tahun Refreshing</label>
                    <input
                      type="date"
                      name="refreshing_date"
                      value={formData.refreshing_date}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 11 KOMPETENSI TAMBAHAN (1-TAP CHIP TOGGLE) */}
          {activeTab === 'competencies' && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="font-semibold text-slate-800 block text-xs">
                  Sentuh / Klik chip untuk memilih kompetensi yang dimiliki (1-Tap Toggle)
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Dipilih: {formData.additional_competencies.length} dari {ALL_ADDITIONAL_COMPETENCIES.length} kompetensi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {ALL_ADDITIONAL_COMPETENCIES.map((comp) => {
                  const isChecked = formData.additional_competencies.includes(comp);
                  return (
                    <button
                      key={comp}
                      type="button"
                      onClick={() => toggleCompetency(comp)}
                      className={`flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-colors duration-100 ${
                        isChecked
                          ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 bg-slate-100'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`font-semibold ${isChecked ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {comp}
                        </span>
                      </div>
                      <span className={`text-[10px] font-semibold ${isChecked ? 'text-emerald-700' : 'text-slate-400'}`}>
                        {isChecked ? 'Dimiliki' : 'Belum'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Form Action */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-100 cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors duration-100 cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Kualifikasi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
