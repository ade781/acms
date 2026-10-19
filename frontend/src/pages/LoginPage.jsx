import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import InputField from '../components/common/InputField';
import Button from '../components/common/Button';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError('Silakan masukkan username dan password Anda.');
      return;
    }

    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Kombinasi username atau password tidak cocok.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-4">
          <Logo className="h-12 w-12" subtitle="Sistem Monitoring Operasional ARFF" />
        </div>
        <h2 className="text-center text-xl font-bold tracking-tight text-slate-900">
          Masuk ke Sistem Operasional ARFF
        </h2>
        <p className="mt-1 text-center text-xs text-slate-600">
          Monitoring Kesiapan Armada, Personel, dan Penugasan Shift
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <InputField
              label="Username"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username Anda..."
              icon={User}
              required
              autoFocus
            />

            <InputField
              label="Password"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password Anda..."
              icon={Lock}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full"
              >
                Masuk ke Sistem
              </Button>
            </div>
          </form>

          {/* Quick Access Info for Testing */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <div className="text-[11px] text-slate-500 font-medium">
              Akun Administrator Awal:
            </div>
            <div className="mt-1 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded text-xs font-mono text-slate-800">
              <span>User: <strong>aaa</strong></span>
              <span>|</span>
              <span>Pass: <strong>aaaaaa</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
