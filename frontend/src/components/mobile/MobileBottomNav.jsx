import React from 'react';
import { LayoutGrid, Users, Clock, AlertTriangle, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav({ activeTab = 'dashboard', onTabChange, isChief: propIsChief }) {
  const { user } = useAuth();
  const userRole = (user?.role || '').toLowerCase();
  const isManagerialRole = ['admin', 'chief', 'chief_assistant', 'operation_chief', 'supervisor'].includes(userRole) || Boolean(propIsChief);

  if (!isManagerialRole) {
    // Nav Kru: Tepat 3 Menu Baku (Dashboard, Kegiatan, Laporan)
    return (
      <nav className="fixed bottom-0 z-40 w-full max-w-[412px] bg-white border-t border-slate-200 px-2 py-1 shadow-lg safe-pb">
        <div id="nav-kru-container" className="grid grid-cols-3 gap-1 text-[11px]">
          <button
            type="button"
            id="nav-btn-dashboard-kru"
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
              activeTab === 'dashboard'
                ? 'text-red-600 font-bold'
                : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            id="nav-btn-kegiatan-kru"
            onClick={() => onTabChange('kegiatan')}
            className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
              activeTab === 'kegiatan'
                ? 'text-red-600 font-bold'
                : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <Clock className="w-4 h-4 mb-0.5" />
            <span>Kegiatan</span>
          </button>

          <button
            type="button"
            id="nav-btn-laporan-kru"
            onClick={() => onTabChange('laporan')}
            className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
              activeTab === 'laporan'
                ? 'text-red-600 font-bold'
                : 'text-slate-400 font-medium hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4 mb-0.5" />
            <span>Laporan</span>
          </button>
        </div>
      </nav>
    );
  }

  // Nav Chief / Admin: Tepat 5 Menu Baku (Dashboard, Ploting, Kegiatan, Insiden, Laporan)
  return (
    <nav className="fixed bottom-0 z-40 w-full max-w-[412px] bg-white border-t border-slate-200 px-1 py-1 shadow-lg safe-pb">
      <div id="nav-chief-container" className="grid grid-cols-5 gap-0.5 text-[10px]">
        <button
          type="button"
          id="nav-btn-dashboard-chief"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
            activeTab === 'dashboard'
              ? 'text-red-600 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-700'
          }`}
        >
          <LayoutGrid className="w-4 h-4 mb-0.5" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          id="nav-btn-ploting"
          onClick={() => onTabChange('ploting')}
          className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
            activeTab === 'ploting'
              ? 'text-red-600 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4 mb-0.5" />
          <span>Ploting</span>
        </button>

        <button
          type="button"
          id="nav-btn-kegiatan"
          onClick={() => onTabChange('kegiatan')}
          className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
            activeTab === 'kegiatan'
              ? 'text-red-600 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4 mb-0.5" />
          <span>Kegiatan</span>
        </button>

        <button
          type="button"
          id="nav-btn-insiden"
          onClick={() => onTabChange('insiden')}
          className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
            activeTab === 'insiden'
              ? 'text-red-600 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4 mb-0.5" />
          <span>Insiden</span>
        </button>

        <button
          type="button"
          id="nav-btn-laporan-chief"
          onClick={() => onTabChange('laporan')}
          className={`flex flex-col items-center justify-center py-1 transition-colors duration-100 tap-target ${
            activeTab === 'laporan'
              ? 'text-red-600 font-bold'
              : 'text-slate-400 font-medium hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4 mb-0.5" />
          <span>Laporan</span>
        </button>
      </div>
    </nav>
  );
}
