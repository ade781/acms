import React from 'react';
import { Plus, AlertTriangle, UserCheck, Trash2 } from 'lucide-react';

export default function MobilePlotCard({
  unit,
  slots = [],
  personnelMap = {},
  currentPersonnelId = null,
  currentUserName = '',
  onOpenPicker,
  onAddCrew,
  onRemoveCrew,
  canEdit = true,
}) {
  const readiness = unit.readiness || unit.status || 'belum_dilaporkan';
  const isCarriedOver = Boolean(unit.is_carried_over);
  const isUnserv = readiness === 'unserviceable';
  const isServ = readiness === 'serviceable';

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
  const isPosko = unit.category === 'posko' || unit.code_name === 'WATCHROOM';
  const maxSlots = isPosko ? 2 : 4;
  const picPerson = picSlot.personnel_id
    ? (personnelMap[picSlot.personnel_id] || (picSlot.personnel_name ? { full_name: picSlot.personnel_name } : null))
    : null;

  // Temuan #2: Deteksi penugasan user yang sedang login
  const isUserPic = Boolean(
    currentPersonnelId && Number(picSlot.personnel_id) === Number(currentPersonnelId)
  );
  const isUserCrew = Boolean(
    currentPersonnelId &&
    crewSlots.some((s) => Number(s.personnel_id) === Number(currentPersonnelId))
  );

  return (
    <div className={`rounded-xl border ${cardBorderBg} px-2.5 py-2 shadow-xs space-y-1.5 transition-colors duration-100 font-sans`}>
      {/* Header Unit & Status Kesiapan */}
      <div className="flex items-start justify-between gap-1.5 border-b border-slate-100 pb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {unit.code_name || unit.vehicle_name || unit.name}
            </h4>

            {/* Badge Penugasan User Login di Header Card */}
            {isUserPic && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold font-sans">
                <UserCheck className="w-3 h-3" />
                <span>PIC Anda</span>
              </span>
            )}
            {!isUserPic && isUserCrew && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold font-sans">
                <UserCheck className="w-3 h-3" />
                <span>Kru Anda</span>
              </span>
            )}
          </div>
        </div>

        {/* 1 Badge Status Kesiapan Resmi (Read-Only Span, bukan tombol modal audit) */}
        <div className="shrink-0 self-start">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-full border ${badgeColor} leading-none flex items-center gap-1 min-h-[24px]`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
            <span>{badgeText}</span>
          </span>
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

      {/* Slot 0 (PIC) + Slot Kru (AGENTS.md Butir 9: PIC Selalu Amber, Kru Terisi Selalu Biru) */}
      <div className="space-y-1 text-xs pt-0.5">
        {/* Slot 0: PIC (Paling Atas - Selalu Amber Baik Terisi Maupun Kosong) */}
        <div className={`flex items-center justify-between py-1 px-1.5 rounded-lg border transition-colors duration-100 ${
          picPerson
            ? 'border-amber-300 bg-amber-50/40'
            : 'border-dashed border-amber-300 bg-amber-50/20'
        } ${isUserPic ? 'ring-1 ring-amber-400' : ''}`}>
          <div className="flex items-center gap-1.5 truncate">
            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-xs shrink-0">
              PIC
            </span>
            <span className="font-medium text-slate-900 truncate text-xs">
              {picPerson ? (
                picPerson.full_name || picPerson.name
              ) : (
                <span className="text-amber-800/60 italic text-xs">Pilih PIC...</span>
              )}
            </span>
          </div>
          {canEdit && onOpenPicker && (
            <button
              type="button"
              onClick={() => onOpenPicker(0, true)}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 bg-amber-100/70 hover:bg-amber-100 px-2 py-0.5 rounded shrink-0 tap-target transition-colors duration-100"
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
          const isCurrentSlotUser = Boolean(
            currentPersonnelId && Number(slot.personnel_id) === Number(currentPersonnelId)
          );
          const isFilled = Boolean(crewPerson);

          return (
            <div
              key={slotIdx}
              className={`flex items-center justify-between py-1 px-1.5 rounded-lg border transition-colors duration-100 ${
                isFilled
                  ? 'border-blue-200 bg-blue-50/40'
                  : 'border-dashed border-slate-200 bg-slate-50/40'
              } ${isCurrentSlotUser ? 'ring-1 ring-blue-300' : ''}`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className={`px-1.5 py-0.5 rounded text-xs shrink-0 ${
                  isFilled ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-100 text-slate-600 font-medium'
                }`}>
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
              <div className="flex items-center gap-1 shrink-0">
                {canEdit && onOpenPicker && (
                  <button
                    type="button"
                    onClick={() => onOpenPicker(slotIdx, false)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded hover:bg-blue-50 tap-target transition-colors duration-100"
                  >
                    {crewPerson ? 'Ganti' : 'Pilih'}
                  </button>
                )}
                {canEdit && onRemoveCrew && (
                  <button
                    type="button"
                    onClick={() => onRemoveCrew(slotIdx)}
                    className="text-xs text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors duration-100 tap-target"
                    title="Hapus slot kru"
                    aria-label="Hapus slot kru"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tombol Tambah Kru (maksimal 4 armada, maksimal 2 posko) */}
      {canEdit && onAddCrew && slots.length < maxSlots && (
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
