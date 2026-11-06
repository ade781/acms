import React from 'react';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default function MobileDutyCard({
  user,
  dutyInfo,
  isOffDuty,
  isOnLeave,
  leaveInfo,
  onOpenLeaveModal,
  vehicleReadiness,
}) {
  const userName = user?.name || user?.full_name || 'Personel ARFF';
  const rawRank = user?.rank_position && !/ketua regu\s*\(chief\)\s*operasional/i.test(user.rank_position)
    ? user.rank_position
    : '';
  const stkpBadge = user?.stkp_license_number || user?.cert_level || 'STKP ARFF';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] relative overflow-hidden font-sans">
      {/* Subtle Top Warm Amber Highlight Bar */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-300/70 via-amber-400/90 to-red-400/70"
      />
      {/* Header Kartu: Nama & Lisensi STKP */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
        <div>
          {rawRank && (
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 leading-tight">
              {rawRank}
            </p>
          )}
          <h2 className="text-sm font-bold text-slate-900 leading-snug">
            {userName}
          </h2>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="px-1.5 py-0.5 rounded text-xs font-mono tabular-nums font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {stkpBadge}
          </span>
        </div>
      </div>

      {/* Kondisi 1: Lepas Piket (Off Duty) */}
      {isOffDuty && (
        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 font-bold text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Status Hari Ini: Lepas Piket (Off Duty)</span>
          </div>
          <p className="text-xs text-amber-800 leading-snug">
            Tidak ada jadwal dinas aktif pada shift ini.
          </p>
        </div>
      )}

      {/* Kondisi 2: Sedang Tercatat Izin / Cuti Mandiri */}
      {!isOffDuty && isOnLeave && (
        <div className="p-2 rounded-lg bg-red-50/80 border border-red-200 text-red-900 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Status Hari Ini: {leaveInfo?.absent_reason ? leaveInfo.absent_reason.toUpperCase() : 'IZIN / CUTI'}</span>
            </div>
            {onOpenLeaveModal && (
              <button
                type="button"
                onClick={onOpenLeaveModal}
                className="text-xs font-bold text-red-700 underline"
              >
                Kelola Cuti
              </button>
            )}
          </div>
          {leaveInfo?.notes && (
            <p className="text-xs text-red-800 leading-snug">
              {leaveInfo.notes}
            </p>
          )}
        </div>
      )}

      {/* Kondisi 3: Dinas Aktif */}
      {!isOffDuty && !isOnLeave && (
        <div className="space-y-1.5 text-xs">
          <div className="grid grid-cols-2 gap-1.5">
            <div className="bg-[#F8FAFC] border border-[#E6ECF5] rounded-lg p-2 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-slate-500 block leading-tight">Unit Armada / Pos</span>
              </div>
              <span
                className="font-bold text-slate-900 text-xs block truncate mt-0.5"
                title={dutyInfo?.vehicle_name || dutyInfo?.vehicle_code || 'Belum Diploting'}
              >
                {dutyInfo?.vehicle_id ? (
                  dutyInfo?.vehicle_code
                    ? (dutyInfo?.vehicle_name && dutyInfo.vehicle_name !== dutyInfo.vehicle_code
                      ? `${dutyInfo.vehicle_code} • ${dutyInfo.vehicle_name}`
                      : dutyInfo.vehicle_code)
                    : (dutyInfo?.vehicle_name || 'Terploting')
                ) : (
                  'Belum Diploting'
                )}
              </span>
            </div>
            <div className="bg-[#F8FAFC] border border-[#E6ECF5] rounded-lg p-2">
              <span className="text-xs text-slate-500 block leading-tight">Peran Dinas</span>
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {dutyInfo?.vehicle_id ? (
                  <>
                    {dutyInfo?.is_pic ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-300 text-xs font-bold shrink-0">
                        PIC
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-xs font-bold shrink-0">
                        Kru
                      </span>
                    )}
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {dutyInfo?.role_name || (dutyInfo?.is_pic ? 'Operator Utama' : 'Kru Lapangan')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold shrink-0 border border-slate-200">
                      Standby
                    </span>
                    <span className="font-bold text-slate-600 text-xs truncate">
                      Menunggu Ploting Dinas
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Banner Konfirmasi Siaga Dinas untuk Kru */}
          {!dutyInfo?.is_pic && Boolean(dutyInfo?.vehicle_id) && dutyInfo?.vehicle_code && (
            <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <span className="font-semibold text-xs flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                <span>Terploting Aktif: {dutyInfo.vehicle_code}</span>
              </span>
              <span className="font-bold text-blue-700 text-xs font-sans">
                Siaga Operasional
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
