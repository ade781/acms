import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users2,
  Calendar,
  Truck,
  Radio,
  UserCheck,
  UserX,
  AlertTriangle,
  ClipboardList,
  FileText,
  Sliders,
  X,
  Activity,
  Bell,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Logo from '../common/Logo';
import Badge from '../common/Badge';

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin } = useAuth();
  const [unreadAnnouncements, setUnreadAnnouncements] = React.useState(0);

  React.useEffect(() => {
    let isMounted = true;
    const checkUnread = async () => {
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
    const interval = setInterval(checkUnread, 45000);
    return () => {
      isMounted = false;
      clearInterval(interval);
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
      to: '/readiness/vehicles',
      label: 'Kesiapan Armada',
      icon: Truck,
    },
    {
      to: '/personnel',
      label: 'Data Personel',
      icon: UserCheck,
    },
    {
      to: '/incidents',
      label: 'Laporan Insiden',
      icon: AlertTriangle,
    },
    {
      to: '/leave',
      label: 'Pencatatan Cuti',
      icon: UserX,
    },
    {
      to: '/activities',
      label: 'Logbook Kegiatan',
      icon: ClipboardList,
    },
    {
      to: '/reports',
      label: 'Laporan Dinas',
      icon: FileText,
    },
    {
      to: '/schedules',
      label: 'Jadwal Dinas',
      icon: Calendar,
    },
    {
      to: '/announcements',
      label: 'Pengumuman',
      icon: Bell,
      badge: unreadAnnouncements > 0 ? unreadAnnouncements : null,
      isAlertBadge: true,
    },
  ];

  const linkClasses = ({ isActive }) =>

    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium min-h-[44px] transition-colors duration-100 select-none ${
      isActive
        ? 'bg-red-50 text-arff-primary font-semibold border-l-4 border-arff-primary pl-2.5'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <>
      {/* Mobile Backdrop without blur */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200">
          <Logo className="h-8 w-8" />
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Tutup navigasi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold tracking-wider uppercase text-slate-400">
            Operasional Dinas
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  if (window.innerWidth < 768) {
                    onClose();
                  }
                }}
                className={linkClasses}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  item.isAlertBadge ? (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-red-600 text-white shadow-xs">
                      {item.badge}
                    </span>
                  ) : (
                    <Badge variant="pending" size="sm">
                      {item.badge}
                    </Badge>
                  )
                )}
              </NavLink>
            );
          })}
        </div>
      </aside>
    </>
  );
}
