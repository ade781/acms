import React from 'react';
import { ShieldCheck, Truck, UserCheck, CalendarOff } from 'lucide-react';
import { cleanNotes } from '../../../utils/leaveHelpers';

export default function MobileDutyCard({
  user,
  dutyInfo,
  isOffDuty,
  isOnLeave,
  leaveInfo,
  onOpenLeaveModal,
}) {
  const userName = user?.name || user?.full_name || 'Personel ARFF';
  const rawRank = user?.rank_position && !/ketua regu\s*\(chief\)\s*operasional/i.test(user.rank_position)
    ? user.rank_position
    : '';
  const stkpBadge = user?.stkp_license_number || user?.cert_level || 'STKP ARFF';

  // Sanitasi nama peran dinas agar tidak terjadi teks dobel dengan badge (misal: [PIC] Operator Utama (PIC) atau [Kru] Kru Lapangan)
  const getDisplayRole = () => {
    let name = dutyInfo?.role_name || (dutyInfo?.is_pic ? 'Operator Utama' : 'Operator Lapangan');
    if (dutyInfo?.is_pic) {
      name = name.replace(/\(PIC\)/gi, '').replace(/^PIC\s*/gi, '').trim();
      return name || 'Operator Utama';
    }
    name = name.replace(/^Kru\s+/gi, '').trim();
    return name || 'Operator Lapangan';
  };

  // Opsi 4: Soft-Tactile Warm Linen & Vermilion (Konsep 2 Soft-Tactile)
  const containerClass = isOffDuty
    ? 'bg-[#F5F5F4] rounded-2xl border border-[#E7E5E4] border-l-4 border-l-[#A8A29E] shadow-none overflow-hidden font-sans'
    : isOnLeave
      ? 'bg-white rounded-2xl border border-[#E7E5E4] border-l-4 border-l-amber-500 shadow-[0_4px_14px_-3px_rgba(245,158,11,0.08),0_1px_3px_rgba(28,25,23,0.04)] overflow-hidden font-sans'
      : 'bg-white rounded-2xl border border-[#E7E5E4] border-l-4 border-l-[#EA580C] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_6px_14px_-3px_rgba(28,25,23,0.05)] overflow-hidden font-sans';

  const headerClass = isOffDuty
    ? 'bg-transparent px-3.5 py-2.5'
    : isOnLeave
      ? 'bg-gradient-to-r from-[#FEF2F2]/70 via-[#FFFDF9] to-[#FEF3C7]/40 border-b border-[#E7E5E4] px-3.5 py-3'
      : 'bg-gradient-to-r from-[#FAF8F5] via-white to-[#FFF7ED] border-b border-[#E7E5E4] px-3.5 py-3';

  const stkpBadgeClass = isOffDuty
    ? 'bg-white text-stone-600 border border-stone-200 shadow-none'
    : isOnLeave
      ? 'bg-amber-50 text-amber-800 border border-amber-200'
      : 'bg-[#FFF7ED] text-[#C2410C] border border-[#FDBA74]';

  const stkpIconClass = isOffDuty ? 'text-stone-400' : isOnLeave ? 'text-amber-600' : 'text-[#EA580C]';

  return (
    <div className={containerClass}>
      {/* Bagian Header Dossier Petugas */}
      <div className={`${headerClass} flex items-center justify-between gap-2`}>
        <div className="min-w-0">
          {rawRank && (
            <p className={`text-xs font-bold uppercase tracking-wider leading-tight truncate ${isOffDuty ? 'text-stone-500' : 'text-[#78716C]'}`}>
              {rawRank}
            </p>
          )}
          <h2 className={`text-base font-bold tracking-tight mt-0.5 truncate ${isOffDuty ? 'text-stone-800' : 'text-[#1C1917]'}`}>
            {userName}
          </h2>
        </div>
        <div className="shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono tabular-nums font-bold shadow-2xs ${stkpBadgeClass}`}>
            <ShieldCheck className={`w-3.5 h-3.5 ${stkpIconClass} shrink-0`} />
            <span>{stkpBadge}</span>
          </span>
        </div>
      </div>

      {/* Bagian Isi Kartu (Hanya dirender jika TIDAK off-duty) */}
      {!isOffDuty && (
        <div className="p-3.5">
          {/* Kondisi 1: Sedang Tercatat Izin / Cuti Mandiri */}
          {isOnLeave && (
            <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-200/80 text-red-900 text-xs space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <CalendarOff className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Status Hari Ini: {leaveInfo?.absent_reason ? leaveInfo.absent_reason.toUpperCase() : 'IZIN / CUTI'}</span>
                </div>
                {onOpenLeaveModal && (
                  <button
                    type="button"
                    onClick={onOpenLeaveModal}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-red-50 text-red-700 border border-red-200 shadow-2xs text-xs font-bold shrink-0 transition-colors duration-100"
                  >
                    Rincian Cuti
                  </button>
                )}
              </div>
              {leaveInfo?.notes && cleanNotes(leaveInfo.notes) !== '-' && (
                <p className="text-xs text-red-800 leading-snug">
                  {cleanNotes(leaveInfo.notes)}
                </p>
              )}
            </div>
          )}

          {/* Kondisi 2: Dinas Aktif — Debossed Tactile Wells */}
          {!isOnLeave && (
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F5F5F4] p-2.5 rounded-xl border border-[#E7E5E4] shadow-[inset_0_2px_4px_rgba(28,25,23,0.04)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#78716C]">
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium leading-tight">Unit Armada / Pos</span>
                  </div>
                  <span
                    className="font-bold text-[#1C1917] text-xs block truncate mt-1"
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

                <div className="bg-[#F5F5F4] p-2.5 rounded-xl border border-[#E7E5E4] shadow-[inset_0_2px_4px_rgba(28,25,23,0.04)] flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-[#78716C]">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-xs font-medium leading-tight">Peran Dinas</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {dutyInfo?.vehicle_id ? (
                      <>
                        {dutyInfo?.is_pic ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-100/90 text-amber-900 border border-amber-300 text-xs font-bold shrink-0">
                            PIC
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200 text-xs font-bold shrink-0">
                            Kru
                          </span>
                        )}
                        <span className="font-bold text-[#1C1917] text-xs truncate">
                          {getDisplayRole()}
                        </span>
                      </>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-[#EFECE6] text-[#44403C] text-xs font-bold shrink-0 border border-[#DFD7CB]">
                        Standby
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner Konfirmasi Siaga Dinas untuk Kru */}
              {!dutyInfo?.is_pic && Boolean(dutyInfo?.vehicle_id) && dutyInfo?.vehicle_code && (
                <div className="p-2 rounded-xl bg-orange-50/70 border border-orange-200 text-orange-950 text-xs flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] shrink-0" />
                    <span>Penugasan Siaga</span>
                  </span>
                  <span className="font-bold text-[#C2410C] text-xs font-sans">
                    Siaga Operasional
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
