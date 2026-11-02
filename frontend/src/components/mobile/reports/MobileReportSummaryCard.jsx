import React from 'react';
import { Truck, Radio, Users, ChevronRight } from 'lucide-react';

/**
 * Kartu Rekapitulasi Ringkas Status Operasional 24 Jam (Mobile)
 * Menampilkan ringkasan status seluruh unit armada & posko secara padat & efisien.
 * Mendukung matriks status 3 shift (Shift 1, Shift 2, Shift 3) dan status tunggal.
 * Status armada dapat diklik untuk membuka modal audit trail.
 */
export default function MobileReportSummaryCard({
  vehicles = [],
  vehiclesDaily = [],
  deployments = [],
  totalCrew = 0,
  onOpenUnitAudit,
}) {
  const displayVehicles = vehiclesDaily.length > 0 ? vehiclesDaily : vehicles;
  const totalUnits = displayVehicles.length || 8;

  const serviceableCount = displayVehicles.filter((v) => {
    if (v.shift1 || v.shift2 || v.shift3) {
      return (
        v.shift1?.status === 'serviceable' ||
        v.shift2?.status === 'serviceable' ||
        v.shift3?.status === 'serviceable'
      );
    }
    return v.status === 'serviceable';
  }).length;

  const presentDeployments = deployments.filter((d) => d.deployment_type !== 'absent');
  const crewCount = totalCrew > 0 ? totalCrew : presentDeployments.length;

  const getShiftBadge = (shiftObj, label) => {
    const status = shiftObj?.status || 'belum_dilaporkan';
    const isServ = status === 'serviceable';
    const isUnserv = status === 'unserviceable';

    return (
      <span
        key={label}
        className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
          isServ
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : isUnserv
            ? 'bg-red-50 text-red-800 border-red-200'
            : 'bg-slate-100 text-slate-500 border-slate-200'
        }`}
      >
        {label}: {isServ ? 'Serv' : isUnserv ? 'Unserv' : 'Belum'}
      </span>
    );
  };

  return (
    <div className="space-y-3 font-sans">
      {/* KPI Summary Grid Ringkas */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Kesiapan Armada & Posko */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Armada Siaga (24 Jam)
            </span>
            <Truck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums leading-none">
              {serviceableCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / <span className="font-mono tabular-nums">{totalUnits}</span> Serviceable
            </span>
          </div>
        </div>

        {/* Presensi Personel */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Personel Dinas (3 Shift)
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums leading-none">
              {crewCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Bertugas</span>
          </div>
        </div>
      </div>

      {/* Daftar Kesiapan Unit Operasional (Compact Flat Rows) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Kesiapan Unit Operasional 24 Jam
          </h4>
          <span className="text-[11px] text-slate-400">Shift 1 • 2 • 3</span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {displayVehicles.map((v, vIdx) => {
            const hasShiftData = v.shift1 || v.shift2 || v.shift3;
            const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
            const isServ = v.status === 'serviceable';
            const isUnserv = v.status === 'unserviceable';

            return (
              <div
                key={v.id ?? v.code_name ?? `veh-${vIdx}`}
                onClick={() => onOpenUnitAudit && onOpenUnitAudit(v)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenUnitAudit && onOpenUnitAudit(v);
                  }
                }}
                className="py-2.5 px-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors duration-100 cursor-pointer space-y-1.5 block focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate min-w-0">
                    <div className="flex items-center gap-1.5">
                      {isPosko && (
                        <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900 text-xs truncate">
                        <span className="font-mono tabular-nums">{v.code_name}</span> - {v.vehicle_name}
                      </span>
                    </div>
                  </div>

                  {!hasShiftData && (
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors duration-100 flex items-center gap-1.5 shrink-0 ${
                        isServ
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isUnserv
                          ? 'bg-red-50 text-red-800 border-red-300'
                          : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isServ ? 'bg-emerald-600' : isUnserv ? 'bg-red-600' : 'bg-slate-400'
                        }`}
                      />
                      <span>{isServ ? 'Serviceable' : isUnserv ? 'Unserviceable' : 'Belum Dicek'}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </div>

                {/* 3 Shift Badge Matrix untuk Mobile */}
                {hasShiftData && (
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getShiftBadge(v.shift1, 'S1')}
                      {getShiftBadge(v.shift2, 'S2')}
                      {getShiftBadge(v.shift3, 'S3')}
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
