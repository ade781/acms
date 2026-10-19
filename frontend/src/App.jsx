import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Halaman / Pages
import HalamanLogin from './pages/HalamanLogin';
import HalamanDashboard from './pages/HalamanDashboard';
import HalamanPersonel from './pages/HalamanPersonel';
import HalamanDetailPersonel from './pages/HalamanDetailPersonel';
import HalamanKesiapanKendaraan from './pages/HalamanKesiapanKendaraan';
import HalamanKesiapanWatchroom from './pages/HalamanKesiapanWatchroom';
import HalamanPenugasan from './pages/HalamanPenugasan';
import HalamanInsiden from './pages/HalamanInsiden';
import HalamanDetailInsiden from './pages/HalamanDetailInsiden';
import HalamanKegiatan from './pages/HalamanKegiatan';
import HalamanLaporan from './pages/HalamanLaporan';
import HalamanPengaturan from './pages/HalamanPengaturan';

// Protected Route Component
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Menghubungkan ke Sesi Operasional...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

// Redirect root to dashboard or login
function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<HalamanLogin />} />

          {/* Root redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Authenticated Layout Routes */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<HalamanDashboard />} />
            <Route path="/deployment" element={<HalamanPenugasan />} />
            <Route path="/readiness/vehicles" element={<HalamanKesiapanKendaraan />} />
            <Route path="/readiness/watchroom" element={<Navigate to="/readiness/vehicles" replace />} />
            <Route path="/personnel" element={<HalamanPersonel />} />
            <Route path="/personnel/:id" element={<HalamanDetailPersonel />} />
            <Route path="/incidents" element={<HalamanInsiden />} />
            <Route path="/incidents/:id" element={<HalamanDetailInsiden />} />
            <Route path="/activities" element={<HalamanKegiatan />} />
            <Route path="/reports" element={<HalamanLaporan />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute adminOnly>
                  <HalamanPengaturan />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
