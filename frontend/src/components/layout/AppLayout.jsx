import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import OfflineBanner from '../common/OfflineBanner';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAuth } from '../../context/AuthContext';
import MandatoryPasswordChangeModal from '../forms/MandatoryPasswordChangeModal';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, resetToToday } = useAuth();
  const location = useLocation();
  const prevPathRef = useRef(location.pathname);

  // Otomatis kembalikan konteks tanggal & shift operasional ke hari ini saat pengguna berpindah menu/halaman
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      prevPathRef.current = location.pathname;
      resetToToday();
    }
  }, [location.pathname, resetToToday]);

  const mustChangePassword = Boolean(user?.must_change_password);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <OfflineBanner />
        <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 print:max-w-none">
          <ErrorBoundary fallbackVariant="section">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Mandatory Password Change Modal for new accounts */}
      <MandatoryPasswordChangeModal isOpen={mustChangePassword} />
    </div>
  );
}
