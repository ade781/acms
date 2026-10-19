import React from 'react';
import { Menu, LogOut, User, Calendar, Clock, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { TEAMS, SHIFT_DEFINITIONS } from '../../utils/shiftHelper';
import Logo from '../common/Logo';
import Badge from '../common/Badge';

export default function Navbar({ onToggleSidebar }) {
  const {
    user,
    logout,
    activeDate,
    setActiveDate,
    activeShiftNumber,
    setActiveShiftNumber,
    activeTeam,
    setActiveTeam,
  } = useAuth();

  const currentShiftDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(activeShiftNumber));

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between px-4 sm:px-6 h-16">
        {/* Left: Mobile hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="md:hidden">
            <Logo className="h-7 w-7" withText={false} />
          </div>

          <div className="hidden lg:flex items-center gap-2 pl-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Unit Pertolongan Kecelakaan Penerbangan dan Pemadam Kebakaran</span>
          </div>
        </div>

        {/* Center: Operational Shift Controls (Date, Shift 1-3, Team Alpha-Delta) */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={activeDate}
              onChange={(e) => setActiveDate(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Pilih tanggal shift dinas"
            />
          </div>

          {/* Shift Select */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeShiftNumber}
              onChange={(e) => setActiveShiftNumber(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Pilih shift dinas"
            >
              {SHIFT_DEFINITIONS.map((s) => (
                <option key={s.number} value={s.number}>
                  {s.name} ({s.startTime} s.d. {s.endTime})
                </option>
              ))}
            </select>
          </div>

          {/* Team Select */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={activeTeam}
              onChange={(e) => setActiveTeam(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              aria-label="Pilih regu dinas"
            >
              {TEAMS.map((team) => (
                <option key={team} value={team}>
                  Regu {team}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right: User identity & logout */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">
                  {user.name || user.username}
                </span>
                <span className="text-[10px] text-slate-500 capitalize">
                  {user.role} {user.team_group ? `(Regu ${user.team_group})` : ''}
                </span>
              </div>

              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-semibold text-xs select-none">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
              </div>

              <button
                type="button"
                onClick={logout}
                className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-100 min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-red-400"
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

      {/* Mobile subheader bar showing active shift and team */}
      <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-slate-100 border-t border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">Regu {activeTeam}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-600">{currentShiftDef?.name}</span>
        </div>
        <span className="text-[11px] text-slate-500">{activeDate}</span>
      </div>
    </header>
  );
}
