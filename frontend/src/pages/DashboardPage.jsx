import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle, Users, UserX, Truck, Radio } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  cleanTeam,
  formatIndoDate,
  getCurrentOperationalShift,
} from '../utils/shiftHelper';
import api from '../services/api';
import DashboardScorecards from '../components/dashboard/DashboardScorecards';
import DashboardFleetSection from '../components/dashboard/DashboardFleetSection';
import DashboardDetailModals from '../components/dashboard/DashboardDetailModals';

/**
 * Dashboard Operasional Utama ARFF YIA
 * Kombinasi terpadu Variant 3 & Variant 5 dengan arsitektur anti-redundansi:
 * - Baris Atas (4 Scorecard):
 *   1. Regu & Pimpinan Shift
 *   2. Pengumuman Terbaru (Judul & Ringkasan)
 *   3. Personel Izin / Cuti Shift Ini
 *   4. Agenda & Log Kegiatan Shift Ini
 * - Baris Bawah (2 Kolom Proporsional):
 *   - Kiri: Kesiapan Armada & Posko Operasional
 *   - Kanan Atas: Komposisi Personel Regu Operasional (Total Regu, Sedang Shift, Organik vs Outsourcing/Training)
 *   - Kanan Bawah: Laporan Insiden Operasional
 *
 * Design Read: Operational Command Dashboard for ARFF YIA officers,
 * grounded utilitarian light-mode visual language, dial ENERGY 1 / RHYTHM 2 / MOTION 1.
 */
export default function DashboardPage() {
  const {
    activeDate: authDate,
    activeShiftNumber: authShiftNumber,
    activeTeam: authTeam,
    token,
  } = useAuth();

  const fallbackShift = useMemo(() => getCurrentOperationalShift(), []);
  const activeDate = authDate || fallbackShift.shiftDate;
  const activeShiftNumber = Number(authShiftNumber || fallbackShift.shiftNumber || 1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Data Operasional Riil (Zero Dummy Data)
  const [vehicles, setVehicles] = useState([]);
  const [watchroomLog, setWatchroomLog] = useState(null);
  const [shiftInfo, setShiftInfo] = useState(null);
  const [deployments, setDeployments] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [rawDeploymentPayload, setRawDeploymentPayload] = useState(null);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState(null);
  const [loadingIncidentDetail, setLoadingIncidentDetail] = useState(false);

  // State Layer 2 (Modal Rincian Interaktif Tanpa Tombol/Label "Detail")
  const [activeModal, setActiveModal] = useState(null);
  // Nilai activeModal:
  // - { type: 'shift' }
  // - { type: 'announcement', item: annObj }
  // - { type: 'personnel', initialTeam: 'ALL' | 'Alpha' | 'Bravo' | 'Charlie' | 'Delta' }
  // - { type: 'leave' }
  // - { type: 'activities' }
  // - { type: 'incident_item', item: incObj }
  // - { type: 'vehicle_item', item: vehicleObj }
  const [selectedTeamTab, setSelectedTeamTab] = useState('ALL');

  const currentTeam = useMemo(() => {
    return cleanTeam(shiftInfo?.team_group || authTeam || fallbackShift.scheduledTeam || 'Alpha');
  }, [shiftInfo, authTeam, fallbackShift]);

  const getShiftHours = (shiftNum) => {
    switch (Number(shiftNum)) {
      case 1:
        return '07:00 - 13:00 WIB';
      case 2:
        return '13:00 - 20:00 WIB';
      case 3:
        return '20:00 - 07:00 WIB';
      default:
        return '07:00 - 13:00 WIB';
    }
  };

  const getShiftLabel = (shiftNum) => {
    switch (Number(shiftNum)) {
      case 1:
        return 'Shift 1 (Pagi)';
      case 2:
        return 'Shift 2 (Siang)';
      case 3:
        return 'Shift 3 (Malam)';
      default:
        return `Shift ${shiftNum}`;
    }
  };

  const formatIncidentCategory = (cat) => {
    const map = {
      aircraft_accident: 'Kecelakaan Pesawat',
      aircraft_incident: 'Insiden Pesawat',
      fire: 'Kebakaran Non-Pesawat',
      medical_emergency: 'Medis Darurat',
      hazmat: 'Bahan Berbahaya (Hazmat)',
      other: 'Operasional Lainnya',
    };
    return map[cat] || cat || 'Insiden Operasional';
  };

  const formatIncidentStatus = (st) => {
    if (st === 'selesai') return 'Selesai';
    if (st === 'menunggu_tindak_lanjut') return 'Tindak Lanjut';
    return 'Dalam Proses';
  };

  const getAttachmentUrl = (rawUrl) => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) return rawUrl;
    const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
    if (!token) return cleanPath;
    const sep = cleanPath.includes('?') ? '&' : '?';
    return `${cleanPath}${sep}token=${encodeURIComponent(token)}`;
  };

  const loadDashboardData = useCallback(
    async (signal) => {
      setLoading(true);
      setError(null);

      try {
        const teamParam = cleanTeam(authTeam || fallbackShift.scheduledTeam || 'Alpha');
        const queryParams = `date=${activeDate}&shift=${activeShiftNumber}&team_group=${teamParam}`;

        // 5 Pemanggilan API Terpadu (Data shift aktif dan presensi lengkap tersedia di /deployments/current)
        const [vRes, depRes, actRes, annRes, incRes] = await Promise.allSettled([
          api.get(`/readiness/vehicles?${queryParams}`, { signal }),
          api.get(`/deployments/current?${queryParams}`, { signal }),
          api.get(`/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${teamParam}`, { signal }),
          api.get('/announcements', { signal }),
          api.get('/incidents?limit=15', { signal }),
        ]);

        const allResults = [vRes, depRes, actRes, annRes, incRes];
        if (
          allResults.some(
            (r) =>
              r.status === 'rejected' &&
              (r.reason?.name === 'CanceledError' || r.reason?.code === 'ERR_CANCELED')
          )
        ) {
          return;
        }

        // 1. Armada Operasional (Termasuk Unit Posko Watchroom)
        let vehicleList = [];
        if (vRes.status === 'fulfilled' && vRes.value?.data) {
          const rawV = vRes.value.data.data || vRes.value.data;
          vehicleList = Array.isArray(rawV) ? rawV : Array.isArray(rawV?.vehicles) ? rawV.vehicles : [];
          setVehicles(vehicleList);
        } else {
          setVehicles([]);
        }

        // Posko Watchroom Log diekstrak langsung dari unit posko armada
        const poskoUnit = vehicleList.find((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');
        if (poskoUnit) {
          setWatchroomLog({ ...poskoUnit, inspector_name: poskoUnit.pic_name });
        } else {
          setWatchroomLog(null);
        }

        // 2. Ploting Shift & Absensi
        if (depRes.status === 'fulfilled' && depRes.value?.data) {
          const depPayload = depRes.value.data.data || depRes.value.data;
          const list = Array.isArray(depPayload?.deployments) ? depPayload.deployments : [];
          const absentList = Array.isArray(depPayload?.absents)
            ? depPayload.absents
            : list.filter((d) => d.deployment_type === 'absent');
          setShiftInfo(depPayload?.shift || null);
          setDeployments(list);
          setAbsents(absentList);
          setRawDeploymentPayload(depPayload);
        } else {
          setShiftInfo(null);
          setDeployments([]);
          setAbsents([]);
          setRawDeploymentPayload(null);
        }

        // 3. Kegiatan Shift
        if (actRes.status === 'fulfilled' && actRes.value?.data) {
          const actPayload = actRes.value.data.data || actRes.value.data;
          const actList = Array.isArray(actPayload)
            ? actPayload
            : Array.isArray(actPayload?.activities)
            ? actPayload.activities
            : [];
          setActivities(actList);
        } else {
          setActivities([]);
        }

        // 4. Pengumuman Terbaru
        if (annRes.status === 'fulfilled' && annRes.value?.data) {
          const annPayload = annRes.value.data.data || annRes.value.data;
          const annList = Array.isArray(annPayload?.announcements)
            ? annPayload.announcements
            : Array.isArray(annPayload)
            ? annPayload
            : [];
          setAnnouncements(annList);
        } else {
          setAnnouncements([]);
        }

        // 5. Laporan Insiden Operasional
        if (incRes.status === 'fulfilled' && incRes.value?.data) {
          const incPayload = incRes.value.data.data || incRes.value.data;
          const incList = Array.isArray(incPayload?.incidents)
            ? incPayload.incidents
            : Array.isArray(incPayload)
            ? incPayload
            : [];
          setIncidents(incList);
        } else {
          setIncidents([]);
        }
      } catch (err) {
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
        const errMsg = err.response?.data?.message || err.message || 'Gagal memuat data operasional dashboard. Periksa koneksi jaringan Anda.';
        setError(typeof errMsg === 'string' ? errMsg : (errMsg?.message || 'Gagal memuat data operasional dashboard.'));
      } finally {
        setLoading(false);
      }
    },
    [activeDate, activeShiftNumber, authTeam, fallbackShift.scheduledTeam]
  );

  useEffect(() => {
    const controller = new AbortController();
    loadDashboardData(controller.signal);
    return () => controller.abort();
  }, [loadDashboardData]);

  // Pengumuman paling baru (berdasarkan urutan tanggal terbit dari backend)
  const latestAnnouncement = useMemo(() => {
    return announcements.length > 0 ? announcements[0] : null;
  }, [announcements]);

  // Pemetaan penugasan personel pada shift berjalan (personnel_id -> informasi penugasan)
  const deploymentByPersonnelId = useMemo(() => {
    const map = new Map();
    (Array.isArray(deployments) ? deployments : []).forEach((d) => {
      if (d?.personnel_id) {
        map.set(Number(d.personnel_id), d);
      }
    });
    return map;
  }, [deployments]);

  // Detail penugasan per armada langsung dari payload currentDeployment
  const vehicleDeploymentDetails = useMemo(() => {
    const picMap = {};
    const crewMap = {};

    if (Array.isArray(rawDeploymentPayload?.vehicles)) {
      rawDeploymentPayload.vehicles.forEach((v) => {
        if (!v) return;
        crewMap[v.vehicle_id] = Array.isArray(v.crew) ? v.crew : [];
        if (v.pic?.full_name) {
          picMap[v.vehicle_id] = v.pic.full_name;
        }
      });
    }
    if (Array.isArray(rawDeploymentPayload?.watchroom)) {
      crewMap['watchroom'] = rawDeploymentPayload.watchroom;
      const watchPic = rawDeploymentPayload.watchroom.find((w) => w && w.is_pic === 1);
      if (watchPic?.full_name) {
        picMap['watchroom'] = watchPic.full_name;
      }
    }

    // Fallback dari deployments jika payload vehicles belum terstruktur
    if (Object.keys(crewMap).length === 0 && Array.isArray(deployments) && deployments.length > 0) {
      deployments.forEach((d) => {
        if (!d || d.deployment_type === 'absent') return;
        const key = d.deployment_type === 'watchroom' ? 'watchroom' : d.vehicle_id;
        if (key) {
          if (!crewMap[key]) crewMap[key] = [];
          crewMap[key].push(d);
          if (d.is_pic) {
            picMap[key] = d.full_name || d.personnel_name;
          }
        }
      });
    }

    return { picMap, crewMap };
  }, [rawDeploymentPayload, deployments]);

  // Ringkasan Kekuatan & Formasi Shift Aktif (Langsung dari currentDeployment)
  const personnelComposition = useMemo(() => {
    const safeDeployments = Array.isArray(deployments) ? deployments : [];
    const safeAbsents = Array.isArray(absents) ? absents : [];
    const onDutyDeployments = safeDeployments.filter((d) => d && d.deployment_type !== 'absent');
    const absentDeployments =
      safeAbsents.length > 0 ? safeAbsents : safeDeployments.filter((d) => d && d.deployment_type === 'absent');
    const onDutyCount = onDutyDeployments.length;
    const absentCount = absentDeployments.length;
    const totalTeam = rawDeploymentPayload?.total_team_members || (onDutyCount + absentCount);

    const organikCount = onDutyDeployments.filter(
      (d) => String(d?.employment_status || 'organik').toLowerCase() === 'organik'
    ).length;
    const outsourcingCount = onDutyDeployments.filter(
      (d) => String(d?.employment_status || '').toLowerCase() === 'outsourcing'
    ).length;

    return {
      onDutyCount,
      absentCount,
      activeTeamAbsentCount: absentCount,
      totalAllAbsentCount: absentCount,
      totalTeamMembers: totalTeam,
      totalAllTeams: totalTeam,
      totalAllOrganik: organikCount,
      totalAllOutsourcing: outsourcingCount,
      onDutyDeployments,
      absentDeployments,
      allLeaves: absentDeployments,
      activeTeamStats: {
        team: currentTeam,
        total: totalTeam,
        organik: organikCount,
        outsourcing: outsourcingCount,
        chiefName: shiftInfo?.supervisor_name || 'Ketua Regu',
        members: onDutyDeployments,
      },
      byTeam: [
        {
          team: currentTeam,
          total: totalTeam,
          organik: organikCount,
          outsourcing: outsourcingCount,
          chiefName: shiftInfo?.supervisor_name || 'Ketua Regu',
          isCurrentShiftTeam: true,
          onDutyCount,
          absentCount,
          members: onDutyDeployments,
        },
      ],
    };
  }, [deployments, absents, rawDeploymentPayload, currentTeam, shiftInfo]);

  // Nama Ketua Regu (Chief) dinamis untuk shift aktif
  const supervisorName = useMemo(() => {
    return (
      shiftInfo?.supervisor_name ||
      (Array.isArray(deployments) ? deployments : []).find(
        (d) =>
          d?.rank_position?.toLowerCase().includes('chief') &&
          !d?.rank_position?.toLowerCase().includes('assistant')
      )?.full_name ||
      'Belum Ditentukan'
    );
  }, [shiftInfo, deployments]);

  // Ringkasan Kelaikan Armada
  const fleetMetrics = useMemo(() => {
    let serviceable = 0;
    let unserviceable = 0;
    let unchecked = 0;

    vehicles.forEach((v) => {
      const st = v.status || v.readiness || 'belum_dilaporkan';
      if (st === 'serviceable') serviceable++;
      else if (st === 'unserviceable') unserviceable++;
      else unchecked++;
    });

    return {
      total: vehicles.length,
      serviceable,
      unserviceable,
      unchecked,
    };
  }, [vehicles]);

  // Helper Aksesibilitas Keyboard untuk Card/Baris Interaktif (R-32)
  const handleInteractiveKeyDown = (e, callback) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };


  const openIncidentModal = async (inc) => {
    setSelectedIncidentDetail(inc);
    setActiveModal({ type: 'incident_item', item: inc });
    if (inc?.id) {
      setLoadingIncidentDetail(true);
      try {
        const res = await api.get(`/incidents/${inc.id}`);
        const fullInc = res.data?.incident || res.data?.data || res.data;
        if (fullInc) {
          setSelectedIncidentDetail(fullInc);
        }
      } catch {
        // Tetap tampilkan data ringkasan jika gagal menarik lampiran
      } finally {
        setLoadingIncidentDetail(false);
      }
    }
  };

  // Anggota yang ditampilkan pada Modal Layer 2 Personel
  const filteredModalPersonnel = useMemo(() => {
    return [...(Array.isArray(deployments) ? deployments : [])].sort((a, b) => {
      const aChief =
        String(a?.rank_position || '').toLowerCase().includes('chief') &&
        !String(a?.rank_position || '').toLowerCase().includes('assistant');
      const bChief =
        String(b?.rank_position || '').toLowerCase().includes('chief') &&
        !String(b?.rank_position || '').toLowerCase().includes('assistant');
      if (aChief && !bChief) return -1;
      if (!aChief && bChief) return 1;
      return String(a?.full_name || '').localeCompare(String(b?.full_name || ''));
    });
  }, [deployments]);

  return (
    <div className="space-y-5 text-slate-800">
      {/* Banner Error Jaringan / API (R-27) */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{typeof error === 'string' ? error : error?.message || 'Gagal memuat data operasional dashboard.'}</span>
          </div>
          <button
            type="button"
            onClick={() => loadDashboardData(undefined)}
            className="px-2.5 py-1 rounded bg-white border border-red-200 text-red-700 font-semibold hover:bg-red-100 transition-colors cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* =====================================================================
          1. BARIS 4 SCORECARD UTAMA (UKURAN FIX h-[118px], KLIK MEMBUKA LAYER 2 MODAL)
          ===================================================================== */}
      <DashboardScorecards
        currentTeam={currentTeam}
        supervisorName={supervisorName}
        latestAnnouncement={latestAnnouncement}
        personnelComposition={personnelComposition}
        activities={activities}
        onOpenModal={setActiveModal}
        onKeyDown={handleInteractiveKeyDown}
      />

      {/* =====================================================================
          2. MAIN SECTION: SEMUA CONTAINER UKURAN FIX & SEJAJAR RATA ATAS-BAWAH
             Kiri: h-[564px] | Kanan: h-[312px] + gap-5 (20px) + h-[232px] = 564px
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* KIRI (lg:col-span-6): KESIAPAN ARMADA & POSKO OPERASIONAL (UKURAN FIX h-[564px]) */}
        <DashboardFleetSection
          vehicles={vehicles}
          loading={loading}
          fleetMetrics={fleetMetrics}
          vehicleDeploymentDetails={vehicleDeploymentDetails}
          watchroomLog={watchroomLog}
          onOpenModal={setActiveModal}
          onKeyDown={handleInteractiveKeyDown}
        />

        {/* KANAN (lg:col-span-6): MATRIKS KOMPOSISI REGU (h-[312px]) & LAPORAN INSIDEN (h-[232px]) */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          {/* Panel Kanan Atas: Kesiapan Formasi Shift Berjalan / Shift Manning Status (UKURAN FIX h-[312px]) */}
          <div className="h-[312px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Kesiapan Formasi Shift Berjalan
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Ringkasan formasi personel, absensi, dan kesiapan armada operasional shift aktif
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg shrink-0">
                Regu {currentTeam} • {getShiftLabel(activeShiftNumber)}
              </span>
            </div>

            <div className="flex-1 p-3.5 grid grid-cols-2 gap-2.5 overflow-y-auto">
              {/* 1. Kru Hadir Dinas */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal({ type: 'shift' })}
                onKeyDown={(e) => handleInteractiveKeyDown(e, () => setActiveModal({ type: 'shift' }))}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 transition-colors duration-100 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Kru Hadir Dinas</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {personnelComposition.onDutyCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Personel Siap Operasi
                  </div>
                </div>
              </div>

              {/* 2. Kru Cuti / Izin */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal({ type: 'leave' })}
                onKeyDown={(e) => handleInteractiveKeyDown(e, () => setActiveModal({ type: 'leave' }))}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 transition-colors duration-100 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Kru Cuti / Izin</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <UserX className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {personnelComposition.absentCount}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {personnelComposition.absentCount > 0 ? 'Personel Berhalangan' : 'Nihil (Hadir Lengkap)'}
                  </div>
                </div>
              </div>

              {/* 3. Armada Siap Operasi */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setActiveModal({ type: 'shift' })}
                onKeyDown={(e) => handleInteractiveKeyDown(e, () => setActiveModal({ type: 'shift' }))}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 transition-colors duration-100 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Armada Siap Operasi</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                    {fleetMetrics.serviceable}/{fleetMetrics.total}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {fleetMetrics.unserviceable > 0 ? `${fleetMetrics.unserviceable} unit kendala` : '100% Siaga Operasi'}
                  </div>
                </div>
              </div>

              {/* 4. Posko Komunikasi / Watchroom */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const watchUnit = vehicles.find((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');
                  if (watchUnit) setActiveModal({ type: 'vehicle_item', item: watchUnit });
                }}
                onKeyDown={(e) =>
                  handleInteractiveKeyDown(e, () => {
                    const watchUnit = vehicles.find((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');
                    if (watchUnit) setActiveModal({ type: 'vehicle_item', item: watchUnit });
                  })
                }
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60 transition-colors duration-100 cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Posko Terisi</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <Radio className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <div className="text-base font-bold text-slate-900 truncate">
                    {watchroomLog?.pic_name ? 'Terisi (Siaga)' : 'Posko Terisi'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    PIC: {watchroomLog?.pic_name || 'Petugas Watchroom'}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between gap-2 text-[11px] text-slate-600 shrink-0">
              <span className="font-medium truncate">
                Pimpinan Shift: <strong className="text-slate-900 font-semibold">{supervisorName}</strong>
              </span>
              <button
                type="button"
                onClick={() => setActiveModal({ type: 'shift' })}
                className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline cursor-pointer shrink-0"
              >
                Lihat Formasi Ploting &rarr;
              </button>
            </div>
          </div>

          {/* Panel Kanan Bawah: Laporan Insiden Operasional (UKURAN FIX h-[232px], MAKS 3 DATA) */}
          <div className="h-[232px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Laporan Insiden Operasional
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Pemantauan kejadian darurat, lokasi penugasan, dan status penanganan insiden
                </p>
              </div>
              <span className="text-xs font-mono tabular-nums font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg shrink-0">
                {incidents.length} Laporan
              </span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Memuat daftar laporan insiden operasional...
                </div>
              ) : incidents.length === 0 ? (
                <div className="h-full flex items-center justify-center px-4 text-center text-xs text-slate-500">
                  Tidak ada laporan insiden darurat yang tercatat. Kondisi operasional aman terkendali.
                </div>
              ) : (
                incidents.slice(0, 3).map((inc, incIdx) => {
                  const isResolved = inc.status === 'selesai';
                  const isFollowUp = inc.status === 'menunggu_tindak_lanjut';

                  return (
                    <div
                      key={inc.id || inc.report_number || `inc-${incIdx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => openIncidentModal(inc)}
                      onKeyDown={(e) => handleInteractiveKeyDown(e, () => openIncidentModal(inc))}
                      className="px-4 py-3 hover:bg-slate-50 transition-colors duration-100 cursor-pointer flex items-start justify-between gap-3 text-xs focus-visible:outline-none focus-visible:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                            {inc.report_number}
                          </span>
                          <span className="font-semibold text-slate-900 truncate">
                            {typeof inc.title === 'string' ? inc.title : String(inc.title || '')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Lokasi: <span className="text-slate-700 font-medium">{typeof inc.location === 'string' ? inc.location : '-'}</span> •{' '}
                          {formatIndoDate(inc.incident_date, { shortMonth: true })} (
                          {String(inc.incident_time || '-').slice(0, 5)} WIB)
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isResolved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isFollowUp
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-red-50 text-red-800 border-red-200'
                          }`}
                        >
                          {formatIncidentStatus(inc.status)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          LAYER KE-2: MODAL RINCIAN INTERAKTIF SAAT FITUR DIKLIK
          ===================================================================== */}
      <DashboardDetailModals
        activeModal={activeModal}
        setActiveModal={setActiveModal}
        announcements={announcements}
        personnelComposition={personnelComposition}
        selectedTeamTab={selectedTeamTab}
        setSelectedTeamTab={setSelectedTeamTab}
        filteredModalPersonnel={filteredModalPersonnel}
        deploymentByPersonnelId={deploymentByPersonnelId}
        currentTeam={currentTeam}
        activeDate={activeDate}
        activeShiftNumber={activeShiftNumber}
        supervisorName={supervisorName}
        shiftInfo={shiftInfo}
        activities={activities}
        selectedIncidentDetail={selectedIncidentDetail}
        setSelectedIncidentDetail={setSelectedIncidentDetail}
        loadingIncidentDetail={loadingIncidentDetail}
        watchroomLog={watchroomLog}
        vehicleDeploymentDetails={vehicleDeploymentDetails}
        getAttachmentUrl={getAttachmentUrl}
        handleInteractiveKeyDown={handleInteractiveKeyDown}
        getShiftLabel={getShiftLabel}
        getShiftHours={getShiftHours}
        formatIncidentCategory={formatIncidentCategory}
        formatIncidentStatus={formatIncidentStatus}
      />
    </div>
  );
}
