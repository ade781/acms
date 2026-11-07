import React from 'react';
import { LayoutGrid, Users, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav({
  isOnDuty = true,
  activeTab = 'dashboard',
  onTabChange,
  isChief: propIsChief,
}) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isManagerialRole =
    ['admin', 'chief', 'chief_assistant', 'operation_chief', 'supervisor'].includes(userRole) ||
    Boolean(propIsChief);

  // Opsi 3: Adaptive Expanding Pill (Ultra-Minimalis & Layar Lebih Lega)
  // Floating capsule ramping: item tidak aktif hanya menampilkan ikon,
  // sedangkan item aktif melebar menjadi kapsul warna terpadu dengan ikon & label.
  const kruItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, buttonId: 'nav-btn-dashboard-kru' },
    { id: 'kegiatan', label: 'Kegiatan', icon: Clock, buttonId: 'nav-btn-kegiatan-kru' },
    { id: 'laporan', label: 'Laporan', icon: FileText, buttonId: 'nav-btn-laporan-kru' },
  ];

      const chiefItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, buttonId: 'nav-btn-dashboard-chief' },
        { id: 'ploting', label: 'Ploting', icon: Users, buttonId: 'nav-btn-ploting' },
        { id: 'kegiatan', label: 'Kegiatan', icon: Clock, buttonId: 'nav-btn-kegiatan' },
        { id: 'insiden', label: 'Insiden', icon: AlertTriangle, buttonId: 'nav-btn-insiden' },
        { id: 'laporan', label: 'Laporan', icon: FileText, buttonId: 'nav-btn-laporan-chief' },
      ];

      const currentItems = isManagerialRole ? chiefItems : kruItems;

      const getActivePillClass = () => {
        if (isOnDuty) {
          return 'bg-[#FFF7ED] text-[#EA580C] ring-1 ring-[#FDBA74]/90 shadow-2xs font-bold';
        }
        return 'bg-stone-100 text-stone-900 ring-1 ring-stone-300 shadow-2xs font-bold';
      };

      return (
        <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none px-3 pb-2.5 pt-1 safe-pb font-sans">
          <nav
            className="pointer-events-auto mx-auto w-fit max-w-[calc(100vw-2rem)] rounded-full border border-stone-200/90 bg-white/95 shadow-[0_8px_24px_-4px_rgba(28,25,23,0.1),0_2px_6px_rgba(28,25,23,0.04)] p-1.5 flex items-center justify-center gap-1 transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]"
          >
              <div
                id={isManagerialRole ? 'nav-chief-container' : 'nav-kru-container'}
                className="flex items-center gap-1 text-xs"
              >
                {currentItems.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={item.buttonId}
                      onClick={() => onTabChange(item.id)}
                      className={`relative flex items-center justify-center h-9 rounded-full text-xs tap-target overflow-hidden select-none cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                        isActive
                          ? `w-[110px] px-3 ${getActivePillClass()}`
                          : 'w-[38px] px-0 text-stone-400 hover:text-stone-700 hover:bg-stone-100/70'
                      } active:scale-95`}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          isActive ? 'scale-105' : 'scale-100'
                        }`}
                      />
                      <span
                        className={`whitespace-nowrap tracking-tight font-bold text-xs leading-none overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          isActive
                            ? 'max-w-[70px] opacity-100 ml-1.5 translate-x-0'
                            : 'max-w-0 opacity-0 ml-0 -translate-x-2 pointer-events-none'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>
          </nav>
        </div>
      );
    }
