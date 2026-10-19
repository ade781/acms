import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import PersonnelPage from './pages/PersonnelPage';
import PersonnelDetailPage from './pages/PersonnelDetailPage';
import VehicleReadinessPage from './pages/VehicleReadinessPage';
import WatchroomReadinessPage from './pages/WatchroomReadinessPage';
import DeploymentPage from './pages/DeploymentPage';
import IncidentsPage from './pages/IncidentsPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import ActivitiesPage from './pages/ActivitiesPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

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
          <Route path="/login" element={<LoginPage />} />

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
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/deployment" element={<DeploymentPage />} />
            <Route path="/readiness/vehicles" element={<VehicleReadinessPage />} />
            <Route path="/readiness/watchroom" element={<WatchroomReadinessPage />} />
            <Route path="/personnel" element={<PersonnelPage />} />
            <Route path="/personnel/:id" element={<PersonnelDetailPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/incidents/:id" element={<IncidentDetailPage />} />
            <Route path="/activities" element={<ActivitiesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route
              path="/settings"
              element={
                <ProtectedRoute adminOnly>
                  <SettingsPage />
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
