import React from 'react';
import { Truck, Radio, Users, FileText, ChevronRight } from 'lucide-react';

/**
 * Kartu Rekapitulasi Ringkas Status Operasional Shift (Mobile)
 * Menampilkan ringkasan status seluruh unit armada & posko secara padat & efisien (flat compact rows).
 * Status armada dapat diklik untuk membuka modal audit trail.
 */
export default function MobileReportSummaryCard({
  vehicles = [],
  deployments = [],
  activities = [],
  incidents = [],
  onOpenUnitAudit,
}) {
  const totalUnits = vehicles.length;
  const serviceableCount = vehicles.filter((v) => v.status === 'serviceable').length;

  const presentDeployments = deployments.filter((d) => d.deployment_type !== 'absent');

  return (
    <div className="space-y-3 font-sans">
      {/* KPI Summary Grid 3 Kolom Proposional */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        {/* 1. Kesiapan Unit & Posko */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kesiapan Unit & Posko
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

        {/* 2. Presensi Personel */}
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
            <span className="text-xs text-slate-500 font-medium">Hadir Bertugas</span>
          </div>
        </div>

        {/* 3. Kegiatan & Insiden */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kegiatan & Insiden
            </span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1 text-xs">
            <span className="text-lg font-black text-slate-900 font-mono tabular-nums leading-none">
              {activities.length}
            </span>
            <span className="text-xs text-slate-500 font-medium mr-1.5">Giat</span>
            <span className={`text-xs font-bold ${incidents.length > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              • <span className="font-mono tabular-nums">{incidents.length}</span> Insiden
            </span>
          </div>
        </div>
      </div>

      {/* Daftar Kesiapan Unit Operasional (Compact Flat Rows) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Kesiapan Unit Operasional & Posko
          </h4>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {vehicles.map((v, vIdx) => {
            const isServ = v.status === 'serviceable';
            const isUnserv = v.status === 'unserviceable';
            const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';

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
                      {isPosko && (
                        <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900 text-xs truncate">
                        <span className="font-mono tabular-nums">{v.code_name}</span> - {v.vehicle_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>PIC: <strong className="text-slate-700">{v.pic_name || 'Belum Ditunjuk'}</strong></span>
                    </div>
                  </div>

                  {/* Badge Status visual */}
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-colors duration-100 flex items-center gap-1.5 shrink-0 ${isServ
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : isUnserv
                        ? 'bg-red-50 text-red-800 border-red-300'
                        : 'bg-slate-50 text-slate-600 border-slate-300'
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${isServ ? 'bg-emerald-600' : isUnserv ? 'bg-red-600' : 'bg-slate-400'
                        }`}
                    />
                    <span>{isServ ? 'Serviceable' : isUnserv ? 'Unserviceable' : 'Belum Dicek'}</span>
                    <ChevronRight className="w-3 h-3 text-slate-400" />
                  </span>
                </div>

                {/* Justifikasi kendala singkat jika unserviceable */}
                {isUnserv && (v.justification || v.notes) && (
                  <div className="p-1.5 rounded bg-red-50/80 border border-red-200 text-red-800 text-xs flex items-center justify-between gap-2">
                    <span className="truncate">Kendala: {v.justification || v.notes}</span>
                    <span className="text-xs text-red-700 font-bold underline shrink-0">
                      Riwayat
                    </span>
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
