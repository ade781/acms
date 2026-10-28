import React, { useState } from 'react';
import { KeyRound, ShieldAlert, AlertCircle, CheckCircle2, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Button from '../common/Button';
import { getErrorMessage } from '../../utils/errorHelper';

export default function MandatoryPasswordChangeModal({ isOpen }) {
  const { user, refreshUser, logout } = useAuth();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Seluruh kolom password wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password baru minimal terdiri dari 6 karakter.');
      return;
    }

    if (newPassword === '123456') {
      setError('Password baru tidak boleh menggunakan password default (123456). Silakan buat password yang aman.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/change-password', {
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccess(true);
      setTimeout(async () => {
        await refreshUser();
      }, 1000);
    } catch (err) {
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal mengubah password.'));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 sm:p-7 relative">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200 mb-5">
          <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Aktivasi Akun & Ubah Password
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Halo, <strong className="text-slate-800">{user?.name || user?.username}</strong>
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900">Password Berhasil Diperbarui</h4>
            <p className="text-xs text-slate-600">
              Akun Anda telah aktif. Mengalihkan ke sistem operasional...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                Demi keamanan sistem operasional ARFF, Anda diwajibkan mengganti password awal (123456) sebelum dapat menggunakan aplikasi.
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{getErrorMessage(error, 'Gagal memperbarui password.')}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Saat Ini (Default: 123456)
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Masukkan 123456"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[42px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Baru (Minimal 6 Karakter)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Buat password baru yang aman"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[42px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ulangi Password Baru
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ketik ulang password baru"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[42px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-slate-100 transition-colors duration-100"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="flex-1"
              >
                Simpan Password Baru
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
