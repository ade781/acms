import React from 'react';

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
  const roleTitle = user?.rank_position || (user?.role === 'chief' ? 'Ketua Regu (Chief)' : 'Kru Pelaksana');
  const stkpBadge = user?.stkp_license_number || user?.cert_level || 'STKP ARFF';

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs">
      {/* Header Kartu: Nama & Lisensi STKP */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
            {roleTitle}
          </p>
          <h2 className="text-xs font-bold text-slate-900 leading-snug">
            {userName}
          </h2>
          <p className="text-[9px] text-slate-400 font-mono">NIP: {userNip}</p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {stkpBadge}
          </span>
        </div>
      </div>

      {/* Kondisi 1: Lepas Piket (Off Duty) */}
      {isOffDuty && (
        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-0.5">
          <div className="flex items-center gap-1.5 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Status Hari Ini: Lepas Piket (Off Duty)</span>
          </div>
          <p className="text-[10px] text-amber-800 leading-snug">
            Anda tidak memiliki jadwal dinas aktif pada Shift ini. Anda tetap dapat membaca pengumuman dan memantau kesiapan operasional.
          </p>
        </div>
      )}

      {/* Kondisi 2: Sedang Tercatat Izin / Cuti Mandiri */}
      {!isOffDuty && isOnLeave && (
        <div className="p-2 rounded-lg bg-red-50/80 border border-red-200 text-red-900 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Status Hari Ini: {leaveInfo?.absent_reason ? leaveInfo.absent_reason.toUpperCase() : 'IZIN / CUTI'}</span>
            </div>
            {onOpenLeaveModal && (
              <button
                type="button"
                onClick={onOpenLeaveModal}
                className="text-[9px] font-bold text-red-700 underline"
              >
                Kelola Cuti
              </button>
            )}
          </div>
          <p className="text-[10px] text-red-800 leading-snug">
            {leaveInfo?.notes || 'Anda terdaftar tidak berdinas pada shift ini karena permohonan izin/cuti.'}
          </p>
        </div>
      )}

      {/* Kondisi 3: Dinas Aktif */}
      {!isOffDuty && !isOnLeave && (
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[9px] text-slate-500 block leading-tight">Unit Armada / Pos</span>
              {vehicleReadiness && (
                <span
                  className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                    vehicleReadiness.status === 'serviceable'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : vehicleReadiness.status === 'unserviceable'
                      ? 'bg-red-100 text-red-800 border-red-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {vehicleReadiness.status === 'serviceable'
                    ? '✓ Serviceable'
                    : vehicleReadiness.status === 'unserviceable'
                    ? '⚠️ Kendala'
                    : '⏳ Belum Dicek'}
                </span>
              )}
            </div>
            <span className="font-bold text-slate-900 text-xs block truncate mt-0.5">
              {dutyInfo?.vehicle_name || dutyInfo?.vehicle_code || 'Belum Diploting'}
            </span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
            <span className="text-[9px] text-slate-500 block leading-tight">Peran Dinas</span>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              {dutyInfo?.is_pic ? (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8.5px] font-bold">
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
