import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Desktop Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PersonnelPage from './pages/PersonnelPage';
import PersonnelDetailPage from './pages/PersonnelDetailPage';
import VehicleReadinessPage from './pages/VehicleReadinessPage';
import DeploymentPage from './pages/DeploymentPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import LeaveManagementPage from './pages/LeaveManagementPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ShiftReportsPage from './pages/ShiftReportsPage';
import RosterSchedulePage from './pages/RosterSchedulePage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import OfficialsManagementPage from './pages/OfficialsManagementPage';

// Dynamic Loaders untuk Halaman Laporan Khusus
const pageModules = import.meta.glob([
  './pages/VehicleReportsPage.jsx',
  './pages/IncidentReportsPage.jsx',
]);

const VehicleReportsPage = React.lazy(
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

const IncidentReportsPage = React.lazy(
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

// Mobile Layout & Halaman Mobile (Operasional Lapangan)
import MobileLayout from './components/mobile/MobileLayout';
import MobileDashboard from './pages/mobile/MobileDashboard';
import MobileDeployment from './pages/mobile/MobileDeployment';
import MobileActivities from './pages/mobile/MobileActivities';
import MobileIncidents from './pages/mobile/MobileIncidents';
import MobileReports from './pages/mobile/MobileReports';

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
            <Route
              path="/vehicles/reports"
              element={
                <React.Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-600">Memuat Laporan Kesiapan Armada...</div>}>
                  <VehicleReportsPage />
                </React.Suspense>
              }
            />
            <Route path="/readiness/vehicles" element={<Navigate to="/vehicles" replace />} />
            <Route path="/readiness/watchroom" element={<Navigate to="/vehicles" replace />} />
            <Route path="/armada/laporan" element={<Navigate to="/vehicles/reports" replace />} />
            <Route path="/personnel" element={<PersonnelPage />} />
            <Route path="/personnel/officials" element={<OfficialsManagementPage />} />
            <Route path="/personnel/:id" element={<PersonnelDetailPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route
              path="/incidents/reports"
              element={
                <React.Suspense fallback={<div className="p-8 text-center text-xs font-semibold text-slate-600">Memuat Laporan Rekap Insiden...</div>}>
                  <IncidentReportsPage />
                </React.Suspense>
              }
            />
            <Route path="/insiden/laporan" element={<Navigate to="/incidents/reports" replace />} />
            <Route path="/leave" element={<LeaveManagementPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/reports" element={<ShiftReportsPage />} />
            <Route path="/settings" element={<Navigate to="/vehicles" replace />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

