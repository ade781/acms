import React, { useState, useEffect } from 'react';
import { Menu, LogOut, User, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SHIFT_DEFINITIONS, formatTeam, formatRoleName } from '../../utils/shiftHelper';
import Logo from '../common/Logo';
import Badge from '../common/Badge';
import DesktopProfileModal from '../profile/DesktopProfileModal';

export default function Navbar({ onToggleSidebar }) {
  const {
    user,
    logout,
    activeDate,
    setActiveDate,
    activeShiftNumber,
    setActiveShiftNumber,
    activeTeam,
  } = useAuth();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  useEffect(() => {
    const handleOpenProfile = () => setIsProfileOpen(true);
    window.addEventListener('arff:open-profile-modal', handleOpenProfile);
    return () => {
      window.removeEventListener('arff:open-profile-modal', handleOpenProfile);
    };
  }, []);

  const safeDateValue = typeof activeDate === 'string'
    ? activeDate
    : (activeDate instanceof Date && !isNaN(activeDate.getTime())
      ? activeDate.toISOString().split('T')[0]
      : '');

  const safeShiftNumber = Number(activeShiftNumber) || 1;
  const safeActiveTeam = formatTeam(activeTeam);
  const userName = user?.name || user?.username || 'Pengguna';
  const userInitial = typeof user?.name === 'string' && user.name.trim().length > 0
    ? user.name.trim().charAt(0).toUpperCase()
    : typeof user?.username === 'string' && user.username.trim().length > 0
    ? user.username.trim().charAt(0).toUpperCase()
    : null;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 print:hidden">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 h-16">
        {/* Left: Mobile Hamburger & Logo (Hidden on Desktop) */}
        <div className="flex items-center gap-2.5 md:hidden">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-shrink-0">
            <Logo className="h-7 w-7" withText={false} />
          </div>
        </div>

        {/* Operational Team, Date, & Shift Control Strip (Desktop) */}
        <div className="hidden sm:flex items-center bg-slate-100/80 border border-slate-200/90 rounded-lg p-1 gap-1.5 flex-shrink-0">
          {/* Active On-Duty Team Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/80 rounded-md text-xs font-bold text-slate-900 tracking-tight"
            title="Regu yang sedang bertugas pada tanggal & shift terpilih"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>{safeActiveTeam}</span>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors duration-100">
            <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <input
              type="date"
              value={safeDateValue}
              onChange={(e) => setActiveDate(e.target.value)}
              className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer tabular-nums"
              aria-label="Pilih tanggal shift dinas"
            />
          </div>

          {/* Shift Select */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200/80 rounded-md text-xs font-medium text-slate-700 hover:border-slate-300 transition-colors duration-100">
            <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
              value={safeShiftNumber}
              onChange={(e) => setActiveShiftNumber(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Pilih shift dinas"
            >
              {SHIFT_DEFINITIONS.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.name} ({s.startTime} - {s.endTime})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: User Identity & Logout */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-auto md:ml-0">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="hidden lg:flex flex-col text-right hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
                title={`Buka Profil ${userName}`}
                aria-label={`Profil ${userName}`}
              >
                <span className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[160px]">
                  {userName}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {formatRoleName(user.role)} {user.team_group ? `• ${formatTeam(user.team_group)}` : ''}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-red-50 hover:border-red-400 border border-slate-300 flex items-center justify-center text-slate-700 hover:text-red-600 font-semibold text-xs select-none transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
                title={`Profil ${userName}`}
                aria-label={`Profil ${userName}`}
              >
                {userInitial ? userInitial : <User className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
                title="Keluar dari sistem"
                aria-label="Keluar dari sistem"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Badge variant="default">Sesi Tamu</Badge>
          )}
        </div>
      </div>

      {/* Mobile Interactive Subheader Bar (< sm) */}
      <div className="sm:hidden flex items-center justify-end gap-1.5 px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs">
        <input
          type="date"
          value={safeDateValue}
          onChange={(e) => setActiveDate(e.target.value)}
          className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-800 focus:outline-none tabular-nums"
          aria-label="Pilih tanggal shift dinas (mobile)"
        />
        <select
          value={safeShiftNumber}
          onChange={(e) => setActiveShiftNumber(Number(e.target.value))}
          className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-semibold text-slate-800 focus:outline-none"
          aria-label="Pilih shift dinas (mobile)"
        >
          {SHIFT_DEFINITIONS.map((s) => (
            <option key={s.number} value={s.number}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Sub-view Modal Profil Mandiri Desktop (GEMINI.md Butir 9) */}
      <DesktopProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
    </header>
  );
}
