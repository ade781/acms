import React from 'react';
import { Users, Truck } from 'lucide-react';

export default function MobileOpsSummaryCards({
  presentCount = 0,
  totalPersonnel = 0,
  absentCount = 0,
  serviceableCount = 0,
  totalVehicles = 0,
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5 text-xs font-sans">
      {/* Kartu 1: Personel Dinas */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <div className="flex items-center gap-1 text-slate-600 font-bold text-xs uppercase tracking-wide">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>Personel</span>
          </div>
        </div>
        <div className="pt-1.5 pb-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-slate-900 font-mono tabular-nums leading-none">
              {presentCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / <span className="font-mono tabular-nums">{totalPersonnel || presentCount + absentCount}</span> Hadir
            </span>
          </div>
        </div>
      </div>

      {/* Kartu 2: Armada & Posko Operasional */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <div className="flex items-center gap-1 text-slate-600 font-bold text-xs uppercase tracking-wide">
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>Armada & Pos</span>
          </div>
        </div>
        <div className="pt-1.5 pb-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-base font-black text-emerald-600 font-mono tabular-nums leading-none">
              {serviceableCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              / <span className="font-mono tabular-nums">{totalVehicles}</span> Serviceable
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
