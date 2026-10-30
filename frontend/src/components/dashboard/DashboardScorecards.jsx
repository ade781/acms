import React from 'react';
import { ShieldCheck, Bell, UserX, Activity } from 'lucide-react';

/**
 * 4 Scorecard Utama Dashboard Operasional
 * 1. Pimpinan Shift & Kesiapan Kekuatan Dinas
 * 2. Pengumuman Terbaru
 * 3. Personel Izin / Cuti
 * 4. Agenda & Log Kegiatan Shift
 */
export default function DashboardScorecards({
  currentTeam = 'Alpha',
  supervisorName = 'Belum Ditentukan',
  latestAnnouncement = null,
  personnelComposition = { onDutyCount: 0, absentCount: 0, totalAllAbsentCount: 0, activeTeamAbsentCount: 0 },
  activities = [],
  onOpenModal = () => {},
  onKeyDown = () => {}
}) {
  const chiefDisplayName = typeof supervisorName === 'string'
    ? supervisorName
    : (supervisorName?.full_name || 'Belum Ditentukan');

  const safeActivities = Array.isArray(activities) ? activities : [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* Scorecard 1: Pimpinan Shift & Kesiapan Kekuatan Dinas */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'shift' })}
        onKeyDown={(e) => onKeyDown(e, () => onOpenModal({ type: 'shift' }))}
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600">Pimpinan & Kesiapan Shift</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-base font-bold text-slate-900 truncate" title={chiefDisplayName}>
            {chiefDisplayName}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Ketua Regu (Chief) Operasional
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Kekuatan Dinas:</span>
          <span className="font-bold font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {personnelComposition?.onDutyCount ?? 0} Personel Hadir
          </span>
        </div>
      </div>

      {/* Scorecard 2: Pengumuman Terbaru (Hanya Judul & Ringkasan) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'announcement', item: latestAnnouncement })}
        onKeyDown={(e) =>
          onKeyDown(e, () =>
            onOpenModal({ type: 'announcement', item: latestAnnouncement })
          )
        }
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Pengumuman Terbaru</span>
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          {latestAnnouncement ? (
            <>
              <div className="text-sm font-bold text-slate-900 line-clamp-1">
                {(typeof latestAnnouncement.title === 'string' ? latestAnnouncement.title : String(latestAnnouncement.title || '')).replace(/^\[MENDESAK\]\s*/i, '').trim()}
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">
                {typeof latestAnnouncement.description === 'string'
                  ? latestAnnouncement.description
                  : (latestAnnouncement.circular_number
                    ? `Surat Edaran: ${latestAnnouncement.circular_number}`
                    : 'Klik untuk membaca dokumen pengumuman.')}
              </p>
            </>
          ) : (
            <div className="py-1">
              <div className="text-sm font-bold text-slate-500">Belum Ada Pengumuman</div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                Tidak ada surat edaran atau pengumuman aktif.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scorecard 3: Personel Izin / Cuti (Keseluruhan / Regu Shift Ini) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'leave' })}
        onKeyDown={(e) => onKeyDown(e, () => onOpenModal({ type: 'leave' }))}
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Personel Izin / Cuti</span>
            <UserX className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {personnelComposition?.totalAllAbsentCount ?? personnelComposition?.absentCount ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Total Izin / Cuti Hari Ini
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">
            {(personnelComposition?.activeTeamAbsentCount ?? 0) > 0
              ? `${personnelComposition.activeTeamAbsentCount} personel shift aktif berhalangan`
              : `Regu ${String(currentTeam || '')} hadir lengkap tanpa cuti/izin`}
          </span>
        </div>
      </div>

      {/* Scorecard 4: Agenda & Log Kegiatan Shift */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'activities' })}
        onKeyDown={(e) => onKeyDown(e, () => onOpenModal({ type: 'activities' }))}
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Agenda & Log Kegiatan</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {safeActivities.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Kegiatan Shift Ini</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="truncate">
            {safeActivities.length > 0
              ? `Terbaru: ${typeof safeActivities[0]?.title === 'string' ? safeActivities[0].title : (typeof safeActivities[0]?.activity_name === 'string' ? safeActivities[0].activity_name : 'Kegiatan Operasional')}`
              : 'Belum ada kegiatan tercatat'}
          </span>
        </div>
      </div>
    </div>
  );
}

