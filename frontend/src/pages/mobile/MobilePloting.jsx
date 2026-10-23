import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Check, AlertCircle, RefreshCw, Plus, UserPlus, X, CalendarOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cleanTeam, getScheduledTeam, formatTeam, formatIndoDate } from '../../utils/shiftHelper';
import api from '../../services/api';
import MobilePlotCard from '../../components/mobile/ploting/MobilePlotCard';
import MobileCrewPickerSheet from '../../components/mobile/ploting/MobileCrewPickerSheet';
import MobileAbsentCrewSection from '../../components/mobile/ploting/MobileAbsentCrewSection';
import MobileCancelLeaveConfirmModal from '../../components/mobile/ploting/MobileCancelLeaveConfirmModal';

export default function MobilePloting({ onOpenCutiModal, onOpenAuditModal }) {
  const { user, isAdmin, isDeptHead, activeDate, activeShiftNumber, activeTeam } = useAuth();

  // Verifikasi apakah user berhak memploting shift ini
  const scheduledTeam = getScheduledTeam(activeDate, activeShiftNumber);
  const userTeam = cleanTeam(user?.team_group || '');
  const isAuthorizedShift = isAdmin || isDeptHead || (userTeam && userTeam.toLowerCase() === scheduledTeam.toLowerCase());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [vehicleSlots, setVehicleSlots] = useState({});
  const [absentList, setAbsentList] = useState([]);

  // Picker Sheet State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerContext, setPickerContext] = useState({
    unitId: null,
    unitName: '',
    slotIndex: 0,
    isPic: false,
  });

  // Cancel Leave Confirm Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [targetCancelLeave, setTargetCancelLeave] = useState(null);
  const [cancelingLeave, setCancelingLeave] = useState(false);

  // Manual Add Absent Crew Modal State
  const [addAbsentModalOpen, setAddAbsentModalOpen] = useState(false);
  const [selectedAbsentPersonnelId, setSelectedAbsentPersonnelId] = useState('');
  const [absentReason, setAbsentReason] = useState('cuti');
  const [absentNotes, setAbsentNotes] = useState('');

  // Map of personnel by ID for fast lookup
  const personnelMap = useMemo(() => {
    const map = {};
    personnelList.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [personnelList]);

  // Set of absent personnel IDs
  const absentSet = useMemo(() => {
    const set = new Set();
    absentList.forEach((a) => {
      if (a.personnel_id) set.add(Number(a.personnel_id));
    });
    return set;
  }, [absentList]);

  // Map of personnel assigned to vehicles { [personnelId]: unitName }
  const assignedMap = useMemo(() => {
    const map = {};
    Object.entries(vehicleSlots).forEach(([unitId, slots]) => {
      const unit = vehicles.find((v) => String(v.id) === String(unitId));
      const uName = unit?.code_name || unit?.vehicle_name || `Unit ${unitId}`;
      slots.forEach((s) => {
        if (s.personnel_id) {
          map[Number(s.personnel_id)] = uName;
        }
      });
    });
    return map;
  }, [vehicleSlots, vehicles]);

  // Fetch all initial data (Hanya dieksekusi jika berhak berdinas di shift ini demi menghemat beban request server)
  const loadPlotingData = useCallback(async () => {
    if (!isAuthorizedShift) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const currentTeam = cleanTeam(activeTeam);

      const [pRes, vRes, rRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`),
        api.get('/vehicles?is_active=1'),
        api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
      ]);

      const rawPersonnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel) ? pRes.data.personnel : (Array.isArray(pRes.data) ? pRes.data : []));
      setPersonnelList(rawPersonnel);

      const rawVehicles = Array.isArray(vRes.data?.data)
        ? vRes.data.data
        : (Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []));

      const readinessList = Array.isArray(rRes.data?.data)
        ? rRes.data.data
        : (Array.isArray(rRes.data?.vehicles) ? rRes.data.vehicles : (Array.isArray(rRes.data) ? rRes.data : []));

      const readinessMap = {};
      readinessList.forEach((r) => {
        const vId = r.vehicle_id || r.id;
        if (vId) readinessMap[vId] = r;
      });

      // Merge vehicles with readiness
      const mergedVehicles = rawVehicles.map((v) => {
        const r = readinessMap[v.id] || {};
        return {
          ...v,
          readiness: r.status || v.status || 'belum_dilaporkan',
          justification: r.justification || v.justification || '',
        };
      });

      // Sort vehicles: Utama -> Pendukung -> Posko (Watchroom)
      const sortedVehicles = [...mergedVehicles].sort((a, b) => {
        const order = { utama: 1, pendukung: 2, posko: 3 };
        const catA = order[a.category] || 99;
        const catB = order[b.category] || 99;
        if (catA !== catB) return catA - catB;
        return (a.code_name || '').localeCompare(b.code_name || '');
      });
      setVehicles(sortedVehicles);

      const depPayload = depRes.data?.data || depRes.data;
      const deploymentsList = Array.isArray(depPayload?.deployments)
        ? depPayload.deployments
        : (Array.isArray(depRes.data?.deployments) ? depRes.data.deployments : []);

      // Initialize vehicle slots
      const initialSlots = {};
      sortedVehicles.forEach((v) => {
        const vId = v.id;
        const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
        const existingForUnit = deploymentsList.filter((d) =>
          isPosko
            ? (d.deployment_type === 'watchroom' || Number(d.vehicle_id) === Number(vId))
            : Number(d.vehicle_id) === Number(vId)
        );

        if (existingForUnit.length > 0) {
          const sorted = [...existingForUnit].sort((a, b) => (b.is_pic ? 1 : 0) - (a.is_pic ? 1 : 0));
          initialSlots[vId] = sorted.map((d, idx) => ({
            personnel_id: d.personnel_id || '',
            is_pic: idx === 0,
            personnel_name: d.full_name || '',
          }));
          // Ensure at least 1 PIC + 1 crew minimum slot exists
          while (initialSlots[vId].length < (isPosko ? 2 : 2)) {
            initialSlots[vId].push({ personnel_id: '', is_pic: false, personnel_name: '' });
          }
        } else {
          initialSlots[vId] = [
            { personnel_id: '', is_pic: true, personnel_name: '' },
            { personnel_id: '', is_pic: false, personnel_name: '' },
          ];
        }
      });
      setVehicleSlots(initialSlots);

      // Absent personnel list
      const existingAbsent = deploymentsList.filter((d) => d.deployment_type === 'absent');
      setAbsentList(
        existingAbsent.map((d) => ({
          id: d.id,
          personnel_id: d.personnel_id,
          name: d.full_name || rawPersonnel.find((p) => p.id === d.personnel_id)?.full_name || '',
          reason: d.absent_reason || 'cuti',
          notes: d.notes || '',
        }))
      );
    } catch (err) {
      console.error('Error loading ploting data:', err);
      setErrorMsg('Gagal memuat data ploting armada.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam, isAuthorizedShift]);

  useEffect(() => {
    loadPlotingData();
  }, [loadPlotingData]);

  // Open Crew Picker Sheet for a unit and slot
  const handleOpenPicker = (unitId, slotIndex, isPic) => {
    const unit = vehicles.find((v) => String(v.id) === String(unitId));
    setPickerContext({
      unitId,
      unitName: unit?.vehicle_name || unit?.code_name || 'Armada',
      slotIndex,
      isPic,
    });
    setPickerOpen(true);
  };

  // Add new dynamic crew slot to a unit (max 4 total slots)
  const handleAddCrew = (unitId) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[unitId] || [])];
      if (currentList.length < 4) {
        currentList.push({ personnel_id: '', is_pic: false, personnel_name: '' });
      }
      return { ...prev, [unitId]: currentList };
    });
  };

  // Select personnel into a slot or clear slot
  const handleSelectPersonnel = (selectedPersonnelId) => {
    const { unitId, slotIndex, isPic } = pickerContext;
    if (!unitId) return;

    setVehicleSlots((prev) => {
      const nextSlots = { ...prev };

      // If personnel was already selected in another unit/slot, remove them to prevent duplicate duty
      if (selectedPersonnelId) {
        Object.keys(nextSlots).forEach((vKey) => {
          nextSlots[vKey] = nextSlots[vKey].map((s) => {
            if (Number(s.personnel_id) === Number(selectedPersonnelId)) {
              return { ...s, personnel_id: '', personnel_name: '' };
            }
            return s;
          });
        });
      }

      const unitList = [...(nextSlots[unitId] || [])];
      if (selectedPersonnelId === null) {
        // Clear slot
        if (isPic) {
          unitList[0] = { ...unitList[0], personnel_id: '', personnel_name: '' };
        } else {
          // If crew slot, remove slot if > 2 slots, otherwise clear
          if (unitList.length > 2) {
            unitList.splice(slotIndex, 1);
          } else {
            unitList[slotIndex] = { ...unitList[slotIndex], personnel_id: '', personnel_name: '' };
          }
        }
      } else {
        const person = personnelMap[selectedPersonnelId];
        unitList[slotIndex] = {
          ...unitList[slotIndex],
          personnel_id: selectedPersonnelId,
          is_pic: slotIndex === 0,
          personnel_name: person?.full_name || person?.name || '',
        };
      }

      nextSlots[unitId] = unitList;
      return nextSlots;
    });

    setToastMsg(
      selectedPersonnelId
        ? `Personel ditempatkan pada ${pickerContext.unitName}.`
        : `Slot pada ${pickerContext.unitName} dikosongkan.`
    );
  };

  // Save all Ploting to backend (/api/deployments/batch)
  const handleSavePloting = async () => {
    setErrorMsg(null);
    setToastMsg(null);

    // Validation: Any unit with crew assigned must have Slot 0 (PIC) assigned
    for (const unit of vehicles) {
      const slots = vehicleSlots[unit.id] || [];
      const hasPic = Boolean(slots[0]?.personnel_id);
      const hasAnyCrew = slots.slice(1).some((s) => Boolean(s.personnel_id));

      if (hasAnyCrew && !hasPic) {
        const uName = unit.vehicle_name || unit.code_name || `Unit #${unit.id}`;
        setErrorMsg(`Unit ${uName} memiliki kru tetapi belum memiliki PIC (Slot 0). Harap tunjuk PIC terlebih dahulu.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payloadDeployments = [];

      // Collect operational units
      vehicles.forEach((unit) => {
        const slots = vehicleSlots[unit.id] || [];
        const isPosko = unit.category === 'posko' || unit.code_name === 'WATCHROOM';
        const depType = isPosko
          ? 'watchroom'
          : (unit.category === 'pendukung' ? 'vehicle_pendukung' : 'vehicle_utama');

        slots.forEach((slot, idx) => {
          if (slot.personnel_id) {
            payloadDeployments.push({
              personnel_id: Number(slot.personnel_id),
              deployment_type: depType,
              vehicle_id: Number(unit.id),
              is_pic: idx === 0,
              notes: isPosko
                ? (idx === 0 ? 'PIC Watchroom' : 'Operator Komunikasi')
                : (idx === 0 ? 'PIC Armada' : `Kru ${idx}`),
            });
          }
        });
      });

      // Collect absent crew
      absentList.forEach((abs) => {
        if (abs.personnel_id) {
          payloadDeployments.push({
            personnel_id: Number(abs.personnel_id),
            deployment_type: 'absent',
            vehicle_id: null,
            is_pic: false,
            absent_reason: abs.reason || 'cuti',
            notes: abs.notes || 'Izin/Cuti Dinas Shift',
          });
        }
      });

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setToastMsg('✓ Ploting penugasan 8 unit armada berhasil disimpan.');
    } catch (err) {
      console.error('Error saving deployments:', err);
      setErrorMsg(`Gagal menyimpan ploting: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Open Cancel Leave Modal
  const handleRequestCancelLeave = (item) => {
    const pId = Number(item.personnel_id);
    const person = personnelMap[pId];
    setTargetCancelLeave({
      ...item,
      personnel_id: pId,
      name: person?.full_name || person?.name || item.name,
    });
    setCancelModalOpen(true);
  };

  // Confirm and execute Cancel Leave
  const handleConfirmCancelLeave = async () => {
    if (!targetCancelLeave) return;
    setCancelingLeave(true);
    try {
      const pId = Number(targetCancelLeave.personnel_id);
      const updatedAbsentList = absentList.filter((a) => Number(a.personnel_id) !== pId);
      setAbsentList(updatedAbsentList);

      // Re-build payload without this absent person and persist to backend
      const payloadDeployments = [];
      vehicles.forEach((unit) => {
        const slots = vehicleSlots[unit.id] || [];
        const isPosko = unit.category === 'posko' || unit.code_name === 'WATCHROOM';
        const depType = isPosko
          ? 'watchroom'
          : (unit.category === 'pendukung' ? 'vehicle_pendukung' : 'vehicle_utama');

        slots.forEach((slot, idx) => {
          if (slot.personnel_id) {
            payloadDeployments.push({
              personnel_id: Number(slot.personnel_id),
              deployment_type: depType,
              vehicle_id: Number(unit.id),
              is_pic: idx === 0,
              notes: isPosko
                ? (idx === 0 ? 'PIC Watchroom' : 'Operator Komunikasi')
                : (idx === 0 ? 'PIC Armada' : `Kru ${idx}`),
            });
          }
        });
      });

      updatedAbsentList.forEach((abs) => {
        if (abs.personnel_id) {
          payloadDeployments.push({
            personnel_id: Number(abs.personnel_id),
            deployment_type: 'absent',
            vehicle_id: null,
            is_pic: false,
            absent_reason: abs.reason || 'cuti',
            notes: abs.notes || 'Izin/Cuti Dinas Shift',
          });
        }
      });

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setToastMsg(`✓ Cuti ${targetCancelLeave.name || 'personel'} dibatalkan. Personel kini aktif berdinas.`);
      setCancelModalOpen(false);
      setTargetCancelLeave(null);
    } catch (err) {
      console.error('Error canceling leave:', err);
      setErrorMsg(`Gagal membatalkan cuti: ${err.response?.data?.message || err.message}`);
    } finally {
      setCancelingLeave(false);
    }
  };

  // Add Absent Member manually
  const handleSaveNewAbsent = () => {
    if (!selectedAbsentPersonnelId) return;
    const pId = Number(selectedAbsentPersonnelId);
    const person = personnelMap[pId];

    // Remove from any vehicle slot
    setVehicleSlots((prev) => {
      const nextSlots = { ...prev };
      Object.keys(nextSlots).forEach((vKey) => {
        nextSlots[vKey] = nextSlots[vKey].map((s) => {
          if (Number(s.personnel_id) === pId) {
            return { ...s, personnel_id: '', personnel_name: '' };
          }
          return s;
        });
      });
      return nextSlots;
    });

    setAbsentList((prev) => [
      ...prev,
      {
        id: Date.now(),
        personnel_id: pId,
        name: person?.full_name || person?.name || `Personel #${pId}`,
        reason: absentReason,
        notes: absentNotes,
      },
    ]);

    setAddAbsentModalOpen(false);
    setSelectedAbsentPersonnelId('');
    setAbsentNotes('');
    setToastMsg(`Personel ${person?.full_name || ''} dicatat izin/cuti.`);
  };

  // Available personnel for manual absent modal (not already absent)
  const availableForAbsent = useMemo(() => {
    return personnelList.filter((p) => !absentSet.has(Number(p.id)));
  }, [personnelList, absentSet]);

  // Layar santun jika pengguna sedang lepas piket / bukan shift dinas regunya
  if (!isAuthorizedShift) {
    return (
      <div className="space-y-3 pb-20">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <CalendarOff className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              Bukan Shift Dinas Anda
            </span>
            <h3 className="text-sm font-bold text-slate-900 pt-1">
              Operasional Regu {scheduledTeam}
            </h3>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
              Anda terdaftar pada <span className="font-semibold text-slate-800">{formatTeam(userTeam) || 'Regu Lain'}</span>. Wewenang penyusunan ploting armada dan kru untuk <span className="font-semibold text-slate-800">Shift {activeShiftNumber}</span> ({formatIndoDate(activeDate)}) dikelola oleh Chief / Pengawas Regu yang bertugas aktif saat ini.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-500 text-left space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Informasi Akses Operasional</span>
            </div>
            <p className="text-[10.5px] leading-snug">
              Untuk memantau kesiapan armada dan logbook shift berjalan tanpa mengubah susunan kru, silakan akses tab <span className="font-semibold text-slate-700">Laporan</span> atau kembali ke layar <span className="font-semibold text-slate-700">Dashboard</span>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pb-20">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold text-[11px]">{toastMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="font-semibold text-[11px]">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-700 p-0.5"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Header Ploting Bar: Judul & Tombol Simpan Ramping */}
      <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-slate-900 leading-tight">
            Ploting & Kesiapan Armada
          </h3>
          <span className="text-[9px] text-slate-500 font-mono">
            {vehicles.length} Unit Operasional
          </span>
        </div>
        <button
          type="button"
          onClick={handleSavePloting}
          disabled={saving || loading}
          className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors duration-100 disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <Save className="w-3 h-3" />
          )}
          <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-1.5">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-2 animate-pulse"
            >
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
              <div className="h-4 bg-slate-100 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : (
        /* Kontainer Kartu Ploting 8 Unit Armada (Dense Ops Layout) */
        <div className="space-y-1.5">
          {vehicles.map((unit) => (
            <MobilePlotCard
              key={unit.id}
              unit={unit}
              slots={vehicleSlots[unit.id] || []}
              personnelMap={personnelMap}
              onOpenPicker={(slotIdx, isPic) => handleOpenPicker(unit.id, slotIdx, isPic)}
              onAddCrew={() => handleAddCrew(unit.id)}
              onOpenDetailKendala={onOpenAuditModal}
            />
          ))}
        </div>
      )}

      {/* Bagian Bawah: Personel Izin / Cuti */}
      <MobileAbsentCrewSection
        absentList={absentList}
        personnelMap={personnelMap}
        onRequestCancel={handleRequestCancelLeave}
        onOpenCutiSaya={onOpenCutiModal}
        onAddAbsentMember={() => setAddAbsentModalOpen(true)}
      />

      {/* Crew Picker Bottom Sheet */}
      <MobileCrewPickerSheet
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={pickerContext.isPic ? `Pilih PIC ${pickerContext.unitName}` : `Pilih Kru ${pickerContext.unitName}`}
        subtitle={`Slot ${pickerContext.slotIndex === 0 ? 'PIC (Operator Utama)' : `Kru Lapangan ${pickerContext.slotIndex}`}`}
        personnelList={personnelList}
        currentPersonnelId={vehicleSlots[pickerContext.unitId]?.[pickerContext.slotIndex]?.personnel_id}
        assignedMap={assignedMap}
        absentSet={absentSet}
        onSelect={handleSelectPersonnel}
      />

      {/* Modal Konfirmasi Pembatalan Cuti */}
      <MobileCancelLeaveConfirmModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setTargetCancelLeave(null);
        }}
        onConfirm={handleConfirmCancelLeave}
        personnelName={targetCancelLeave?.name || ''}
        reason={targetCancelLeave?.reason || 'cuti'}
        loading={cancelingLeave}
      />

      {/* Modal Cepat Tambah Anggota Absen */}
      {addAbsentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h4 className="text-xs font-bold text-slate-900 uppercase">
                Catat Personel Izin / Cuti
              </h4>
              <button
                type="button"
                onClick={() => setAddAbsentModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  Pilih Anggota *
                </label>
                <select
                  value={selectedAbsentPersonnelId}
                  onChange={(e) => setSelectedAbsentPersonnelId(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none"
                >
                  <option value="">-- Pilih Personel --</option>
                  {availableForAbsent.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.name} ({p.nip})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  Kategori Izin *
                </label>
                <select
                  value={absentReason}
                  onChange={(e) => setAbsentReason(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none"
                >
                  <option value="cuti">Cuti Tahunan</option>
                  <option value="sakit">Sakit</option>
                  <option value="dinas">Dinas Luar</option>
                  <option value="tukar_dinas">Tukar Dinas</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                  Keterangan Singkat
                </label>
                <input
                  type="text"
                  value={absentNotes}
                  onChange={(e) => setAbsentNotes(e.target.value)}
                  placeholder="Keterangan permohonan..."
                  className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none transition-colors duration-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setAddAbsentModalOpen(false)}
                  className="w-full py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewAbsent}
                  disabled={!selectedAbsentPersonnelId}
                  className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-colors duration-100 disabled:opacity-50"
                >
                  Simpan Izin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
