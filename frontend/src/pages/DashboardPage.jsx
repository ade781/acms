import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  TEAMS,
  cleanTeam,
  formatIndoDate,
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
  const [rawDeploymentPayload, setRawDeploymentPayload] = useState(null);
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

        // 7 Pemanggilan API Terpadu untuk operasional, formasi shift, dan data 4 regu dinas
        const [vRes, depRes, actRes, annRes, incRes, pRes, leaveRes] = await Promise.allSettled([
          api.get(`/readiness/vehicles?${queryParams}`, { signal }),
          api.get(`/deployments/current?${queryParams}`, { signal }),
          api.get(`/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${teamParam}`, { signal }),
          api.get('/announcements', { signal }),
          api.get('/incidents?limit=15', { signal }),
          api.get('/personnel?is_active=1&compact=true', { signal }),
          api.get(`/deployments/leave-history?date=${activeDate}`, { signal }),
        ]);

        const allResults = [vRes, depRes, actRes, annRes, incRes, pRes, leaveRes];
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

        // 6. Data Master Personel 4 Regu Operasional
        if (pRes.status === 'fulfilled' && pRes.value?.data) {
          const pPayload = pRes.value.data.data || pRes.value.data;
          const pList = Array.isArray(pPayload?.personnel)
            ? pPayload.personnel
            : Array.isArray(pPayload)
              ? pPayload
              : [];
          setAllPersonnel(pList);
        } else {
          setAllPersonnel([]);
        }

        // 7. Data Riwayat Cuti Seluruh Regu pada Hari Ini
        if (leaveRes.status === 'fulfilled' && leaveRes.value?.data) {
          const lPayload = leaveRes.value.data.data || leaveRes.value.data;
          const lList = Array.isArray(lPayload?.leaves)
            ? lPayload.leaves
            : Array.isArray(lPayload)
              ? lPayload
              : [];
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

  const dailyRoster = useMemo(() => getDailyRoster(activeDate), [activeDate]);

  // Personel operasional murni 4 Regu Dinas (Alpha, Bravo, Charlie, Delta)
  const operationalPersonnel = useMemo(() => {
    return (Array.isArray(allPersonnel) ? allPersonnel : []).filter((p) =>
      TEAMS.some((t) => t.toLowerCase() === cleanTeam(p?.team_group || '').toLowerCase())
    );
  }, [allPersonnel]);

  // Helper penentu Ketua Regu (Chief) dari daftar personel regu
  const findTeamChief = useCallback((members) => {
    return (
      (Array.isArray(members) ? members : []).find((p) => {
        const rank = String(p?.rank_position || '').toLowerCase();
        const role = String(p?.user_role || p?.role || '').toLowerCase();
        return (
          (role === 'chief' || role === 'supervisor' || rank.includes('chief') || rank.includes('ketua')) &&
          !rank.includes('assistant') &&
          !rank.includes('asisten') &&
          !rank.includes('wakil') &&
          role !== 'chief_assistant'
        );
      }) || null
    );
  }, []);

  // Kalkulasi Komposisi 4 Regu Operasional & Status Kepegawaian (Organik vs Outsourcing/Training)
  const personnelComposition = useMemo(() => {
    const onDutyDeployments = (Array.isArray(deployments) ? deployments : []).filter(
      (d) => d && d.deployment_type !== 'absent'
    );
    const absentDeployments =
      (Array.isArray(absents) && absents.length > 0)
        ? absents
        : (Array.isArray(deployments) ? deployments : []).filter((d) => d && d.deployment_type === 'absent');

    // Cuti personel untuk regu shift saat ini
    const activeTeamAbsentList =
      absentDeployments.length > 0
        ? absentDeployments
        : (Array.isArray(allLeaves) ? allLeaves : []).filter(
          (l) => cleanTeam(l?.personnel_team || '').toLowerCase() === currentTeam.toLowerCase()
        );

    // Cuti seluruh personel dari semua 4 regu pada tanggal hari ini (Alpha, Bravo, Charlie, Delta)
    const combinedAllLeavesMap = new Map();
    (Array.isArray(allLeaves) ? allLeaves : []).forEach((l) => {
      if (l?.personnel_id) {
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
      if (d?.personnel_id && !combinedAllLeavesMap.has(Number(d.personnel_id))) {
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
        (p) => cleanTeam(p?.team_group || '').toLowerCase() === teamName.toLowerCase()
      );
      const organikMembers = members.filter(
        (p) => String(p?.employment_status || 'organik').toLowerCase() === 'organik'
      );
      const outsourcingMembers = members.filter(
        (p) => String(p?.employment_status || '').toLowerCase() === 'outsourcing'
      );
      const chief = findTeamChief(members);
      const isCurrentShiftTeam = teamName.toLowerCase() === currentTeam.toLowerCase();

      const teamOnDutyCount = isCurrentShiftTeam
        ? onDutyDeployments.length
        : onDutyDeployments.filter(
          (d) => cleanTeam(d?.personnel_team || '').toLowerCase() === teamName.toLowerCase()
        ).length;

      const teamAbsentCount = isCurrentShiftTeam
        ? activeTeamAbsentCount
        : combinedAllLeaves.filter(
          (l) => cleanTeam(l?.personnel_team || '').toLowerCase() === teamName.toLowerCase()
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
        total: onDutyDeployments.length + activeTeamAbsentCount,
        organik: onDutyDeployments.length,
        outsourcing: 0,
        chiefName: shiftInfo?.supervisor_name || null,
        members: onDutyDeployments,
      };

    const totalAllTeams = operationalPersonnel.length || byTeam.reduce((acc, t) => acc + t.total, 0);
    const totalAllOrganik = operationalPersonnel.filter(
      (p) => String(p?.employment_status || 'organik').toLowerCase() === 'organik'
    ).length || byTeam.reduce((acc, t) => acc + t.organik, 0);
    const totalAllOutsourcing = operationalPersonnel.filter(
      (p) => String(p?.employment_status || '').toLowerCase() === 'outsourcing'
    ).length || byTeam.reduce((acc, t) => acc + t.outsourcing, 0);

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
  }, [operationalPersonnel, deployments, absents, allLeaves, currentTeam, dailyRoster, findTeamChief, activeDate, shiftInfo]);

  // Nama Ketua Regu (Chief) dinamis untuk shift aktif
  const supervisorName = useMemo(() => {
    // 1. Dari shiftInfo jika sudah ada sesi shift tersimpan
    if (shiftInfo?.supervisor_name) {
      return shiftInfo.supervisor_name;
    }

    // 2. Dari deployments jika Chief sudah diploting
    const deployedChief = (Array.isArray(deployments) ? deployments : []).find((d) => {
      const rank = String(d?.rank_position || '').toLowerCase();
      const role = String(d?.user_role || d?.role || '').toLowerCase();
      return (
        (role === 'chief' || role === 'supervisor' || rank.includes('chief') || rank.includes('ketua')) &&
        !rank.includes('assistant') &&
        !rank.includes('asisten') &&
        !rank.includes('wakil') &&
        role !== 'chief_assistant'
      );
    });
    if (deployedChief?.full_name || deployedChief?.personnel_name) {
      return deployedChief.full_name || deployedChief.personnel_name;
    }

    // 3. Fallback cerdas: Ambil Ketua Regu (Chief) resmi dari regu yang sedang bertugas
    const activeTeamKey = cleanTeam(currentTeam || '').toLowerCase();
    const activeTeamStats = personnelComposition?.byTeam?.find(
      (t) => cleanTeam(t?.team || '').toLowerCase() === activeTeamKey
    );
    if (activeTeamStats?.chiefName) {
      return activeTeamStats.chiefName;
    }

    const teamMembers = (operationalPersonnel || []).filter(
      (p) => cleanTeam(p?.team_group || '').toLowerCase() === activeTeamKey
    );
    const officialTeamChief = findTeamChief(teamMembers);
    if (officialTeamChief?.full_name || officialTeamChief?.name) {
      return officialTeamChief.full_name || officialTeamChief.name;
    }

    return 'Belum Ditentukan';
  }, [shiftInfo, deployments, personnelComposition, operationalPersonnel, currentTeam, findTeamChief]);

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
      operationalPersonnel.length > 0
        ? operationalPersonnel
        : Array.isArray(deployments)
          ? deployments
          : [];
    const filtered =
      !selectedTeamTab || selectedTeamTab === 'ALL'
        ? list
        : list.filter(
          (p) =>
            cleanTeam(p?.team_group || p?.personnel_team || '').toLowerCase() ===
            selectedTeamTab.toLowerCase()
        );

    return [...filtered].sort((a, b) => {
      const aChief =
        String(a?.rank_position || '').toLowerCase().includes('chief') &&
        !String(a?.rank_position || '').toLowerCase().includes('assistant');
      const bChief =
        String(b?.rank_position || '').toLowerCase().includes('chief') &&
        !String(b?.rank_position || '').toLowerCase().includes('assistant');
      if (aChief && !bChief) return -1;
      if (!aChief && bChief) return 1;
      return String(a?.full_name || a?.personnel_name || '').localeCompare(
        String(b?.full_name || b?.personnel_name || '')
      );
    });
  }, [operationalPersonnel, deployments, selectedTeamTab]);

  return (
    <div className="space-y-5 font-sans text-slate-800">
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
        loading={loading}
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
          {/* Panel Kanan Atas: Komposisi Anggota 4 Regu (UKURAN FIX h-[312px], 4 BARIS PROPORSIONAL) */}
          <div className="h-[312px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50/50 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Komposisi Personel Regu Operasional
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                <span className="font-mono tabular-nums font-bold">4</span> Regu Dinas
              </span>
            </div>

            {loading ? (
              <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                Memuat komposisi personel regu...
              </div>
            ) : (
              <div className="flex-1 grid grid-rows-4 divide-y divide-slate-100">
                {personnelComposition.byTeam.map((tStat) => (
                  <div
                    key={String(tStat.team)}
                    role="button"
                    tabIndex={0}
                    onClick={() => openPersonnelModal(tStat.team)}
                    onKeyDown={(e) =>
                      handleInteractiveKeyDown(e, () => openPersonnelModal(tStat.team))
                    }
                    className={`px-4 flex items-center justify-between gap-2 text-xs cursor-pointer hover:bg-slate-50 transition-colors duration-100 focus-visible:outline-none focus-visible:bg-slate-50 ${
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
                          <span className="font-bold text-slate-900 text-sm">
                            Regu {tStat.team}
                          </span>
                          {tStat.isCurrentShiftTeam ? (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Sedang Shift
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              Jadwal: {typeof tStat.dutySchedule === 'string' ? tStat.dutySchedule : String(tStat.dutySchedule || '-')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          Chief: <span className="text-slate-700 font-medium">{typeof tStat.chiefName === 'string' ? tStat.chiefName : '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 text-xs font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                        Total: <span className="font-mono tabular-nums font-bold">{tStat.total}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                        Organik: <span className="font-mono tabular-nums font-bold">{tStat.organik}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                        Outsourcing: <span className="font-mono tabular-nums font-bold">{tStat.outsourcing}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
              <span className="font-medium text-slate-700">
                Total Kekuatan 4 Regu:{' '}
                <strong className="font-mono tabular-nums text-slate-900 font-bold">
                  {personnelComposition.totalAllTeams}
                </strong>{' '}
                Personel
              </span>
              <div className="flex items-center gap-3">
                <span>
                  Organik:{' '}
                  <strong className="font-mono tabular-nums text-blue-800 font-bold">
                    {personnelComposition.totalAllOrganik}
                  </strong>
                </span>
                <span>
                  Outsourcing (Training):{' '}
                  <strong className="font-mono tabular-nums text-amber-800 font-bold">
                    {personnelComposition.totalAllOutsourcing}
                  </strong>
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
              </div>
              <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                <span className="font-mono tabular-nums font-bold">{incidents.length}</span> Laporan
              </span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
              {loading ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  Memuat daftar laporan insiden operasional...
                </div>
              ) : incidents.length === 0 ? (
                <div className="h-full flex items-center justify-center px-4 text-center text-xs text-slate-500">
                  Belum ada laporan insiden operasional yang tercatat.
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
                          <span className="font-mono tabular-nums text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {inc.report_number}
                          </span>
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {typeof inc.title === 'string' ? inc.title : String(inc.title || '')}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          Lokasi: <span className="text-slate-700 font-medium">{typeof inc.location === 'string' ? inc.location : '-'}</span> •{' '}
                          {formatIndoDate(inc.incident_date, { shortMonth: true })} (
                          <span className="font-mono tabular-nums">
                            {String(inc.incident_time || '-').slice(0, 5)}
                          </span>{' '}
                          WIB)
                        </div>
                      </div>

                      <div className="shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${isResolved
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
        getShiftLabel={getShiftLabel}
        getShiftHours={getShiftHours}
        formatIncidentCategory={formatIncidentCategory}
        formatIncidentStatus={formatIncidentStatus}
      />
    </div>
  );
}
