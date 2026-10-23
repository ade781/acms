import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import MobileProfileView from './profile/MobileProfileView';
import MobileAnnouncementsModal from './announcements/MobileAnnouncementsModal';
import MobileLeaveModal from './dashboard/MobileLeaveModal';

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

  // Listener event global pembukaan modal cuti dari profil maupun ploting
  useEffect(() => {
    const handleOpen = () => {
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

  return (
    <div className="bg-slate-900 text-slate-800 flex justify-center min-h-screen">
      {/* Mobile Viewport Container (Rasio Modern 20:9 / max 412px) */}
      <div className="w-full max-w-[412px] bg-slate-50 min-h-screen flex flex-col shadow-2xl relative border-x border-slate-700/20 overflow-x-hidden">
        {/* Top App Bar */}
        <MobileHeader
          onOpenAnnouncements={() => setIsAnnounceOpen(true)}
          onOpenProfile={() => setIsProfileOpen((prev) => !prev)}
          isProfileActive={isProfileOpen}
        />

        {/* Main Scrollable Canvas */}
        <main className="flex-1 px-3 py-2 pb-24 overflow-y-auto no-scrollbar space-y-2">
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
          onSuccess={() => {
            setIsLeaveModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}
