import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users2,
  Calendar,
  Truck,
  UserCheck,
  UserX,
  AlertTriangle,
  ClipboardList,
  FileText,
  X,
  Bell,
  ChevronLeft,
} from 'lucide-react';

import api from '../../services/api';
import Logo from '../common/Logo';
import Badge from '../common/Badge';

export default function Sidebar({ isOpen, onClose }) {
  const [unreadAnnouncements, setUnreadAnnouncements] = React.useState(0);
  const [isCollapsed, setIsCollapsed] = React.useState(() => {
    return localStorage.getItem('arff_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('arff_sidebar_collapsed', String(next));
      return next;
    });
  };

  React.useEffect(() => {
    let isMounted = true;
    const checkUnread = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const res = await api.get('/announcements/unread-count');
        if (isMounted) {
          setUnreadAnnouncements(
            Number(res.data?.data?.unread_count || res.data?.unread_count || 0)
          );
        }
      } catch {
        // Abaikan kegagalan jaringan berkala
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 90000);
    const handleUpdate = () => checkUnread();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUnread();
      }
    };

    window.addEventListener('arff:announcements-updated', handleUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('arff:announcements-updated', handleUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const navItems = [
    {
      to: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      to: '/deployment',
      label: 'Ploting Dinas',
      icon: Users2,
    },
    {
      to: '/vehicles',
      label: 'Kesiapan Armada',
      icon: Truck,
    },
    {
      to: '/activities',
      label: 'Logbook Kegiatan',
      icon: ClipboardList,
    },
    {
      to: '/incidents',
      label: 'Laporan Insiden',
      icon: AlertTriangle,
    },
    {
      to: '/reports',
      label: 'Laporan Dinas',
      icon: FileText,
    },
    {
      to: '/leave',
      label: 'Pencatatan Cuti',
      icon: UserX,
    },
    {
      to: '/schedules',
      label: 'Jadwal Dinas',
      icon: Calendar,
    },
    {
      to: '/personnel',
      label: 'Data Personel',
      icon: UserCheck,
    },
    {
      to: '/announcements',
      label: 'Pengumuman',
      icon: Bell,
      badge: unreadAnnouncements > 0 ? unreadAnnouncements : null,
      isAlertBadge: true,
    },
  ];

  const location = useLocation();

  const isItemActive = (itemTo) => {
    if (location.pathname === itemTo) return true;
    if (
      itemTo === '/vehicles' &&
      (location.pathname.startsWith('/vehicles') ||
        location.pathname.startsWith('/readiness/vehicles') ||
        location.pathname.startsWith('/armada/laporan'))
    )
      return true;
    if (
      itemTo === '/incidents' &&
      (location.pathname.startsWith('/incidents') ||
        location.pathname.startsWith('/insiden/laporan'))
    )
      return true;
    return false;
  };

  const linkClasses = (itemTo) => ({ isActive }) => {
    const active = isActive || isItemActive(itemTo);
    return `group flex items-center w-full h-11 rounded-lg text-sm font-medium transition-colors duration-150 select-none relative overflow-hidden ${
      active
        ? 'bg-red-50 text-arff-primary font-semibold'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;
  };

  return (
    <>
      {/* Mobile Backdrop without blur */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 md:hidden transition-opacity print:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container: px-4 (16px) + w-12 (48px) icon column + px-4 (16px) = 80px (md:w-20) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } w-64 bg-white border-r border-slate-200 flex flex-col overflow-x-hidden transition-[width,transform] duration-200 ease-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:z-auto print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-200 flex-shrink-0 overflow-hidden">
          {/* Desktop Logo (Fixed left anchor so icon never jumps horizontally) */}
          <div className="hidden md:flex items-center min-w-0 overflow-hidden">
            <Logo className="h-8 w-8" withText={true} collapsed={isCollapsed} />
          </div>

          {/* Mobile Logo & Close Button */}
          <div className="flex md:hidden items-center justify-between w-full min-w-0">
            <Logo className="h-8 w-8" withText={true} collapsed={false} />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center flex-shrink-0"
              aria-label="Tutup navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 space-y-1">
          {/* Fixed-height section header (h-7) prevents vertical layout jump when toggling */}
          <div className="relative h-7 flex items-center overflow-hidden">
            <span
              className={`px-3 text-[11px] font-bold tracking-wider uppercase text-slate-400 whitespace-nowrap transition-opacity duration-150 ease-out ${
                isCollapsed ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'
              }`}
            >
              Operasional Dinas
            </span>
            <div
              className={`hidden md:block absolute left-2 right-2 border-t border-slate-100 transition-opacity duration-150 ease-out ${
                isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            />
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.to);
            const isAnnouncements = item.to === '/announcements';

            return (
              <NavLink
                key={item.to}
                to={item.to}
                title={item.label}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={linkClasses(item.to)}
              >
                {/* Active left accent bar (absolute so it never shifts icon position by 4px) */}
                {active && (
                  <span
                    className={`absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-arff-primary transition-opacity duration-150 ${
                      isCollapsed ? 'md:opacity-0' : 'opacity-100'
                    }`}
                  />
                )}

                {/* Fixed 48px (w-12) icon anchor column — stays at exact center of 80px collapsed sidebar */}
                <div className="w-12 h-11 flex items-center justify-center flex-shrink-0 relative">
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {isAnnouncements && unreadAnnouncements > 0 && (
                    <span
                      className={`hidden md:block absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-600 ring-2 ring-white transition-opacity duration-150 ${
                        isCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                      title={`${unreadAnnouncements} pengumuman baru belum dibaca`}
                    />
                  )}
                </div>

                {/* Label & Right Badge — smooth opacity transition without layout jump */}
                <div
                  className={`flex items-center justify-between flex-1 min-w-0 pr-3 transition-opacity duration-150 ease-out ${
                    isCollapsed ? 'md:opacity-0 md:pointer-events-none' : 'opacity-100'
                  }`}
                >
                  <span className="whitespace-nowrap truncate">{item.label}</span>

                  {item.badge && (
                    <div className="flex-shrink-0 ml-2">
                      {item.isAlertBadge ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-xs">
                          {item.badge}
                        </span>
                      ) : (
                        <Badge variant="pending" size="sm">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Footer with Collapse Toggle (Desktop only) */}
        <div className="hidden md:flex items-center border-t border-slate-200 px-4 py-3 flex-shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-full h-10 flex items-center rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer overflow-hidden"
            title={isCollapsed ? 'Perluas Menu Sidebar' : 'Ciutkan Menu Sidebar'}
            aria-label={isCollapsed ? 'Perluas Menu Sidebar' : 'Ciutkan Menu Sidebar'}
          >
            <div className="w-12 h-10 flex items-center justify-center flex-shrink-0">
              <ChevronLeft
                className={`w-[18px] h-[18px] text-slate-500 transition-transform duration-200 ease-out ${
                  isCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
              />
            </div>
            <span
              className={`whitespace-nowrap truncate pr-3 transition-opacity duration-150 ease-out ${
                isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              Ciutkan Menu
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
