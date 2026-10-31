import React from 'react';
import { Truck, Radio, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Kolom Kiri: Kesiapan Armada & Posko Operasional
 * Menampilkan daftar kendaraan ARFF YIA dan Posko Watchroom beserta status kelaikan dan PIC.
 * Menggunakan Exception-Based Indicator: unit serviceable menampilkan dot hijau kompak,
 * badge mencolok hanya digunakan untuk pengecualian (Unserviceable / Belum Dicek).
 */
export default function DashboardFleetSection({
  vehicles = [],
  loading = false,
  fleetMetrics = { total: 0, serviceable: 0, unserviceable: 0, unchecked: 0 },
  vehicleDeploymentDetails = { picMap: {}, crewMap: {} },
  watchroomLog = null,
  onOpenModal = () => {},
  onKeyDown = () => {}
}) {
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  return (
    <div className="lg:col-span-6 h-[564px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden font-sans">
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Kesiapan Armada & Posko Operasional
          </h2>
        </div>
        <span className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
          <span className="font-mono tabular-nums font-bold">
            {fleetMetrics?.serviceable ?? 0}/{fleetMetrics?.total ?? 0}
          </span>{' '}
          Serviceable
        </span>
      </div>

      {/* Daftar Baris Kompak Armada (Volume Tetap flex-1 overflow-y-auto) */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Memuat data kesiapan armada dan posko...
          </div>
        ) : safeVehicles.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4 text-center text-xs text-slate-500">
            Belum ada unit armada operasional yang terdaftar di database.
          </div>
        ) : (
          safeVehicles.map((vehicle) => {
            if (!vehicle) return null;
            const vId = vehicle.id || vehicle.vehicle_id;
            const status = vehicle.status || vehicle.readiness || 'belum_dilaporkan';
            const isUnserviceable = status === 'unserviceable';
            const isServiceable = status === 'serviceable';
            const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';

            const picName = vehicle.pic_name ||
              vehicleDeploymentDetails?.picMap?.[isPosko ? 'watchroom' : vId] ||
              (isPosko && watchroomLog?.inspector_name) ||
              'Belum Ditunjuk';

            return (
              <div
                key={vId || vehicle.code_name || `vehicle-${vehicle.id || Math.random()}`}
                role="button"
                tabIndex={0}
                onClick={() => onOpenModal({ type: 'vehicle_item', item: vehicle })}
                onKeyDown={(e) =>
                  onKeyDown(e, () =>
                    onOpenModal({ type: 'vehicle_item', item: vehicle })
                  )
                }
                className="px-4 py-3 hover:bg-slate-50 transition-colors duration-100 flex items-center justify-between gap-3 text-xs cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50"
              >
                {/* Sisi Kiri: Ikon, Nama Kendaraan & Nama PIC tepat di bawahnya */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isUnserviceable
                        ? 'bg-red-50 text-red-700'
                        : isServiceable
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {isPosko ? (
                      <Radio className="w-3.5 h-3.5" />
                    ) : (
                      <Truck className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate leading-tight">
                      {vehicle.vehicle_name || vehicle.code_name}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      PIC: <span className="text-slate-700 font-medium">{typeof picName === 'string' ? picName : (picName?.name || 'Belum Ditunjuk')}</span>
                    </div>
                  </div>
                </div>

                {/* Sisi Kanan: Exception-Based Status Indicator */}
                <div className="shrink-0 flex items-center">
                  {isUnserviceable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span>Unserviceable</span>
                    </span>
                  ) : !isServiceable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      <HelpCircle className="w-3 h-3 text-slate-500" />
                      <span>Belum Dicek</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium text-emerald-700 bg-emerald-50/50 rounded border border-emerald-100">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span>Serviceable</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

