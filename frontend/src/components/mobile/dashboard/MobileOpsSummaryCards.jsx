import React from 'react';
import { Users, Truck } from 'lucide-react';

export default function MobileOpsSummaryCards({
  presentCount = 0,
  totalPersonnel = 0,
  absentCount = 0,
  serviceableCount = 0,
  totalVehicles = 0,
}) {
  const totalPers = totalPersonnel || presentCount + absentCount;
  const personnelPercent = Math.min(100, Math.round((presentCount / Math.max(1, totalPers)) * 100));
  const vehiclePercent = Math.min(100, Math.round((serviceableCount / Math.max(1, totalVehicles)) * 100));

  return (
    <div className="grid grid-cols-2 gap-2.5 text-xs font-sans">
      {/* Kartu 1: Personel Dinas */}
      <div className="bg-white p-3 rounded-2xl border border-[#DDD5C7] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.05),0_1px_2px_rgba(28,25,23,0.03)] flex flex-col justify-between space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#F5F2EB] border border-[#E5DEC9] flex items-center justify-center text-[#44403C] shrink-0">
            <Users className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider truncate">
            Personel
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-[#1C1917] leading-none">
            {presentCount}
          </span>
          <span className="text-xs text-[#78716C] font-medium">
            / <span className="font-mono tabular-nums">{totalPers}</span> Hadir
          </span>
        </div>

        <div className="h-1.5 w-full bg-[#EFECE6] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#1C1917] rounded-full transition-colors duration-100"
            style={{ width: `${personnelPercent}%` }}
          />
        </div>
      </div>

      {/* Kartu 2: Armada & Posko Operasional */}
      <div className="bg-white p-3 rounded-2xl border border-[#DDD5C7] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.05),0_1px_2px_rgba(28,25,23,0.03)] flex flex-col justify-between space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[#57534E] uppercase tracking-wider truncate">
            Armada & Pos
          </span>
        </div>

        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold font-mono tabular-nums text-emerald-700 leading-none">
            {serviceableCount}
          </span>
          <span className="text-xs text-[#78716C] font-medium">
            / <span className="font-mono tabular-nums">{totalVehicles}</span> Serviceable
          </span>
        </div>

        <div className="h-1.5 w-full bg-[#EFECE6] rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-colors duration-100"
            style={{ width: `${vehiclePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
