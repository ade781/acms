import React from 'react';
import { Edit3, Award, Save } from 'lucide-react';

/**
 * Komponen Inline Form Edit Profil & Kredensial STKP
 */
export default function ProfileEditCard({
  isOpen,
  onClose,
  activeUser,
  editFormData,
  setEditFormData,
  onSubmit,
  savingProfile,
  onOpenDossier
}) {
  if (!isOpen) return null;

  return (
    <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2 text-slate-900 font-bold text-xs uppercase tracking-wider">
          <Edit3 className="w-4 h-4 text-slate-700" />
          <span>Edit Data Profil & Kredensial STKP</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-600 hover:text-slate-900 text-xs font-bold px-2 py-1"
        >
          Batal
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 text-xs">
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

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-slate-200">
          <button
            type="button"
            onClick={onOpenDossier}
            className="px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 transition-colors duration-100"
          >
            <Award className="w-3.5 h-3.5 text-emerald-700" />
            <span>Edit 11 Kompetensi & Diklat (Dossier Lengkap) →</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
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
        </div>
      </form>
    </div>
  );
}

