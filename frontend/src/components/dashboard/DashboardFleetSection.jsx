import React from 'react';
import { Truck, Radio, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Kolom Kiri: Kesiapan Armada & Posko Operasional
 * Menampilkan daftar kendaraan ARFF YIA dan Posko Watchroom beserta status kelaikan dan PIC.
 */
export default function DashboardFleetSection({
  vehicles,
  loading,
  fleetMetrics,
  vehicleDeploymentDetails,
  watchroomLog,
  onOpenModal,
  onKeyDown
}) {
  return (
    <div className="lg:col-span-6 h-[564px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">
            Kesiapan Armada & Posko Operasional
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Status kelaikan fisik dan penanggung jawab unit (PIC) shift berjalan
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
          {fleetMetrics.serviceable}/{fleetMetrics.total} Siap Operasi
        </span>
      </div>

      {/* Daftar Baris Kompak Armada (Volume Tetap flex-1 overflow-y-auto) */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            Memuat data kesiapan armada dan posko...
          </div>
        ) : vehicles.length === 0 ? (
          <div className="h-full flex items-center justify-center px-4 text-center text-xs text-slate-500">
            Belum ada unit armada operasional yang terdaftar di database.
          </div>
        ) : (
          vehicles.map((vehicle) => {
            const vId = vehicle.id || vehicle.vehicle_id;
            const status = vehicle.status || vehicle.readiness || 'belum_dilaporkan';
            const isUnserviceable = status === 'unserviceable';
            const isServiceable = status === 'serviceable';
            const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';

            const picName = isPosko
              ? vehicle.pic_name ||
                vehicleDeploymentDetails.picMap['watchroom'] ||
                watchroomLog?.inspector_name ||
                'Belum Ditunjuk'
              : vehicle.pic_name ||
                vehicleDeploymentDetails.picMap[vId] ||
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
                    <div className="font-semibold text-slate-900 truncate leading-tight">
                      {vehicle.vehicle_name || vehicle.code_name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      PIC: <span className="text-slate-700 font-medium">{typeof picName === 'string' ? picName : (picName?.name || 'Belum Ditunjuk')}</span>
                    </div>
                  </div>
                </div>

                {/* Sisi Kanan: Badge Status Kelaikan */}
                <div className="shrink-0">
                  {isUnserviceable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span>Unserviceable</span>
                    </span>
                  ) : isServiceable ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Serviceable</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                      <HelpCircle className="w-3 h-3 text-slate-400" />
                      <span>Belum Dicek</span>
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

