import React from 'react';
import { Truck, ShieldCheck, UserPlus, Trash2, Star } from 'lucide-react';
import Badge from '../common/Badge';

export default function DeploymentSlotCard({
  vehicle,
  slots = [],
  availablePersonnel = [],
  onSlotPersonnelChange,
  onSlotPicChange,
  onAddSlot,
  onRemoveSlot,
  readOnly = false,
}) {
  const maxSlots = 4;
  const minSlots = 3;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-red-100 text-arff-primary flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 leading-tight">
                {vehicle.code_name || vehicle.vehicle_name}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {vehicle.license_plate || vehicle.category || 'Armada Utama'}
              </p>
            </div>
          </div>
          <Badge variant="default" size="sm">
            {slots.length} Personel
          </Badge>
        </div>

        {/* Slot List */}
        <div className="mt-4 space-y-3">
          {slots.map((slot, index) => {
            const isPic = Boolean(slot.is_pic);
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border transition-colors duration-100 ${
                  isPic
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Kru Slot #{index + 1}
                  </span>

                  {/* PIC Toggle Badge */}
                  {!readOnly ? (
                    <button
                      type="button"
                      onClick={() => onSlotPicChange(index)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold transition-colors duration-100 ${
                        isPic
                          ? 'bg-amber-400 text-amber-950 shadow-sm ring-1 ring-amber-500'
                          : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      <Star className={`w-3 h-3 ${isPic ? 'fill-amber-950' : ''}`} />
                      <span>{isPic ? 'PIC Kendaraan' : 'Jadikan PIC'}</span>
                    </button>
                  ) : (
                    isPic && (
                      <Badge variant="pic" size="sm">
                        <Star className="w-3 h-3 fill-amber-900" />
                        PIC
                      </Badge>
                    )
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly ? (
                    <select
                      value={slot.personnel_id || ''}
                      onChange={(e) => onSlotPersonnelChange(index, e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">(Pilih Personel Dinas)</option>
                      {availablePersonnel.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name} ({p.rank_position || p.cert_level || 'Kru'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-xs font-semibold text-slate-800">
                      {slot.personnel_name || '(Belum Ditugaskan)'}
                    </div>
                  )}

                  {!readOnly && slots.length > minSlots && (
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
