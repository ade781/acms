import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  AlertCircle,
  Save,
  ShieldAlert,
  X,
  FileBarChart2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, getScheduledTeam } from '../utils/shiftHelper';
import api from '../services/api';
import DeploymentSlotCard from '../components/forms/DeploymentSlotCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';

export default function DeploymentPage() {
  const navigate = useNavigate();
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
    isDeptHead,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [vehicles, setVehicles] = useState([]);
  const [teamPersonnel, setTeamPersonnel] = useState([]);

  // Ploting state: vehicleId -> Array of { personnel_id, is_pic, personnel_name }
  const [vehicleSlots, setVehicleSlots] = useState({});

  // Absent personnel: Array of { personnel_id, reason, notes } (dipertahankan untuk proteksi dropdown pilihan personel)
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
  const isUserScheduledTeam = isAdmin || isDeptHead || cleanTeam(user?.team_group) === cleanTeam(scheduledTeam);
  const canAccessPlot = isUserScheduledTeam && (isScheduledTeam || isAdmin || isDeptHead);

  // Hak edit: Hanya supervisor/admin/dept_head, dan regu harus terjadwal dinas aktif
  const canEditPlot = (isAdmin || isDeptHead || isSupervisor) && canAccessPlot;

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

  const getVehicleStatusKey = useCallback((v) => {
    const raw = v.status || v.current_log?.status || v.readiness || 'belum_dilaporkan';
    if (raw === 'serviceable' || raw === 'unserviceable') return raw;
    return 'belum_dilaporkan';
  }, []);

  const getVehicleCategoryKey = useCallback((v) => {
    if (v.category === 'posko' || v.code_name === 'WATCHROOM') return 'posko';
    if (v.category === 'pendukung') return 'pendukung';
    return 'utama';
  }, []);

  // Ringkasan Kesiapan Fisik Armada (Murni 3 status: Belum Dicek, Serviceable, Unserviceable)
  const statusSummary = useMemo(() => {
    let serviceableCount = 0;
    let unserviceableCount = 0;
    let belumDicekCount = 0;

    vehicles.forEach((v) => {
      const st = getVehicleStatusKey(v);
      if (st === 'serviceable') {
        serviceableCount++;
      } else if (st === 'unserviceable') {
        unserviceableCount++;
      } else {
        belumDicekCount++;
      }
    });

    return { serviceableCount, unserviceableCount, belumDicekCount, total: vehicles.length };
  }, [vehicles, getVehicleStatusKey]);

  // Fetch current deployment & master data concurrently
  const fetchDeploymentData = useCallback(async (options = {}) => {
    if (!canAccessPlot) {
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
      const fetchedVehicles = rawVehicles.map((v) => ({
        ...v,
        id: v.id || v.vehicle_id,
      }));
      setVehicles(fetchedVehicles);

      const depPayload = depRes.data?.data || depRes.data;
      const deploymentsList = Array.isArray(depPayload?.deployments)
        ? depPayload.deployments
        : (Array.isArray(depRes.data?.deployments) ? depRes.data.deployments : []);

      // Absent personnel (untuk memfilter dropdown agar personel cuti tidak terpilih bertugas)
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

      // Initialize vehicle & watchroom slots secara fleksibel (tanpa paksaan harus 3 kru)
      const initialSlots = {};
      fetchedVehicles.forEach((v) => {
        const vId = v.id;
        const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
        const defaultEmptyCount = 3;

        const existingForUnit = (deploymentsList || []).filter((d) =>
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
          while (initialSlots[vId].length < defaultEmptyCount) {
            initialSlots[vId].push({ personnel_id: '', is_pic: false, personnel_name: '' });
          }
        } else {
          initialSlots[vId] = [
            { personnel_id: '', is_pic: true, personnel_name: '' },
            { personnel_id: '', is_pic: false, personnel_name: '' },
            { personnel_id: '', is_pic: false, personnel_name: '' },
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
  }, [activeDate, activeShiftNumber, activeTeam, canAccessPlot]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDeploymentData({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchDeploymentData]);

  // Handle personnel change in a vehicle slot
  const handleSlotPersonnelChange = useCallback((vehicleId, slotIndex, personnelId) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      currentList[slotIndex] = {
        ...currentList[slotIndex],
        personnel_id: personnelId ? Number(personnelId) : '',
        is_pic: slotIndex === 0,
      };
      return { ...prev, [vehicleId]: currentList };
    });
  }, []);

  // Add slot to vehicle (fleksibel)
  const handleAddSlot = useCallback((vehicleId) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      if (currentList.length < 6) {
        currentList.push({ personnel_id: '', is_pic: false });
      }
      return { ...prev, [vehicleId]: currentList };
    });
  }, []);

  // Remove slot from vehicle (fleksibel selama masih ada minimal 1 slot PIC)
  const handleRemoveSlot = useCallback((vehicleId, slotIndex) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      if (currentList.length > 1) {
        const removed = currentList.splice(slotIndex, 1)[0];
        if (removed.is_pic && currentList.length > 0) {
          currentList[0].is_pic = true;
        }
      }
      return { ...prev, [vehicleId]: currentList };
    });
  }, []);

  // Save all deployments
  const handleSaveDeployments = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const payloadDeployments = [];
      const assignedMap = new Map();
      let duplicateErrorMsg = null;

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
              is_pic: idx === 0,
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
      const rawMsg = err.response?.data?.message || err.response?.data?.error || err.message;
      const msg = typeof rawMsg === 'string' ? rawMsg : (rawMsg?.message || 'Gagal menyimpan ploting kru.');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Floating Viewport Toast Notifikasi */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-semibold font-sans animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{typeof successMsg === 'string' ? successMsg : successMsg?.message || 'Ploting berhasil disimpan'}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="ml-2 hover:bg-emerald-700 p-0.5 rounded text-emerald-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-600 text-white shadow-xl text-xs font-semibold font-sans animate-in fade-in slide-in-from-top-2 duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{typeof error === 'string' ? error : error?.message || 'Terjadi kendala pada ploting'}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 hover:bg-red-700 p-0.5 rounded text-red-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Proteksi Hak Akses Ploting Berdasarkan Shift Dinas */}
      {!canAccessPlot ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center max-w-2xl mx-auto shadow-sm my-4 font-sans">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1.5">
            Bukan Shift Dinas Anda
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-5">
            Regu <strong>{cleanTeam(user?.team_group || activeTeam)}</strong> sedang tidak bertugas aktif (libur/off) pada tanggal <strong className="font-mono tabular-nums">{activeDate}</strong> Shift <strong className="font-mono tabular-nums">{activeShiftNumber}</strong>.
            Operasional dan ploting penugasan shift ini dipimpin oleh <strong>Regu {cleanTeam(scheduledTeam)}</strong>.
          </p>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 inline-block text-left space-y-1">
            <div className="font-semibold text-slate-800 mb-1">Status Roster Operasional:</div>
            <div>• Shift Berjalan: <strong className="font-mono tabular-nums">Shift {activeShiftNumber}</strong></div>
            <div>• Regu Terjadwal Aktif: <strong className="text-emerald-700">Regu {cleanTeam(scheduledTeam)}</strong></div>
            <div>• Status Regu Anda ({cleanTeam(user?.team_group || activeTeam)}): <span className="text-amber-700 font-semibold">Siaga Cadangan / Libur</span></div>
          </div>
        </div>
      ) : (
        <>
          {/* Header & Status Summary (Identik dengan VehicleReadinessPage) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs font-sans">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold tracking-tight text-slate-900">
                    Ploting Personel Armada
                  </h2>
                  {!isScheduledTeam && (isAdmin || isDeptHead) && (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800"
                      title={`Regu aktif terjadwal: Regu ${cleanTeam(scheduledTeam)}`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      Mode Tinjau Manajemen (Jadwal: Regu {cleanTeam(scheduledTeam)})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between xl:justify-end gap-3 flex-wrap">
                {/* Ringkasan Kelaikan Fisik Armada (Murni 3 Kondisi: Belum Dicek, Serviceable, Unserviceable) */}
                <div className="inline-flex items-center divide-x divide-slate-200 rounded-lg bg-slate-50 border border-slate-200 text-xs overflow-hidden">
                  <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Unit belum diperiksa PIC pada shift ini">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-500 font-medium">Belum Dicek:</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">{statusSummary.belumDicekCount}</span>
                  </div>
                  <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Unit berstatus serviceable (laik)">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-500 font-medium">Serviceable:</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">{statusSummary.serviceableCount}</span>
                  </div>
                  <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Unit berstatus unserviceable (kendala/rusak)">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-slate-500 font-medium">Unserviceable:</span>
                    <span className="font-bold text-slate-900 font-mono tabular-nums">{statusSummary.unserviceableCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={FileBarChart2}
                    onClick={() => navigate('/reports')}
                  >
                    Laporan Shift
                  </Button>
                  {canEditPlot && (
                    <>
                      {hasUnsavedChanges && (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Belum disimpan
                        </span>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Save}
                        onClick={handleSaveDeployments}
                        disabled={saving || !hasUnsavedChanges}
                        loading={saving}
                      >
                        Simpan Ploting
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <StateView
            loading={loading}
            isEmpty={vehicles.length === 0}
            emptyTitle="Belum Ada Armada Terdaftar"
            emptyDescription="Daftarkan kendaraan operasional terlebih dahulu pada menu Kesiapan Armada untuk memulai ploting kru."
            onRetry={fetchDeploymentData}
          >
            {/* Vehicles Deployment Grid */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map((v, vIdx) => {
                  const vId = v.id || v.vehicle_id || `v-${vIdx}`;
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
                      currentPersonnelId={user?.personnel_id ? Number(user.personnel_id) : undefined}
                      currentUserName={typeof user?.name === 'string' ? user.name : (user?.name?.toString() || '')}
                      isAdmin={isAdmin}
                      isSupervisor={isSupervisor}
                    />
                  );
                })}
              </div>
            </div>
          </StateView>
        </>
      )}
    </div>
  );
}

