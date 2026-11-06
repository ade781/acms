import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { formatTeam } from '../../utils/shiftHelper';

function getInitials(name) {
  if (!name) return 'AR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MobileHeader({
  isOnDuty = true,
  onOpenAnnouncements,
  onOpenProfile,
  isProfileActive = false,
  unreadCount: propUnreadCount,
}) {
  const { user, activeTeam, activeShiftNumber } = useAuth();
  const [unreadCount, setUnreadCount] = useState(propUnreadCount || 0);

  useEffect(() => {
    if (propUnreadCount !== undefined) {
      setUnreadCount(Number(propUnreadCount));
    }
  }, [propUnreadCount]);

  useEffect(() => {
    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const res = await api.get('/announcements/unread-count');
        if (typeof window !== 'undefined') {
          window.__arff_announcements_cache = {
            data: res.data,
            timestamp: Date.now(),
          };
        }
        const count = res.data?.data?.unread_count ?? res.data?.unread_count ?? 0;
        if (isMounted) setUnreadCount(Number(count));
      } catch {
        // Abaikan error jaringan berkala
      }
    };

    fetchUnread();
    const handleUpdate = () => {
      if (typeof window !== 'undefined') {
        window.__arff_announcements_cache = null;
      }
      fetchUnread();
    };
    window.addEventListener('arff:announcements-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('arff:announcements-updated', handleUpdate);
    };
  }, []);

  const userName = user?.full_name || user?.name || user?.username || 'Petugas ARFF';
  const initials = getInitials(userName);
  const teamLabel = formatTeam(activeTeam || 'Alpha');

  const headerSurfaceClass = isOnDuty
    ? 'bg-white/95 border-b border-[#E7E5E4] shadow-[0_1px_3px_rgba(28,25,23,0.04)]'
    : 'bg-[#FBFBFA]/95 border-b border-[#E7E5E4] shadow-[0_1px_2px_rgba(28,25,23,0.03)]';

  return (
    <header className={`sticky top-0 z-40 w-full ${headerSurfaceClass} transition-colors duration-100 font-sans`}>
      <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-2">
        {/* Sisi Kiri: Identitas Dinas */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#1C1917] tracking-tight leading-none">
              YIA AIRPORT
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isOnDuty ? 'bg-emerald-500' : 'bg-stone-400'
              }`}
              title={isOnDuty ? 'Operasional Aktif' : 'Lepas Piket'}
            />
          </div>
          <p className="text-xs font-medium text-[#57534E] leading-tight mt-0.5 truncate">
            {teamLabel} • Shift <span className="font-mono tabular-nums">{activeShiftNumber || 1}</span>
          </p>
        </div>

        {/* Sisi Kanan: Lonceng Pengumuman & Avatar Profil */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Tombol Lonceng Pengumuman */}
          <button
            type="button"
            onClick={onOpenAnnouncements}
            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center relative transition-colors duration-100 text-[#44403C]"
            aria-label="Pengumuman Dinas"
            title="Buka Pengumuman Dinas"
          >
            <Bell className="w-4 h-4 text-[#44403C]" />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#EA580C] text-white font-mono tabular-nums text-xs font-bold flex items-center justify-center ring-2 ring-white leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Tombol Profil */}
          <button
            type="button"
            onClick={onOpenProfile}
            className="p-0.5 rounded-full transition-colors duration-100"
            aria-label="Profil Pengguna"
            title={`Profil: ${userName}`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-100 ${
                isProfileActive
                  ? 'bg-[#EA580C] text-white ring-2 ring-[#FDBA74]'
                  : isOnDuty
                    ? 'bg-[#1C1917] text-white ring-2 ring-[#EA580C]/40'
                    : 'bg-stone-700 text-white ring-1 ring-stone-300'
              }`}
            >
              {initials}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
