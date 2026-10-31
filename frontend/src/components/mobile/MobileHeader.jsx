import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function getInitials(name) {
  if (!name) return 'AR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function MobileHeader({ onOpenAnnouncements, onOpenProfile, isProfileActive = false, unreadCount: propUnreadCount }) {
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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-3 py-1 flex items-center justify-between shadow-xs font-sans">
      {/* Sisi Kiri: Identitas Dinas ARFF YIA */}
      <div className="flex items-center gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-xs font-bold text-slate-900 tracking-tight leading-none">
              YIA AIRPORT
            </h1>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"
              title="Operasional Aktif"
            ></span>
          </div>
          <p className="text-xs font-medium text-slate-500 leading-tight mt-0.5">
            {activeTeam || 'Alpha'} • Shift <span className="font-mono tabular-nums">{activeShiftNumber || 1}</span>
          </p>
        </div>
      </div>

      {/* Sisi Kanan: Lonceng Pengumuman & Avatar Profil (Touch Target min 44x44px) */}
      <div className="flex items-center gap-0.5">
        {/* Lonceng Pengumuman dengan Badge Merah jika ada yang belum dibaca */}
        <button
          type="button"
          onClick={onOpenAnnouncements}
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors duration-100"
          aria-label="Pengumuman Dinas"
          title="Buka Pengumuman Dinas"
        >
          <div className="relative w-7 h-7 flex items-center justify-center">
            <Bell className="w-4 h-4 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white"></span>
            )}
          </div>
        </button>

        {/* Avatar Profil Inisial */}
        <button
          type="button"
          onClick={onOpenProfile}
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors duration-100"
          aria-label="Profil Pengguna"
          title={`Profil: ${userName}`}
        >
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-colors duration-100 shadow-2xs ${
              isProfileActive
                ? 'bg-red-600 text-white ring-2 ring-red-400'
                : 'bg-slate-800 text-white ring-1 ring-slate-300 hover:ring-red-500'
            }`}
          >
            {initials}
          </span>
        </button>
      </div>
    </header>
  );
}
