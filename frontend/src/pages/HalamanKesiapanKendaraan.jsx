import React, { useState, useEffect, useCallback } from 'react';
import { Truck, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import VehicleMetricCard from '../components/dashboard/VehicleMetricCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';

export default function HalamanKesiapanKendaraan() {
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
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentTeam = cleanTeam(activeTeam);
      const res = await api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
      const list = Array.isArray(res.data?.vehicles) ? res.data.vehicles : (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Gagal memuat status kesiapan armada.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const serviceableCount = vehicles.filter(
    (v) => (v.status === 'serviceable' || v.current_log?.status === 'serviceable')
  ).length;
  const unserviceableCount = vehicles.filter(
    (v) => (v.status === 'unserviceable' || v.current_log?.status === 'unserviceable')
  ).length;

  return (
    <div>
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Monitoring Kesiapan Fisik & Operasional Armada
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Status pemeriksaan kondisi armada ARFF. Pengisian form hanya dapat dilakukan oleh PIC kendaraan atau Ketua Regu.
          </p>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            {serviceableCount} Serviceable
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
            {unserviceableCount} Unserviceable
          </span>
        </div>
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={vehicles.length === 0}
        emptyTitle="Belum Ada Master Kendaraan"
        emptyDescription="Daftarkan kendaraan operasional di Pengaturan Master terlebih dahulu."
        onRetry={fetchVehicles}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => {
            const isPic = user?.personnel_id && v.pic_personnel_id === user.personnel_id;
            const canInspect = isPic || isSupervisor || isAdmin;

            return (
              <VehicleMetricCard
                key={v.id}
                vehicle={v}
                isPicForVehicle={isPic}
                canInspect={canInspect}
                onInspect={(veh) => setSelectedVehicle(veh)}
              />
            );
          })}
        </div>
      </StateView>

      {selectedVehicle && (
        <VehicleReadinessModal
          isOpen={Boolean(selectedVehicle)}
          onClose={() => setSelectedVehicle(null)}
          vehicle={selectedVehicle}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={fetchVehicles}
        />
      )}
    </div>
  );
}
