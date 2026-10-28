import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock,
  UserX,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Truck,
  HelpCircle,
  AlertCircle,
  UserCheck,
  Bell,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
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
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

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

        const [vRes, wRes, depRes, actRes, pRes, annRes, incRes] = await Promise.allSettled([
          api.get(`/readiness/vehicles?${queryParams}`, { signal }),
          api.get(`/readiness/watchroom?${queryParams}`, { signal }),
          api.get(`/deployments/current?${queryParams}`, { signal }),
          api.get(`/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${teamParam}`, { signal }),
          api.get('/personnel?is_active=1&compact=true', { signal }),
          api.get('/announcements', { signal }),
          api.get('/incidents?limit=15', { signal }),
        ]);

        const allResults = [vRes, wRes, depRes, actRes, pRes, annRes, incRes];
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
        ? absentDeployments.length
        : absentDeployments.filter(
            (d) => cleanTeam(d.personnel_team || '').toLowerCase() === teamName.toLowerCase()
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
      absentCount: absentDeployments.length,
      onDutyDeployments,
      absentDeployments,
    };
  }, [operationalPersonnel, deployments, absents, currentTeam, dailyRoster, findTeamChief]);

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Scorecard 1: Status Dinas, Jam Shift, & Ketua Regu */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal({ type: 'shift' })}
          onKeyDown={(e) => handleInteractiveKeyDown(e, () => setActiveModal({ type: 'shift' }))}
          className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Regu & Pimpinan Shift</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-xl font-bold text-slate-900">Regu {String(currentTeam || '')}</div>
              <span className="text-[11px] font-mono tabular-nums font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {getShiftHours(activeShiftNumber)}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Ketua Regu:</span>
            <span className="font-semibold text-slate-900 truncate max-w-[160px]">
              {typeof supervisorName === 'string' ? supervisorName : (supervisorName?.full_name || 'Belum Ditentukan')}
            </span>
          </div>
        </div>

        {/* Scorecard 2: Pengumuman Terbaru (Hanya Judul & Ringkasan) */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal({ type: 'announcement', item: latestAnnouncement })}
          onKeyDown={(e) =>
            handleInteractiveKeyDown(e, () =>
              setActiveModal({ type: 'announcement', item: latestAnnouncement })
            )
          }
          className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Pengumuman Terbaru</span>
              <Bell className="w-4 h-4 text-blue-600" />
            </div>
            {latestAnnouncement ? (
              <>
                <div className="text-sm font-bold text-slate-900 line-clamp-1">
                  {typeof latestAnnouncement.title === 'string' ? latestAnnouncement.title : String(latestAnnouncement.title || '')}
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-snug">
                  {typeof latestAnnouncement.description === 'string'
                    ? latestAnnouncement.description
                    : (latestAnnouncement.circular_number
                      ? `Surat Edaran: ${latestAnnouncement.circular_number}`
                      : 'Klik untuk membaca dokumen pengumuman.')}
                </p>
              </>
            ) : (
              <div className="py-1">
                <div className="text-sm font-bold text-slate-500">Belum Ada Pengumuman</div>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                  Tidak ada surat edaran atau pengumuman aktif.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Scorecard 3: Personel Izin / Cuti Shift Berjalan */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal({ type: 'leave' })}
          onKeyDown={(e) => handleInteractiveKeyDown(e, () => setActiveModal({ type: 'leave' }))}
          className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Personel Izin / Cuti</span>
              <UserX className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {personnelComposition.absentCount}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Anggota Regu {String(currentTeam || '')}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="truncate">
              {personnelComposition.absentCount > 0
                ? `${personnelComposition.absentCount} personel tercatat izin/cuti`
                : 'Tidak ada personel izin/cuti'}
            </span>
          </div>
        </div>

        {/* Scorecard 4: Agenda & Log Kegiatan Shift */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveModal({ type: 'activities' })}
          onKeyDown={(e) => handleInteractiveKeyDown(e, () => setActiveModal({ type: 'activities' }))}
          className="h-[118px] bg-white rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/60 p-4 transition-colors duration-100 cursor-pointer flex flex-col justify-between overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          <div>
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-semibold text-slate-600">Agenda & Log Kegiatan</span>
              <Activity className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {activities.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Kegiatan Shift Ini</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="truncate">
              {activities.length > 0
                ? `Terbaru: ${typeof activities[0]?.title === 'string' ? activities[0].title : (typeof activities[0]?.activity_name === 'string' ? activities[0].activity_name : 'Kegiatan Operasional')}`
                : 'Belum ada kegiatan tercatat'}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN SECTION: SEMUA CONTAINER UKURAN FIX & SEJAJAR RATA ATAS-BAWAH
             Kiri: h-[564px] | Kanan: h-[312px] + gap-5 (20px) + h-[232px] = 564px
          ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* KIRI (lg:col-span-6): KESIAPAN ARMADA & POSKO OPERASIONAL (UKURAN FIX h-[564px]) */}
        <div className="lg:col-span-6 h-[564px] bg-white rounded-xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Kesiapan Armada & Posko Operasional
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Status kelaikan fisik dan penanggung jawab unit (PIC) shift berjalan
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
              {fleetMetrics.serviceable}/{fleetMetrics.total} Siap Operasi
            </span>
          </div>

          {/* Daftar Baris Kompak Armada (Volume Tetap flex-1 overflow-y-auto) */}
          <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Memuat data kesiapan armada dan posko...
              </div>
            ) : vehicles.length === 0 ? (
              <div className="h-full flex items-center justify-center px-4 text-center text-xs text-slate-500">
                Belum ada unit armada operasional yang terdaftar di database.
              </div>
            ) : (
              vehicles.map((vehicle) => {
                const vId = vehicle.id || vehicle.vehicle_id;
                const status = vehicle.status || vehicle.readiness || 'belum_dilaporkan';
                const isUnserviceable = status === 'unserviceable';
                const isServiceable = status === 'serviceable';
                const isPosko = vehicle.category === 'posko' || vehicle.code_name === 'WATCHROOM';

                const picName = isPosko
                  ? vehicle.pic_name ||
                    vehicleDeploymentDetails.picMap['watchroom'] ||
                    watchroomLog?.inspector_name ||
                    'Belum Ditunjuk'
                  : vehicle.pic_name ||
                    vehicleDeploymentDetails.picMap[vId] ||
                    'Belum Ditunjuk';

                return (
                  <div
                    key={vId || vehicle.code_name || `vehicle-${vehicle.id || Math.random()}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveModal({ type: 'vehicle_item', item: vehicle })}
                    onKeyDown={(e) =>
                      handleInteractiveKeyDown(e, () =>
                        setActiveModal({ type: 'vehicle_item', item: vehicle })
                      )
                    }
                    className="px-4 py-3 hover:bg-slate-50 transition-colors duration-100 flex items-center justify-between gap-3 text-xs cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50"
                  >
                    {/* Sisi Kiri: Ikon, Nama Kendaraan & Nama PIC tepat di bawahnya */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isUnserviceable
                            ? 'bg-red-50 text-red-700'
                            : isServiceable
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isPosko ? (
                          <Radio className="w-3.5 h-3.5" />
                        ) : (
                          <Truck className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate leading-tight">
                          {vehicle.vehicle_name || vehicle.code_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          PIC: <span className="text-slate-700 font-medium">{typeof picName === 'string' ? picName : (picName?.name || 'Belum Ditunjuk')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sisi Kanan: Badge Status Kelaikan */}
                    <div className="shrink-0">
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
        </div>

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
              <span className="text-xs font-mono tabular-nums font-bold text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shrink-0">
                {personnelComposition.totalAllTeams} Anggota
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
                              Sedang Shift ({tStat.onDutyCount} Hadir)
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
              <span>
                Sedang Shift Ini:{' '}
                <strong className="font-mono text-emerald-800">
                  {personnelComposition.onDutyCount} / {personnelComposition.activeTeamStats.total}
                </strong>{' '}
                (Regu {currentTeam})
              </span>
              <div className="flex items-center gap-3 font-mono tabular-nums">
                <span>
                  Organik: <strong className="text-blue-800">{personnelComposition.totalAllOrganik}</strong>
                </span>
                <span>
                  Outsourcing (Training): <strong className="text-amber-800">{personnelComposition.totalAllOutsourcing}</strong>
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
                {incidents.slice(0, 3).length} Laporan
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

      {/* 1. MODAL LAYER 2: PENGUMUMAN TERBARU & DAFTAR SURAT EDARAN */}
      <Modal
        isOpen={activeModal?.type === 'announcement'}
        onClose={() => setActiveModal(null)}
        title={typeof activeModal?.item?.title === 'string' ? activeModal.item.title : 'Pengumuman Operasional'}
        subtitle={
          activeModal?.item
            ? `${activeModal.item.circular_number ? `No. Edaran: ${activeModal.item.circular_number} • ` : ''}Diterbitkan: ${formatIndoDate(activeModal.item.published_date)}`
            : 'Informasi surat edaran dinas'
        }
        maxWidth="max-w-2xl"
        footer={
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Tutup
          </Button>
        }
      >
        {!activeModal?.item ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Belum ada pengumuman atau surat edaran operasional yang diterbitkan.
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2">
              <div className="text-[11px] font-semibold text-slate-500">Ringkasan / Isi Pengumuman</div>
              <p className="text-slate-800 leading-relaxed whitespace-pre-line">
                {typeof activeModal.item.description === 'string' ? activeModal.item.description : 'Tidak ada ringkasan teks tambahan.'}
              </p>
            </div>

            {activeModal.item.id && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                <div>
                  <div className="font-semibold text-slate-900">
                    {activeModal.item.file_name || 'Lampiran Surat Edaran Resmi (PDF)'}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Diterbitkan oleh: {activeModal.item.creator_name || 'Manajemen ARFF'}
                  </div>
                </div>
                <a
                  href={getAttachmentUrl(`/api/announcements/${activeModal.item.id}/file`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <span>Buka Dokumen</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {announcements.length > 1 && (
              <div className="pt-2 border-t border-slate-200">
                <div className="font-bold text-slate-800 mb-2">
                  Arsip Pengumuman Sebelumnya ({announcements.length - 1})
                </div>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg max-h-[200px] overflow-y-auto">
                  {announcements.slice(1).map((ann, annIdx) => (
                    <div
                      key={ann.id || `ann-${annIdx}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveModal({ type: 'announcement', item: ann })}
                      onKeyDown={(e) =>
                        handleInteractiveKeyDown(e, () =>
                          setActiveModal({ type: 'announcement', item: ann })
                        )
                      }
                      className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{ann.title}</div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {ann.description || ann.circular_number || '-'}
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0">
                        {formatIndoDate(ann.published_date, { shortMonth: true })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* 2. MODAL LAYER 2: KOMPOSISI PERSONEL REGU (ORGANIK VS OUTSOURCING/TRAINING & STATUS SHIFT) */}
      <Modal
        isOpen={activeModal?.type === 'personnel'}
        onClose={() => setActiveModal(null)}
        title="Rincian Kekuatan & Komposisi Personel Regu"
        subtitle={`Data anggota aktif 4 regu operasional, status shift (${getShiftLabel(activeShiftNumber)}), serta rincian Organik dan Outsourcing (Training)`}
        maxWidth="max-w-4xl"
        footer={
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Tutup
          </Button>
        }
      >
        <div className="space-y-4">
          {/* Tab Filter Regu */}
          <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setSelectedTeamTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                selectedTeamTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua 4 Regu ({personnelComposition.totalAllTeams})
            </button>
            {personnelComposition.byTeam.map((t) => (
              <button
                key={t.team}
                type="button"
                onClick={() => setSelectedTeamTab(t.team)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  selectedTeamTab === t.team
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>Regu {t.team}</span>
                <span className="font-mono text-[11px] opacity-80">({t.total})</span>
              </button>
            ))}
          </div>

          {/* Ringkasan Angka Sesuai Tab yang Dipilih */}
          {(() => {
            const selectedStat =
              selectedTeamTab === 'ALL'
                ? {
                    label: 'Gabungan 4 Regu (Alpha, Bravo, Charlie, Delta)',
                    total: personnelComposition.totalAllTeams,
                    onShift: personnelComposition.onDutyCount,
                    organik: personnelComposition.totalAllOrganik,
                    outsourcing: personnelComposition.totalAllOutsourcing,
                  }
                : (() => {
                    const found = personnelComposition.byTeam.find((x) => x.team === selectedTeamTab);
                    return {
                      label: `Regu ${selectedTeamTab}`,
                      total: found?.total || 0,
                      onShift: found?.onDutyCount || 0,
                      organik: found?.organik || 0,
                      outsourcing: found?.outsourcing || 0,
                    };
                  })();

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-[11px] text-slate-500">Total Anggota Regu</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                    {selectedStat.total}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{selectedStat.label}</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
                  <div className="text-[11px] text-emerald-800">Sedang Shift Saat Ini</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-emerald-900 mt-0.5">
                    {selectedStat.onShift}
                  </div>
                  <div className="text-[10px] text-emerald-700">
                    Regu Bertugas: Regu {currentTeam}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
                  <div className="text-[11px] text-blue-800">Status Organik</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-blue-900 mt-0.5">
                    {selectedStat.organik}
                  </div>
                  <div className="text-[10px] text-blue-700">Karyawan Tetap</div>
                </div>
                <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
                  <div className="text-[11px] text-amber-800">Outsourcing (Training)</div>
                  <div className="text-xl font-bold font-mono tabular-nums text-amber-900 mt-0.5">
                    {selectedStat.outsourcing}
                  </div>
                  <div className="text-[10px] text-amber-700">Personel Kontrak / Training</div>
                </div>
              </div>
            );
          })()}

          {/* Tabel Daftar Anggota */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">No</th>
                    <th className="py-2.5 px-3 font-semibold">Nama Personel & NIP</th>
                    <th className="py-2.5 px-3 font-semibold">Regu</th>
                    <th className="py-2.5 px-3 font-semibold">Jabatan</th>
                    <th className="py-2.5 px-3 font-semibold">Status Kepegawaian</th>
                    <th className="py-2.5 px-3 font-semibold">Status Shift Ini</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredModalPersonnel.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Tidak ada data personel pada regu ini.
                      </td>
                    </tr>
                  ) : (
                    filteredModalPersonnel.map((person, index) => {
                      const isOrganik =
                        String(person.employment_status || 'organik').toLowerCase() === 'organik';
                      const dep = deploymentByPersonnelId.get(Number(person.id));
                      const isOnDuty = dep && dep.deployment_type !== 'absent';
                      const isAbsent = dep && dep.deployment_type === 'absent';

                      return (
                        <tr key={person.id || `person-${index}`} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-mono text-slate-400">{index + 1}</td>
                          <td className="py-2 px-3">
                            <div className="font-semibold text-slate-900">{typeof person.full_name === 'string' ? person.full_name : String(person.full_name || '')}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              NIP: {person.nip || '-'}
                            </div>
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            Regu {cleanTeam(person.team_group)}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {formatRoleName(person.rank_position)}
                          </td>
                          <td className="py-2 px-3">
                            {isOrganik ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                Organik
                              </span>
                            ) : (
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Outsourcing (Training)
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {isOnDuty ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <UserCheck className="w-3 h-3" />
                                <span>
                                  {dep.deployment_type === 'watchroom'
                                    ? 'Posko Watchroom'
                                    : dep.vehicle_code || dep.vehicle_name || 'Bertugas'}
                                  {dep.is_pic ? ' (PIC)' : ''}
                                </span>
                              </span>
                            ) : isAbsent ? (
                              <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Izin / Cuti ({dep.absent_reason || 'Cuti'})
                              </span>
                            ) : cleanTeam(person.team_group).toLowerCase() ===
                              currentTeam.toLowerCase() ? (
                              <span className="text-[11px] text-slate-400">Belum Diploting</span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Lepas Piket / Off</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* 3. MODAL LAYER 2: RINCIAN SHIFT & FORMASI REGU BERTUGAS */}
      <Modal
        isOpen={activeModal?.type === 'shift'}
        onClose={() => setActiveModal(null)}
        title={`Rincian Pelaksanaan ${getShiftLabel(activeShiftNumber)} • Regu ${currentTeam}`}
        subtitle={`${formatIndoDate(activeDate)} • Jam Operasional ${getShiftHours(activeShiftNumber)}`}
        maxWidth="max-w-2xl"
        footer={
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Tutup
          </Button>
        }
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px]">Ketua Regu (Chief)</div>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{supervisorName}</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px]">Kekuatan Shift Regu {currentTeam}</div>
              <div className="font-bold font-mono text-slate-900 text-sm mt-0.5">
                {personnelComposition.onDutyCount} Hadir / {personnelComposition.activeTeamStats.total} Anggota
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-slate-500 text-[11px]">Komposisi Regu {currentTeam}</div>
              <div className="font-bold font-mono text-slate-900 text-sm mt-0.5">
                {personnelComposition.activeTeamStats.organik} Organik •{' '}
                {personnelComposition.activeTeamStats.outsourcing} Outsourcing
              </div>
            </div>
          </div>

          {shiftInfo?.handover_notes && (
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
              <div className="font-bold text-amber-900 mb-1">Catatan Serah Terima Shift:</div>
              <p className="text-slate-700 leading-relaxed">{shiftInfo.handover_notes}</p>
            </div>
          )}

          <div>
            <h4 className="font-bold text-slate-900 mb-2">
              Daftar Penugasan Personel pada Shift Ini ({personnelComposition.onDutyDeployments.length} Orang)
            </h4>
            {personnelComposition.onDutyDeployments.length === 0 ? (
              <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                Belum ada personel yang diploting pada shift ini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {personnelComposition.onDutyDeployments.map((dep, i) => (
                  <div key={dep.id || `dep-${i}`} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-slate-900">
                        {typeof dep.full_name === 'string' ? dep.full_name : String(dep.full_name || '')}
                        {dep.is_pic ? (
                          <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            PIC Unit
                          </span>
                        ) : null}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        NIP: {dep.nip || '-'} •{' '}
                        {String(dep.employment_status || 'organik').toLowerCase() === 'organik'
                          ? 'Organik'
                          : 'Outsourcing (Training)'}
                      </div>
                    </div>
                    <div className="text-right font-medium text-slate-800">
                      {dep.deployment_type === 'watchroom'
                        ? 'Posko Watchroom'
                        : dep.vehicle_name || dep.vehicle_code || 'Unit Operasional'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 4. MODAL LAYER 2: DAFTAR PERSONEL IZIN / CUTI SHIFT INI */}
      <Modal
        isOpen={activeModal?.type === 'leave'}
        onClose={() => setActiveModal(null)}
        title={`Daftar Personel Izin / Cuti • Regu ${currentTeam}`}
        subtitle={`${formatIndoDate(activeDate)} • ${getShiftLabel(activeShiftNumber)}`}
        maxWidth="max-w-xl"
        footer={
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Tutup
          </Button>
        }
      >
        {personnelComposition.absentDeployments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Seluruh personel Regu {currentTeam} hadir lengkap (tidak ada catatan izin/cuti pada shift ini).
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
            {personnelComposition.absentDeployments.map((item, idx) => (
              <div key={item.id || `absent-${idx}`} className="p-3.5 flex items-start justify-between gap-3 bg-white">
                <div>
                  <div className="font-bold text-slate-900">{typeof item.full_name === 'string' ? item.full_name : String(item.full_name || '')}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    NIP: {item.nip || '-'} • {formatRoleName(item.rank_position)}
                  </div>
                  {item.notes && (
                    <div className="text-[11px] text-slate-600 mt-1">
                      Keterangan: {typeof item.notes === 'string' ? item.notes : String(item.notes)}
                    </div>
                  )}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                  {typeof item.absent_reason === 'string' ? item.absent_reason : 'Cuti / Izin'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 5. MODAL LAYER 2: DAFTAR LENGKAP KEGIATAN SHIFT */}
      <Modal
        isOpen={activeModal?.type === 'activities'}
        onClose={() => setActiveModal(null)}
        title={`Logbook Kegiatan Operasional • Regu ${currentTeam}`}
        subtitle={`${formatIndoDate(activeDate)} • ${getShiftLabel(activeShiftNumber)}`}
        maxWidth="max-w-2xl"
        footer={
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Tutup
          </Button>
        }
      >
        {activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            Belum ada kegiatan operasional yang dicatat pada shift ini.
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {activities.map((act, idx) => (
              <div
                key={act.id || `act-${idx}`}
                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-sm">
                    {typeof act.title === 'string' ? act.title : (typeof act.activity_name === 'string' ? act.activity_name : 'Kegiatan Operasional')}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700">
                      {act.activity_type || act.category || 'Rutin'}
                    </span>
                    <span className="font-mono font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      {String(act.activity_time || '-').slice(0, 5)} WIB
                    </span>
                  </div>
                </div>
                {act.description && (
                  <p className="text-slate-700 leading-relaxed">{act.description}</p>
                )}
                {act.result_notes && (
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-200/70">
                    <strong>Hasil / Tindak Lanjut:</strong> {act.result_notes}
                  </div>
                )}
                {act.attachment_url && (
                  <div className="pt-2">
                    <img
                      src={getAttachmentUrl(act.attachment_url)}
                      alt="Dokumentasi kegiatan"
                      className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* 6. MODAL LAYER 2: RINCIAN LAPORAN INSIDEN OPERASIONAL */}
      <Modal
        isOpen={activeModal?.type === 'incident_item' && Boolean(selectedIncidentDetail)}
        onClose={() => {
          setActiveModal(null);
          setSelectedIncidentDetail(null);
        }}
        title={
          selectedIncidentDetail
            ? `${selectedIncidentDetail.report_number} • ${selectedIncidentDetail.title}`
            : 'Rincian Laporan Insiden'
        }
        subtitle={
          selectedIncidentDetail
            ? `${formatIndoDate(selectedIncidentDetail.incident_date)} • Pukul ${String(selectedIncidentDetail.incident_time || '-').slice(0, 5)} WIB • Regu ${cleanTeam(selectedIncidentDetail.team_group || currentTeam)}`
            : ''
        }
        maxWidth="max-w-2xl"
        footer={
          <Button
            variant="outline"
            onClick={() => {
              setActiveModal(null);
              setSelectedIncidentDetail(null);
            }}
          >
            Tutup
          </Button>
        }
      >
        {selectedIncidentDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Kategori Insiden</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {formatIncidentCategory(selectedIncidentDetail.category)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Lokasi Kejadian</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedIncidentDetail.location || '-'}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] text-slate-500">Status Penanganan</div>
                <div className="font-bold text-slate-900 mt-0.5">
                  {formatIncidentStatus(selectedIncidentDetail.status)}
                </div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1">Kronologi Kejadian</div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed whitespace-pre-line">
                {selectedIncidentDetail.chronology || 'Tidak ada catatan kronologi.'}
              </div>
            </div>

            {selectedIncidentDetail.action_taken && (
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">
                  Tindakan Penanganan ARFF
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed whitespace-pre-line">
                  {selectedIncidentDetail.action_taken}
                </div>
              </div>
            )}

            {selectedIncidentDetail.last_condition && (
              <div>
                <div className="text-[11px] font-semibold text-slate-500 mb-1">Kondisi Terakhir</div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed">
                  {selectedIncidentDetail.last_condition}
                </div>
              </div>
            )}

            {loadingIncidentDetail ? (
              <div className="text-center text-slate-400 py-2">Memuat lampiran dokumentasi...</div>
            ) : (
              Array.isArray(selectedIncidentDetail.attachments) &&
              selectedIncidentDetail.attachments.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                    Dokumentasi Lapangan ({selectedIncidentDetail.attachments.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedIncidentDetail.attachments.map((att, idx) => (
                      <img
                        key={att.id || `att-${idx}`}
                        src={getAttachmentUrl(att.file_path || att.file_url)}
                        alt={att.file_name || `Dokumentasi insiden ${idx + 1}`}
                        className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-slate-50"
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Modal>

      {/* 7. MODAL LAYER 2: RINCIAN KENDARAAN / POSKO & KRU TERPLOTING */}
      <Modal
        isOpen={activeModal?.type === 'vehicle_item' && Boolean(activeModal?.item)}
        onClose={() => setActiveModal(null)}
        title={
          activeModal?.item?.vehicle_name ||
          activeModal?.item?.code_name ||
          'Rincian Unit Operasional'
        }
        subtitle={`Status Kelaikan & Kru Terploting • Regu ${currentTeam} (${getShiftLabel(activeShiftNumber)})`}
        maxWidth="max-w-xl"
        footer={
          <Button variant="outline" onClick={() => setActiveModal(null)}>
            Tutup
          </Button>
        }
      >
        {activeModal?.item &&
          (() => {
            const v = activeModal.item;
            const vId = v.id || v.vehicle_id;
            const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
            const status = v.status || v.readiness || 'belum_dilaporkan';
            const isServiceable = status === 'serviceable';
            const isUnserviceable = status === 'unserviceable';

            const crewList = isPosko
              ? vehicleDeploymentDetails.crewMap['watchroom'] || []
              : vehicleDeploymentDetails.crewMap[vId] || [];

            const picName = isPosko
              ? v.pic_name ||
                vehicleDeploymentDetails.picMap['watchroom'] ||
                watchroomLog?.inspector_name ||
                'Belum Ditunjuk'
              : v.pic_name || vehicleDeploymentDetails.picMap[vId] || 'Belum Ditunjuk';

            const notesText = v.justification || v.notes || (isPosko ? watchroomLog?.notes : null);
            const photoUrl = v.photo_webp_url || (isPosko ? watchroomLog?.photo_webp_url : null);

            return (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">Status Kelaikan Unit</div>
                    <div className="mt-1">
                      {isUnserviceable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span>Unserviceable (Kendala)</span>
                        </span>
                      ) : isServiceable ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Serviceable (Laik Operasi)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Belum Dicek Shift Ini</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="text-[11px] text-slate-500">Penanggung Jawab (PIC)</div>
                    <div className="font-bold text-slate-900 text-sm mt-1 truncate">{picName}</div>
                  </div>
                </div>

                {notesText && (
                  <div
                    className={`p-3 rounded-lg border ${
                      isUnserviceable
                        ? 'bg-red-50/60 border-red-200 text-red-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="font-bold mb-1">
                      {isUnserviceable ? 'Justifikasi / Kendala Teknis:' : 'Catatan Pemeriksaan:'}
                    </div>
                    <p className="leading-relaxed">{notesText}</p>
                  </div>
                )}

                <div>
                  <h4 className="font-bold text-slate-900 mb-2">
                    Kru Terploting pada Unit Ini ({crewList.length} Personel)
                  </h4>
                  {crewList.length === 0 ? (
                    <div className="py-5 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                      Belum ada personel yang diploting pada unit ini di shift berjalan.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                      {crewList.map((member, i) => (
                        <div
                          key={member.id || `member-${i}`}
                          className="px-3.5 py-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">
                              {typeof member.full_name === 'string' ? member.full_name : String(member.full_name || '')}
                              {member.is_pic ? (
                                <span className="ml-2 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  PIC
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              NIP: {member.nip || '-'} • {formatRoleName(member.rank_position)}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {String(member.employment_status || 'organik').toLowerCase() === 'organik'
                              ? 'Organik'
                              : 'Outsourcing (Training)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {photoUrl && (
                  <div>
                    <div className="text-[11px] font-semibold text-slate-500 mb-1">
                      Foto Bukti Pemeriksaan Fisik
                    </div>
                    <img
                      src={getAttachmentUrl(photoUrl)}
                      alt={`Bukti fisik ${v.vehicle_name || v.code_name}`}
                      className="w-full max-h-60 object-contain rounded-lg border border-slate-200 bg-slate-50"
                    />
                  </div>
                )}
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}
