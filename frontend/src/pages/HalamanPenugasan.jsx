import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import DeploymentSlotCard from '../components/forms/DeploymentSlotCard';
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
  const [isApproved, setIsApproved] = useState(false);
  const [supervisorName, setSupervisorName] = useState('');

  // Ploting state: vehicleId -> Array of { personnel_id, is_pic }
  // Slot 0 FIX PIC, slot 1-3 Kru (untuk Watchroom: Slot 0 PIC, Slot 1 Kru)
  const [vehicleSlots, setVehicleSlots] = useState({});

  // Absent personnel: Array of { personnel_id, reason: 'cuti'|'sakit'|'dinas'|'tukar_dinas', notes }
  const [absentList, setAbsentList] = useState([]);

  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);

  // Fetch current deployment & master data concurrently
  const fetchDeploymentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

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

      const depData = depRes.data;
      setIsApproved(Boolean(depData?.status === 'approved'));
      setSupervisorName(depData?.supervisor_name || '');

      // Initialize vehicle & watchroom slots
      // Slot 0 (paling atas) selalu FIX sebagai PIC
      const initialSlots = {};
      fetchedVehicles.forEach((v) => {
        const vId = v.id;
        const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
        const targetSlotsCount = isPosko ? 2 : 3;

        const existingForUnit = (depData?.deployments || []).filter((d) =>
          isPosko
            ? (d.deployment_type === 'watchroom' || Number(d.vehicle_id) === Number(vId))
            : Number(d.vehicle_id) === Number(vId)
        );

        if (existingForUnit.length > 0) {
          // Sort so that PIC is at slot 0
          const sorted = [...existingForUnit].sort((a, b) => (b.is_pic ? 1 : 0) - (a.is_pic ? 1 : 0));
          initialSlots[vId] = sorted.map((d, idx) => ({
            personnel_id: d.personnel_id || '',
            is_pic: idx === 0, // Slot 0 selalu PIC
          }));
          while (initialSlots[vId].length < targetSlotsCount) {
            initialSlots[vId].push({ personnel_id: '', is_pic: false });
          }
        } else {
          initialSlots[vId] = isPosko
            ? [
                { personnel_id: '', is_pic: true },   // Slot 0: PIC / Operator Utama
                { personnel_id: '', is_pic: false },  // Slot 1: Operator Pendukung
              ]
            : [
                { personnel_id: '', is_pic: true },   // Slot 0: FIX PIC
                { personnel_id: '', is_pic: false },  // Slot 1: Kru
                { personnel_id: '', is_pic: false },  // Slot 2: Kru
              ];
        }
      });
      setVehicleSlots(initialSlots);

      // Absent personnel
      const existingAbsent = (depData?.deployments || []).filter(
        (d) => d.deployment_type === 'absent'
      );
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
      fetchDeploymentData();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan ploting kru.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // Approve shift: Menyimpan ploting sekaligus mengesahkan laporan shift
  const handleApproveShift = async () => {
    if (!window.confirm('Sahkan seluruh laporan dan ploting penugasan shift ini?')) return;

    setApproving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const payloadDeployments = [];

      // Kumpulkan seluruh slot operasional (armada & posko watchroom)
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

      // Kumpulkan personel yang cuti/izin
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

      // Simpan batch ploting jika ada slot yang terisi
      if (payloadDeployments.length > 0) {
        await api.post('/deployments/batch', {
          shift_date: activeDate,
          shift_number: activeShiftNumber,
          team_group: cleanTeam(activeTeam),
          deployments: payloadDeployments,
        });
      }

      // Sahkan shift
      await api.post('/deployments/approve', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
      });

      setIsApproved(true);
      setSuccessMsg('Laporan dan ploting shift resmi disahkan oleh Ketua Regu.');
      fetchDeploymentData();
    } catch (err) {
      setError(`Gagal mengesahkan shift: ${err.response?.data?.message || err.message}`);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={supervisorName}
        isApproved={isApproved}
        canApprove={isSupervisor || isAdmin}
        onApproveShift={handleApproveShift}
        approving={approving}
      />

      {/* Operational Instructions Banner */}
      <div className="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-700 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-slate-900 mb-0.5">Ketentuan Ploting Dinas Operasional</h4>
          <p>
            Ploting penugasan kru armada (3 s.d. 4 personel) dan posko Watch Room (2 personel). Personel pada slot pertama otomatis bertindak sebagai <strong>Penanggung Jawab (PIC)</strong> yang berhak menginput kesiapan operasional unit.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
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
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">
              Ploting Personel Armada & Posko Operasional
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih PIC (Slot #1 paling atas) dan kru dinas untuk seluruh unit kendaraan dan posko watchroom
            </p>
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
                  readOnly={isApproved && !isAdmin}
                />
              );
            })}
          </div>
        </div>
      </StateView>
    </div>
  );
}
