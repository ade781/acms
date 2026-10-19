import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Users2,
  Radio,
  CheckCircle2,
  Clock,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import IncidentModal from '../components/forms/IncidentModal';

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
    activitiesCount: 0,
    isShiftApproved: false,
    supervisorName: '',
  });

  // Modals state
  const [selectedVehicleForInspect, setSelectedVehicleForInspect] = useState(null);
  const [watchroomModalOpen, setWatchroomModalOpen] = useState(false);
  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [approvingShift, setApprovingShift] = useState(false);
  const [allPersonnelList, setAllPersonnelList] = useState([]);

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

      // 2. Fetch vehicle readiness (includes 7 vehicles + 1 posko watchroom)
      const vRes = await api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
      const fetchedVehicles = Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []);
      setVehicles(fetchedVehicles);

      // 3. Fetch watchroom log (for legacy modal if needed)
      try {
        const wRes = await api.get(`/readiness/watchroom?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
        setWatchroomLog(wRes.data?.log || wRes.data || null);
      } catch {
        setWatchroomLog(null);
      }

      // 4. Fetch activities count for this shift
      let activitiesTotal = 0;
      try {
        const actRes = await api.get(`/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
        const actList = actRes.data?.data || actRes.data;
        activitiesTotal = Array.isArray(actList) ? actList.length : 0;
      } catch {
        activitiesTotal = 0;
      }

      // 5. Fetch all personnel for team breakdown & overall strength
      try {
        const allPRes = await api.get('/personnel?is_active=1');
        const allList = Array.isArray(allPRes.data?.data)
          ? allPRes.data.data
          : (Array.isArray(allPRes.data?.personnel)
          ? allPRes.data.personnel
          : (Array.isArray(allPRes.data) ? allPRes.data : []));
        setAllPersonnelList(allList);
      } catch (err) {
        console.error('Error fetching all personnel for breakdown:', err);
      }

      // 6. Determine total roster and personnel duty/absent breakdown
      let totalRoster = summaryData?.personnel?.total_roster ?? summaryData?.total_team_members;
      if (!totalRoster) {
        try {
          const pRes = await api.get(`/personnel?team_group=${currentTeam}&is_active=1`);
          const pList = Array.isArray(pRes.data?.data)
            ? pRes.data.data
            : (Array.isArray(pRes.data?.personnel)
            ? pRes.data.personnel
            : (Array.isArray(pRes.data) ? pRes.data : []));
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
        activitiesCount: activitiesTotal,
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
      {/* Shift Banner & Approval Header with Incident Status */}
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={metrics.supervisorName}
        isApproved={metrics.isShiftApproved}
        openIncidentsCount={metrics.openIncidentsCount}

        onOpenIncidentModal={() => setIncidentModalOpen(true)}
        personnelStats={{
          total: metrics.totalPersonnelCount,
          duty: metrics.dutyPersonnelCount,
          absent: metrics.absentPersonnelCount,
          isPlotted: metrics.isPersonnelPlotted,
        }}
      />

      {/* Dashboard Utama: Layout 3 Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8 items-stretch">
        {/* Kolom 1 (Kiri): Personel & Kekuatan Regu (Pecah Setengah-Setengah) */}
        <div className="flex flex-col gap-4 justify-between h-full">
          {/* Card 1A: Personel Shift Aktif */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex-1 flex flex-col justify-between hover:border-slate-300 transition-colors duration-100">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Personel Dinas
                </span>
                <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                  <Users2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {metrics.isPersonnelPlotted ? metrics.dutyPersonnelCount : metrics.totalPersonnelCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {metrics.totalPersonnelCount} Personel ({formatTeam(activeTeam)})
                </span>
              </div>

              {/* Status Kehadiran (3 Kotak Lega) */}
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="px-2 py-2 rounded-lg bg-emerald-50 border border-emerald-200/70">
                  <span className="text-[10px] text-emerald-700 font-semibold uppercase block leading-none mb-1">
                    Dinas
                  </span>
                  <span className="text-base font-bold text-emerald-800">
                    {metrics.dutyPersonnelCount}
                  </span>
                </div>

                <div className={`px-2 py-2 rounded-lg border ${
                  metrics.absentPersonnelCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-slate-50 border-slate-200/70 text-slate-600'
                }`}>
                  <span className="text-[10px] font-semibold uppercase block leading-none mb-1 text-slate-500">
                    Izin/Cuti
                  </span>
                  <span className="text-base font-bold">
                    {metrics.absentPersonnelCount}
                  </span>
                </div>

                <div className="px-2 py-2 rounded-lg bg-slate-50 border border-slate-200/70 text-slate-700">
                  <span className="text-[10px] font-semibold uppercase block leading-none mb-1 text-slate-500">
                    Cadangan
                  </span>
                  <span className="text-base font-bold text-slate-800">
                    {metrics.isPersonnelPlotted
                      ? Math.max(0, metrics.totalPersonnelCount - metrics.dutyPersonnelCount - metrics.absentPersonnelCount)
                      : metrics.totalPersonnelCount}
                  </span>
                </div>
              </div>

              {/* Catatan Izin/Cuti jika ada */}
              {metrics.absentDetails && metrics.absentDetails.length > 0 ? (
                <div className="mt-2.5 p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900">
                  <span className="font-semibold block text-amber-800 mb-0.5">Personel Berhalangan:</span>
                  <p className="line-clamp-2">
                    {metrics.absentDetails.map((a) => `${a.full_name} (${a.reason || 'Izin'})`).join(', ')}
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Semua anggota hadir dinas</span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-600 flex items-center justify-between">
              <span className="text-slate-500">Shift {activeShiftNumber}</span>
              <button
                type="button"
                onClick={() => navigate('/deployment')}
                className="text-slate-800 hover:text-slate-900 hover:underline font-semibold"
              >
                {metrics.isPersonnelPlotted ? 'Lihat Ploting →' : '+ Atur Ploting →'}
              </button>
            </div>
          </div>

          {/* Card 1B: Kekuatan Personel & Breakdown Regu (Dibawah Container Personel) */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex-1 flex flex-col justify-between hover:border-slate-300 transition-colors duration-100">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Total Personel
                  </span>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                      {allPersonnelList.length || 69}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Anggota</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md block">
                    Siaga Operasional
                  </span>
                </div>
              </div>

              {/* Grid 4 Tim (Alpha, Bravo, Charlie, Delta) */}
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                {['Alpha', 'Bravo', 'Charlie', 'Delta'].map((teamName) => {
                  const teamCount = allPersonnelList.filter(
                    (p) => cleanTeam(p.team_group).toLowerCase() === teamName.toLowerCase()
                  ).length || (teamName === 'Alpha' ? 18 : 17);

                  const isOnDuty = cleanTeam(teamName).toLowerCase() === cleanTeam(activeTeam).toLowerCase();

                  const teamStyles = {
                    alpha: {
                      activeCard: 'bg-red-50/90 border-red-300 ring-1 ring-red-400/30 text-red-950',
                      activeBadge: 'bg-red-100 text-red-800 border-red-300',
                      activeCount: 'text-red-900',
                    },
                    bravo: {
                      activeCard: 'bg-blue-50/90 border-blue-300 ring-1 ring-blue-400/30 text-blue-950',
                      activeBadge: 'bg-blue-100 text-blue-800 border-blue-300',
                      activeCount: 'text-blue-900',
                    },
                    charlie: {
                      activeCard: 'bg-emerald-50/90 border-emerald-300 ring-1 ring-emerald-400/30 text-emerald-950',
                      activeBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                      activeCount: 'text-emerald-900',
                    },
                    delta: {
                      activeCard: 'bg-purple-50/90 border-purple-300 ring-1 ring-purple-400/30 text-purple-950',
                      activeBadge: 'bg-purple-100 text-purple-800 border-purple-300',
                      activeCount: 'text-purple-900',
                    },
                  };
                  const s = teamStyles[teamName.toLowerCase()];

                  return (
                    <div
                      key={teamName}
                      className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors duration-100 ${
                        isOnDuty ? s.activeCard : 'bg-slate-50/60 border-slate-200/80 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider truncate">
                          {teamName}
                        </span>
                        {isOnDuty ? (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border ${s.activeBadge}`}>
                            Bertugas
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-slate-400">
                            Off
                          </span>
                        )}
                      </div>

                      <div className="my-1.5 flex items-baseline gap-1">
                        <span className={`text-lg sm:text-xl font-extrabold tracking-tight ${isOnDuty ? s.activeCount : 'text-slate-900'}`}>
                          {teamCount}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Personel</span>
                      </div>

                      <div className="text-[10px] font-medium leading-tight">
                        {isOnDuty ? (
                          <span className="font-bold text-emerald-700">Dinas Aktif Saat Ini</span>
                        ) : (
                          <span className="text-slate-400">Siaga Cadangan</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Status Penugasan</span>
              <span className="font-semibold text-slate-700">
                {cleanTeam(activeTeam)} Bertugas
              </span>
            </div>
          </div>
        </div>

        {/* Kolom 2 (Tengah): Kesiapan Operasi & Logbook Kegiatan (Pecah Setengah-Setengah) */}
        <div className="flex flex-col gap-4 justify-between h-full">
          {/* Card 2A: Kesiapan Operasi */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex-1 flex flex-col justify-between hover:border-slate-300 transition-colors duration-100">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Kesiapan Operasi
                </span>
                <div className="w-7 h-7 rounded-lg bg-red-50 text-arff-primary flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {metrics.serviceableVehicles}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / {metrics.totalVehicles} Unit Siap
                </span>
              </div>

              {/* Progress Bar & Status */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metrics.totalVehicles > 0 && metrics.serviceableVehicles === metrics.totalVehicles
                        ? 'bg-emerald-500'
                        : metrics.unserviceableVehicles > 0
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${metrics.totalVehicles > 0 ? (metrics.serviceableVehicles / metrics.totalVehicles) * 100 : 0}%`,
                    }}
                  />
                </div>

                <div className="mt-2 text-xs font-medium">
                  {metrics.totalVehicles === 0 ? (
                    <span className="text-slate-500">Belum ada unit terdaftar</span>
                  ) : metrics.unserviceableVehicles > 0 ? (
                    <span className="text-red-700 font-bold">{metrics.unserviceableVehicles} unit rusak</span>
                  ) : metrics.serviceableVehicles === metrics.totalVehicles ? (
                    <span className="text-emerald-700 font-semibold">Semua unit siap dinas</span>
                  ) : (
                    <span className="text-amber-700 font-medium">{metrics.totalVehicles - metrics.serviceableVehicles} unit belum diperiksa</span>
                  )}
                </div>
              </div>

              {/* Ringkasan Komposisi Unit */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>7 Armada</span>
                <span>1 Posko</span>
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-600 flex items-center justify-between">
              <span className="text-slate-500">Total 8 Unit</span>
              <button
                type="button"
                onClick={() => navigate('/readiness/vehicles')}
                className="text-slate-800 hover:text-slate-900 hover:underline font-semibold"
              >
                Detail Kesiapan →
              </button>
            </div>
          </div>

          {/* Card 2B: Logbook Kegiatan */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm flex-1 flex flex-col justify-between hover:border-slate-300 transition-colors duration-100">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Logbook Kegiatan
                </span>
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <ClipboardList className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {metrics.activitiesCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  Kegiatan Dicatat
                </span>
              </div>

              <div className="mt-2.5 text-xs">
                {metrics.activitiesCount > 0 ? (
                  <span className="text-emerald-700 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    Jurnal kegiatan terisi
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    Belum ada kegiatan
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs font-medium text-slate-600 flex items-center justify-between">
              <span className="text-slate-500">Jurnal Harian</span>
              <button
                type="button"
                onClick={() => navigate('/activities')}
                className="text-slate-800 hover:text-slate-900 hover:underline font-semibold"
              >
                Buka Logbook →
              </button>
            </div>
          </div>
        </div>

        {/* Kolom 3 (Kanan): Kesiapan Fisik (Minimalis: Icon, Nama, dan Penanggung Jawab Saja) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors duration-100">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Kesiapan Fisik
                </span>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {metrics.serviceableVehicles}/{metrics.totalVehicles} Siap
              </span>
            </div>

            {/* List Armada & Posko Ringkas (Tanpa tombol kelola, tanpa lihat seluruh armada, tanpa input pemeriksaan, tanpa plat) */}
            <div className="divide-y divide-slate-100 mt-1 max-h-[440px] overflow-y-auto pr-1">
              {vehicles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 italic">
                  Belum ada data unit operasional.
                </div>
              ) : (
                vehicles.map((v) => {
                  const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
                  const ItemIcon = isPosko ? Radio : Truck;
                  const log = v.current_log || v;
                  const status = v.status || log?.status || 'belum_dilaporkan';

                  return (
                    <div
                      key={v.id}
                      className="py-2.5 px-1.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 rounded-lg transition-colors duration-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            status === 'serviceable'
                              ? 'bg-emerald-50 text-emerald-700'
                              : status === 'unserviceable'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <ItemIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {v.vehicle_name || v.code_name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            Penanggung Jawab:{' '}
                            <strong className="font-semibold text-slate-800">
                              {v.pic_name || 'Belum Ditentukan'}
                            </strong>
                          </p>
                        </div>
                      </div>

                      {/* Indikator Status Dot Sederhana */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            status === 'serviceable'
                              ? 'bg-emerald-500'
                              : status === 'unserviceable'
                              ? 'bg-red-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <span className="text-[11px] font-semibold text-slate-600">
                          {status === 'serviceable'
                            ? 'Siap'
                            : status === 'unserviceable'
                            ? 'Rusak'
                            : 'Belum Cek'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Status Armada & Posko</span>
            <span className="font-medium text-slate-700">8 Unit Operasional</span>
          </div>
        </div>
      </div>

      {/* Inspection Modal (Armada atau Posko Watchroom) */}
      {selectedVehicleForInspect && (
        (selectedVehicleForInspect.category === 'posko' || selectedVehicleForInspect.code_name === 'WATCHROOM') ? (
          <WatchroomReadinessModal
            isOpen={Boolean(selectedVehicleForInspect)}
            onClose={() => setSelectedVehicleForInspect(null)}
            logItem={selectedVehicleForInspect}
            activeDate={activeDate}
            activeShiftNumber={activeShiftNumber}
            activeTeam={activeTeam}
            onSuccess={fetchDashboardData}
          />
        ) : (
          <VehicleReadinessModal
            isOpen={Boolean(selectedVehicleForInspect)}
            onClose={() => setSelectedVehicleForInspect(null)}
            vehicle={selectedVehicleForInspect}
            activeDate={activeDate}
            activeShiftNumber={activeShiftNumber}
            activeTeam={activeTeam}
            onSuccess={fetchDashboardData}
          />
        )
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
