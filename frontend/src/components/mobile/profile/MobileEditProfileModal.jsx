import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import api from '../../../services/api';

export default function MobileEditProfileModal({ isOpen, onClose, personnel, onSuccess }) {
  const [formData, setFormData] = useState({
    nip: '',
    birth_place: '',
    birth_date: '',
    formal_education: '',
    cert_level: 'Junior',
    cert_number: '',
    cert_expiry_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (personnel && isOpen) {
      let rawCert = personnel.cert_level || 'Junior';
      if (rawCert.includes('Senior')) rawCert = 'Senior';
      else if (rawCert.includes('Junior')) rawCert = 'Junior';
      else if (rawCert.includes('Basic')) rawCert = 'Basic';

      setFormData({
        nip: personnel.nip || '',
        birth_place: personnel.birth_place || '',
        birth_date: personnel.birth_date ? personnel.birth_date.split('T')[0] : '',
        formal_education: personnel.formal_education || '',
        cert_level: rawCert,
        cert_number: personnel.cert_number || '',
        cert_expiry_date: personnel.cert_expiry_date ? personnel.cert_expiry_date.split('T')[0] : '',
      });
      setError(null);
    }
  }, [personnel, isOpen]);

  if (!isOpen || !personnel) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      nip: formData.nip,
      birth_place: formData.birth_place || null,
      birth_date: formData.birth_date || null,
      formal_education: formData.formal_education,
      cert_level: formData.cert_level,
      cert_number: formData.cert_number,
      cert_expiry_date: formData.cert_expiry_date || null,
    };

    try {
      try {
        await api.put('/auth/profile', payload);
      } catch (errAuth) {
        if (personnel?.id) {
          await api.put(`/personnel/${personnel.id}`, payload);
        } else {
          throw errAuth;
        }
      }

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error update profile:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memperbarui data profil'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Edit Data Mandiri</h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{typeof error === 'string' ? error : (error?.message || 'Gagal memperbarui data profil')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nama Lengkap (Terkunci)</label>
            <input
              type="text"
              value={personnel.full_name || personnel.name || ''}
              disabled
              className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-bold outline-none cursor-not-allowed text-xs transition-colors duration-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">NIP</label>
            <input
              type="text"
              name="nip"
              value={formData.nip}
              onChange={handleChange}
              placeholder="NIP Personel"
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:border-red-500 transition-colors duration-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tempat Lahir</label>
              <input
                type="text"
                name="birth_place"
                value={formData.birth_place}
                onChange={handleChange}
                placeholder="Kota Kelahiran"
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Tanggal Lahir</label>
              <input
                type="date"
                name="birth_date"
                value={formData.birth_date}
                onChange={handleChange}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:border-red-500 transition-colors duration-100"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Pendidikan Terakhir</label>
            <input
              type="text"
              name="formal_education"
              value={formData.formal_education}
              onChange={handleChange}
              placeholder="Contoh: SMA/SMK, D3 Teknik, S1"
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Kualifikasi / Tingkat Lisensi STKP</label>
            <select
              name="cert_level"
              value={formData.cert_level}
              onChange={handleChange}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
            >
              <option value="Basic">Basic Fire Fighter</option>
              <option value="Junior">Junior Fire Fighter</option>
              <option value="Senior">Senior Fire Fighter</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Nomor Registrasi STKP</label>
              <input
                type="text"
                name="cert_number"
                value={formData.cert_number}
                onChange={handleChange}
                placeholder="STKP-YYYY-XXX"
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:border-red-500 transition-colors duration-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Masa Berlaku Lisensi</label>
              <input
                type="date"
                name="cert_expiry_date"
                value={formData.cert_expiry_date}
                onChange={handleChange}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:border-red-500 transition-colors duration-100"
              />
            </div>
          </div>

          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors duration-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100 flex items-center justify-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
