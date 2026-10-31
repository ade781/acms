import React from 'react';
import {
  UserPlus,
  Trash2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { getVehicleIcon } from '../../utils/vehicleHelper';

function DeploymentSlotCard({
  vehicle,
  slots = [],
  availablePersonnel = [],
  assignedPersonnelIds = new Set(),
  absentPersonnelIds = new Set(),
  onSlotPersonnelChange,
  onAddSlot,
  onRemoveSlot,
  readOnly = false,
  currentPersonnelId = null,
  currentUserName = '',
  isAdmin = false,
  isSupervisor = false,
}) {
  const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';
  const maxSlots = isPosko ? 2 : 6;
  const minSlots = 1;

  const IconComponent = getVehicleIcon(vehicle);

  // PIC kendaraan selalu berada di Slot #0 (paling atas)
  const picSlot = slots[0];
  const isUserThePic = Boolean(
    picSlot &&
    picSlot.personnel_id &&
    ((currentPersonnelId && Number(picSlot.personnel_id) === Number(currentPersonnelId)) ||
     (currentUserName && (availablePersonnel.find((p) => Number(p.id) === Number(picSlot.personnel_id))?.full_name || picSlot.personnel_name)?.toLowerCase() === currentUserName.toLowerCase()))
  );

  // Periksa apakah user bertugas sebagai kru biasa di slot setelah PIC
  const isUserKru = Boolean(
    !isUserThePic &&
    slots.slice(1).some((s) => {
      if (!s.personnel_id) return false;
      if (currentPersonnelId && Number(s.personnel_id) === Number(currentPersonnelId)) return true;
      const pName = availablePersonnel.find((p) => Number(p.id) === Number(s.personnel_id))?.full_name || s.personnel_name;
      return Boolean(currentUserName && pName && currentUserName.toLowerCase() === pName.toLowerCase());
    })
  );

  // Status Kelaikan Fisik (Default: belum_dilaporkan -> "Belum Dicek")
  const rawStatus = vehicle.status || vehicle.current_log?.status || vehicle.readiness;
  const readinessStatus =
    rawStatus === 'serviceable' || rawStatus === 'unserviceable'
      ? rawStatus
      : 'belum_dilaporkan';

  const isUnserviceable = readinessStatus === 'unserviceable';
  const isServiceable = readinessStatus === 'serviceable';
  const filledSlotsCount = slots.filter((s) => Boolean(s.personnel_id)).length;

  const statusConfig = {
    serviceable: {
      label: 'Serviceable',
      icon: CheckCircle2,
      badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-100 text-emerald-800',
    },
    unserviceable: {
      label: 'Tidak Laik',
      icon: AlertTriangle,
      badgeCls: 'bg-red-50 text-red-800 border-red-200',
      iconBg: 'bg-red-100 text-red-800',
    },
    belum_dilaporkan: {
      label: 'Belum Dicek',
      icon: HelpCircle,
      badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
      iconBg: 'bg-slate-100 text-slate-700',
    },
  };

  const cfg = statusConfig[readinessStatus] || statusConfig.belum_dilaporkan;
  const StatusIcon = cfg.icon;

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-colors duration-100 hover:border-slate-300 ${
        isUserThePic
          ? 'border-emerald-500'
          : isUserKru
          ? 'border-blue-400'
          : isUnserviceable
          ? 'border-red-300'
          : isServiceable
          ? 'border-emerald-200'
          : 'border-slate-200'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isUserThePic
                  ? 'bg-emerald-100 text-emerald-800'
                  : isUserKru
                  ? 'bg-blue-100 text-blue-800'
                  : cfg.iconBg
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-base font-bold text-slate-900 leading-tight font-sans truncate">
                  {vehicle.code_name || vehicle.vehicle_name}
                </h4>
                {isUserThePic && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans">
                    PIC Anda
                  </span>
                )}
                {isUserKru && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 font-sans">
                    Kru Anda
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                {isPosko ? 'Posko Komunikasi' : (vehicle.license_plate || vehicle.category || 'Armada Utama')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 font-sans ${cfg.badgeCls}`}
            >
              <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{cfg.label}</span>
            </span>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {filledSlotsCount} Personel
            </span>
          </div>
        </div>

        {/* Peringatan Fisik jika Unserviceable */}
        {isUnserviceable && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-semibold flex items-center justify-between font-sans">
            <span className="inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
              <span>Armada Tidak Laik / Dalam Perbaikan</span>
            </span>
            <span className="text-xs font-normal text-red-600">Periksa PIC</span>
          </div>
        )}

        {/* Slot List */}
        <div className="mt-3 space-y-2.5">
          {slots.map((slot, index) => {
            const isPic = index === 0; // Slot paling atas selalu FIX sebagai PIC
            const isSlotFilled = Boolean(slot.personnel_id);

            const personObj = availablePersonnel.find(
              (p) => Number(p.id) === Number(slot.personnel_id)
            );
            const displayName = personObj?.full_name || slot.personnel_name || '';

            const isCurrentUser = Boolean(
              (currentPersonnelId && Number(slot.personnel_id) === Number(currentPersonnelId)) ||
              (currentUserName && displayName && currentUserName.toLowerCase() === displayName.toLowerCase())
            );

            return (
              <div
                key={`${vehicle.id || vehicle.vehicle_id || 'v'}-slot-${index}`}
                className={`p-2.5 rounded-lg border transition-colors duration-100 ${
                  isCurrentUser
                    ? isPic
                      ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300'
                      : 'border-blue-300 bg-blue-50/60 ring-1 ring-blue-300'
                    : isPic
                    ? isSlotFilled
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-dashed border-amber-300 bg-amber-50/20'
                    : isSlotFilled
                    ? 'border-blue-200 bg-blue-50/40'
                    : 'border-dashed border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider font-sans ${
                        isPic
                          ? 'text-amber-900'
                          : isSlotFilled
                          ? 'text-blue-900'
                          : 'text-slate-600'
                      }`}
                    >
                      {isPic
                        ? (isPosko ? 'Slot #1 • PIC Watchroom' : 'Slot #1 • PIC')
                        : (isPosko ? `Operator #${index + 1}` : `Kru Slot #${index + 1}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Indicator for current user */}
                    {isCurrentUser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white font-sans">
                        <UserCheck className="w-3 h-3" />
                        <span>Tugas Saya</span>
                      </span>
                    )}

                    {/* PIC label badge - tetap kuning */}
                    {isPic && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 font-sans">
                        <ShieldCheck className="w-3 h-3" />
                        <span>PIC</span>
                      </span>
                    )}

                    {/* Kru label badge */}
                    {!isPic && isSlotFilled && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 font-sans">
                        <span>Kru</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly ? (
                    <select
                      value={slot.personnel_id || ''}
                      onChange={(e) => onSlotPersonnelChange(index, e.target.value)}
                      className={`w-full rounded-lg border px-2.5 py-1.5 text-xs min-h-[38px] font-sans transition-colors duration-100 focus:outline-none focus:ring-2 ${
                        isCurrentUser
                          ? 'border-emerald-400 bg-white text-emerald-950 font-bold focus:ring-emerald-500'
                          : isPic
                          ? 'border-amber-300 bg-white text-slate-900 focus:ring-amber-400'
                          : isSlotFilled
                          ? 'border-blue-300 bg-white text-slate-900 focus:ring-blue-400'
                          : 'border-slate-300 bg-white text-slate-900 focus:ring-slate-400'
                      }`}
                    >
                      <option value="">
                        {isPic ? '(Pilih Personel PIC / Penanggung Jawab)' : '(Pilih Personel Kru)'}
                      </option>
                      {availablePersonnel.map((p) => {
                        const isCurrentSelected = Number(slot.personnel_id) === Number(p.id);
                        const isAlreadyAssigned = assignedPersonnelIds.has(Number(p.id)) && !isCurrentSelected;
                        const isAbsent = absentPersonnelIds.has(Number(p.id)) && !isCurrentSelected;

                        return (
                          <option
                            key={p.id}
                            value={p.id}
                            disabled={isAlreadyAssigned || isAbsent}
                            className={isAbsent ? 'text-red-600 font-bold bg-red-50' : ''}
                          >
                            {isAbsent
                              ? `[CUTI/IZIN] ${p.full_name} (Sedang Cuti/Izin - Tidak Dapat Ditugaskan)`
                              : isAlreadyAssigned
                              ? `${p.full_name} (Sudah Ditugaskan)`
                              : p.full_name}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div
                      className={`text-xs min-h-[38px] flex items-center px-2 rounded font-sans ${
                        isCurrentUser
                          ? 'font-extrabold text-emerald-950 bg-emerald-100/60'
                          : isPic
                          ? displayName
                            ? 'font-bold text-amber-950'
                            : 'italic text-amber-700/60'
                          : displayName
                          ? 'font-semibold text-blue-950'
                          : 'italic text-slate-400'
                      }`}
                    >
                      {displayName || (isPic ? '(Belum Ada PIC)' : '(Belum Ditugaskan)')}
                    </div>
                  )}

                  {!readOnly && slots.length > minSlots && !isPic && (
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors duration-100 cursor-pointer"
                      title="Hapus slot kru"
                      aria-label="Hapus slot"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Slot Button */}
      {!readOnly && slots.length < maxSlots && (
        <button
          type="button"
          onClick={onAddSlot}
          className="mt-3 w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-100 flex items-center justify-center gap-1.5 min-h-[38px] font-sans cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Slot Kru</span>
        </button>
      )}
    </div>
  );
}

export default React.memo(DeploymentSlotCard);
