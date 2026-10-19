import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Users2,
  Radio,
  AlertTriangle,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import VehicleMetricCard from '../components/dashboard/VehicleMetricCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import IncidentModal from '../components/forms/IncidentModal';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';

export default function DashboardPage() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [watchroomLog, setWatchroomLog] = useState(null);
  const [metrics, setMetrics] = useState({
    totalVehicles: 0,
    serviceableVehicles: 0,
    unserviceableVehicles: 0,
    activePersonnelCount: 0,
    absentPersonnelCount: 0,
    openIncidentsCount: 0,
    isShiftApproved: false,
    supervisorName: '',
  });

  // Modals state
  const [selectedVehicleForInspect, setSelectedVehicleForInspect] = useState(null);
  const [watchroomModalOpen, setWatchroomModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [approvingShift, setApprovingShift] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch dashboard summary if available
      let summaryData = null;
      try {
        const sumRes = await api.get(`/dashboard/summary?date=${activeDate}&shift=${activeShiftNumber}`);
        summaryData = sumRes.data;
      } catch (e) {
        // Fallback gracefully if backend endpoint structure is slightly different
      }

      // 2. Fetch vehicle readiness
      const vRes = await api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${activeTeam}`);
      const fetchedVehicles = Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []);
      setVehicles(fetchedVehicles);

      // 3. Fetch watchroom readiness
      try {
        const wRes = await api.get(`/readiness/watchroom?date=${activeDate}&shift=${activeShiftNumber}&team_group=${activeTeam}`);
        setWatchroomLog(wRes.data?.log || wRes.data || null);
      } catch {
        setWatchroomLog(null);
      }

      // Calculate summary metrics
      const serviceableCount = fetchedVehicles.filter(
        (v) => v.current_log?.status === 'serviceable'
      ).length;
      const unserviceableCount = fetchedVehicles.filter(
        (v) => v.current_log?.status === 'unserviceable'
      ).length;

      setMetrics({
        totalVehicles: fetchedVehicles.length,
        serviceableVehicles: serviceableCount,
        unserviceableVehicles: unserviceableCount,
        activePersonnelCount: summaryData?.personnel_count || summaryData?.present_count || 0,
        absentPersonnelCount: summaryData?.absent_count || 0,
        openIncidentsCount: summaryData?.open_incidents || 0,
        isShiftApproved: Boolean(summaryData?.shift_status === 'approved'),
        supervisorName: summaryData?.supervisor_name || '',
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Gagal menghubungkan ke server backend untuk memuat data operasional.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle shift approval
  const handleApproveShift = async () => {
    if (!window.confirm('Sahkan seluruh laporan dan kesiapan pada shift aktif ini?')) return;

    setApprovingShift(true);
    try {
      await api.post('/deployments/approve', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: activeTeam,
      });
      fetchDashboardData();
    } catch (err) {
      alert(`Gagal mengesahkan shift: ${err.response?.data?.message || err.message}`);
    } finally {
      setApprovingShift(false);
    }
  };

  return (
    <div>
      {/* Shift Banner & Approval Header */}
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={metrics.supervisorName}
        isApproved={metrics.isShiftApproved}
        canApprove={isSupervisor || isAdmin}
        onApproveShift={handleApproveShift}
        approving={approvingShift}
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Fleet Readiness */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kesiapan Armada
            </span>
            <div className="w-8 h-8 rounded-lg bg-red-50 text-arff-primary flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.serviceableVehicles}
            </span>
            <span className="text-xs text-slate-500">
              / {metrics.totalVehicles} Siap Operasi
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-600">
            {metrics.unserviceableVehicles > 0 ? (
              <span className="text-red-700 font-bold">
                {metrics.unserviceableVehicles} unit unserviceable
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">Semua armada beroperasi normal</span>
            )}
          </div>
        </div>

        {/* Personnel Strength */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Kekuatan Personel
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <Users2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              Regu {activeTeam}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium text-slate-600 flex items-center justify-between">
            <span>Shift {activeShiftNumber}</span>
            <button
              type="button"
              onClick={() => navigate('/deployment')}
              className="text-arff-primary hover:underline font-semibold"
            >
              Lihat Ploting
            </button>
          </div>
        </div>

        {/* Watchroom Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Fasilitas Watchroom
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-lg font-bold ${
                watchroomLog?.status === 'unserviceable'
                  ? 'text-red-700'
                  : watchroomLog?.status === 'serviceable'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}
            >
              {watchroomLog?.status === 'serviceable'
                ? 'Serviceable'
                : watchroomLog?.status === 'unserviceable'
                ? 'Unserviceable'
                : 'Belum Diperiksa'}
            </span>
          </div>
          <div className="mt-2 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setWatchroomModalOpen(true)}
              className="text-arff-primary hover:underline font-semibold"
            >
              Input / Perbarui Status
            </button>
          </div>
        </div>

        {/* Operational Incidents */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Laporan Insiden
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics.openIncidentsCount}
            </span>
            <span className="text-xs text-slate-500">Insiden Terbuka</span>
          </div>
          <div className="mt-2 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setIncidentModalOpen(true)}
              className="text-red-700 hover:underline font-semibold"
            >
              + Catat Kejadian Baru
            </button>
          </div>
        </div>
      </div>

      {/* Fleet Monitoring Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Kesiapan Fisik & Operasional Armada
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemeriksaan wajib dilakukan oleh Penanggung Jawab (PIC) masing-masing unit kendaraan
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/readiness/vehicles')}
            >
              Lihat Seluruh Armada
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => navigate('/deployment')}
            >
              Kelola Ploting Regu
            </Button>
          </div>
        </div>

        {/* State View for Vehicles */}
        <div className="mt-5">
          <StateView
            loading={loading}
            error={error}
            isEmpty={vehicles.length === 0}
            emptyTitle="Belum Ada Data Master Armada"
            emptyDescription="Master data kendaraan ARFF dimulai dari kosong. Silakan masuk ke menu Pengaturan Master untuk mendaftarkan unit kendaraan operasional."
            emptyAction={
              isAdmin && (
                <Button variant="primary" size="sm" onClick={() => navigate('/settings')}>
                  Buka Pengaturan Master Armada
                </Button>
              )
            }
            onRetry={fetchDashboardData}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vehicles.map((v) => {
                // Check if user is the assigned PIC for this vehicle
                const isPic = user?.personnel_id && v.pic_personnel_id === user.personnel_id;
                const canInspect = isPic || isSupervisor || isAdmin;

                return (
                  <VehicleMetricCard
                    key={v.id}
                    vehicle={v}
                    isPicForVehicle={isPic}
                    canInspect={canInspect}
                    onInspect={(veh) => setSelectedVehicleForInspect(veh)}
                  />
                );
              })}
            </div>
          </StateView>
        </div>
      </div>

      {/* Inspection Modal */}
      {selectedVehicleForInspect && (
        <VehicleReadinessModal
          isOpen={Boolean(selectedVehicleForInspect)}
          onClose={() => setSelectedVehicleForInspect(null)}
          vehicle={selectedVehicleForInspect}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Watchroom Modal */}
      {watchroomModalOpen && (
        <WatchroomReadinessModal
          isOpen={watchroomModalOpen}
          onClose={() => setWatchroomModalOpen(false)}
          logItem={watchroomLog}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={fetchDashboardData}
        />
      )}

      {/* Incident Modal */}
      {incidentModalOpen && (
        <IncidentModal
          isOpen={incidentModalOpen}
          onClose={() => setIncidentModalOpen(false)}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={fetchDashboardData}
        />
      )}
    </div>
  );
}
