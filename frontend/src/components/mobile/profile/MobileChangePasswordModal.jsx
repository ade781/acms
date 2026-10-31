import React, { useState } from 'react';
import { X, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';

export default function MobileChangePasswordModal({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Semua kolom kata sandi wajib diisi');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal 6 karakter');
      return;
    }

    if (newPassword === '123456') {
      setError('Password baru tidak boleh menggunakan password bawaan (123456)');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password baru');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Error change password:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal mengubah password'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Key className="w-4 h-4 text-slate-700" />
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight">Ubah Kata Sandi</h4>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{typeof error === 'string' ? error : (error?.message || 'Gagal mengubah password')}</span>
          </div>
        )}

        {success && (
          <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>Password berhasil diperbarui!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2 text-xs">
          <div>
            <label className="text-xs font-bold text-slate-600 block mb-0.5">Password Lama</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Masukkan password saat ini"
              required
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-0.5">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              required
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-600 block mb-0.5">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang password baru"
              required
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:border-red-500 transition-colors duration-100"
            />
          </div>

          <div className="pt-1 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors duration-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100 flex items-center justify-center gap-1"
            >
              <span>{loading ? 'Menyimpan...' : 'Simpan Sandi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
