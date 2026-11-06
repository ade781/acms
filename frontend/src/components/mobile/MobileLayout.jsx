import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cleanTeam, getScheduledTeam } from '../../utils/shiftHelper';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileProfileView from './profile/MobileProfileView';
import MobileAnnouncementsModal from './announcements/MobileAnnouncementsModal';
import LeaveModal from '../forms/LeaveModal';
import MandatoryPasswordChangeModal from '../forms/MandatoryPasswordChangeModal';
import OfflineBanner from '../common/OfflineBanner';
import ErrorBoundary from '../common/ErrorBoundary';

export default function MobileLayout({ children }) {
  const { user, activeDate, activeShiftNumber, activeTeam, isChief, isAdmin, isSupervisor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Sub-view profile state
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  // Announcements modal state
  const [isAnnounceOpen, setIsAnnounceOpen] = useState(false);
  // Leave modal state (Global untuk seluruh antarmuka mobile)
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [activeUserLeaveDetail, setActiveUserLeaveDetail] = useState(null);

  // Listener event global pembukaan modal cuti dan pengumuman
  useEffect(() => {
    const handleOpen = (e) => {
      setActiveUserLeaveDetail(e?.detail?.activeUserLeave || null);
      setIsLeaveModalOpen(true);
    };
    const handleOpenAnnouncements = () => {
      setIsAnnounceOpen(true);
    };
    window.addEventListener('arff:open-leave-modal', handleOpen);
    window.addEventListener('arff:open-announcements-modal', handleOpenAnnouncements);
    return () => {
      window.removeEventListener('arff:open-leave-modal', handleOpen);
      window.removeEventListener('arff:open-announcements-modal', handleOpenAnnouncements);
    };
  }, []);

  // Determine active tab based on current pathname
  const path = location.pathname.toLowerCase();
  let activeTab = 'dashboard';
  if (path.includes('/ploting')) activeTab = 'ploting';
  else if (path.includes('/kegiatan')) activeTab = 'kegiatan';
  else if (path.includes('/insiden')) activeTab = 'insiden';
  else if (path.includes('/laporan') || path.includes('/reports')) activeTab = 'laporan';

  // Chief role check (chief, chief_assistant, operation_chief, supervisor, admin)
  const isChiefRole = Boolean(isChief || isAdmin || isSupervisor);
  const mustChangePassword = Boolean(user?.must_change_password);

  const handleTabChange = (tab) => {
    // If profile is open, close it when switching tabs
    if (isProfileOpen) setIsProfileOpen(false);

    if (tab === 'dashboard') navigate('/m/dashboard');
    else if (tab === 'ploting') navigate('/m/ploting');
    else if (tab === 'kegiatan') navigate('/m/kegiatan');
    else if (tab === 'insiden') navigate('/m/insiden');
    else if (tab === 'laporan') navigate('/m/laporan');
  };

  const handleOpenLeaveModal = () => {
    setIsLeaveModalOpen(true);
  };

  // Cek apakah personel sedang bertugas di shift saat ini (Roster dinas otomatis)
  const scheduledTeam = getScheduledTeam(activeDate, activeShiftNumber);
  const userTeam = cleanTeam(user?.team_group || '');
  // Jika user memiliki regu dinas (Alpha-Delta), periksa kecocokan regu dengan roster jadwal
  // Jika user admin / non-shift, ikuti regu aktif yang sedang dipantau (activeTeam)
  const isOnDuty = Boolean(
    userTeam
      ? userTeam.toLowerCase() === cleanTeam(scheduledTeam).toLowerCase()
      : cleanTeam(activeTeam || scheduledTeam).toLowerCase() === cleanTeam(scheduledTeam).toLowerCase()
  );

  // ==========================================================================================
  // PENGATURAN WARNA & GRADIENT BACKGROUND MOBILE (OPSI 4: SOFT-TACTILE WARM LINEN & VERMILION):
  // - Saat isOnDuty = true (Sedang Shift):
  //   * Warm Linen & Vermilion Mist lembut di atas dasar putih linen
  // - Saat isOnDuty = false (Tidak Shift / Lepas Piket):
  //   * Calm Warm Linen Stone yang sejuk dan netral
  // ==========================================================================================
  const mobileBackgroundStyle = {
    background: isOnDuty
      ? 'radial-gradient(ellipse 130% 65% at 50% 100%, rgba(234, 88, 12, 0.12) 0%, rgba(234, 88, 12, 0.04) 50%, transparent 85%), linear-gradient(180deg, #FAF8F5 0%, #F5F5F4 55%, #EFEFEA 100%)'
      : 'linear-gradient(180deg, #FBFBFA 0%, #F5F5F4 55%, #EFEFEA 100%)',
    transition: 'background 0.5s ease',
  };

  return (
    <div className="w-full min-h-screen flex flex-col relative overflow-x-hidden font-sans text-[#1C1917]">
      {/* Fixed Viewport Background Atmosphere Layer (100% layar penuh) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 w-full z-0 pointer-events-none"
        style={mobileBackgroundStyle}
      />

      {/* Banner Deteksi Offline Apron (Temuan #41) */}
      <OfflineBanner />

      {/* Top App Bar */}
      <MobileHeader
        isOnDuty={isOnDuty}
        onOpenAnnouncements={() => setIsAnnounceOpen(true)}
        onOpenProfile={() => setIsProfileOpen((prev) => !prev)}
        isProfileActive={isProfileOpen}
      />

      {/* Main Scrollable Canvas */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-4 pb-24 overflow-y-auto no-scrollbar space-y-2.5 relative z-10">
        {isProfileOpen ? (
          <MobileProfileView
            onClose={() => setIsProfileOpen(false)}
            onOpenLeaveModal={handleOpenLeaveModal}
          />
        ) : (
          <ErrorBoundary fallbackVariant="section">
            {children || <Outlet />}
          </ErrorBoundary>
        )}
      </main>

      {/* Fixed Bottom Navigation Bar (Hidden while Profile sub-view is open) */}
      {!isProfileOpen && (
        <MobileBottomNav
          isOnDuty={isOnDuty}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isChief={isChiefRole}
        />
      )}

      {/* Announcements Modal */}
      <MobileAnnouncementsModal
        isOpen={isAnnounceOpen}
        onClose={() => setIsAnnounceOpen(false)}
      />

      {/* Global Mobile Leave Modal */}
      <LeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        user={user}
        activeDate={activeDate}
        onSuccess={() => {
          setIsLeaveModalOpen(false);
          window.dispatchEvent(new CustomEvent('arff:leave-updated'));
        }}
      />

      {/* Mandatory Password Change Modal for new accounts */}
      <MandatoryPasswordChangeModal isOpen={mustChangePassword} />
    </div>
  );
}
