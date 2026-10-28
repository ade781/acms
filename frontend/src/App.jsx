import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import MobileLayout from './components/mobile/MobileLayout';

// Desktop Pages (Lazy Loaded)
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PersonnelPage = lazy(() => import('./pages/PersonnelPage'));
const PersonnelDetailPage = lazy(() => import('./pages/PersonnelDetailPage'));
const VehicleReadinessPage = lazy(() => import('./pages/VehicleReadinessPage'));
const DeploymentPage = lazy(() => import('./pages/DeploymentPage'));
const IncidentsPage = lazy(() => import('./pages/IncidentsPage'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage'));
const LeaveManagementPage = lazy(() => import('./pages/LeaveManagementPage'));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage'));
const ShiftReportsPage = lazy(() => import('./pages/ShiftReportsPage'));
const RosterSchedulePage = lazy(() => import('./pages/RosterSchedulePage'));
const AnnouncementsPage = lazy(() => import('./pages/AnnouncementsPage'));
const OfficialsManagementPage = lazy(() => import('./pages/OfficialsManagementPage'));

// Dynamic Loaders untuk Halaman Laporan Khusus
const pageModules = import.meta.glob([
  './pages/VehicleReportsPage.jsx',
  './pages/IncidentReportsPage.jsx',
]);

const VehicleReportsPage = lazy(
  pageModules['./pages/VehicleReportsPage.jsx'] ||
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

const IncidentReportsPage = lazy(
  pageModules['./pages/IncidentReportsPage.jsx'] ||
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

// Mobile Pages (Lazy Loaded)
const MobileDashboard = lazy(() => import('./pages/mobile/MobileDashboard'));
const MobileDeployment = lazy(() => import('./pages/mobile/MobileDeployment'));
const MobileActivities = lazy(() => import('./pages/mobile/MobileActivities'));
const MobileIncidents = lazy(() => import('./pages/mobile/MobileIncidents'));
const MobileReports = lazy(() => import('./pages/mobile/MobileReports'));

// Fallback loader komponen saat chunk halaman diunduh
const PageLoadingFallback = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-8 h-8 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-3" />
    <span className="text-xs font-medium text-slate-500">Memuat antarmuka...</span>
  </div>
);

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
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<LoginPage />} />

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
                  <MobileDeployment
                    onOpenCutiModal={() =>
                      window.dispatchEvent(new CustomEvent('arff:open-leave-modal'))
                    }
                  />
                }
              />
              <Route path="kegiatan" element={<MobileActivities />} />
              <Route path="insiden" element={<MobileIncidents />} />
              <Route path="laporan" element={<MobileReports />} />
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
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/schedules" element={<RosterSchedulePage />} />
              <Route path="/announcements" element={<AnnouncementsPage />} />
              <Route path="/deployment" element={<DeploymentPage />} />
              <Route path="/vehicles" element={<VehicleReadinessPage />} />
              <Route path="/vehicles/reports" element={<VehicleReportsPage />} />
              <Route path="/readiness/vehicles" element={<Navigate to="/vehicles" replace />} />
              <Route path="/readiness/watchroom" element={<Navigate to="/vehicles" replace />} />
              <Route path="/armada/laporan" element={<Navigate to="/vehicles/reports" replace />} />
              <Route path="/personnel" element={<PersonnelPage />} />
              <Route path="/personnel/officials" element={<OfficialsManagementPage />} />
              <Route path="/personnel/:id" element={<PersonnelDetailPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/incidents/:id" element={<IncidentDetailPage />} />
              <Route path="/incidents/reports" element={<IncidentReportsPage />} />
              <Route path="/insiden/laporan" element={<Navigate to="/incidents/reports" replace />} />
              <Route path="/leave" element={<LeaveManagementPage />} />
              <Route path="/activities" element={<ActivitiesPage />} />
              <Route path="/reports" element={<ShiftReportsPage />} />
              <Route path="/settings" element={<Navigate to="/vehicles" replace />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

