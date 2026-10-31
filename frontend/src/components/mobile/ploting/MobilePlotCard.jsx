import React from 'react';
import { Plus, CheckCircle2, AlertTriangle, HelpCircle, Edit3, Camera } from 'lucide-react';

export default function MobilePlotCard({
  unit,
  slots = [],
  personnelMap = {},
  onOpenPicker,
  onAddCrew,
  onOpenDetailKendala,
  onInspect,
  canEdit = true,
}) {
  const readiness = unit.readiness || unit.status || 'belum_dilaporkan';
  const isCarriedOver = Boolean(unit.is_carried_over);
  const isUnserv = readiness === 'unserviceable';
  const isServ = readiness === 'serviceable';
  const isBelumDicek = readiness === 'belum_dilaporkan';

  // Styling kontainer dan status berdasarkan kesiapan fisik armada operasional
  let cardBorderBg = 'bg-white border-slate-200';
  let badgeColor = 'bg-amber-50 text-amber-800 border-amber-300';
  let badgeText = 'Belum Dicek';
  let dotColor = 'bg-amber-500';

  if (isServ) {
    cardBorderBg = 'bg-emerald-50/20 border-emerald-300 shadow-2xs';
    badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    badgeText = 'Serviceable';
    dotColor = 'bg-emerald-500';
  } else if (isUnserv) {
    cardBorderBg = 'bg-red-50/25 border-red-300 shadow-2xs';
    badgeColor = 'bg-red-50 text-red-800 border-red-300';
    badgeText = isCarriedOver ? 'Unserviceable (Estafet)' : 'Unserviceable';
    dotColor = 'bg-red-500';
  }

  const picSlot = slots[0] || { personnel_id: '', is_pic: true };
  const crewSlots = slots.slice(1);
  const picPerson = picSlot.personnel_id
    ? (personnelMap[picSlot.personnel_id] || (picSlot.personnel_name ? { full_name: picSlot.personnel_name } : null))
    : null;
  const assignedCount = slots.filter((s) => Boolean(s.personnel_id)).length;

  return (
    <div className={`rounded-xl border ${cardBorderBg} px-2.5 py-2 shadow-xs space-y-1 transition-colors duration-100 font-sans`}>
      {/* Header Unit & Status Kesiapan */}
      <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 pb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {unit.vehicle_name || unit.name || unit.code_name}
            </h4>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
              <span className="font-mono tabular-nums mr-1">{assignedCount}</span> Kru
            </span>
            {isServ && (
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-1.5 py-0.5 rounded">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Terverifikasi Fisik
              </span>
            )}
            {isBelumDicek && (
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-700 bg-amber-100/70 border border-amber-300 px-1.5 py-0.5 rounded">
                <HelpCircle className="w-3 h-3 text-amber-600" />
                Menunggu PIC
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
            <span className={unit.license_plate ? 'font-mono tabular-nums' : 'font-sans'}>
              {unit.license_plate || (unit.category === 'posko' ? 'Posko Komunikasi' : 'Armada')}
            </span>
            {unit.photo_webp_url && (
              <span className="text-slate-600 font-medium inline-flex items-center gap-0.5 ml-1">
                <Camera className="w-3 h-3 text-slate-400" />
                Foto Ada
              </span>
            )}
          </div>
        </div>

        {/* Tombol Periksa & Badge Status */}
        <div className="flex items-center gap-1.5 shrink-0 self-start">
          {onInspect && (
            <button
              type="button"
              onClick={() => onInspect(unit)}
              className={`text-xs font-bold px-2 py-1 rounded-md transition-colors duration-100 flex items-center gap-1 cursor-pointer min-h-[26px] ${
                isBelumDicek
                  ? 'bg-amber-600 text-white hover:bg-amber-700 shadow-2xs font-extrabold'
                  : isServ
                  ? 'bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                  : 'bg-red-100/80 text-red-800 hover:bg-red-200 border border-red-300'
              }`}
              title={isServ ? 'Armada sudah dicek fisik (Klik untuk periksa ulang)' : 'Periksa kesiapan fisik armada'}
            >
              {isServ ? (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Sudah Dicek</span>
                </>
              ) : isUnserv ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  <span>Kendala</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 text-white" />
                  <span>Periksa</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => isUnserv && onOpenDetailKendala && onOpenDetailKendala(unit)}
            className={`text-xs font-semibold px-2 py-1 rounded-full border ${badgeColor} leading-none flex items-center gap-1 transition-colors duration-100 min-h-[24px] ${
              isUnserv ? 'cursor-pointer hover:bg-red-100' : ''
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
            <span>{badgeText}</span>
          </button>
        </div>
      </div>

      {/* Cuplikan kendala jika unserviceable */}
      {isUnserv && unit.justification && (
        <div className="p-1.5 rounded bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-1 leading-snug">
          <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
          <span className="line-clamp-2">
            <strong className="font-semibold">Kendala:</strong> {unit.justification}
          </span>
        </div>
      )}

      {/* Flat Divided Rows: Slot 0 (PIC) + Slot Kru */}
      <div className="divide-y divide-slate-100 text-xs pt-0.5">
        {/* Slot 0: PIC (Paling Atas - Terkunci Permanen) */}
        <div className="flex items-center justify-between py-1 px-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
              PIC
            </span>
            <span className="font-medium text-slate-900 truncate text-xs">
              {picPerson ? (
                picPerson.full_name || picPerson.name
              ) : (
                <span className="text-slate-400 italic">Kosong...</span>
              )}
            </span>
          </div>
          {canEdit && onOpenPicker && (
            <button
              type="button"
              onClick={() => onOpenPicker(0, true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 px-2 py-1 tap-target"
            >
              {picPerson ? 'Ganti' : 'Pilih'}
            </button>
          )}
        </div>

        {/* Slot Kru Tambahan */}
        {crewSlots.map((slot, idx) => {
          const slotIdx = idx + 1;
          const crewPerson = slot.personnel_id
            ? (personnelMap[slot.personnel_id] || (slot.personnel_name ? { full_name: slot.personnel_name } : null))
            : null;
          return (
            <div key={slotIdx} className="flex items-center justify-between py-1 px-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium text-xs shrink-0">
                  Kru <span className="font-mono tabular-nums">{idx + 1}</span>
                </span>
                <span className="font-medium text-slate-800 truncate text-xs">
                  {crewPerson ? (
                    crewPerson.full_name || crewPerson.name
                  ) : (
                    <span className="text-slate-400 italic">Kosong...</span>
                  )}
                </span>
              </div>
              {canEdit && onOpenPicker && (
                <button
                  type="button"
                  onClick={() => onOpenPicker(slotIdx, false)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 px-2 py-1 tap-target"
                >
                  {crewPerson ? 'Ganti' : 'Pilih'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Tombol Tambah Kru */}
      {canEdit && onAddCrew && slots.length < 4 && (
        <div className="pt-0.5 flex justify-end">
          <button
            type="button"
            onClick={onAddCrew}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 flex items-center gap-0.5 py-0.5 transition-colors duration-100 cursor-pointer"
          >
            <Plus className="w-3 h-3 text-slate-400" />
            <span>Tambah Kru</span>
          </button>
        </div>
      )}
    </div>
  );
}
