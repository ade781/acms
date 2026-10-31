import React from 'react';
import { Truck, Users, ChevronRight } from 'lucide-react';

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
  const pureVehicles = vehicles.filter(
    (v) => v.category !== 'posko' && v.code_name !== 'WATCHROOM'
  );
  const totalVehicles = pureVehicles.length + 1;
  const serviceableCount =
    pureVehicles.filter((v) => v.status === 'serviceable').length +
    (watchroomData?.status === 'serviceable' ? 1 : 0);
  const unserviceableCount =
    pureVehicles.filter((v) => v.status === 'unserviceable').length +
    (watchroomData?.status === 'unserviceable' ? 1 : 0);
  const uncheckedCount =
    pureVehicles.filter((v) => !v.status || v.status === 'belum_dilaporkan').length +
    (!watchroomData?.status || watchroomData?.status === 'belum_dilaporkan' ? 1 : 0);

  const presentDeployments = deployments.filter((d) => d.deployment_type !== 'absent');

  return (
    <div className="space-y-3 font-sans">
      {/* KPI Summary Grid Ringkas */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Kesiapan Armada */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kesiapan Armada
            </span>
            <Truck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums leading-none">
              {serviceableCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / <span className="font-mono tabular-nums">{totalVehicles || 8}</span> Serviceable
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {unserviceableCount > 0 ? (
              <span className="px-2 py-0.5 rounded font-bold bg-red-100 text-red-700">
                <span className="font-mono tabular-nums">{unserviceableCount}</span> Unserviceable
              </span>
            ) : uncheckedCount > 0 ? (
              <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                <span className="font-mono tabular-nums">{uncheckedCount}</span> Belum Dicek
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                Seluruh Unit Serviceable
              </span>
            )}
          </div>
        </div>

        {/* Presensi Personel */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Personel Dinas
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums leading-none">
              {presentDeployments.length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Hadir</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            {absents.length > 0 ? (
              <span className="px-2 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                <span className="font-mono tabular-nums">{absents.length}</span> Izin / Cuti
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-100 text-emerald-700">
                Nihil Cuti
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Daftar Kesiapan Unit Armada (Compact Flat Rows) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Kesiapan Unit Operasional & Posko
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih unit untuk melihat riwayat audit kendala
            </p>
          </div>
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            <span className="font-mono tabular-nums">{serviceableCount}/{totalVehicles || 8}</span> Serviceable
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {pureVehicles.map((v, vIdx) => {
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
                className="py-2.5 px-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors duration-100 cursor-pointer space-y-1 block focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        <span className="font-mono tabular-nums">{v.code_name}</span> - {v.vehicle_name}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold font-sans uppercase">
                        {v.category === 'utama' ? 'Utama' : 'Pendukung'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>PIC: <strong className="text-slate-700">{v.pic_name || 'Belum Ditunjuk'}</strong></span>
                    </div>
                  </div>

                  {/* Badge Status visual */}
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
                </div>

                {/* Justifikasi kendala singkat jika unserviceable */}
                {isUnserv && v.justification && (
                  <div className="p-1.5 rounded bg-red-50/80 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
                    <span className="truncate">Kendala: {v.justification}</span>
                    <span className="text-xs text-red-700 font-bold underline shrink-0">
                      Riwayat
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Posko Watchroom */}
          <div
            onClick={() =>
              onOpenUnitAudit &&
              onOpenUnitAudit({
                id: 'WATCHROOM',
                code_name: 'WATCHROOM',
                vehicle_name: 'Posko ARFF',
                category: 'posko',
                status: watchroomData?.status || 'belum_dilaporkan',
                justification: watchroomData?.notes || '',
              })
            }
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenUnitAudit &&
                  onOpenUnitAudit({
                    id: 'WATCHROOM',
                    code_name: 'WATCHROOM',
                    vehicle_name: 'Posko ARFF',
                    category: 'posko',
                    status: watchroomData?.status || 'belum_dilaporkan',
                    justification: watchroomData?.notes || '',
                  });
              }
            }}
            className="py-2.5 px-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition-colors duration-100 cursor-pointer space-y-1 block focus:outline-none focus:ring-1 focus:ring-slate-300"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900 text-xs truncate">
                    <span className="font-mono tabular-nums">WATCHROOM</span> - Posko ARFF
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold font-sans uppercase">
                    Posko
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  PIC: <strong className="text-slate-700">{watchroomData?.pic_name || 'Belum Ditunjuk'}</strong>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors duration-100 flex items-center gap-1.5 shrink-0 ${
                  watchroomData?.status === 'unserviceable'
                    ? 'bg-red-50 text-red-800 border-red-300'
                    : watchroomData?.status === 'serviceable'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-slate-50 text-slate-600 border-slate-300'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    watchroomData?.status === 'unserviceable'
                      ? 'bg-red-600'
                      : watchroomData?.status === 'serviceable'
                      ? 'bg-emerald-600'
                      : 'bg-slate-400'
                  }`}
                />
                <span>
                  {watchroomData?.status === 'unserviceable'
                    ? 'Unserviceable'
                    : watchroomData?.status === 'serviceable'
                    ? 'Serviceable'
                    : 'Belum Dicek'}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
