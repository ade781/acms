import React from 'react';
import { AlertTriangle, History } from 'lucide-react';
import { cleanTeam } from '../../../utils/shiftHelper';

export default function MobileUnserviceableWidget({
  unserviceableVehicles = [],
  onOpenAuditModal
}) {
  if (!unserviceableVehicles || unserviceableVehicles.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#DDD5C7] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.05),0_1px_2px_rgba(28,25,23,0.03)] overflow-hidden font-sans">
      {/* Header Widget Kendala */}
      <div className="px-3.5 py-2.5 bg-[#FAF7F2] border-b border-[#EAE3D5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Kendala Armada
          </h4>
        </div>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <span className="font-mono tabular-nums">{unserviceableVehicles.length}</span> Unit
        </span>
      </div>

      {/* Daftar Unit Bermasalah — Clean Divided Ledger Rows */}
      <div className="divide-y divide-[#EFECE6]">
        {unserviceableVehicles.map((vehicle, vIdx) => {
          const vCode = vehicle.code_name || `UNIT-${vehicle.id || vIdx}`;
          const vName = vehicle.vehicle_name || vehicle.code_name;
          const rawTeam = vehicle.carried_from?.team_group || vehicle.team_group || '';
          const reportedTeam = cleanTeam(rawTeam) || 'Piket';
          const reportedDate = vehicle.carried_from?.shift_date || vehicle.logged_at?.split('T')[0] || '';
          const justification = vehicle.justification || vehicle.notes || '-';

          return (
            <div
              key={vehicle.id ?? vehicle.vehicle_id ?? vehicle.code_name ?? `unserv-${vIdx}`}
              className="px-3.5 py-2.5 hover:bg-[#FAF8F5] transition-colors duration-100 relative pl-4 text-xs"
            >
              <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full bg-red-500" />

              {/* Baris Pertama: Kode Unit, Nama Kendaraan, & Tombol Jejak */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-1.5 py-0.5 rounded-md font-mono tabular-nums font-bold text-xs bg-[#FEF2F2] text-[#991B1B] border border-red-200/80 shrink-0">
                    {vCode}
                  </span>
                  <span className="font-bold text-[#1C1917] text-xs truncate">
                    {vName}
                  </span>
                </div>
                {onOpenAuditModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAuditModal(vehicle.id || vehicle.vehicle_id)}
                    className="px-2 py-0.5 rounded-full bg-[#F7F5F0] hover:bg-[#EFECE6] border border-[#E2DBD0] text-xs font-semibold text-[#44403C] flex items-center gap-1 shrink-0 transition-colors duration-100"
                  >
                    <History className="w-3 h-3" />
                    <span>Jejak</span>
                  </button>
                )}
              </div>

              {/* Baris Kedua: Catatan Kendala */}
              <p className="text-xs text-[#44403C] leading-snug mt-1">
                {justification}
              </p>

              {/* Baris Ketiga: Metadata Pelapor & Tanggal */}
              <div className="flex items-center justify-between text-xs text-[#78716C] mt-1">
                <span>Pelapor: Regu {reportedTeam}</span>
                {reportedDate && (
                  <span>
                    Tanggal: <span className="font-mono tabular-nums">{reportedDate}</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
