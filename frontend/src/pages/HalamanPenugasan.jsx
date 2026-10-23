import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Save,
  ShieldAlert,
  UserX,
  PlusCircle,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam, getScheduledTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import DeploymentSlotCard from '../components/forms/DeploymentSlotCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import StateView from '../components/common/StateView';

export default function HalamanPenugasan() {
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


  // Fetch current deployment & master data concurrently
  const fetchDeploymentData = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    if (!options?.keepSuccessMsg) {
      setSuccessMsg(null);
    }

    try {
      const currentTeam = cleanTeam(activeTeam);

      // Concurrent fetch (Promise.all) to prevent request waterfalls
      const [pRes, vRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`),
        api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
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
    } catch (err) {
      console.error('Error fetching deployments:', err);
      setError('Gagal memuat data ploting penugasan shift.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchDeploymentData();
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

  // Tambah baris cuti/absen baru
  const handleAddAbsent = () => {
    setAbsentList((prev) => [
      ...prev,
      { personnel_id: '', reason: 'cuti', notes: '' },
    ]);
  };

  // Ubah personel cuti & auto-evict dari slot kendaraan
  const handleAbsentPersonnelChange = (index, personnelId) => {
    const pId = personnelId ? Number(personnelId) : '';
    setAbsentList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], personnel_id: pId };
      return updated;
    });

    // Auto-evict: Jika personel dipilih izin/cuti, otomatis kosongkan dari slot kendaraan yang pernah ditempatinya
    if (pId) {
      setVehicleSlots((prev) => {
        const nextSlots = { ...prev };
        Object.keys(nextSlots).forEach((vId) => {
          nextSlots[vId] = nextSlots[vId].map((s) => {
            if (Number(s.personnel_id) === pId) {
              return { ...s, personnel_id: '', personnel_name: '' };
            }
            return s;
          });
        });
        return nextSlots;
      });
    }
  };

  // Hapus baris cuti
  const handleRemoveAbsent = (index) => {
    setAbsentList((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Save all deployments
  const handleSaveDeployments = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const payloadDeployments = [];

      // Collect all operational units (armada & posko watchroom)
      Object.entries(vehicleSlots).forEach(([vId, slots]) => {
        const unitObj = vehicles.find((v) => Number(v.id) === Number(vId));
        const isPosko = unitObj?.category === 'posko' || unitObj?.code_name === 'WATCHROOM';
        const depType = isPosko
          ? 'watchroom'
          : (unitObj?.category === 'pendukung' ? 'vehicle_pendukung' : 'vehicle_utama');

        slots.forEach((s, idx) => {
          if (s.personnel_id) {
            payloadDeployments.push({
              personnel_id: Number(s.personnel_id),
              deployment_type: depType,
              vehicle_id: Number(vId),
              is_pic: idx === 0, // Slot 0 paling atas FIX sebagai PIC
              notes: isPosko ? 'Operator Komunikasi Watchroom' : (idx === 0 ? 'PIC Armada' : 'Kru Armada'),
            });
          }
        });
      });

      // Collect absent
      absentList.forEach((abs) => {
        if (abs.personnel_id) {
          payloadDeployments.push({
            personnel_id: Number(abs.personnel_id),
            deployment_type: 'absent',
            vehicle_id: null,
            is_pic: false,
            absent_reason: abs.reason,
            notes: abs.notes,
          });
        }
      });

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setSuccessMsg('Ploting penugasan kru berhasil disimpan!');
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

      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={supervisorName}
      />

      {/* Peringatan jika regu yang aktif di header sedang OFF / Libur */}
      {!isScheduledTeam && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-sm text-amber-950 block">
              Regu {cleanTeam(activeTeam)} Sedang OFF / Libur
            </span>
            <span className="text-xs text-amber-800 leading-relaxed block">
              Sesuai rotasi siklus dinas operasional, regu yang bertugas aktif pada shift ini adalah <strong>Regu {cleanTeam(scheduledTeam)}</strong>.
              {canEditPlot
                ? ' Anda memiliki wewenang administratif untuk meninjau data.'
                : ' Ploting kru armada dikunci untuk regu yang sedang siaga cadangan / libur.'}
            </span>
          </div>
        </div>
      )}

      <StateView
        loading={loading}
        isEmpty={vehicles.length === 0}
        emptyTitle="Belum Ada Armada Terdaftar"
        emptyDescription="Daftarkan kendaraan operasional terlebih dahulu pada menu Pengaturan Master untuk memulai ploting kru."
        onRetry={fetchDeploymentData}
      >
        {/* Vehicles Deployment Grid */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ploting Personel Armada
              </h3>
              <p className="text-xs text-slate-500">
                Slot pertama adalah PIC kendaraan. Satu personel hanya boleh ditugaskan pada 1 unit atau berstatus izin/cuti.
              </p>
            </div>
            {canEditPlot && (
              <button
                type="button"
                onClick={handleSaveDeployments}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-arff-primary text-white hover:bg-red-700 text-xs font-semibold shadow-sm transition-colors duration-100 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Draf Ploting'}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

        {/* Panel Daftar Personel Izin / Cuti Shift Ini */}
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
                  Personel regu yang berhalangan dinas aktif pada shift berjalan ({absentList.length} orang)
                </p>
              </div>
            </div>
            {canEditPlot && (
              <button
                type="button"
                onClick={handleAddAbsent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors duration-100"
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>+ Catat Personel Cuti</span>
              </button>
            )}
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
            <div className="space-y-2.5">
              {absentList.map((abs, idx) => {
                const person = teamPersonnel.find((p) => Number(p.id) === Number(abs.personnel_id));
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 text-xs"
                  >
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Personel:
                      </label>
                      {canEditPlot ? (
                        <select
                          value={abs.personnel_id || ''}
                          onChange={(e) => handleAbsentPersonnelChange(idx, e.target.value)}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="">(Pilih Personel)</option>
                          {teamPersonnel.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.full_name} ({p.nip || '-'})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="font-bold text-slate-800">
                          {person?.full_name || `Personel #${abs.personnel_id}`}
                        </div>
                      )}
                    </div>

                    <div className="w-full sm:w-44">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kategori Keterangan:
                      </label>
                      {canEditPlot ? (
                        <select
                          value={abs.reason || 'cuti'}
                          onChange={(e) => {
                            const updated = [...absentList];
                            updated[idx].reason = e.target.value;
                            setAbsentList(updated);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          <option value="cuti">Cuti Tahunan</option>
                          <option value="sakit">Sakit</option>
                          <option value="dinas">Dinas Luar</option>
                          <option value="tukar_dinas">Tukar Dinas</option>
                        </select>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold text-[10px] uppercase">
                          {abs.reason || 'Cuti'}
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Catatan / Keterangan:
                      </label>
                      {canEditPlot ? (
                        <input
                          type="text"
                          value={abs.notes || ''}
                          placeholder="Alasan cuti / keterangan..."
                          onChange={(e) => {
                            const updated = [...absentList];
                            updated[idx].notes = e.target.value;
                            setAbsentList(updated);
                          }}
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      ) : (
                        <span className="text-slate-600 italic">
                          {abs.notes || '-'}
                        </span>
                      )}
                    </div>

                    {canEditPlot && (
                      <div className="sm:pt-5">
                        <button
                          type="button"
                          onClick={() => handleRemoveAbsent(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-100"
                          title="Hapus baris cuti ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </StateView>

      {/* Modal Pemeriksaan Kesiapan Fisik Armada Langsung dari Ploting */}
      {inspectionModalOpen && selectedVehicleForInspection && (
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
          onSuccess={() => {
            fetchDeploymentData({ keepSuccessMsg: true });
            setSuccessMsg(
              `Kesiapan fisik kendaraan ${
                selectedVehicleForInspection.code_name || selectedVehicleForInspection.vehicle_name
              } berhasil diperbarui.`
            );
          }}
        />
      )}
    </div>
  );
}

