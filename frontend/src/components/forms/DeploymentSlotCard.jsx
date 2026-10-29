import React from 'react';
import { UserPlus, Trash2, ShieldCheck, Camera, Sparkles } from 'lucide-react';
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
  onInspectVehicle = null,
  isAdmin = false,
  isSupervisor = false,
}) {
  const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';
  const maxSlots = isPosko ? 2 : 4;
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

  // Periksa apakah user bertugas sebagai kru biasa di slot 1, 2, atau 3 (bukan PIC)
  const isUserKru = Boolean(
    !isUserThePic &&
    slots.slice(1).some((s) => {
      if (!s.personnel_id) return false;
      if (currentPersonnelId && Number(s.personnel_id) === Number(currentPersonnelId)) return true;
      const pName = availablePersonnel.find((p) => Number(p.id) === Number(s.personnel_id))?.full_name || s.personnel_name;
      return Boolean(currentUserName && pName && currentUserName.toLowerCase() === pName.toLowerCase());
    })
  );

  const isAssignedToThisUnit = isUserThePic || isUserKru;

  // Hak periksa fisik armada / fasilitas posko: HANYA PIC (atau admin/supervisor unit). KRU TIDAK BISA.
  const canInspect = Boolean(
    onInspectVehicle && (isUserThePic || isAdmin || isSupervisor)
  );

  // Analisis Kesiapan Armada & Kelengkapan Formasi Kru
  const readinessStatus = vehicle.status || vehicle.readiness || 'serviceable';
  const isUnserviceable = readinessStatus === 'unserviceable';
  const picAssigned = Boolean(picSlot?.personnel_id);
  const filledSlotsCount = slots.filter((s) => Boolean(s.personnel_id)).length;
  // Kru dinyatakan lengkap jika minimal 2 personel (termasuk PIC) terisi
  const isCrewComplete = filledSlotsCount >= 2 && picAssigned;
  const isReadyForDuty = !isUnserviceable && isCrewComplete;

  return (
    <div
      className={`rounded-xl border shadow-sm p-3.5 sm:p-5 flex flex-col justify-between transition-colors duration-100 ${
        isUserThePic
          ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/40 shadow-md'
          : isUserKru
          ? 'bg-white border-blue-400 ring-2 ring-blue-300/40 shadow-sm'
          : isUnserviceable
          ? 'bg-red-50/15 border-red-300 ring-1 ring-red-200/50 shadow-xs'
          : isReadyForDuty
          ? 'bg-emerald-50/15 border-emerald-300 ring-1 ring-emerald-200/50 shadow-xs'
          : 'bg-amber-50/15 border-amber-300 ring-1 ring-amber-200/50 shadow-xs'
      }`}
    >
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isUnserviceable
                  ? 'bg-red-100 text-red-700'
                  : isPosko
                  ? 'bg-emerald-100 text-emerald-800'
                  : isUserThePic
                  ? 'bg-emerald-100 text-emerald-800'
                  : isUserKru
                  ? 'bg-blue-100 text-blue-800'
                  : isReadyForDuty
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <IconComponent className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 leading-tight">
                  {vehicle.code_name || vehicle.vehicle_name}
                </h4>
                {isUserThePic && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    PIC Anda
                  </span>
                )}
                {isUserKru && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300">
                    Kru Anda
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {isPosko ? 'Posko Komunikasi' : (vehicle.license_plate || vehicle.category || 'Armada Utama')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {/* Badge Kelaikan Fisik Armada / Fasilitas Posko */}
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                isUnserviceable
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}
            >
              {isUnserviceable ? 'Unserviceable' : 'Serviceable'}
            </span>

            {/* Badge Kelengkapan Kru */}
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                isCrewComplete
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : !picAssigned
                  ? 'bg-red-50 text-red-800 border-red-200 font-bold'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              {isCrewComplete
                ? `Lengkap (${filledSlotsCount}/${slots.length})`
                : !picAssigned
                ? `Belum Ada PIC (${filledSlotsCount}/${slots.length})`
                : `Belum Lengkap (${filledSlotsCount}/${slots.length})`}
            </span>
          </div>
        </div>

        {/* Peringatan Fisik jika Unserviceable */}
        {isUnserviceable && (
          <div className="mt-2.5 px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-[11px] text-red-800 font-semibold flex items-center justify-between">
            <span>⚠️ Armada Rusak / Dalam Perbaikan</span>
            <span className="text-[10px] font-normal text-red-600">Periksa PIC</span>
          </div>
        )}

        {/* Slot List */}
        <div className="mt-2.5 sm:mt-3 space-y-2 sm:space-y-2.5">
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
                className={`p-2 sm:p-2.5 rounded-lg border transition-colors duration-100 ${
                  isCurrentUser
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/40 shadow-xs'
                    : isPic
                    ? isSlotFilled
                      ? 'border-emerald-300 bg-emerald-50/50'
                      : 'border-dashed border-red-300 bg-red-50/30'
                    : isSlotFilled
                    ? 'border-slate-200 bg-white'
                    : 'border-dashed border-slate-200 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5 mb-1 sm:mb-1.5">
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <span
                      className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${
                        isCurrentUser
                          ? 'text-emerald-900'
                          : isPic && !isSlotFilled
                          ? 'text-red-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {isPic
                        ? (isPosko ? 'Slot #1 (PIC Watchroom)' : 'Slot #1 (PIC Kendaraan)')
                        : (isPosko ? `Operator #${index + 1}` : `Kru Slot #${index + 1}`)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-1.5">
                    {/* Glowing highlight indicator for current user */}
                    {isCurrentUser && (
                      <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Tugas Saya</span>
                      </span>
                    )}

                    {/* Fixed PIC Badge for top slot */}
                    {isPic && (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[9px] sm:text-[10px] font-bold border ${
                          isSlotFilled
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-red-100 text-red-900 border-red-300 animate-pulse'
                        }`}
                      >
                        <ShieldCheck className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
                        <span>{isSlotFilled ? 'PIC Terisi' : 'Wajib PIC'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!readOnly ? (
                    <select
                      value={slot.personnel_id || ''}
                      onChange={(e) => onSlotPersonnelChange(index, e.target.value)}
                      className={`w-full rounded-lg border px-2 sm:px-2.5 py-1 sm:py-1.5 text-xs min-h-[36px] sm:min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 ${
                        isCurrentUser
                          ? 'border-emerald-400 bg-white text-emerald-950 font-bold focus:ring-emerald-500'
                          : 'border-slate-300 bg-white text-slate-900 focus:ring-red-500'
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
                              ? `⛔ [CUTI/IZIN] ${p.full_name} (Sedang Cuti/Izin - Tidak Dapat Ditugaskan)`
                              : isAlreadyAssigned
                              ? `${p.full_name} (Sudah Ditugaskan)`
                              : p.full_name}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <div
                      className={`text-xs min-h-[36px] sm:min-h-[38px] flex items-center px-2 rounded ${
                        isCurrentUser
                          ? 'font-extrabold text-emerald-950 bg-emerald-100/60'
                          : displayName
                          ? 'font-semibold text-slate-800'
                          : 'italic text-slate-400'
                      }`}
                    >
                      {displayName || '(Belum Ditugaskan)'}
                    </div>
                  )}

                  {!readOnly && slots.length > minSlots && !isPic && (
                    <button
                      type="button"
                      onClick={() => onRemoveSlot(index)}
                      className="p-1 sm:p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded min-h-[36px] sm:min-h-[38px] min-w-[36px] sm:min-w-[38px] flex items-center justify-center transition-colors duration-100"
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
          className="mt-2.5 sm:mt-3 w-full py-1.5 sm:py-2 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors duration-100 flex items-center justify-center gap-1.5 min-h-[36px] sm:min-h-[38px]"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Slot ke-4</span>
        </button>
      )}

      {/* Bagian Status & Pemeriksaan Kesiapan Armada / Fasilitas Posko */}
      <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
          {isUserThePic ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {isPosko ? 'PIC Watchroom' : 'PIC Kendaraan'}
            </span>
          ) : isUserKru ? (
            <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
              <span>{isPosko ? 'Operator Posko' : 'Kru Armada (Pemeriksaan oleh PIC)'}</span>
            </span>
          ) : (
            <span className="text-slate-400">{isPosko ? 'Pemeriksaan Posko' : 'Pemeriksaan PIC'}</span>
          )}
        </div>

        {canInspect ? (
          <button
            type="button"
            onClick={() => onInspectVehicle(vehicle)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-100 shadow-xs ${
              isUserThePic
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400/40'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title={isPosko ? "Pemeriksaan kesiapan fasilitas komunikasi watchroom" : "Input status serviceable/unserviceable & foto kesiapan armada oleh PIC"}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isUserThePic ? (isPosko ? 'Periksa Fasilitas Posko' : 'Periksa Kesiapan (PIC)') : 'Periksa Kesiapan'}</span>
          </button>
        ) : isUserKru ? (
          <span className="text-[10px] text-slate-400 italic bg-slate-50 px-2 py-1 rounded border border-slate-200">
            Kru tidak berwenang input
          </span>
        ) : null}
      </div>
    </div>
  );
}


export default React.memo(DeploymentSlotCard);
