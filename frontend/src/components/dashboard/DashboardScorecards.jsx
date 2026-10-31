import React from 'react';
import { ShieldCheck, Bell, UserX, Activity } from 'lucide-react';
import { cleanAnnouncementDescription, cleanAnnouncementTitle } from '../../utils/shiftHelper';

/**
 * 4 Scorecard Utama Dashboard Operasional ARFF YIA
 * 1. Pimpinan Shift & Kesiapan Kekuatan Dinas
 * 2. Pengumuman Terbaru
 * 3. Personel Izin / Cuti
 * 4. Agenda & Log Kegiatan Shift
 *
 * Menerapkan Anti Flash-of-Zero (Skeleton pulsing saat loading data awal)
 * dan palet netral berwibawa (bg-slate-100 text-slate-700) untuk wadah ikon.
 */
export default function DashboardScorecards({
  loading = false,
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
  const absentCount = personnelComposition?.totalAllAbsentCount ?? personnelComposition?.absentCount ?? 0;
  const onDutyCount = personnelComposition?.onDutyCount ?? 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-sans">
      {/* Scorecard 1: Pimpinan Shift & Kesiapan Kekuatan Dinas */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'shift' })}
        onKeyDown={(e) => onKeyDown(e, () => onOpenModal({ type: 'shift' }))}
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-3.5 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600 truncate">Regu & Pimpinan Shift</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          {loading ? (
            <div className="space-y-1.5 py-0.5">
              <div className="h-4 w-28 bg-slate-200/70 rounded animate-pulse" />
              <div className="h-3 w-36 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="text-sm font-bold text-slate-900 truncate" title={chiefDisplayName}>
              {chiefDisplayName}
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Regu {String(currentTeam || '')}</span>
          {loading ? (
            <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
          ) : (
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <span className="font-mono tabular-nums font-bold">{onDutyCount}</span> Personel Hadir
            </span>
          )}
        </div>
      </div>

      {/* Scorecard 2: Pengumuman Terbaru */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'announcement', item: latestAnnouncement })}
        onKeyDown={(e) =>
          onKeyDown(e, () =>
            onOpenModal({ type: 'announcement', item: latestAnnouncement })
          )
        }
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-3.5 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600 truncate">Pengumuman Terbaru</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Bell className="w-3.5 h-3.5" />
            </div>
          </div>
          {loading ? (
            <div className="space-y-1.5 py-0.5">
              <div className="h-4 w-32 bg-slate-200/70 rounded animate-pulse" />
              <div className="h-3 w-44 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : latestAnnouncement ? (
            <>
              <div className="text-sm font-bold text-slate-900 line-clamp-1">
                {cleanAnnouncementTitle(latestAnnouncement.title) || 'Pengumuman Dinas'}
              </div>
              {(() => {
                const cleanDesc = cleanAnnouncementDescription(latestAnnouncement.description);
                return cleanDesc ? (
                  <p className="text-xs text-slate-500 line-clamp-1 mt-0.5 leading-snug">
                    {cleanDesc}
                  </p>
                ) : null;
              })()}
            </>
          ) : (
            <div className="py-0.5">
              <div className="text-sm font-bold text-slate-500">Belum Ada Pengumuman</div>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {loading ? (
            <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
          ) : (
            <span className="truncate">
              {latestAnnouncement?.circular_number ? (
                <>
                  No: <span className="font-mono tabular-nums">{latestAnnouncement.circular_number}</span>
                </>
              ) : (
                'Surat Edaran Dinas'
              )}
            </span>
          )}
        </div>
      </div>

      {/* Scorecard 3: Personel Izin / Cuti */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'leave' })}
        onKeyDown={(e) => onKeyDown(e, () => onOpenModal({ type: 'leave' }))}
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-3.5 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600 truncate">Personel Izin / Cuti</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-baseline gap-2 py-0.5">
              <div className="h-6 w-8 bg-slate-200/70 rounded animate-pulse" />
              <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {absentCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Izin / Cuti Hari Ini
              </span>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {loading ? (
            <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
          ) : (
            <span className="truncate">
              {(personnelComposition?.activeTeamAbsentCount ?? 0) > 0 ? (
                <>
                  <span className="font-mono tabular-nums font-semibold text-slate-700">
                    {personnelComposition.activeTeamAbsentCount}
                  </span>{' '}
                  personel Regu {String(currentTeam || '')} izin/cuti
                </>
              ) : (
                `Tidak ada cuti di Regu ${String(currentTeam || '')}`
              )}
            </span>
          )}
        </div>
      </div>

      {/* Scorecard 4: Agenda & Log Kegiatan Shift */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenModal({ type: 'activities' })}
        onKeyDown={(e) => onKeyDown(e, () => onOpenModal({ type: 'activities' }))}
        className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-3.5 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <div>
          <div className="flex items-center justify-between gap-2 text-slate-500 mb-1">
            <span className="text-xs font-semibold text-slate-600 truncate">Agenda & Log Kegiatan</span>
            <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          {loading ? (
            <div className="flex items-baseline gap-2 py-0.5">
              <div className="h-6 w-8 bg-slate-200/70 rounded animate-pulse" />
              <div className="h-3.5 w-24 bg-slate-100 rounded animate-pulse" />
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
                {safeActivities.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Kegiatan Shift Ini</span>
            </div>
          )}
        </div>

        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          {loading ? (
            <div className="h-3.5 w-32 bg-slate-100 rounded animate-pulse" />
          ) : (
            <span className="truncate">
              {safeActivities.length > 0
                ? `Terbaru: ${typeof safeActivities[0]?.title === 'string' ? safeActivities[0].title : (typeof safeActivities[0]?.activity_name === 'string' ? safeActivities[0].activity_name : 'Kegiatan Operasional')}`
                : 'Belum ada kegiatan tercatat'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
