import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, Check, AlertCircle, RefreshCw, X, CalendarOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cleanTeam, getScheduledTeam, formatTeam, formatIndoDate } from '../../utils/shiftHelper';
import api from '../../services/api';
import MobilePlotCard from '../../components/mobile/ploting/MobilePlotCard';
import MobileCrewPickerSheet from '../../components/mobile/ploting/MobileCrewPickerSheet';

export default function MobileDeployment({ onOpenAuditModal }) {
  const { user, isAdmin, isDeptHead, isSupervisor, isChief, activeDate, activeShiftNumber, activeTeam } = useAuth();

  // Verifikasi apakah user berhak memploting shift ini
  const scheduledTeam = getScheduledTeam(activeDate, activeShiftNumber);
  const userTeam = cleanTeam(user?.team_group || '');
  const isAuthorizedShift = isAdmin || isDeptHead || (userTeam && userTeam.toLowerCase() === scheduledTeam.toLowerCase());
  const canEditPlot = Boolean(isAuthorizedShift && (isSupervisor || isChief || isAdmin || isDeptHead));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Auto-dismiss feedback toast setelah 3 detik
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const [vehicles, setVehicles] = useState([]);
  const [personnelList, setPersonnelList] = useState([]);
  const [vehicleSlots, setVehicleSlots] = useState({});
  const [initialSnapshot, setInitialSnapshot] = useState('');
  const [absentList, setAbsentList] = useState([]);

  // Picker Sheet State
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerContext, setPickerContext] = useState({
    unitId: null,
    unitName: '',
    slotIndex: 0,
    isPic: false,
  });

  // Status perubahan yang belum disimpan (Dirty state tracking)
  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshot) return false;
    return initialSnapshot !== JSON.stringify(vehicleSlots);
  }, [initialSnapshot, vehicleSlots]);

  // Route & browser tab close guard jika ada perubahan belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handlePopState = () => {
      if (hasUnsavedChanges) {
        const confirmLeave = window.confirm('Perubahan formasi ploting belum disimpan. Yakin ingin meninggalkan halaman?');
        if (!confirmLeave) {
          window.history.pushState(null, '', window.location.href);
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges]);


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
  const loadPlotingData = useCallback(async (signal) => {
    if (!isAuthorizedShift) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const currentTeam = cleanTeam(activeTeam);

      // Optimasi Temuan #16: Eliminasi fetch agresif personel saat inisialisasi awal.
      // Data personel hanya diunduh secara lazy saat picker dibuka.
      const [rRes, depRes] = await Promise.all([
        api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal }),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal }),
      ]);

      const readinessPayload = rRes.data?.data || rRes.data;
      const rawVehicles = Array.isArray(readinessPayload?.vehicles)
        ? readinessPayload.vehicles
        : (Array.isArray(rRes.data?.vehicles) ? rRes.data.vehicles : (Array.isArray(rRes.data) ? rRes.data : []));

      // Map vehicles with readiness status
      const mergedVehicles = rawVehicles.map((v) => ({
        ...v,
        id: v.id || v.vehicle_id,
        readiness: v.status || 'belum_dilaporkan',
        justification: v.justification || '',
      }));

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

      // Absent personnel list
      const existingAbsent = deploymentsList.filter((d) => d.deployment_type === 'absent');
      const absentIdSet = new Set(existingAbsent.map((d) => Number(d.personnel_id)));
      setAbsentList(
        existingAbsent.map((d) => ({
          id: d.id,
          personnel_id: d.personnel_id,
          name: d.full_name || '',
          reason: d.absent_reason || 'cuti',
          notes: d.notes || '',
        }))
      );

      // Initialize vehicle slots: default armada 3 slot (1 PIC + 2 kru), default posko 1 slot (1 PIC)
      const initialSlots = {};
      sortedVehicles.forEach((v) => {
        const vId = v.id;
        const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
        const defaultEmptyCount = isPosko ? 1 : 3;
        const existingForUnit = deploymentsList.filter((d) =>
          isPosko
            ? (d.deployment_type === 'watchroom' || Number(d.vehicle_id) === Number(vId))
            : Number(d.vehicle_id) === Number(vId)
        );

        if (existingForUnit.length > 0) {
          const sorted = [...existingForUnit].sort((a, b) => (b.is_pic ? 1 : 0) - (a.is_pic ? 1 : 0));
          initialSlots[vId] = sorted.map((d, idx) => {
            const isAbsentCrew = d.personnel_id && absentIdSet.has(Number(d.personnel_id));
            return {
              personnel_id: isAbsentCrew ? '' : (d.personnel_id || ''),
              is_pic: idx === 0,
              personnel_name: isAbsentCrew ? '' : (d.full_name || ''),
            };
          });
          // Ensure default slot count (posko: 1, armada: 3)
          while (initialSlots[vId].length < defaultEmptyCount) {
            initialSlots[vId].push({ personnel_id: '', is_pic: false, personnel_name: '' });
          }
        } else {
          initialSlots[vId] = isPosko
            ? [{ personnel_id: '', is_pic: true, personnel_name: '' }]
            : [
                { personnel_id: '', is_pic: true, personnel_name: '' },
                { personnel_id: '', is_pic: false, personnel_name: '' },
                { personnel_id: '', is_pic: false, personnel_name: '' },
              ];
        }
      });
      setVehicleSlots(initialSlots);
      setInitialSnapshot(JSON.stringify(initialSlots));
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error loading ploting data:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memuat data ploting armada.'));
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam, isAuthorizedShift]);

  useEffect(() => {
    const controller = new AbortController();
    loadPlotingData(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadPlotingData]);

  // Lazy-fetch kandidat personel hanya saat picker sheet dibuka (Temuan #16)
  useEffect(() => { setPersonnelList([]); }, [activeTeam]);
  const fetchCandidates = useCallback(async () => {
    if (personnelList.length > 0) return;
    try {
      const currentTeam = cleanTeam(activeTeam);
      const pRes = await api.get(`/personnel?team_group=${currentTeam}&is_active=1&compact=true`);
      const rawPersonnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel) ? pRes.data.personnel : (Array.isArray(pRes.data) ? pRes.data : []));
      setPersonnelList(rawPersonnel);
    } catch (err) {
      console.error('Error lazy-fetching candidates:', err);
    }
  }, [activeTeam, personnelList.length]);

  // Open Crew Picker Sheet for a unit and slot
  const handleOpenPicker = (unitId, slotIndex, isPic) => {
    if (!canEditPlot) return;
    const unit = vehicles.find((v) => String(v.id) === String(unitId));
    setPickerContext({
      unitId,
      unitName: unit?.vehicle_name || unit?.code_name || 'Armada',
      slotIndex,
      isPic,
    });
    setPickerOpen(true);
    fetchCandidates();
  };

  // Add new dynamic crew slot to a unit (max 4 armada, max 2 posko)
  const handleAddCrew = (unitId) => {
    if (!canEditPlot) return;
    const unit = vehicles.find((v) => String(v.id) === String(unitId));
    const isPosko = unit?.category === 'posko' || unit?.code_name === 'WATCHROOM';
    const maxSlots = isPosko ? 2 : 4;
    setVehicleSlots((prev) => {
      const currentList = [...(prev[unitId] || [])];
      if (currentList.length < maxSlots) {
        currentList.push({ personnel_id: '', is_pic: false, personnel_name: '' });
      }
      return { ...prev, [unitId]: currentList };
    });
  };

  // Select personnel into a slot or clear slot
  const handleSelectPersonnel = (selectedPersonnelId, selectedPersonObj = null) => {
    if (!canEditPlot) return;
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
          // If crew slot, remove slot if > defaultEmptyCount, otherwise clear
          const unit = vehicles.find((v) => String(v.id) === String(unitId));
          const isPosko = unit?.category === 'posko' || unit?.code_name === 'WATCHROOM';
          const defaultEmptyCount = isPosko ? 1 : 3;
          if (unitList.length > defaultEmptyCount) {
            unitList.splice(slotIndex, 1);
          } else {
            unitList[slotIndex] = { ...unitList[slotIndex], personnel_id: '', personnel_name: '' };
          }
        }
      } else {
        const person = selectedPersonObj || personnelMap[selectedPersonnelId];
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
    if (!canEditPlot) {
      setErrorMsg('Akses ditolak: Hanya Chief/Supervisor/Admin yang dapat menyimpan ploting armada.');
      return;
    }
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

    // Validasi: Personel yang sedang cuti tidak boleh diploting di armada
    for (const abs of absentList) {
      if (abs.personnel_id && assignedMap[Number(abs.personnel_id)]) {
        const personObj = personnelList.find((p) => Number(p.id) === Number(abs.personnel_id));
        const pName = personObj?.full_name || personObj?.name || abs.name || `ID #${abs.personnel_id}`;
        setErrorMsg(`Personel ${pName} sedang cuti/izin namun terploting di ${assignedMap[Number(abs.personnel_id)]}. Harap kosongkan slotnya terlebih dahulu.`);
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

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setToastMsg('Ploting penugasan armada berhasil disimpan.');
      setInitialSnapshot(JSON.stringify(vehicleSlots));
      window.dispatchEvent(new CustomEvent('arff:deployments-updated'));
      await loadPlotingData();
    } catch (err) {
      console.error('Error saving deployments:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan ploting.'));
      setErrorMsg(`Gagal menyimpan ploting: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Layar santun jika pengguna sedang lepas piket / bukan shift dinas regunya
  if (!isAuthorizedShift) {
    return (
      <div className="space-y-3 pb-20 font-sans">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center space-y-2.5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
            <CalendarOff className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider">
              Bukan Shift Dinas Anda
            </span>
            <h3 className="text-sm font-bold text-slate-900 pt-1">
              Operasional Regu {scheduledTeam}
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
              Anda terdaftar pada <span className="font-semibold text-slate-800">{formatTeam(userTeam) || 'Regu Lain'}</span>. Wewenang penyusunan ploting armada dan kru untuk <span className="font-semibold text-slate-800">Shift <span className="font-mono tabular-nums">{activeShiftNumber}</span></span> ({formatIndoDate(activeDate)}) dikelola oleh Chief / Pengawas Regu yang bertugas aktif saat ini.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 pb-20 font-sans">
      {/* Floating Viewport Toast Feedback */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm p-2.5 rounded-xl bg-emerald-600 text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-white shrink-0" />
            <span className="font-bold text-xs leading-tight">
              {typeof toastMsg === 'string' ? toastMsg : (toastMsg?.message || 'Berhasil')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-100 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Viewport Error Message */}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm p-2.5 rounded-xl bg-red-600 text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-white shrink-0" />
            <span className="font-bold text-xs leading-tight">
              {typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'Terjadi kesalahan')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="text-red-100 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Ploting Bar: Judul & Tombol Simpan */}
      <div className="flex items-center justify-between bg-white px-2.5 py-2 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h3 className="text-xs font-bold text-slate-900 leading-tight">
            Ploting & Kesiapan Armada
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Ada perubahan belum disimpan" />
          )}
          {canEditPlot ? (
            <button
              type="button"
              onClick={handleSavePloting}
              disabled={saving || loading || !hasUnsavedChanges}
              className={`px-2.5 py-1 rounded font-bold text-xs flex items-center gap-1 shadow-xs transition-colors duration-100 ${hasUnsavedChanges
                  ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                } disabled:opacity-60`}
            >
              {saving ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Save className="w-3 h-3" />
              )}
              <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
            </button>
          ) : (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              Mode Tinjau (Read-Only)
            </span>
          )}
        </div>
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
        /* Kontainer Kartu Ploting Armada (Dense Ops Layout) */
        <div className="space-y-1.5">
          {vehicles.map((unit, unitIdx) => (
            <MobilePlotCard
              key={unit.id ?? unit.code_name ?? `unit-${unitIdx}`}
              unit={unit}
              slots={vehicleSlots[unit.id] || []}
              personnelMap={personnelMap}
              currentPersonnelId={user?.personnel_id}
              currentUserName={user?.name || user?.full_name}
              onOpenPicker={canEditPlot ? (slotIdx, isPic) => handleOpenPicker(unit.id, slotIdx, isPic) : null}
              onAddCrew={canEditPlot ? () => handleAddCrew(unit.id) : null}
              canEdit={canEditPlot}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}
