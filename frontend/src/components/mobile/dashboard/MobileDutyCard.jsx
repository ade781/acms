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
  const userNip = user?.nip || user?.username || '-';
  const rawRank = user?.rank_position && !/ketua regu\s*\(chief\)\s*operasional/i.test(user.rank_position)
    ? user.rank_position
    : '';
  const stkpBadge = user?.stkp_license_number || user?.cert_level || 'STKP ARFF';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs font-sans">
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
          <p className="text-xs text-slate-400">NIP: <span className="font-mono tabular-nums">{userNip}</span></p>
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
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs text-slate-500 block leading-tight">Unit Armada / Pos</span>
              {vehicleReadiness && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${vehicleReadiness.status === 'serviceable'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : vehicleReadiness.status === 'unserviceable'
                        ? 'bg-red-100 text-red-800 border-red-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                >
                  {vehicleReadiness.status === 'serviceable' ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Serviceable</span>
                    </>
                  ) : vehicleReadiness.status === 'unserviceable' ? (
                    <>
                      <AlertTriangle className="w-3 h-3 text-red-600 shrink-0" />
                      <span>Kendala</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>Belum Dicek</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <span className="font-bold text-slate-900 text-xs block truncate mt-0.5">
              {dutyInfo?.vehicle_name || dutyInfo?.vehicle_code || 'Belum Diploting'}
            </span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="text-xs text-slate-500 block leading-tight">Peran Dinas</span>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {dutyInfo?.is_pic ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                  PIC
                </span>
              ) : null}
              <span className="font-bold text-slate-900 text-xs truncate">
                {dutyInfo?.role_name || (dutyInfo?.is_pic ? 'Operator Utama' : 'Kru Lapangan')}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
