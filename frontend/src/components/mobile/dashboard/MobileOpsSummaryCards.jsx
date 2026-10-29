import React from 'react';
import { Users, Truck } from 'lucide-react';

export default function MobileOpsSummaryCards({
  presentCount = 0,
  totalPersonnel = 0,
  absentCount = 0,
  serviceableCount = 0,
  totalVehicles = 0,
  unserviceableCount = 0,
  belumDicekCount,
  onOpenLeaveModal
}) {
  const unresolvedBelumDicek = typeof belumDicekCount === 'number'
    ? belumDicekCount
    : Math.max(0, totalVehicles - serviceableCount - unserviceableCount);
  return (
    <div className="grid grid-cols-2 gap-1.5 text-xs">
      {/* Kartu 1: Personel Dinas */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <div className="flex items-center gap-1 text-slate-600 font-bold text-[9px] uppercase tracking-wide">
            <Users className="w-3 h-3 text-slate-500" />
            <span>Personel</span>
          </div>
          {onOpenLeaveModal && (
            <button
              type="button"
              onClick={onOpenLeaveModal}
              className="text-[9.5px] font-bold text-red-600 hover:text-red-700 hover:underline transition-colors duration-100 cursor-pointer"
            >
              + Izin Saya
            </button>
          )}
        </div>
        <div className="pt-1.5 pb-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-slate-900 leading-none">
              {presentCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              / {totalPersonnel || presentCount + absentCount} Hadir
            </span>
          </div>
          <p className="text-[9px] text-amber-700 font-medium mt-0.5">
            {absentCount > 0 ? `${absentCount} Izin/Cuti` : '0 Izin/Cuti (Lengkap)'}
          </p>
        </div>
      </div>

      {/* Kartu 2: Armada & Posko Operasional */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <div className="flex items-center gap-1 text-slate-600 font-bold text-[9px] uppercase tracking-wide">
            <Truck className="w-3 h-3 text-slate-500" />
            <span>Armada & Pos</span>
          </div>
          <span className="text-[8.5px] font-mono text-slate-400">
            {totalVehicles} Unit
          </span>
        </div>
        <div className="pt-1.5 pb-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-emerald-600 leading-none">
              {serviceableCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              / {totalVehicles} Siap
            </span>
          </div>
          <div className="text-[9px] font-medium mt-0.5 flex items-center gap-1.5 flex-wrap">
            {unserviceableCount > 0 && (
              <span className="text-red-600 font-bold">{unserviceableCount} Kendala</span>
            )}
            {unresolvedBelumDicek > 0 ? (
              <span className="text-amber-700 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                {unresolvedBelumDicek} Belum Dicek
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">✓ 100% Terverifikasi</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
