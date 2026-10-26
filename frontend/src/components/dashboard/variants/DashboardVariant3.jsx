import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  Users,
  UserX,
  Activity,
  RotateCw,
  ChevronRight,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Truck,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { cleanTeam } from '../../../utils/shiftHelper';
import api from '../../../services/api';

export default function DashboardVariant3() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Real Data states (Zero Dummy Data)
  const [vehicles, setVehicles] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [supervisorName, setSupervisorName] = useState('');
  const [activities, setActivities] = useState([]);
  const [totalAllPersonnel, setTotalAllPersonnel] = useState(0);

  // Jam operasional baku per shift dinas
  const getShiftHours = (shiftNum) => {
    switch (Number(shiftNum)) {
      case 1:
        return '07:00 - 15:00 WIB';
      case 2:
        return '15:00 - 23:00 WIB';
      case 3:
        return '23:00 - 07:00 WIB';
      default:
        return '07:00 - 15:00 WIB';
    }
  };

  // Fetch data real dari backend (Zero Dummy Data)
  const loadDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const currentTeam = cleanTeam(activeTeam || 'Alpha');
      const dateStr = activeDate || new Date().toISOString().split('T')[0];
      const shiftNum = activeShiftNumber || 1;

      // Concurrent fetch seluruh data operasional riil
      const [vRes, depRes, actRes, pRes] = await Promise.allSettled([
        api.get(`/readiness/vehicles?date=${dateStr}&shift=${shiftNum}&team_group=${currentTeam}`),
        api.get(`/deployments/current?date=${dateStr}&shift=${shiftNum}&team_group=${currentTeam}`),
        api.get(`/activities?date=${dateStr}&shift=${shiftNum}`),
        api.get('/personnel?is_active=1'),
      ]);

      // 1. Data Armada & Watchroom Riil
      if (vRes.status === 'fulfilled' && vRes.value.data) {
        const rawV = Array.isArray(vRes.value.data.vehicles)
          ? vRes.value.data.vehicles
          : (Array.isArray(vRes.value.data.data) ? vRes.value.data.data : []);
        setVehicles(rawV);
      } else {
        setVehicles([]);
      }

      // 2. Data Penugasan Shift & Absensi Riil
      if (depRes.status === 'fulfilled' && depRes.value.data) {
        const depPayload = depRes.value.data.data || depRes.value.data;
        const list = Array.isArray(depPayload.deployments) ? depPayload.deployments : [];
        setDeployments(list);
        setSupervisorName(depPayload.shift?.supervisor_name || depPayload.supervisor_name || '');
      } else {
        setDeployments([]);
        setSupervisorName('');
      }

      // 3. Data Aktivitas Shift Riil
      if (actRes.status === 'fulfilled' && actRes.value.data) {
        const actPayload = actRes.value.data.data || actRes.value.data;
        const actList = Array.isArray(actPayload) ? actPayload : (actPayload?.activities || []);
        setActivities(actList);
      } else {
        setActivities([]);
      }

      // 4. Total Personel Aktif Seluruh Unit
      if (pRes.status === 'fulfilled' && pRes.value.data) {
        const pList = Array.isArray(pRes.value.data.data)
          ? pRes.value.data.data
          : (Array.isArray(pRes.value.data.personnel) ? pRes.value.data.personnel : []);
        setTotalAllPersonnel(pList.length);
      } else {
        setTotalAllPersonnel(0);
      }
    } catch (err) {
      console.warn('Dashboard Variant 3 data load:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Ekstraksi pemetaan PIC per unit dari data deployment riil
  const vehiclePicMap = useMemo(() => {
    const map = {};
    deployments.forEach((d) => {
      if (d.is_pic) {
        if (d.vehicle_id) {
          map[d.vehicle_id] = d.full_name || d.personnel_name;
        }
        if (d.deployment_type === 'watchroom') {
          map['watchroom'] = d.full_name || d.personnel_name;
        }
      }
    });
    return map;
  }, [deployments]);

  // Metrik riil scorecard (Formasi Baku 4 Card)
  const scorecardMetrics = useMemo(() => {
    const absentPersonnel = deployments.filter((d) => d.deployment_type === 'absent');
    const onDutyPersonnel = deployments.filter((d) => d.deployment_type !== 'absent');
    const onDutyCount = onDutyPersonnel.length;
    const absentCount = absentPersonnel.length;

    return {
      reguName: cleanTeam(activeTeam || 'Alpha'),
      shiftHours: getShiftHours(activeShiftNumber || 1),
      onDutyCount,
      totalActiveUnit: totalAllPersonnel || (onDutyCount + absentCount),
      absentCount,
      activitiesCount: activities.length,
    };
  }, [deployments, totalAllPersonnel, activeTeam, activeShiftNumber, activities]);

  // Filter pencarian armada
  const filteredVehicles = useMemo(() => {
    if (!searchQuery.trim()) return vehicles;
    const q = searchQuery.toLowerCase();
    return vehicles.filter((v) => {
      const code = (v.code_name || '').toLowerCase();
      const name = (v.vehicle_name || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [vehicles, searchQuery]);

  return (
    <div className="space-y-5 text-slate-800">
      {/* HEADER / CONTEXT BAR (Grounded & Bebas Slogan ICAO Filler) */}
      <div className="bg-white rounded-xl border border-slate-200/90 px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
              OPERASIONAL DINAS SHIFT
            </span>
          </div>
          <div className="h-3.5 w-px bg-slate-200"></div>
          <div className="text-xs text-slate-600 flex items-center gap-1.5">
            <span>{activeDate || new Date().toISOString().split('T')[0]}</span>
            <span>•</span>
            <span className="font-semibold text-slate-900">Shift {activeShiftNumber || 1}</span>
            <span>•</span>
            <span className="font-bold text-emerald-800">Regu {cleanTeam(activeTeam || 'Alpha')}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors duration-100 flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title="Muat ulang data riil"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
          <a
            href="/deployment"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors duration-100"
          >
            <span>Kelola Ploting</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
          </a>
        </div>
      </div>

      {/* 1. FORMASI SCORECARD ATAS: TETAP 4 CARD BAKU (Tanpa Redundansi Kesiapan Armada) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Shift & Regu Berdinas */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Regu & Jam Dinas</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 leading-snug">
            Regu {scorecardMetrics.reguName}
          </div>
          <div className="text-xs font-mono text-emerald-700 font-semibold mt-1">
            {scorecardMetrics.shiftHours}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Shift {activeShiftNumber || 1} Dinas Aktif
          </div>
        </div>

        {/* Card 2: Total Personel Aktif Unit / Dinas Shift Sekarang */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Personel Berdinas</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {scorecardMetrics.onDutyCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Bertugas Shift Ini</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total Unit: <strong className="text-slate-800 font-mono">{scorecardMetrics.totalActiveUnit}</strong> personel aktif
          </div>
        </div>

        {/* Card 3: Personel Izin / Cuti */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Personel Izin / Cuti</span>
            <UserX className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {scorecardMetrics.absentCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Orang</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>
              {scorecardMetrics.absentCount > 0 ? 'Tercatat izin/cuti shift ini' : 'Seluruh personil hadir'}
            </span>
            <a href="/leave" className="text-amber-700 hover:underline font-semibold text-[10px]">
              Daftar
            </a>
          </div>
        </div>

        {/* Card 4: Agenda / Log Kegiatan Shift Aktif */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-[11px] font-medium tracking-tight">Agenda / Log Kegiatan</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {scorecardMetrics.activitiesCount}
            </span>
            <span className="text-xs text-slate-500 font-medium">Kegiatan Shift</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>
              {scorecardMetrics.activitiesCount > 0 ? 'Terekam di log operasional' : 'Belum ada agenda'}
            </span>
            <a href="/kegiatan" className="text-emerald-700 hover:underline font-semibold text-[10px]">
              Buka Log
            </a>
          </div>
        </div>
      </div>

      {/* 2. RESTRUKTURISASI MAIN SECTION: ARMADA RAMPING (KIRI) & CONTAINER BERUKURAN FIX DENGAN SCROLL (KANAN) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* KIRI (lg:col-span-6): CONTAINER KESIAPAN ARMADA OPERASIONAL (RAMPING & KOMPAK) */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
            {/* Header Ringkas */}
            <div className="p-4 border-b border-slate-200/80 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Kesiapan Armada Operasional
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Status kelaikan fisik & penanggung jawab operasional (PIC)
                </p>
              </div>

              {/* Search Baris Armada */}
              <div className="relative w-36 sm:w-44">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari armada..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 transition-colors"
                />
              </div>
            </div>

            {/* List Baris Ramping (HANYA Nama Kendaraan, PIC di bawahnya, dan Status Kelaikan di Kanan) */}
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {filteredVehicles.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  {loading ? 'Memuat status kelaikan armada...' : 'Tidak ada data armada terdaftar.'}
                </div>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const vId = vehicle.id || vehicle.vehicle_id;
                  const rawStatus = vehicle.status || vehicle.readiness;
                  const status = rawStatus || 'belum_dilaporkan';
                  const isUnserviceable = status === 'unserviceable';
                  const isServiceable = status === 'serviceable';
                  const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';
                  const picName = isPosko
                    ? (vehiclePicMap['watchroom'] || vehiclePicMap[vId] || 'Operator Komunikasi')
                    : (vehiclePicMap[vId] || 'Belum Ditunjuk');

                  return (
                    <div
                      key={vId}
                      className="px-4 py-2.5 hover:bg-slate-50/70 transition-colors duration-100 flex items-center justify-between gap-3 text-xs"
                    >
                      {/* Sisi Kiri: Ikon, Nama Kendaraan & PIC tepat di bawahnya */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isUnserviceable
                              ? 'bg-red-50 text-red-700'
                              : isServiceable
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isPosko ? <Radio className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate leading-tight">
                            {vehicle.code_name || vehicle.vehicle_name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            PIC: <span className="text-slate-700 font-medium">{picName}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sisi Kanan: Status Kelaikan (Serviceable / Unserviceable / Belum Dicek) */}
                      <div className="flex-shrink-0">
                        {isUnserviceable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Unserviceable</span>
                          </span>
                        ) : isServiceable ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Serviceable</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-600 border border-slate-200">
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                            <span>Belum Dicek</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Navigasi Armada */}
            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
              <span>{filteredVehicles.length} unit operasional</span>
              <a
                href="/armada"
                className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1"
              >
                <span>Detail Armada</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* KANAN (lg:col-span-6): CONTAINER PENDUKUNG FIX SIZE DENGAN SCROLL VERTIKAL */}
        <div className="lg:col-span-6 space-y-4">
          {/* Container 1: Log Agenda / Kegiatan Shift Aktif (Ukuran Fix & Scroll Vertikal max-h-[320px]) */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-slate-500" />
                  <span>Daftar Kegiatan Shift Aktif</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Riwayat apel, patroli runway, inspeksi & uji pancar hari ini
                </p>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                {activities.length} Kegiatan
              </span>
            </div>

            {/* Area Scroll Vertikal Berukuran Fix */}
            <div className="mt-3.5 relative pl-4 border-l border-slate-200 space-y-3.5 text-xs max-h-[220px] overflow-y-auto pr-1">
              {activities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 pl-0">
                  Belum ada catatan kegiatan operasional yang tercatat pada shift ini.
                </div>
              ) : (
                activities.map((act, idx) => (
                  <div key={act.id || idx} className="relative group">
                    {/* Dot vertikal timeline */}
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-white border-2 border-slate-400 group-hover:border-slate-800 transition-colors"></span>

                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-mono font-bold text-slate-800">
                        {act.activity_time || '-'}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {act.category || 'Operasional'}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 mt-0.5 leading-snug">
                      {act.title}
                    </div>
                    {act.personnel_name && (
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Pelaksana: {act.personnel_name}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[10px] text-slate-400">Shift {activeShiftNumber || 1} • {scorecardMetrics.reguName}</span>
              <a
                href="/kegiatan"
                className="font-semibold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 text-[11px]"
              >
                <span>Buka Seluruh Log</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Container 2: Pimpinan & Pengawas Shift Berjalan */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                  {scorecardMetrics.reguName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Pimpinan Shift Dinas
                  </h4>
                  <p className="text-[10px] text-slate-500">Regu {scorecardMetrics.reguName} • {scorecardMetrics.shiftHours}</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                ACTIVE SHIFT
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-500 text-[11px]">Ketua Regu (Chief):</span>
                <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                  {supervisorName || 'Menunggu Ploting'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-500 text-[11px]">Personel Siap Operasi:</span>
                <span className="font-mono font-bold text-slate-900">
                  {scorecardMetrics.onDutyCount} Personel
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="text-slate-500 text-[11px]">Personel Izin / Cuti:</span>
                <span className="font-mono font-bold text-amber-700">
                  {scorecardMetrics.absentCount} Personel
                </span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center gap-2">
              <a
                href="/deployment"
                className="flex-1 text-center py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors"
              >
                Atur Ploting Regu
              </a>
              <a
                href="/leave"
                className="flex-1 text-center py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors"
              >
                Kelola Izin / Cuti
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
