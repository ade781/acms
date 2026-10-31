import React from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle, Edit3, Edit2, ShieldAlert, ShieldCheck, Clock } from 'lucide-react';
import { getVehicleIcon } from '../../utils/vehicleHelper';
import Badge from '../common/Badge';
import Button from '../common/Button';

/**
 * VehicleMetricCard
 * Kartu metrik inspeksi armada operasional untuk VehicleReadinessPage.
 * Menampilkan status kelaikan fisik, PIC penanggung jawab, carry-over status, dan tombol aksi inspeksi.
 */
export default function VehicleMetricCard({
  vehicle,
  canInspect = false,
  onInspect,
  isAdmin = false,
  onEdit,
}) {
  const CardIcon = getVehicleIcon(vehicle);
  const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';

  const log = vehicle.current_log || vehicle;
  // Default status kelaikan adalah belum_dilaporkan sebelum diinspeksi PIC (GEMINI.md No. 17)
  const rawStatus = vehicle.status || log?.status;
  const status = rawStatus || 'belum_dilaporkan';
  const justification = vehicle.justification || log?.justification;
  const notes = vehicle.notes || log?.notes;
  const isCarriedOver = Boolean(vehicle.is_carried_over);

  const lastInspected = vehicle.logged_at || log?.logged_at || vehicle.updated_at || log?.updated_at;
  const formattedTimestamp = React.useMemo(() => {
    if (!lastInspected) return null;
    try {
      const d = new Date(lastInspected);
      if (isNaN(d.getTime())) return null;
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
    } catch {
      return null;
    }
  }, [lastInspected]);

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
      badge: 'default',
      label: 'Belum Dicek',
      icon: HelpCircle,
      cardBorder: 'border-slate-200',
      iconBg: 'bg-slate-100 text-slate-600',
    },
  };

  const cfg = statusConfig[status] || statusConfig.belum_dilaporkan;
  const StatusIcon = cfg.icon;

  return (
    <div
      className={`bg-white rounded-xl border ${cfg.cardBorder} shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-colors duration-100 hover:border-slate-400 font-sans`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-lg ${cfg.iconBg} flex items-center justify-center flex-shrink-0`}>
              <CardIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900 leading-tight">
                {vehicle.code_name || vehicle.vehicle_name}
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                {isPosko ? (
                  'Posko Komunikasi'
                ) : vehicle.license_plate ? (
                  <span className="font-mono tabular-nums">{vehicle.license_plate}</span>
                ) : (
                  vehicle.category || 'Armada'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {isAdmin && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(vehicle)}
                title="Ubah Spesifikasi Armada"
                className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors duration-100"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {isCarriedOver && (
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                Carry-Over
              </span>
            )}
            <Badge variant={cfg.badge} size="md">
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{cfg.label}</span>
            </Badge>
          </div>
        </div>

        {/* Assigned PIC indicator */}
        <div className="mt-4 p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Penanggung Jawab (PIC):</span>
          {vehicle.pic_name ? (
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              <span>{vehicle.pic_name}</span>
            </span>
          ) : (
            <span className="text-slate-400 italic">Belum Ditentukan</span>
          )}
        </div>

        {/* Justification snippet if unserviceable */}
        {status === 'unserviceable' && justification && (
          <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900">
            <div className="flex items-center gap-1 font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
              <span>Kendala / Kerusakan:</span>
            </div>
            <p className="line-clamp-2">{justification}</p>
          </div>
        )}

        {/* Notes if serviceable */}
        {status === 'serviceable' && notes && (
          <div className="mt-3 text-xs text-slate-500 line-clamp-1 italic">
            Catatan: {notes}
          </div>
        )}
      </div>

      {/* Action Area: ONLY ACTIVE FOR PIC OR SUPERVISOR/ADMIN */}
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
          <div className="w-full flex items-center justify-between text-xs text-slate-500 py-1">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>
                {formattedTimestamp ? (
                  <>
                    Inspeksi: <span className="font-mono tabular-nums">{formattedTimestamp}</span>
                  </>
                ) : status === 'belum_dilaporkan' ? (
                  'Menunggu inspeksi PIC'
                ) : (
                  'Terverifikasi shift aktif'
                )}
              </span>
            </span>
            <span className="text-xs text-slate-400 font-medium">Mode Pantau</span>
          </div>
        )}
      </div>
    </div>
  );
}
