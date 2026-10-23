import React from 'react';
import { Plus } from 'lucide-react';

export default function MobilePlotCard({
  unit,
  slots = [],
  personnelMap = {},
  onOpenPicker,
  onAddCrew,
  onOpenDetailKendala,
}) {
  const readiness = unit.readiness || 'belum_dilaporkan';
  let badgeColor = 'bg-slate-100 text-slate-700 border-slate-300';
  let badgeText = 'Belum Dilaporkan';
  let dotColor = 'bg-slate-400';

  if (readiness === 'serviceable') {
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    badgeText = 'Serviceable';
    dotColor = 'bg-emerald-500';
  } else if (readiness === 'unserviceable') {
    badgeColor = 'bg-red-50 text-red-800 border-red-300';
    badgeText = 'Unserviceable';
    dotColor = 'bg-red-500';
  }

  const isUnserv = readiness === 'unserviceable';
  const picSlot = slots[0] || { personnel_id: '', is_pic: true };
  const crewSlots = slots.slice(1);
  const picPerson = picSlot.personnel_id ? personnelMap[picSlot.personnel_id] : null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 px-2.5 py-1.5 shadow-xs space-y-0.5">
      {/* Header Unit */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
        <h4 className="text-xs font-bold text-slate-900 leading-tight">
          {unit.vehicle_name || unit.name || unit.code_name}
        </h4>
        <button
          type="button"
          onClick={() => isUnserv && onOpenDetailKendala && onOpenDetailKendala(unit)}
          className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${badgeColor} leading-none flex items-center gap-1 transition-colors duration-100 ${
            isUnserv ? 'cursor-pointer hover:bg-red-100' : ''
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
          <span>{badgeText}</span>
        </button>
      </div>

      {/* Flat Divided Rows: Slot 0 (PIC) + Slot Kru */}
      <div className="divide-y divide-slate-100 text-[11px]">
        {/* Slot 0: PIC (Paling Atas - Terkunci Permanen) */}
        <div className="flex items-center justify-between py-0.5 px-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[8px] shrink-0">
              PIC
            </span>
            <span className="font-medium text-slate-900 truncate text-[11px]">
              {picPerson ? (
                picPerson.full_name || picPerson.name
              ) : (
                <span className="text-slate-400 italic">Kosong...</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenPicker(0, true)}
            className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 shrink-0 px-1 py-0.5"
          >
            {picPerson ? 'Ganti' : 'Pilih'}
          </button>
        </div>

        {/* Slot Kru Tambahan */}
        {crewSlots.map((slot, idx) => {
          const slotIdx = idx + 1;
          const crewPerson = slot.personnel_id ? personnelMap[slot.personnel_id] : null;
          return (
            <div key={slotIdx} className="flex items-center justify-between py-0.5 px-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-medium text-[8px] shrink-0">
                  Kru {idx + 1}
                </span>
                <span className="font-medium text-slate-800 truncate text-[11px]">
                  {crewPerson ? (
                    crewPerson.full_name || crewPerson.name
                  ) : (
                    <span className="text-slate-400 italic">Kosong...</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onOpenPicker(slotIdx, false)}
                className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 shrink-0 px-1 py-0.5"
              >
                {crewPerson ? 'Ganti' : 'Pilih'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Tombol Tambah Kru (Maksimal total 4 orang per unit) */}
      {slots.length < 4 && (
        <div className="pt-0.5 flex justify-end">
          <button
            type="button"
            onClick={onAddCrew}
            className="text-[9px] font-semibold text-slate-500 hover:text-red-600 flex items-center gap-0.5 transition-colors duration-100"
          >
            <Plus className="w-2.5 h-2.5 text-slate-400" />
            <span>Tambah Kru</span>
          </button>
        </div>
      )}
    </div>
  );
}
