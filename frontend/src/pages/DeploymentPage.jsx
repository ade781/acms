import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Save,
  ShieldAlert,
  UserX,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam, getScheduledTeam, formatIndoDate } from '../utils/shiftHelper';
import api from '../services/api';
import DeploymentSlotCard from '../components/forms/DeploymentSlotCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import StateView from '../components/common/StateView';

export default function DeploymentPage() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [supervisorName, setSupervisorName] = useState('');

  // Modal Kesiapan Kendaraan di Ploting
  const [selectedVehicleForInspection, setSelectedVehicleForInspection] = useState(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);

  // Ploting state: vehicleId -> Array of { personnel_id, is_pic, personnel_name }
  // Slot 0 FIX PIC, slot 1-3 Kru (untuk Watchroom: Slot 0 PIC, Slot 1 Kru)
  const [vehicleSlots, setVehicleSlots] = useState({});

  // Absent personnel: Array of { personnel_id, reason: 'cuti'|'sakit'|'dinas'|'tukar_dinas', notes }
  const [absentList, setAbsentList] = useState([]);

  const [saving, setSaving] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState('');

  // Auto-dismiss timer untuk notifikasi sukses
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Jadwal dinas operasional shift aktif
  const scheduledTeam = useMemo(
    () => getScheduledTeam(activeDate, activeShiftNumber),
    [activeDate, activeShiftNumber]
  );
  const isScheduledTeam = cleanTeam(activeTeam) === cleanTeam(scheduledTeam);

  // Hak edit: Hanya supervisor/admin, dan regu harus terjadwal dinas aktif (kecuali admin)
  const canEditPlot = (isAdmin || isSupervisor) && (isScheduledTeam || isAdmin);

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

  // ID Personel yang telah ditugaskan di slot armada manapun
  const assignedPersonnelIds = useMemo(() => {
    const set = new Set();
    Object.values(vehicleSlots).forEach((slots) => {
      slots.forEach((s) => {
        if (s.personnel_id) set.add(Number(s.personnel_id));
      });
    });
    return set;
  }, [vehicleSlots]);

  // ID Personel yang sedang cuti / izin
  const absentPersonnelIds = useMemo(() => {
    const set = new Set();
    absentList.forEach((a) => {
      if (a.personnel_id) set.add(Number(a.personnel_id));
    });
    return set;
  }, [absentList]);

  // Ringkasan Kesiapan Visual Formasi Kru & Armada
  const formationSummary = useMemo(() => {
    let readyCount = 0;
    let incompleteCount = 0;
    let unserviceableCount = 0;

    vehicles.forEach((v) => {
      const vId = v.id || v.vehicle_id;
      const slots = vehicleSlots[vId] || [];
      const isUnserviceable = (v.status || v.readiness) === 'unserviceable';
      const picAssigned = Boolean(slots[0]?.personnel_id);
      const filledCount = slots.filter((s) => Boolean(s.personnel_id)).length;
      const isComplete = filledCount >= 2 && picAssigned;

      if (isUnserviceable) {
        unserviceableCount++;
      } else if (isComplete) {
        readyCount++;
      } else {
        incompleteCount++;
      }
    });

    return { readyCount, incompleteCount, unserviceableCount, total: vehicles.length };
  }, [vehicles, vehicleSlots]);


  // Fetch current deployment & master data concurrently
  const fetchDeploymentData = useCallback(async (options = {}) => {
    // Proteksi Penghematan Bandwidth & Aturan GEMINI.md:
    // Jika user bukan Admin dan bukan regu yang terjadwal aktif dinas, DILARANG request fetch data berat
    if (!isScheduledTeam && !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    if (!options?.keepSuccessMsg) {
      setSuccessMsg(null);
    }

    try {
      const currentTeam = cleanTeam(activeTeam);

      // Concurrent fetch (Promise.all) to prevent request waterfalls
      const [pRes, vRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`, { signal: options?.signal }),
        api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal: options?.signal }),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal: options?.signal }),
      ]);

      const personnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel)
        ? pRes.data.personnel
        : (Array.isArray(pRes.data) ? pRes.data : []));
      setTeamPersonnel(personnel);

      const rawVehicles = Array.isArray(vRes.data?.vehicles)
        ? vRes.data.vehicles
        : (Array.isArray(vRes.data) ? vRes.data : []);
      // Ensure id is always valid and consistent
      const fetchedVehicles = rawVehicles.map((v) => ({
        ...v,
        id: v.id || v.vehicle_id,
      }));
      setVehicles(fetchedVehicles);

      const depPayload = depRes.data?.data || depRes.data;
      const deploymentsList = Array.isArray(depPayload?.deployments)
        ? depPayload.deployments
        : (Array.isArray(depRes.data?.deployments) ? depRes.data.deployments : []);

      setSupervisorName(depPayload?.shift?.supervisor_name || depPayload?.supervisor_name || '');

      // Absent personnel
      const existingAbsent = (deploymentsList || []).filter(
        (d) => d.deployment_type === 'absent'
      );
      const absentIdSet = new Set(existingAbsent.map((d) => Number(d.personnel_id)));

      if (existingAbsent.length > 0) {
        setAbsentList(
          existingAbsent.map((d) => ({
            personnel_id: d.personnel_id,
            reason: d.absent_reason || 'cuti',
            notes: d.notes || '',
          }))
        );
      } else {
        setAbsentList([]);
      }

      // Initialize vehicle & watchroom slots
      // Slot 0 (paling atas) selalu FIX sebagai PIC
      // Auto-evict: Jika personel tercatat cuti/izin, otomatis lepaskan dari slot kendaraan
      const initialSlots = {};
      fetchedVehicles.forEach((v) => {
        const vId = v.id;
        const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
        const targetSlotsCount = isPosko ? 2 : 3;

        const existingForUnit = (deploymentsList || []).filter((d) =>
          isPosko
            ? (d.deployment_type === 'watchroom' || Number(d.vehicle_id) === Number(vId))
            : Number(d.vehicle_id) === Number(vId)
        );

        if (existingForUnit.length > 0) {
          // Sort so that PIC is at slot 0
          const sorted = [...existingForUnit].sort((a, b) => (b.is_pic ? 1 : 0) - (a.is_pic ? 1 : 0));
          initialSlots[vId] = sorted.map((d, idx) => {
            const isAbsentCrew = d.personnel_id && absentIdSet.has(Number(d.personnel_id));
            return {
              personnel_id: isAbsentCrew ? '' : (d.personnel_id || ''),
              is_pic: idx === 0, // Slot 0 selalu PIC
              personnel_name: isAbsentCrew ? '' : (d.full_name || ''),
            };
          });
          while (initialSlots[vId].length < targetSlotsCount) {
            initialSlots[vId].push({ personnel_id: '', is_pic: false, personnel_name: '' });
          }
        } else {
          initialSlots[vId] = isPosko
            ? [
                { personnel_id: '', is_pic: true, personnel_name: '' },   // Slot 0: PIC / Operator Utama
                { personnel_id: '', is_pic: false, personnel_name: '' },  // Slot 1: Operator Pendukung
              ]
            : [
                { personnel_id: '', is_pic: true, personnel_name: '' },   // Slot 0: FIX PIC
                { personnel_id: '', is_pic: false, personnel_name: '' },  // Slot 1: Kru
                { personnel_id: '', is_pic: false, personnel_name: '' },  // Slot 2: Kru
              ];
        }
      });
      setVehicleSlots(initialSlots);
      setInitialSnapshot(JSON.stringify(initialSlots));
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Error fetching deployments:', err);
      setError('Gagal memuat data ploting penugasan shift.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam, isScheduledTeam, isAdmin]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDeploymentData({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchDeploymentData]);

  // Handle personnel change in a vehicle slot
  const handleSlotPersonnelChange = (vehicleId, slotIndex, personnelId) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      currentList[slotIndex] = {
        ...currentList[slotIndex],
        personnel_id: personnelId ? Number(personnelId) : '',
        is_pic: slotIndex === 0, // Slot 0 selalu FIX sebagai PIC
      };
      return { ...prev, [vehicleId]: currentList };
    });
  };

  // Add 4th slot to vehicle
  const handleAddSlot = (vehicleId) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      if (currentList.length < 4) {
        currentList.push({ personnel_id: '', is_pic: false });
      }
      return { ...prev, [vehicleId]: currentList };
    });
  };

  // Remove slot from vehicle
  const handleRemoveSlot = (vehicleId, slotIndex) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      if (currentList.length > 3) {
        const removed = currentList.splice(slotIndex, 1)[0];
        // If removed was PIC, set first slot as PIC
        if (removed.is_pic && currentList.length > 0) {
          currentList[0].is_pic = true;
        }
      }
      return { ...prev, [vehicleId]: currentList };
    });
  };

  // Save all deployments
  const handleSaveDeployments = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const payloadDeployments = [];
      const assignedMap = new Map(); // personnel_id -> unitName
      let duplicateErrorMsg = null;

      // Collect all operational units (armada & posko watchroom)
      for (const [vId, slots] of Object.entries(vehicleSlots)) {
        const unitObj = vehicles.find((v) => Number(v.id) === Number(vId));
        const unitName = unitObj?.code_name || unitObj?.vehicle_name || `Unit #${vId}`;
        const isPosko = unitObj?.category === 'posko' || unitObj?.code_name === 'WATCHROOM';
        const depType = isPosko
          ? 'watchroom'
          : (unitObj?.category === 'pendukung' ? 'vehicle_pendukung' : 'vehicle_utama');

        for (let idx = 0; idx < slots.length; idx++) {
          const s = slots[idx];
          if (s.personnel_id) {
            const pId = Number(s.personnel_id);

            // Cek duplikasi personel di lebih dari satu slot armada
            if (assignedMap.has(pId)) {
              const prevUnit = assignedMap.get(pId);
              const personObj = teamPersonnel.find((p) => Number(p.id) === pId);
              const personName = personObj?.name || personObj?.full_name || s.personnel_name || `ID #${pId}`;
              duplicateErrorMsg = `Personel ${personName} terdeteksi ditugaskan ganda pada ${prevUnit} dan ${unitName}. Satu personel hanya dapat menempati satu slot armada.`;
              break;
            }

            assignedMap.set(pId, unitName);

            payloadDeployments.push({
              personnel_id: pId,
              deployment_type: depType,
              vehicle_id: Number(vId),
              is_pic: idx === 0, // Slot 0 paling atas FIX sebagai PIC
              notes: isPosko ? 'Operator Komunikasi Watchroom' : (idx === 0 ? 'PIC Armada' : 'Kru Armada'),
            });
          }
        }

        if (duplicateErrorMsg) break;
      }

      if (duplicateErrorMsg) {
        setError(duplicateErrorMsg);
        setSaving(false);
        return;
      }

      // Collect absent and check collision with assigned personnel
      for (const abs of absentList) {
        if (abs.personnel_id) {
          const pId = Number(abs.personnel_id);
          if (assignedMap.has(pId)) {
            const prevUnit = assignedMap.get(pId);
            const personObj = teamPersonnel.find((p) => Number(p.id) === pId);
            const personName = personObj?.name || personObj?.full_name || `ID #${pId}`;
            setError(`Personel ${personName} tercatat sedang cuti/izin namun masih terploting di ${prevUnit}. Silakan kosongkan slotnya terlebih dahulu.`);
            setSaving(false);
            return;
          }

          payloadDeployments.push({
            personnel_id: pId,
            deployment_type: 'absent',
            vehicle_id: null,
            is_pic: false,
            absent_reason: abs.reason,
            notes: abs.notes,
          });
        }
      }

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setSuccessMsg('Ploting penugasan kru berhasil disimpan!');
      setInitialSnapshot(JSON.stringify(vehicleSlots));
      fetchDeploymentData({ keepSuccessMsg: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan ploting kru.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleInspectVehicle = (vehicle) => {
    setSelectedVehicleForInspection(vehicle);
    setInspectionModalOpen(true);
  };

  return (
    <div>
      {/* Floating Viewport Toast Notifikasi (Selalu Terlihat di Mana Pun Pengguna Scroll) */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="ml-2 hover:bg-emerald-700 p-0.5 rounded text-emerald-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 hover:bg-red-700 p-0.5 rounded text-red-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Proteksi Hak Akses Ploting Berdasarkan Shift Dinas (Aturan GEMINI.md) */}
      {!isScheduledTeam && !isAdmin ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center max-w-2xl mx-auto shadow-sm my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1.5">
            Bukan Shift Dinas Anda
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Regu <strong>{cleanTeam(activeTeam)}</strong> sedang tidak bertugas aktif (libur/off) pada tanggal <strong>{activeDate}</strong> Shift <strong>{activeShiftNumber}</strong>.
            Operasional dan ploting penugasan shift ini dipimpin oleh <strong>Regu {cleanTeam(scheduledTeam)}</strong>.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 inline-block text-left space-y-1">
            <div className="font-semibold text-slate-800 mb-1">Status Roster Operasional:</div>
            <div>• Shift Berjalan: <strong>Shift {activeShiftNumber}</strong></div>
            <div>• Regu Terjadwal Aktif: <strong className="text-emerald-700">Regu {cleanTeam(scheduledTeam)}</strong></div>
            <div>• Status Regu Anda ({cleanTeam(activeTeam)}): <span className="text-amber-700 font-semibold">Siaga Cadangan / Libur</span></div>
          </div>
        </div>
      ) : (
        <>
          {/* Command Ribbon: Header + Inline Formation Strip + Save Action */}
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs mb-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Ploting Personel Armada
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700">
                  {formatTeam(activeTeam)} • Shift {activeShiftNumber}
                </span>
                {!isScheduledTeam && isAdmin && (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] font-bold text-amber-800"
                    title={`Regu aktif terjadwal: Regu ${cleanTeam(scheduledTeam)}`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                    Mode Tinjau Admin (Jadwal: Regu {cleanTeam(scheduledTeam)})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                {formatIndoDate(activeDate, { shortMonth: true })}
                {supervisorName ? ` • Ketua Regu: ${supervisorName}` : ''} • Slot 1 = PIC Kendaraan
              </p>
            </div>

            <div className="flex items-center justify-between xl:justify-end gap-3 flex-wrap">
              {/* Inline Segmented Crew & Fleet Readiness Strip */}
              <div className="inline-flex items-center divide-x divide-slate-200 rounded-lg bg-slate-50 border border-slate-200 text-xs overflow-hidden">
                <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Armada & kru lengkap siap operasi">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-slate-500 font-medium">Siap:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formationSummary.readyCount}</span>
                </div>
                <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Kru belum lengkap / tanpa PIC">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-slate-500 font-medium">Kurang Kru:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formationSummary.incompleteCount}</span>
                </div>
                <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Kendaraan kendala teknis / unserviceable">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-slate-500 font-medium">Rusak:</span>
                  <span className="font-bold text-slate-900 tabular-nums">{formationSummary.unserviceableCount}</span>
                </div>
                <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Total personel regu yang telah diploting">
                  <span className="text-slate-500 font-medium">Tertugas:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {assignedPersonnelIds.size}/{teamPersonnel.length}
                  </span>
                </div>
              </div>

              {canEditPlot && (
                <div className="flex items-center gap-2">
                  {hasUnsavedChanges && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Belum disimpan
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveDeployments}
                    disabled={saving || !hasUnsavedChanges}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-2xs transition-colors duration-100 ${
                      hasUnsavedChanges
                        ? 'bg-arff-primary text-white hover:bg-red-700 cursor-pointer'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    } disabled:opacity-60`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Draf Ploting'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <StateView
            loading={loading}
            isEmpty={vehicles.length === 0}
            emptyTitle="Belum Ada Armada Terdaftar"
            emptyDescription="Daftarkan kendaraan operasional terlebih dahulu pada menu Pengaturan Master untuk memulai ploting kru."
            onRetry={fetchDeploymentData}
          >
        {/* Vehicles Deployment Grid */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((v) => {
              const vId = v.id || v.vehicle_id;
              return (
                <DeploymentSlotCard
                  key={vId}
                  vehicle={v}
                  slots={vehicleSlots[vId] || []}
                  availablePersonnel={teamPersonnel}
                  onSlotPersonnelChange={(slotIdx, pId) =>
                    handleSlotPersonnelChange(vId, slotIdx, pId)
                  }
                  onAddSlot={() => handleAddSlot(vId)}
                  onRemoveSlot={(slotIdx) => handleRemoveSlot(vId, slotIdx)}
                  readOnly={!canEditPlot}
                  assignedPersonnelIds={assignedPersonnelIds}
                  absentPersonnelIds={absentPersonnelIds}
                  currentPersonnelId={user?.personnel_id}
                  currentUserName={user?.name}
                  onInspectVehicle={handleInspectVehicle}
                  isAdmin={isAdmin}
                  isSupervisor={isSupervisor}
                />
              );
            })}
          </div>
        </div>

        {/* Panel Daftar Personel Izin / Cuti Shift Ini (Read-Only Transparan) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-8">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Daftar Personel Izin / Cuti Shift Ini
                </h4>
                <p className="text-xs text-slate-500">
                  Informasi absensi mandiri personel regu yang berhalangan dinas aktif ({absentList.length} orang)
                </p>
              </div>
            </div>
            <span className="text-[11px] font-medium text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
              Kelola di Menu Cuti / Izin
            </span>
          </div>

          {absentList.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">
              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
              <p className="font-semibold text-slate-700">Seluruh Personel Hadir</p>
              <p className="text-slate-400 mt-0.5">
                Tidak ada personel regu yang tercatat cuti atau berhalangan pada shift ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {absentList.map((abs, idx) => {
                const person = teamPersonnel.find((p) => Number(p.id) === Number(abs.personnel_id));
                const reasonLabels = {
                  cuti: 'Cuti Tahunan',
                  sakit: 'Sakit',
                  dinas: 'Dinas Luar',
                  tukar_dinas: 'Tukar Dinas',
                };
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between text-xs space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900">
                          {person?.full_name || `Personel #${abs.personnel_id}`}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          NIP: {person?.nip || '-'}
                        </div>
                      </div>
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] uppercase">
                        {reasonLabels[abs.reason] || abs.reason || 'Cuti'}
                      </span>
                    </div>

                    {abs.notes && (
                      <p className="text-[11px] text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                        "{abs.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </StateView>
      </>
      )}

      {/* Modal Pemeriksaan Kesiapan Fisik Armada / Posko Watchroom Langsung dari Ploting */}
      {inspectionModalOpen && selectedVehicleForInspection && (
        (selectedVehicleForInspection.category === 'posko' || selectedVehicleForInspection.code_name === 'WATCHROOM') ? (
          <WatchroomReadinessModal
            isOpen={inspectionModalOpen}
            onClose={() => {
              setInspectionModalOpen(false);
              setSelectedVehicleForInspection(null);
            }}
            logItem={selectedVehicleForInspection}
            activeDate={activeDate}
            activeShiftNumber={activeShiftNumber}
            activeTeam={activeTeam}
            onSuccess={(customMsg) => {
              fetchDeploymentData({ keepSuccessMsg: true });
              setSuccessMsg(
                customMsg ||
                `Kesiapan fasilitas posko ${
                  selectedVehicleForInspection.code_name || selectedVehicleForInspection.vehicle_name
                } berhasil diperbarui.`
              );
            }}
          />
        ) : (
          <VehicleReadinessModal
            isOpen={inspectionModalOpen}
            onClose={() => {
              setInspectionModalOpen(false);
              setSelectedVehicleForInspection(null);
            }}
            vehicle={selectedVehicleForInspection}
            activeDate={activeDate}
            activeShiftNumber={activeShiftNumber}
            activeTeam={activeTeam}
            onSuccess={(customMsg) => {
              fetchDeploymentData({ keepSuccessMsg: true });
              setSuccessMsg(
                customMsg ||
                `Kesiapan fisik kendaraan ${
                  selectedVehicleForInspection.code_name || selectedVehicleForInspection.vehicle_name
                } berhasil diperbarui.`
              );
            }}
          />
        )
      )}
    </div>
  );
}

