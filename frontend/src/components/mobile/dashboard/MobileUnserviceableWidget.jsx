import React from 'react';
import { AlertTriangle, History } from 'lucide-react';

export default function MobileUnserviceableWidget({
  unserviceableVehicles = [],
  onOpenAuditModal
}) {
  if (!unserviceableVehicles || unserviceableVehicles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs space-y-1.5">
      {/* Header Widget Kendala */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Kendala Armada
          </h4>
        </div>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-700">
          {unserviceableVehicles.length} Unit
        </span>
      </div>

      {/* Daftar Unit Bermasalah */}
      <div className="space-y-1">
        {unserviceableVehicles.map((vehicle, vIdx) => {
          const vCode = vehicle.code_name || `UNIT-${vehicle.id || vIdx}`;
          const vName = vehicle.vehicle_name || vehicle.code_name;
          const reportedTeam = vehicle.carried_from?.team_group || vehicle.team_group || 'Regu Piket';
          const reportedDate = vehicle.carried_from?.shift_date || vehicle.logged_at?.split('T')[0] || '';
          const justification = vehicle.justification || vehicle.notes || 'Kendala teknis sedang ditangani teknisi';

          return (
            <div
              key={vehicle.id ?? vehicle.vehicle_id ?? vehicle.code_name ?? `unserv-${vIdx}`}
              className="p-2 rounded-lg border border-red-200 bg-red-50/50 space-y-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-red-200 text-red-900">
                    {vCode}
                  </span>
                  <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">
                    {vName}
                  </span>
                </div>
                {onOpenAuditModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAuditModal(vehicle.id || vehicle.vehicle_id)}
                    className="text-[9px] font-semibold text-red-700 hover:text-red-900 flex items-center gap-0.5"
                  >
                    <History className="w-2.5 h-2.5" />
                    <span>Jejak</span>
                  </button>
                )}
              </div>

              <p className="text-[10px] text-red-800 leading-snug">
                {justification}
              </p>

              <div className="flex items-center justify-between text-[8.5px] text-slate-500 pt-0.5 border-t border-red-200/60 font-medium">
                <span>Pelapor: Regu {reportedTeam}</span>
                {reportedDate && <span>Tanggal: {reportedDate}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
