import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Halaman / Pages Desktop
import HalamanLogin from './pages/HalamanLogin';
import HalamanDashboard from './pages/HalamanDashboard';
import HalamanPersonel from './pages/HalamanPersonel';
import HalamanDetailPersonel from './pages/HalamanDetailPersonel';
import HalamanKesiapanKendaraan from './pages/HalamanKesiapanKendaraan';
import HalamanPenugasan from './pages/HalamanPenugasan';
import HalamanInsiden from './pages/HalamanInsiden';
import HalamanDetailInsiden from './pages/HalamanDetailInsiden';
import HalamanCuti from './pages/HalamanCuti';
import HalamanKegiatan from './pages/HalamanKegiatan';
import HalamanLaporan from './pages/HalamanLaporan';
import HalamanJadwal from './pages/HalamanJadwal';
import HalamanPengumuman from './pages/HalamanPengumuman';
import HalamanKelolaPejabat from './pages/HalamanKelolaPejabat';

// Dynamic Loaders untuk Halaman Laporan Khusus
const pageModules = import.meta.glob([
  './pages/HalamanLaporanArmada.jsx',
  './pages/HalamanLaporanInsiden.jsx',
]);

const HalamanLaporanArmada = React.lazy(
  pageModules['./pages/HalamanLaporanArmada.jsx'] ||
    (() =>
      Promise.resolve({
        default: () => (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-base font-bold text-slate-800 mb-1">Laporan Kesiapan Armada</h3>
            <p className="text-xs text-slate-500">Memuat komponen laporan kelaikan armada...</p>
          </div>
        ),
      }))
);

const HalamanLaporanInsiden = React.lazy(
  pageModules['./pages/HalamanLaporanInsiden.jsx'] ||
    (() =>
      Promise.resolve({
        default: () => (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-base font-bold text-slate-800 mb-1">Laporan Rekapitulasi Insiden</h3>
            <p className="text-xs text-slate-500">Memuat komponen laporan rekapitulasi insiden...</p>
          </div>
        ),
      }))
);

// Mobile Layout & Halaman Mobile (Operasional Lapangan)
import MobileLayout from './components/mobile/MobileLayout';
import MobileDashboard from './pages/mobile/MobileDashboard';
import MobilePloting from './pages/mobile/MobilePloting';
import MobileKegiatan from './pages/mobile/MobileKegiatan';
import MobileInsiden from './pages/mobile/MobileInsiden';
import MobileLaporan from './pages/mobile/MobileLaporan';

// Protected Route Component (Mendukung Guard Role Operasional ARFF)
function ProtectedRoute({ children, adminOnly = false, allowedRoles = null }) {
  const { user, loading, isAdmin, isRole } = useAuth();

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

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const hasAllowedRole = isRole(...allowedRoles);
    if (!hasAllowedRole && !isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

// Redirect root to dashboard or login according to user role
function RootRedirect() {
  const { user, loading, isRole } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const isFieldRole = isRole(
    'chief',
    'chief_assistant',
    'operation_chief',
    'senior_firefighter',
    'junior_firefighter'
  );

  return isFieldRole ? <Navigate to="/m/dashboard" replace /> : <Navigate to="/dashboard" replace />;
}

// Guard untuk rute portal desktop: role lapangan dialihkan ke antarmuka mobile secara default
function DesktopRoute({ children }) {
  const { isRole } = useAuth();
  const isFieldRole = isRole(
    'chief',
    'chief_assistant',
    'operation_chief',
    'senior_firefighter',
    'junior_firefighter'
  );

  const search = window.location.search;
  if (isFieldRole && !search.includes('view=desktop')) {
    return <Navigate to="/m/dashboard" replace />;
  }

  return children;
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

          {/* Mobile Shell Routes (Role Lapangan & Mobile First) */}
          <Route
            path="/m"
            element={
              <ProtectedRoute>
                <MobileLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<MobileDashboard />} />
            <Route
              path="ploting"
              element={
                <MobilePloting
                  onOpenCutiModal={() =>
                    window.dispatchEvent(new CustomEvent('arff:open-leave-modal'))
                  }
                />
              }
            />
            <Route path="kegiatan" element={<MobileKegiatan />} />
            <Route path="insiden" element={<MobileInsiden />} />
            <Route path="laporan" element={<MobileLaporan />} />
          </Route>

          {/* Authenticated Desktop Layout Routes */}
          <Route
            element={
              <ProtectedRoute>
                <DesktopRoute>
                  <AppLayout />
                </DesktopRoute>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<HalamanDashboard />} />
            <Route path="/schedules" element={<HalamanJadwal />} />
            <Route path="/announcements" element={<HalamanPengumuman />} />
            <Route path="/deployment" element={<HalamanPenugasan />} />
            <Route path="/readiness/vehicles" element={<HalamanKesiapanKendaraan />} />
            <Route path="/readiness/watchroom" element={<Navigate to="/readiness/vehicles" replace />} />
            <Route
              path="/armada/laporan"
              element={
                <React.Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-600">Memuat Laporan Kesiapan Armada...</div>}>
                  <HalamanLaporanArmada />
                </React.Suspense>
              }
            />
            <Route
              path="/insiden/laporan"
              element={
                <React.Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-600">Memuat Laporan Rekap Insiden...</div>}>
                  <HalamanLaporanInsiden />
                </React.Suspense>
              }
            />
            <Route path="/personnel" element={<HalamanPersonel />} />
            <Route path="/personnel/officials" element={<HalamanKelolaPejabat />} />
            <Route path="/personnel/:id" element={<HalamanDetailPersonel />} />
            <Route path="/incidents" element={<HalamanInsiden />} />
            <Route path="/incidents/:id" element={<HalamanDetailInsiden />} />
            <Route path="/leave" element={<HalamanCuti />} />
            <Route path="/activities" element={<HalamanKegiatan />} />
            <Route path="/reports" element={<HalamanLaporan />} />
            <Route path="/settings" element={<Navigate to="/readiness/vehicles" replace />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

