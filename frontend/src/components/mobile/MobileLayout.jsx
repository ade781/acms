import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { cleanTeam, getScheduledTeam } from '../../utils/shiftHelper';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileProfileView from './profile/MobileProfileView';
import MobileAnnouncementsModal from './announcements/MobileAnnouncementsModal';
import MobileLeaveModal from './dashboard/MobileLeaveModal';
import MandatoryPasswordChangeModal from '../forms/MandatoryPasswordChangeModal';
import OfflineBanner from '../common/OfflineBanner';

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

  // Listener event global pembukaan modal cuti dari dashboard, profil, maupun ploting
  useEffect(() => {
    const handleOpen = (e) => {
      setActiveUserLeaveDetail(e?.detail?.activeUserLeave || null);
      setIsLeaveModalOpen(true);
    };
    window.addEventListener('arff:open-leave-modal', handleOpen);
    return () => {
      window.removeEventListener('arff:open-leave-modal', handleOpen);
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
  // PENGATURAN WARNA & GRADIENT BACKGROUND MOBILE:
  // - isOnDuty = true  -> Gradien Merah lembut dari bawah memudar ke atas (sampai 85% layar)
  // - isOnDuty = false -> Gradien Biru lembut dari bawah memudar ke atas (sampai 85% layar)
  // Anda bisa mengatur kepekatan (opacity 0.20 - 0.40) atau titik pudar (45%, 85%) di sini
  // ==========================================================================================
  const mobileBackgroundStyle = {
    background: isOnDuty
      ? 'radial-gradient(ellipse 140% 75% at 50% 100%, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0.06) 50%, transparent 85%), linear-gradient(to top, rgba(254, 202, 202, 0.40) 0%, rgba(254, 226, 226, 0.18) 45%, rgba(248, 250, 252, 0) 85%), #f8fafc'
      : 'radial-gradient(ellipse 140% 75% at 50% 100%, rgba(14, 165, 233, 0.18) 0%, rgba(14, 165, 233, 0.06) 50%, transparent 85%), linear-gradient(to top, rgba(186, 230, 253, 0.40) 0%, rgba(224, 242, 254, 0.18) 45%, rgba(248, 250, 252, 0) 85%), #f8fafc',
    transition: 'background 0.5s ease',
  };

  return (
    <div className="bg-slate-900 text-slate-800 flex justify-center min-h-screen">
      {/* Mobile Viewport Container (Rasio Modern 20:9 / max 412px) */}
      <div className="w-full max-w-[412px] min-h-screen flex flex-col shadow-2xl relative border-x border-slate-700/20 overflow-x-hidden bg-transparent">
        {/* Fixed Viewport Background Atmosphere Layer (Terkunci di layar pandang/viewport saat digulir) */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 w-full max-w-[412px] mx-auto z-0"
          style={mobileBackgroundStyle}
        />

        {/* Banner Deteksi Offline Apron (Temuan #41) */}
        <OfflineBanner />

        {/* Top App Bar */}
        <MobileHeader
          onOpenAnnouncements={() => setIsAnnounceOpen(true)}
          onOpenProfile={() => setIsProfileOpen((prev) => !prev)}
          isProfileActive={isProfileOpen}
        />

        {/* Main Scrollable Canvas */}
        <main className="flex-1 px-3 py-2 pb-24 overflow-y-auto no-scrollbar space-y-2 relative z-10">
          {isProfileOpen ? (
            <MobileProfileView
              onClose={() => setIsProfileOpen(false)}
              onOpenLeaveModal={handleOpenLeaveModal}
            />
          ) : (
            children || <Outlet />
          )}
        </main>

        {/* Fixed Bottom Navigation Bar (Hidden while Profile sub-view is open) */}
        {!isProfileOpen && (
          <MobileBottomNav
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
        <MobileLeaveModal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          user={user}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          activeUserLeave={activeUserLeaveDetail}
          onSuccess={() => {
            setIsLeaveModalOpen(false);
            window.dispatchEvent(new CustomEvent('arff:leave-updated'));
          }}
        />

        {/* Mandatory Password Change Modal for new accounts */}
        <MandatoryPasswordChangeModal isOpen={mustChangePassword} />
      </div>
    </div>
  );
}
