import React from 'react';
import { Truck, CheckCircle2, AlertTriangle, HelpCircle, Star, Edit3, ShieldAlert } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function VehicleMetricCard({
  vehicle,
  isPicForVehicle = false,
  canInspect = false,
  onInspect,
}) {
  const log = vehicle.current_log;
  const status = log?.status || 'belum_dilaporkan';

  const statusConfig = {
    serviceable: {
      badge: 'serviceable',
      label: 'Serviceable',
      icon: CheckCircle2,
      cardBorder: 'border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-800',
    },
    unserviceable: {
      badge: 'unserviceable',
      label: 'Unserviceable',
      icon: AlertTriangle,
      cardBorder: 'border-red-300',
      iconBg: 'bg-red-100 text-red-800',
    },
    belum_dilaporkan: {
      badge: 'pending',
      label: 'Belum Diperiksa',
      icon: HelpCircle,
      cardBorder: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-600',
    },
  };

  const cfg = statusConfig[status] || statusConfig.belum_dilaporkan;
  const StatusIcon = cfg.icon;

  return (
    <div
      className={`bg-white rounded-xl border ${cfg.cardBorder} shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-colors duration-100 hover:border-slate-400`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-lg ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 leading-tight">
                {vehicle.code_name || vehicle.vehicle_name}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {vehicle.license_plate || vehicle.category || 'Armada'}
              </p>
            </div>
          </div>
          <Badge variant={cfg.badge} size="md">
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{cfg.label}</span>
          </Badge>
        </div>

        {/* Assigned PIC indicator */}
        <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Penanggung Jawab (PIC):</span>
          {vehicle.pic_name ? (
            <span className="font-bold text-slate-800 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              {vehicle.pic_name}
            </span>
          ) : (
            <span className="text-slate-400 italic">Belum Ditentukan</span>
          )}
        </div>

        {/* Justification snippet if unserviceable */}
        {status === 'unserviceable' && log?.justification && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
            <div className="flex items-center gap-1 font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Kendala / Kerusakan:</span>
            </div>
            <p className="line-clamp-2">{log.justification}</p>
          </div>
        )}

        {/* Notes if serviceable */}
        {status === 'serviceable' && log?.notes && (
          <div className="mt-3 text-xs text-slate-500 line-clamp-1 italic">
            Catatan: {log.notes}
          </div>
        )}
      </div>

      {/* Action Button: ONLY ACTIVE FOR PIC OR SUPERVISOR/ADMIN */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {canInspect ? (
          <Button
            variant={status === 'unserviceable' ? 'danger' : 'outline'}
            size="sm"
            icon={Edit3}
            onClick={() => onInspect(vehicle)}
            className="w-full"
          >
            Input Pemeriksaan / Ubah Kondisi
          </Button>
        ) : (
          <div className="w-full text-center py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 font-medium">
            Read-only (Khusus PIC Kendaraan / Ketua Regu)
          </div>
        )}
      </div>
    </div>
  );
}
