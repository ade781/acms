import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, getScheduledTeam } from '../utils/shiftHelper';
import api from '../services/api';
import DeploymentSlotCard from '../components/forms/DeploymentSlotCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';

export default function DeploymentPage() {
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

  // Jadwal dinas operasional shift aktif (gunakan scheduled_team resmi dari API / fallback rumus)
  const scheduledTeamCalc = useMemo(
    () => getScheduledTeam(activeDate, activeShiftNumber),
    [activeDate, activeShiftNumber]
  );
  const [serverScheduledTeam, setServerScheduledTeam] = useState(null);
  const scheduledTeam = serverScheduledTeam || scheduledTeamCalc;

  useEffect(() => {
    setServerScheduledTeam(null);
  }, [activeDate, activeShiftNumber, activeTeam]);

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

  // In-app navigation guard (intersep navigasi link jika ada perubahan formasi belum disimpan)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleAnchorClick = (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href && !anchor.target) {
        const targetUrl = new URL(anchor.href, window.location.href);
        if (targetUrl.origin === window.location.origin && targetUrl.pathname !== window.location.pathname) {
          const confirmLeave = window.confirm(
            'Terdapat perubahan formasi ploting yang belum disimpan. Yakin ingin meninggalkan halaman ini?'
          );
          if (!confirmLeave) {
            e.preventDefault();
            e.stopPropagation();
          }
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => document.removeEventListener('click', handleAnchorClick, true);
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

  // Fetch current deployment & master data concurrently
  const fetchDeploymentData = useCallback(async (options = {}) => {
    const currentTeam = cleanTeam(activeTeam);

    if (!canAccessPlot) {
      try {
        const depRes = await api.get(
          `/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`,
          { signal: options?.signal }
        );
        const depPayload = depRes.data?.data || depRes.data;
        if (depPayload?.scheduled_team) {
          setServerScheduledTeam(depPayload.scheduled_team);
        }
      } catch (e) {
        // Abaikan error saat bukan shift aktif
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    if (!options?.keepSuccessMsg) {
      setSuccessMsg(null);
    }

    try {
      const [pRes, vRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`, { signal: options?.signal }),
        api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal: options?.signal }),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal: options?.signal }),
      ]);

      const depPayload = depRes.data?.data || depRes.data;
      if (depPayload?.scheduled_team) {
        setServerScheduledTeam(depPayload.scheduled_team);
      }

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

      const deploymentsList = Array.isArray(depPayload?.deployments)
        ? depPayload.deployments
        : (Array.isArray(depRes.data?.deployments) ? depRes.data.deployments : []);

      // Ambil data cuti resmi langsung dari depPayload.absents
      const rawAbsents = Array.isArray(depPayload?.absents)
        ? depPayload.absents
        : (deploymentsList || []).filter((d) => d.deployment_type === 'absent');
      const absentIdSet = new Set(rawAbsents.map((d) => Number(d.personnel_id)));

      setAbsentList(
        rawAbsents.map((d) => ({
          personnel_id: d.personnel_id,
          reason: d.absent_reason || d.reason || 'cuti',
          notes: d.notes || '',
        }))
      );

      // Initialize vehicle & watchroom slots: default armada & posko 3 slot (1 PIC + 2 kru)
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

  // Auto-reload saat ada perubahan cuti atau status kesiapan armada
  useEffect(() => {
    const handleSync = () => {
      fetchDeploymentData({ keepSuccessMsg: true });
    };
    window.addEventListener('arff:leave-updated', handleSync);
    window.addEventListener('arff:readiness-updated', handleSync);
    return () => {
      window.removeEventListener('arff:leave-updated', handleSync);
      window.removeEventListener('arff:readiness-updated', handleSync);
    };
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

  // Add slot to vehicle (maksimal 4 personel per unit armada / posko watchroom)
  const handleAddSlot = useCallback((vehicleId) => {
    setVehicleSlots((prev) => {
      const currentList = [...(prev[vehicleId] || [])];
      const maxSlots = 4;
      if (currentList.length < maxSlots) {
        currentList.push({ personnel_id: '', is_pic: false, personnel_name: '' });
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

    // Validasi PIC: Unit yang memiliki kru wajib memiliki PIC (Slot 0)
    for (const [vId, slots] of Object.entries(vehicleSlots)) {
      const hasPic = Boolean(slots[0]?.personnel_id);
      const hasAnyCrew = (slots || []).slice(1).some((s) => Boolean(s.personnel_id));

      if (hasAnyCrew && !hasPic) {
        const unitObj = vehicles.find((v) => Number(v.id) === Number(vId));
        const unitName = unitObj?.code_name || unitObj?.vehicle_name || `Unit #${vId}`;
        setError(`Unit ${unitName} memiliki kru tetapi belum memiliki PIC (Slot 0). Harap tunjuk PIC terlebih dahulu.`);
        return;
      }
    }

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
      window.dispatchEvent(new CustomEvent('arff:deployments-updated'));
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
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Regu <strong>{cleanTeam(user?.team_group || activeTeam)}</strong> sedang tidak bertugas aktif (libur/off) pada tanggal <strong className="font-mono tabular-nums">{activeDate}</strong> Shift <strong className="font-mono tabular-nums">{activeShiftNumber}</strong>.
            Operasional dan ploting penugasan shift ini dipimpin oleh <strong>Regu {cleanTeam(scheduledTeam)}</strong>.
          </p>
        </div>
      ) : (
        <>
          {/* Header */}
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
                <div className="flex items-center gap-2">
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

