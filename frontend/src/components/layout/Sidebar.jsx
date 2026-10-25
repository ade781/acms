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
  ChevronRight,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Logo from '../common/Logo';
import Badge from '../common/Badge';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
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
        const res = await api.get('/announcements');
        if (isMounted) {
          setUnreadAnnouncements(Number(res.data?.data?.unread_count || res.data?.unread_count || 0));
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
    return `flex items-center ${
      isCollapsed ? 'md:justify-center md:px-2' : 'justify-between px-3.5'
    } py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors duration-100 select-none relative ${
      active
        ? `bg-red-50 text-arff-primary font-semibold ${
            isCollapsed ? 'md:border-l-0 md:bg-red-100/60' : 'border-l-4 border-arff-primary pl-2.5'
          }`
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

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 ${
          isCollapsed ? 'md:w-20' : 'md:w-64'
        } w-64 bg-white border-r border-slate-200 flex flex-col transition-[width,transform] duration-200 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:z-auto print:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`flex items-center ${
            isCollapsed ? 'md:justify-center md:px-2' : 'justify-between px-5'
          } h-16 border-b border-slate-200 flex-shrink-0`}
        >
          {/* Desktop Logo */}
          <div className="hidden md:flex items-center justify-center">
            <Logo className="h-8 w-8" withText={!isCollapsed} />
          </div>

          {/* Mobile Logo & Close Button */}
          <div className="flex md:hidden items-center justify-between w-full">
            <Logo className="h-8 w-8" withText={true} />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Tutup navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {!isCollapsed ? (
            <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
              Operasional Dinas
            </div>
          ) : (
            <div className="hidden md:block my-2 border-t border-slate-100" />
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
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
                <div className={`flex items-center ${isCollapsed ? 'md:justify-center' : 'gap-3'}`}>
                  <div className="relative flex items-center justify-center">
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {/* Blinking red dot indicator in collapsed mode */}
                    {isCollapsed && isAnnouncements && unreadAnnouncements > 0 && (
                      <span
                        className="hidden md:block absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white animate-pulse"
                        title={`${unreadAnnouncements} pengumuman baru belum dibaca`}
                      />
                    )}
                  </div>
                  <span className={isCollapsed ? 'md:hidden truncate' : 'truncate'}>
                    {item.label}
                  </span>
                </div>

                {/* Normal Badge (shown in expanded mode and on mobile) */}
                {item.badge && (
                  <div className={isCollapsed ? 'md:hidden' : 'block'}>
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
              </NavLink>
            );
          })}
        </div>

        {/* Footer with Collapse Toggle (Desktop only) */}
        <div className="hidden md:flex items-center border-t border-slate-200 p-3 flex-shrink-0">
          <button
            type="button"
            onClick={toggleCollapse}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center' : 'justify-between px-3'
            } py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer`}
            title={isCollapsed ? 'Perluas Menu Sidebar' : 'Ciutkan Menu Sidebar'}
            aria-label={isCollapsed ? 'Perluas Menu Sidebar' : 'Ciutkan Menu Sidebar'}
          >
            {!isCollapsed && <span>Ciutkan Menu</span>}
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
