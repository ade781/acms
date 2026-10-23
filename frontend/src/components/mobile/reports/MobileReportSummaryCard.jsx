import React from 'react';
import { Truck, ShieldCheck, AlertTriangle, Users, Calendar, Clock, ChevronRight } from 'lucide-react';

/**
 * Kartu Rekapitulasi Ringkas Status Operasional Shift (Mobile)
 * Menampilkan ringkasan status 8 unit armada dan presensi kru secara padat & efisien (flat compact rows).
 * Status armada dapat diklik untuk membuka modal audit trail.
 */
export default function MobileReportSummaryCard({
  vehicles = [],
  watchroomData = {},
  deployments = [],
  absents = [],
  onOpenUnitAudit,
}) {
  const totalVehicles = vehicles.length + (watchroomData?.status ? 1 : 0);
  const serviceableCount =
    vehicles.filter((v) => v.status === 'serviceable').length +
    (watchroomData?.status === 'serviceable' ? 1 : 0);
  const unserviceableCount =
    vehicles.filter((v) => v.status === 'unserviceable').length +
    (watchroomData?.status === 'unserviceable' ? 1 : 0);

  return (
    <div className="space-y-2">
      {/* KPI Summary Grid Ringkas */}
      <div className="grid grid-cols-2 gap-1.5 text-xs">
        {/* Kesiapan Armada */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Kesiapan Armada
            </span>
            <Truck className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 leading-none">
              {serviceableCount}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              / {Math.max(totalVehicles, 8)} Siap
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px]">
            {unserviceableCount > 0 ? (
              <span className="px-1.5 py-0.2 rounded font-bold bg-red-100 text-red-700">
                {unserviceableCount} Unserviceable
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-700">
                100% Serviceable
              </span>
            )}
          </div>
        </div>

        {/* Presensi Personel */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Personel Dinas
            </span>
            <Users className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 leading-none">
              {deployments.length}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Hadir Terploting</span>
          </div>
          <div className="flex items-center gap-1.5 text-[9px]">
            {absents.length > 0 ? (
              <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800">
                {absents.length} Izin / Cuti
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-700">
                Nihil Izin / Lengkap
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Kesiapan 8 Unit Armada (Compact Flat Rows - Sesuai Aturan GEMINI.md Butir 6) */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Kesiapan 8 Unit Operasional
            </h4>
            <p className="text-[9px] text-slate-500">
              Klik status unit untuk memeriksa riwayat perbaikan & audit trail
            </p>
          </div>
          <span className="text-[9.5px] font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
            {serviceableCount}/{Math.max(totalVehicles, 8)} Siap
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {vehicles.map((v) => {
            const isServ = v.status === 'serviceable';
            const isUnserv = v.status === 'unserviceable';

            return (
              <div
                key={v.id || v.code_name}
                className="py-1.5 first:pt-0 last:pb-0 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-[11px] truncate">
                        {v.code_name} - {v.vehicle_name}
                      </span>
                      <span className="text-[8px] px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-mono uppercase">
                        {v.category === 'utama' ? 'Utama' : 'Pendukung'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 mt-0.5">
                      <span>PIC: <strong className="text-slate-700">{v.pic_name || 'Belum Ada'}</strong></span>
                    </div>
                  </div>

                  {/* Tombol Status interaktif memicu Modal Audit Trail */}
                  <button
                    type="button"
                    onClick={() => onOpenUnitAudit && onOpenUnitAudit(v)}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors duration-100 flex items-center gap-1 shrink-0 ${
                      isServ
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : isUnserv
                        ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                        : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                    }`}
                    title="Klik untuk membuka riwayat audit kendala unit"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isServ ? 'bg-emerald-600' : isUnserv ? 'bg-red-600' : 'bg-slate-400'
                      }`}
                    />
                    <span>{isServ ? 'Serviceable' : isUnserv ? 'Unserviceable' : 'Belum Lapor'}</span>
                    <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
                  </button>
                </div>

                {/* Justifikasi kendala singkat jika unserviceable */}
                {isUnserv && v.justification && (
                  <div className="p-1 rounded bg-red-50/80 border border-red-200 text-red-800 text-[9px] flex items-center justify-between gap-1">
                    <span className="truncate">Kendala: {v.justification}</span>
                    <button
                      type="button"
                      onClick={() => onOpenUnitAudit && onOpenUnitAudit(v)}
                      className="text-[8.5px] text-red-700 font-bold underline shrink-0 hover:text-red-900"
                    >
                      Riwayat
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Posko Watchroom */}
          <div className="py-1.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-[11px] truncate">
                    WATCHROOM - Posko ARFF
                  </span>
                  <span className="text-[8px] px-1 py-0.2 rounded bg-blue-50 text-blue-700 font-mono uppercase">
                    Posko
                  </span>
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5">
                  Sistem monitoring & komunikasi darurat bandara
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  onOpenUnitAudit &&
                  onOpenUnitAudit({
                    id: 'WATCHROOM',
                    code_name: 'WATCHROOM',
                    vehicle_name: 'Posko ARFF',
                    category: 'posko',
                    status: watchroomData?.status || 'serviceable',
                    justification: watchroomData?.notes || '',
                  })
                }
                className="px-2 py-0.5 rounded-full text-[9px] font-bold border transition-colors duration-100 flex items-center gap-1 shrink-0 bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>{watchroomData?.status === 'unserviceable' ? 'Unserviceable' : 'Serviceable'}</span>
                <ChevronRight className="w-2.5 h-2.5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
