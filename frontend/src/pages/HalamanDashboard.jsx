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
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import VehicleMetricCard from '../components/dashboard/VehicleMetricCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import IncidentModal from '../components/forms/IncidentModal';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';

export default function HalamanDashboard() {
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
    totalPersonnelCount: 17,
    dutyPersonnelCount: 0,
    absentPersonnelCount: 0,
    isPersonnelPlotted: false,
    absentDetails: [],
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
      const currentTeam = cleanTeam(activeTeam);

      // 1. Fetch dashboard summary with team_group parameter
      let summaryData = null;
      try {
        const sumRes = await api.get(`/dashboard/summary?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
        summaryData = sumRes.data?.data || sumRes.data;
      } catch (e) {
        // Fallback gracefully if backend endpoint structure is slightly different
      }

      // 2. Fetch vehicle readiness
      const vRes = await api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
      const fetchedVehicles = Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []);
      setVehicles(fetchedVehicles);

      // 3. Fetch watchroom readiness
      try {
        const wRes = await api.get(`/readiness/watchroom?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
        setWatchroomLog(wRes.data?.log || wRes.data || null);
      } catch {
        setWatchroomLog(null);
      }

      // 4. Determine total roster and personnel duty/absent breakdown
      let totalRoster = summaryData?.personnel?.total_roster ?? summaryData?.total_team_members;
      if (!totalRoster) {
        try {
          const pRes = await api.get(`/personnel?team_group=${currentTeam}&is_active=1`);
          const pList = Array.isArray(pRes.data?.personnel) ? pRes.data.personnel : (Array.isArray(pRes.data) ? pRes.data : []);
          totalRoster = pList.length || 17;
        } catch {
          totalRoster = 17;
        }
      }

      const dutyCount = summaryData?.personnel?.duty_count ?? summaryData?.duty_count ?? 0;
      const absentCount = summaryData?.personnel?.absent_count ?? summaryData?.absent_count ?? 0;
      const isPlotted = Boolean(summaryData?.personnel?.is_plotted || dutyCount > 0 || absentCount > 0);
      const absentDetails = summaryData?.personnel?.absent_details || [];

      // Calculate summary metrics (support both flat v.status and v.current_log.status)
      const serviceableCount = fetchedVehicles.filter(
        (v) => (v.status === 'serviceable' || v.current_log?.status === 'serviceable')
      ).length;
      const unserviceableCount = fetchedVehicles.filter(
        (v) => (v.status === 'unserviceable' || v.current_log?.status === 'unserviceable')
      ).length;

      setMetrics({
        totalVehicles: fetchedVehicles.length,
        serviceableVehicles: serviceableCount,
        unserviceableVehicles: unserviceableCount,
        totalPersonnelCount: totalRoster,
        dutyPersonnelCount: dutyCount,
        absentPersonnelCount: absentCount,
        isPersonnelPlotted: isPlotted,
        absentDetails: absentDetails,
        openIncidentsCount: summaryData?.incidents?.total_open ?? summaryData?.open_incidents ?? 0,
        isShiftApproved: Boolean(summaryData?.shift?.status === 'approved' || summaryData?.shift_status === 'approved'),
        supervisorName: summaryData?.shift?.supervisor_name || summaryData?.supervisor_name || '',
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
        personnelStats={{
          total: metrics.totalPersonnelCount,
          duty: metrics.dutyPersonnelCount,
          absent: metrics.absentPersonnelCount,
          isPlotted: metrics.isPersonnelPlotted,
        }}
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Fleet Readiness */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
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
              <span className="text-xs text-slate-500 font-medium">
                / {metrics.totalVehicles} Siap Operasi
              </span>
            </div>
          </div>
          <div className="mt-3 text-[11px] font-medium text-slate-600">
            {metrics.unserviceableVehicles > 0 ? (
              <span className="text-red-700 font-bold">
                {metrics.unserviceableVehicles} unit unserviceable
              </span>
            ) : (
              <span className="text-emerald-700 font-semibold">Semua armada beroperasi normal</span>
            )}
          </div>
        </div>

        {/* Personnel Strength (Kekuatan & Keterangan Personel Dinas) */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div>
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
                {metrics.isPersonnelPlotted ? metrics.dutyPersonnelCount : metrics.totalPersonnelCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {metrics.isPersonnelPlotted
                  ? `/ ${metrics.totalPersonnelCount} Sedang Bertugas`
                  : `Anggota ${formatTeam(activeTeam)}`}
              </span>
            </div>

            {/* Keterangan Berapa yang Bertugas & Berapa yang Izin */}
            <div className="mt-2.5 grid grid-cols-2 gap-1.5 text-xs">
              <div className="px-2 py-1.5 rounded-lg bg-emerald-50/80 border border-emerald-200/70">
                <span className="text-[10px] text-emerald-700 font-semibold uppercase block leading-none mb-1">
                  Bertugas
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  {metrics.dutyPersonnelCount} <span className="text-[10px] font-normal text-emerald-600">Orang</span>
                </span>
              </div>

              <div className={`px-2 py-1.5 rounded-lg border ${
                metrics.absentPersonnelCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
                <span className="text-[10px] font-semibold uppercase block leading-none mb-1 text-slate-500">
                  Izin / Cuti
                </span>
                <span className="text-sm font-bold">
                  {metrics.absentPersonnelCount} <span className="text-[10px] font-normal text-slate-500">Orang</span>
                </span>
              </div>
            </div>

            {/* Ringkasan nama personel berhalangan jika ada */}
            {metrics.absentDetails && metrics.absentDetails.length > 0 && (
              <div className="mt-2 p-1.5 rounded bg-amber-50/60 border border-amber-200 text-[10px] text-amber-900">
                <span className="font-semibold block text-amber-800">Izin/Cuti:</span>
                <p className="truncate">
                  {metrics.absentDetails.map(a => `${a.full_name} (${a.reason || 'Izin'})`).join(', ')}
                </p>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-medium text-slate-600 flex items-center justify-between">
            <span className="text-slate-500">Shift {activeShiftNumber}</span>
            <button
              type="button"
              onClick={() => navigate('/deployment')}
              className="text-arff-primary hover:underline font-semibold"
            >
              {metrics.isPersonnelPlotted ? 'Lihat Ploting' : '+ Atur Ploting Kru'}
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
              Kelola Ploting Kru
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
