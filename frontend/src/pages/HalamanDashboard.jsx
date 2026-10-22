import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Users2,
  Radio,
  CheckCircle2,
  Clock,
  ClipboardList,
  UserCheck,
  ShieldAlert,
  Wrench,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import { getVehicleIcon } from '../utils/vehicleHelper';
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
  const [allPersonnelList, setAllPersonnelList] = useState([]);
  const [myDeployment, setMyDeployment] = useState(null);

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

      // 7. Cari penugasan user yang sedang login pada shift aktif ini
      try {
        const depRes = await api.get(`/deployments?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
        const depList = depRes.data?.data?.deployments || depRes.data?.deployments || [];
        const myItem = depList.find((d) => {
          if (user?.personnel_id && Number(d.personnel_id) === Number(user.personnel_id)) return true;
          if (user?.id && Number(d.user_id) === Number(user.id)) return true;
          if (user?.username && d.nip === user.username) return true;
          return false;
        });
        setMyDeployment(myItem || null);
      } catch (err) {
        console.warn('Error fetching my deployment:', err);
        setMyDeployment(null);
      }
    } catch (err) {
      console.error('Error loading dashboard:', err);
      setError('Gagal menghubungkan ke server backend untuk memuat data operasional.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam, user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

      {/* Kartu Penugasan Operasional Saya Hari Ini (Untuk Non-Admin) */}
      {!isAdmin && (
        <div className="mb-6 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:border-slate-300 transition-colors duration-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  myDeployment
                    ? myDeployment.deployment_type === 'absent'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {myDeployment ? (
                  myDeployment.deployment_type === 'absent' ? (
                    <Clock className="w-5 h-5" />
                  ) : myDeployment.is_pic === 1 ? (
                    <Shield className="w-5 h-5 text-emerald-700" />
                  ) : (
                    <UserCheck className="w-5 h-5 text-emerald-700" />
                  )
                ) : (
                  <Users2 className="w-5 h-5 text-slate-500" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Penugasan Operasional Saya
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">
                    {user?.name || 'Personel'}
                  </span>
                  {myDeployment?.is_pic === 1 && (
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                      PIC Terpilih
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-baseline gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                    {myDeployment ? (
                      myDeployment.deployment_type === 'watchroom' ? (
                        'Posko Watchroom / Komunikasi'
                      ) : myDeployment.deployment_type === 'absent' ? (
                        `Izin / Cuti (${myDeployment.leave_type || 'Cuti'})`
                      ) : (
                        myDeployment.vehicle_name || myDeployment.vehicle_code || 'Armada Operasional'
                      )
                    ) : (
                      'Belum Terploting pada Shift Ini'
                    )}
                  </h3>

                  {myDeployment && myDeployment.deployment_type !== 'absent' && (
                    <span className="text-xs font-semibold text-slate-500">
                      •{' '}
                      {myDeployment.deployment_type === 'watchroom'
                        ? 'Operator Watchroom'
                        : myDeployment.is_pic === 1
                        ? 'Penanggung Jawab Kendaraan (PIC)'
                        : 'Kru Pemadam'}
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-0.5">
                  {myDeployment ? (
                    myDeployment.deployment_type === 'absent' ? (
                      `Keterangan cuti: ${myDeployment.notes || 'Tercatat dispensasi / izin dinas resmi'}`
                    ) : (
                      `Shift ${activeShiftNumber} (${formatTeam(activeTeam)}) • Tanggal ${activeDate}`
                    )
                  ) : (
                    'Anda belum dialokasikan ke unit armada atau watchroom. Silakan hubungi Chief / Pengawas shift.'
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions untuk PIC / Petugas */}
            {myDeployment && (
              <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                {myDeployment.is_pic === 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetV = vehicles.find((v) => Number(v.id) === Number(myDeployment.vehicle_id));
                      if (targetV) {
                        setSelectedVehicleForInspect(targetV);
                      } else {
                        navigate('/readiness/vehicles');
                      }
                    }}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors duration-100"
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Periksa Kesiapan {myDeployment.vehicle_code || 'Armada'}</span>
                  </button>
                )}

                {myDeployment.deployment_type === 'watchroom' && (
                  <button
                    type="button"
                    onClick={() => setWatchroomModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors duration-100"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Periksa Posko Watchroom</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => navigate('/deployments')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors duration-100"
                >
                  <span>Daftar Ploting</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dashboard Utama: Layout 3 Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8 items-stretch">
        {/* Kolom 1 (Kiri): Container 1 & Container 2 */}
        <div className="flex flex-col gap-4 h-full">
          {/* Container 1 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex-1 flex items-center justify-center text-center min-h-[220px]">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Coming Soon
            </span>
          </div>

          {/* Container 2 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex-1 flex items-center justify-center text-center min-h-[220px]">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Coming Soon
            </span>
          </div>
        </div>

        {/* Kolom 2 (Tengah): Container 3 & Container 4 */}
        <div className="flex flex-col gap-4 h-full">
          {/* Container 3 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex-1 flex items-center justify-center text-center min-h-[220px]">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Coming Soon
            </span>
          </div>

          {/* Container 4 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex-1 flex items-center justify-center text-center min-h-[220px]">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Coming Soon
            </span>
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
                  const ItemIcon = getVehicleIcon(v);
                  const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
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
