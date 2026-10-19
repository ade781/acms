import React from 'react';
import { Truck, Radio, UserPlus, Trash2, ShieldCheck, User } from 'lucide-react';
import Badge from '../common/Badge';

export default function DeploymentSlotCard({
  vehicle,
  slots = [],
  availablePersonnel = [],
  onSlotPersonnelChange,
  onAddSlot,
  onRemoveSlot,
  readOnly = false,
}) {
  const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';
  const maxSlots = isPosko ? 2 : 4;
  const minSlots = 1;

  const IconComponent = isPosko ? Radio : Truck;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isPosko ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-arff-primary'
            }`}>
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {vehicle.code_name || vehicle.vehicle_name}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {isPosko ? 'Posko Komunikasi' : (vehicle.license_plate || vehicle.category || 'Armada Utama')}
              </p>
            </div>
          </div>
          <Badge variant={isPosko ? 'teamAlpha' : 'default'} size="sm">
            {slots.length} Personel
          </Badge>
        </div>

        {/* Slot List */}
        <div className="mt-4 space-y-3">
          {slots.map((slot, index) => {
            const isPic = index === 0; // Slot paling atas selalu FIX sebagai PIC
            return (
              <div
                key={`${vehicle.id || vehicle.vehicle_id || 'v'}-slot-${index}`}
                className={`p-3 rounded-lg border transition-colors duration-100 ${
                  isPic
                    ? 'border-amber-300 bg-amber-50/70'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      {isPic
                        ? (isPosko ? 'Slot #1 (PIC Watchroom)' : 'Slot #1 (PIC Kendaraan)')
                        : (isPosko ? `Operator #${index + 1}` : `Kru Slot #${index + 1}`)}
                    </span>
                  </div>

                  {/* Fixed PIC Badge for top slot */}
                  {isPic && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      <ShieldCheck className="w-3 h-3 text-amber-700" />
                      <span>PIC</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly ? (
                    <select
                      value={slot.personnel_id || ''}
                      onChange={(e) => onSlotPersonnelChange(index, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">
                        {isPic ? '(Pilih Personel PIC / Penanggung Jawab)' : '(Pilih Personel Kru)'}
                      </option>
                      {availablePersonnel.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs font-semibold text-slate-800">
                      {slot.personnel_name || '(Belum Ditugaskan)'}
                    </div>
                  )}

                  {!readOnly && slots.length > minSlots && !isPic && (
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(index)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[38px] min-w-[38px] flex items-center justify-center"
                      title="Hapus slot ke-4"
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

      {/* Add Slot 4 Button if currently 3 slots */}
      {!readOnly && slots.length < maxSlots && (
        <button
          type="button"
          onClick={onAddSlot}
          className="mt-3 w-full py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-100 flex items-center justify-center gap-1.5 min-h-[38px]"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Slot ke-4</span>
        </button>
      )}
    </div>
  );
}
