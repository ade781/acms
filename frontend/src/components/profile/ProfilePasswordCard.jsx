import React, { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Komponen Form Ubah Kata Sandi Akun
 */
export default function ProfilePasswordCard({
  isOpen,
  onClose,
  onSuccess,
  onError
}) {
  const { refreshUser } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  if (!isOpen) return null;

  const handleSavePassword = async (e) => {
    e.preventDefault();
    onError(null);
    onSuccess(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      onError('Semua kolom kata sandi wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      onError('Password baru minimal terdiri dari 6 karakter.');
      return;
    }

    if (newPassword === '123456') {
      onError('Password baru tidak boleh menggunakan password default (123456).');
      return;
    }

    if (newPassword !== confirmPassword) {
      onError('Konfirmasi password tidak cocok dengan password baru.');
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      onSuccess('Kata sandi akun Anda berhasil diperbarui!');
      onClose();
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refreshUser();
    } catch (err) {
      console.error('Error change password:', err);
      onError(err.response?.data?.message || err.message || 'Gagal memperbarui password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-amber-200">
        <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
          <KeyRound className="w-4 h-4 text-amber-700" />
          <span>Ubah Kata Sandi Akun</span>
        </div>
        <button
          type="button"
          onClick={onClose}
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
            onClick={onClose}
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
  );
}

