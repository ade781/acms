import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  TEAMS,
  cleanTeam,
  formatIndoDate,
  formatRoleName,
  getCurrentOperationalShift,
  getDailyRoster,
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
  const [allLeaves, setAllLeaves] = useState([]);
  const [activities, setActivities] = useState([]);
  const [allPersonnel, setAllPersonnel] = useState([]);
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

  const dailyRoster = useMemo(() => getDailyRoster(activeDate), [activeDate]);

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

        const [vRes, wRes, depRes, actRes, pRes, annRes, incRes, leaveRes] = await Promise.allSettled([
          api.get(`/readiness/vehicles?${queryParams}`, { signal }),
          api.get(`/readiness/watchroom?${queryParams}`, { signal }),
          api.get(`/deployments/current?${queryParams}`, { signal }),
          api.get(`/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${teamParam}`, { signal }),
          api.get('/personnel?is_active=1&compact=true', { signal }),
          api.get('/announcements', { signal }),
          api.get('/incidents?limit=15', { signal }),
          api.get(`/deployments/leave-history?date=${activeDate}`, { signal }),
        ]);

        const allResults = [vRes, wRes, depRes, actRes, pRes, annRes, incRes, leaveRes];
        if (
          allResults.some(
            (r) =>
              r.status === 'rejected' &&
              (r.reason?.name === 'CanceledError' || r.reason?.code === 'ERR_CANCELED')
          )
        ) {
          return;
        }

        // 1. Armada Operasional
        if (vRes.status === 'fulfilled' && vRes.value?.data) {
          const rawV = vRes.value.data.data || vRes.value.data;
          const list = Array.isArray(rawV) ? rawV : Array.isArray(rawV?.vehicles) ? rawV.vehicles : [];
          setVehicles(list);
        } else {
          setVehicles([]);
        }

        // 2. Watchroom Log
        if (wRes.status === 'fulfilled' && wRes.value?.data) {
          setWatchroomLog(wRes.value.data.data || wRes.value.data || null);
        } else {
          setWatchroomLog(null);
        }

        // 3. Ploting Shift & Absensi
        if (depRes.status === 'fulfilled' && depRes.value?.data) {
          const depPayload = depRes.value.data.data || depRes.value.data;
          const list = Array.isArray(depPayload?.deployments) ? depPayload.deployments : [];
          const absentList = Array.isArray(depPayload?.absents)
            ? depPayload.absents
            : list.filter((d) => d.deployment_type === 'absent');
          setShiftInfo(depPayload?.shift || null);
          setDeployments(list);
          setAbsents(absentList);
        } else {
          setShiftInfo(null);
          setDeployments([]);
          setAbsents([]);
        }

        // 4. Kegiatan Shift
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

        // 5. Katalog Personel Aktif (Untuk Komposisi Regu & Organik/Outsourcing)
        if (pRes.status === 'fulfilled' && pRes.value?.data) {
          const pList = Array.isArray(pRes.value.data.data)
            ? pRes.value.data.data
            : Array.isArray(pRes.value.data.personnel)
            ? pRes.value.data.personnel
            : [];
          setAllPersonnel(pList);
        } else {
          setAllPersonnel([]);
        }

        // 6. Pengumuman Terbaru
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

        // 7. Laporan Insiden Operasional
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

        // 8. Seluruh Riwayat Cuti (Semua 4 Regu pada Tanggal Ini)
        if (leaveRes.status === 'fulfilled' && leaveRes.value?.data) {
          const lPayload = leaveRes.value.data.data || leaveRes.value.data;
          const lList = Array.isArray(lPayload) ? lPayload : [];
          setAllLeaves(lList);
        } else {
          setAllLeaves([]);
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
    deployments.forEach((d) => {
      if (d.personnel_id) {
        map.set(Number(d.personnel_id), d);
      }
    });
    return map;
  }, [deployments]);

  // Pemetaan PIC & kru per kendaraan/watchroom dari data deployment
  const vehicleDeploymentDetails = useMemo(() => {
    const picMap = {};
    const crewMap = {};

    deployments.forEach((d) => {
      if (d.deployment_type === 'absent') return;
      if (d.deployment_type === 'watchroom') {
        if (!crewMap['watchroom']) crewMap['watchroom'] = [];
        crewMap['watchroom'].push(d);
        if (d.is_pic) {
          picMap['watchroom'] = d.full_name || d.personnel_name;
        }
      } else if (d.vehicle_id) {
        const vId = d.vehicle_id;
        if (!crewMap[vId]) crewMap[vId] = [];
        crewMap[vId].push(d);
        if (d.is_pic) {
          picMap[vId] = d.full_name || d.personnel_name;
        }
      }
    });

    return { picMap, crewMap };
  }, [deployments]);

  // Filter personel khusus 4 Regu Dinas Operasional (Alpha, Bravo, Charlie, Delta)
  const operationalPersonnel = useMemo(() => {
    return allPersonnel.filter((p) =>
      TEAMS.some((t) => t.toLowerCase() === cleanTeam(p.team_group).toLowerCase())
    );
  }, [allPersonnel]);

  // Helper penentu Ketua Regu (Chief) dari daftar personel regu
  const findTeamChief = useCallback((members) => {
    return (
      members.find((p) => {
        const rank = String(p.rank_position || '').toLowerCase();
        return (
          (rank.includes('chief') || rank.includes('ketua')) &&
          !rank.includes('assistant') &&
          !rank.includes('asisten') &&
          !rank.includes('wakil')
        );
      }) || null
    );
  }, []);

  // Kalkulasi Komposisi 4 Regu Operasional & Status Kepegawaian (Organik vs Outsourcing/Training)
  const personnelComposition = useMemo(() => {
    const onDutyDeployments = deployments.filter((d) => d.deployment_type !== 'absent');
    const absentDeployments =
      absents.length > 0 ? absents : deployments.filter((d) => d.deployment_type === 'absent');

    // Cuti personel untuk regu shift saat ini
    const activeTeamAbsentList =
      absentDeployments.length > 0
        ? absentDeployments
        : allLeaves.filter(
            (l) => cleanTeam(l.personnel_team || '').toLowerCase() === currentTeam.toLowerCase()
          );

    // Cuti seluruh personel dari semua 4 regu pada tanggal hari ini (Alpha, Bravo, Charlie, Delta)
    const combinedAllLeavesMap = new Map();
    allLeaves.forEach((l) => {
      if (l.personnel_id) {
        combinedAllLeavesMap.set(Number(l.personnel_id), {
          id: l.id,
          personnel_id: l.personnel_id,
          personnel_name: l.personnel_name || l.full_name,
          personnel_nip: l.personnel_nip || l.nip,
          personnel_team: l.personnel_team || l.shift_team,
          personnel_role: l.personnel_role || l.rank_position,
          absent_reason: l.absent_reason || 'cuti',
          notes: l.notes || l.raw_notes || '-',
          start_date: l.start_date,
          end_date: l.end_date,
        });
      }
    });

    absentDeployments.forEach((d) => {
      if (d.personnel_id && !combinedAllLeavesMap.has(Number(d.personnel_id))) {
        combinedAllLeavesMap.set(Number(d.personnel_id), {
          id: d.id,
          personnel_id: d.personnel_id,
          personnel_name: d.full_name || d.personnel_name,
          personnel_nip: d.nip || d.personnel_nip,
          personnel_team: d.personnel_team || currentTeam,
          personnel_role: d.rank_position || d.personnel_role,
          absent_reason: d.absent_reason || 'cuti',
          notes: d.notes || '-',
          start_date: activeDate,
          end_date: activeDate,
        });
      }
    });

    const combinedAllLeaves = Array.from(combinedAllLeavesMap.values());
    const totalAllAbsentCount = Math.max(combinedAllLeaves.length, activeTeamAbsentList.length);
    const activeTeamAbsentCount = activeTeamAbsentList.length;

    const byTeam = TEAMS.map((teamName) => {
      const members = operationalPersonnel.filter(
        (p) => cleanTeam(p.team_group).toLowerCase() === teamName.toLowerCase()
      );
      const organikMembers = members.filter(
        (p) => String(p.employment_status || 'organik').toLowerCase() === 'organik'
      );
      const outsourcingMembers = members.filter(
        (p) => String(p.employment_status || '').toLowerCase() === 'outsourcing'
      );
      const chief = findTeamChief(members);
      const isCurrentShiftTeam = teamName.toLowerCase() === currentTeam.toLowerCase();

      const teamOnDutyCount = isCurrentShiftTeam
        ? onDutyDeployments.length
        : onDutyDeployments.filter(
            (d) => cleanTeam(d.personnel_team || '').toLowerCase() === teamName.toLowerCase()
          ).length;

      const teamAbsentCount = isCurrentShiftTeam
        ? activeTeamAbsentCount
        : combinedAllLeaves.filter(
            (l) => cleanTeam(l.personnel_team || '').toLowerCase() === teamName.toLowerCase()
          ).length;

      return {
        team: teamName,
        total: members.length,
        organik: organikMembers.length,
        outsourcing: outsourcingMembers.length,
        chiefName: chief?.full_name || null,
        dutySchedule: dailyRoster?.duties?.[teamName] || '-',
        isCurrentShiftTeam,
        onDutyCount: teamOnDutyCount,
        absentCount: teamAbsentCount,
        members,
      };
    });

    const activeTeamStats =
      byTeam.find((t) => t.team.toLowerCase() === currentTeam.toLowerCase()) || {
        team: currentTeam,
        total: 0,
        organik: 0,
        outsourcing: 0,
        chiefName: null,
        members: [],
      };

    const totalAllTeams = operationalPersonnel.length;
    const totalAllOrganik = operationalPersonnel.filter(
      (p) => String(p.employment_status || 'organik').toLowerCase() === 'organik'
    ).length;
    const totalAllOutsourcing = operationalPersonnel.filter(
      (p) => String(p.employment_status || '').toLowerCase() === 'outsourcing'
    ).length;

    return {
      byTeam,
      activeTeamStats,
      totalAllTeams,
      totalAllOrganik,
      totalAllOutsourcing,
      onDutyCount: onDutyDeployments.length,
      absentCount: activeTeamAbsentCount,
      totalAllAbsentCount,
      activeTeamAbsentCount,
      onDutyDeployments,
      absentDeployments: activeTeamAbsentList,
      allLeaves: combinedAllLeaves,
    };
  }, [operationalPersonnel, deployments, absents, allLeaves, currentTeam, dailyRoster, findTeamChief, activeDate]);

  // Nama Ketua Regu (Chief) dinamis untuk shift aktif
  const supervisorName = useMemo(() => {
    return (
      shiftInfo?.supervisor_name ||
      personnelComposition.activeTeamStats?.chiefName ||
      deployments.find(
        (d) =>
          d.rank_position?.toLowerCase().includes('chief') &&
          !d.rank_position?.toLowerCase().includes('assistant')
      )?.full_name ||
      'Belum Ditentukan'
    );
  }, [shiftInfo, personnelComposition.activeTeamStats, deployments]);

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

  const openPersonnelModal = (initialTeam = 'ALL') => {
    setSelectedTeamTab(initialTeam);
    setActiveModal({ type: 'personnel', initialTeam });
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

  // Anggota yang ditampilkan pada Modal Layer 2 Personel sesuai tab regu yang dipilih
  const filteredModalPersonnel = useMemo(() => {
    const list =
      selectedTeamTab === 'ALL'
        ? operationalPersonnel
        : operationalPersonnel.filter(
            (p) => cleanTeam(p.team_group).toLowerCase() === selectedTeamTab.toLowerCase()
          );

    return [...list].sort((a, b) => {
      const teamCmp = cleanTeam(a.team_group).localeCompare(cleanTeam(b.team_group));
      if (teamCmp !== 0) return teamCmp;
      const aChief =
        String(a.rank_position || '').toLowerCase().includes('chief') &&
        !String(a.rank_position || '').toLowerCase().includes('assistant');
      const bChief =
        String(b.rank_position || '').toLowerCase().includes('chief') &&
        !String(b.rank_position || '').toLowerCase().includes('assistant');
      if (aChief && !bChief) return -1;
      if (!aChief && bChief) return 1;
      return String(a.full_name || '').localeCompare(String(b.full_name || ''));
    });
  }, [operationalPersonnel, selectedTeamTab]);

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
          {/* Panel Kanan Atas: Komposisi Anggota 4 Regu (UKURAN FIX h-[312px]) */}
          <div className="h-[312px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Komposisi Personel Regu Operasional
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Rincian jumlah anggota regu, personel sedang shift, dan status Organik / Outsourcing (Training)
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                4 Regu Dinas
              </span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Memuat komposisi personel regu...
                </div>
              ) : (
                personnelComposition.byTeam.map((tStat) => (
                  <div
                    key={String(tStat.team)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPersonnelModal(tStat.team)}
                    onKeyDown={(e) =>
                      handleInteractiveKeyDown(e, () => openPersonnelModal(tStat.team))
                    }
                    className={`px-4 py-2.5 hover:bg-slate-50 transition-colors duration-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50 ${
                      tStat.isCurrentShiftTeam ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                          tStat.isCurrentShiftTeam
                            ? 'bg-emerald-700 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {tStat.team.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Regu {tStat.team}</span>
                          {tStat.isCurrentShiftTeam ? (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Sedang Shift
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              Jadwal: {typeof tStat.dutySchedule === 'string' ? tStat.dutySchedule : String(tStat.dutySchedule || '-')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          Chief: <span className="text-slate-700 font-medium">{typeof tStat.chiefName === 'string' ? tStat.chiefName : '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center shrink-0 text-[11px] font-mono tabular-nums">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                        Total: {tStat.total}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                        Organik: {tStat.organik}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                        Outsourcing: {tStat.outsourcing}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 shrink-0">
              <span className="font-medium text-slate-700">
                Total Kekuatan 4 Regu:{' '}
                <strong className="font-mono text-slate-900 font-bold">
                  {personnelComposition.totalAllTeams} Personel
                </strong>
              </span>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span>
                  Organik: <strong className="text-blue-800 font-bold">{personnelComposition.totalAllOrganik}</strong>
                </span>
                <span>
                  Outsourcing (Training): <strong className="text-amber-800 font-bold">{personnelComposition.totalAllOutsourcing}</strong>
                </span>
              </div>
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
