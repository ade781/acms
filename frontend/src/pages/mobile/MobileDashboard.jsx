import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam, getScheduledTeam } from '../../utils/shiftHelper';

// Subcomponents
import MobileDutyCard from '../../components/mobile/dashboard/MobileDutyCard';
import MobilePicReadinessForm from '../../components/mobile/dashboard/MobilePicReadinessForm';
import MobileUnserviceableWidget from '../../components/mobile/dashboard/MobileUnserviceableWidget';
import MobileRecentAnnouncements from '../../components/mobile/dashboard/MobileRecentAnnouncements';
import MobileUnitAuditModal from '../../components/mobile/reports/MobileUnitAuditModal';

import { AlertTriangle } from 'lucide-react';

export default function MobileDashboard({ onNavigateToAnnouncements }) {
  const { user, token, activeDate, activeShiftNumber, activeTeam } = useAuth();

  const [errorMsg, setErrorMsg] = useState(null);

  // Data states
  const [deploymentsData, setDeploymentsData] = useState(null);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modal states
  const [auditVehicleId, setAuditVehicleId] = useState(null);

  const fetchDashboardData = useCallback(async (_isSilent = false, signal = null) => {
    setErrorMsg(null);

    const currentTeam = cleanTeam(activeTeam) || 'Alpha';

    try {
      // Pemangkasan payload (Temuan #15) & sinyal pembatalan (Temuan #9):
      // Eliminasi pemanggilan GET /personnel yang memuat full dossier 186 kB hanya untuk hitungan personel
      const [depRes, readRes, annRes] = await Promise.allSettled([
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal }),
        api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, { signal }),
        api.get('/announcements', { signal })
      ]);

      if (depRes.status === 'fulfilled') {
        setDeploymentsData(depRes.value.data?.data || depRes.value.data);
      } else if (depRes.reason?.name !== 'CanceledError' && depRes.reason?.name !== 'AbortError' && depRes.reason?.code !== 'ERR_CANCELED') {
        console.warn('Deployments fetch warning:', depRes.reason);
      }

      if (readRes.status === 'fulfilled') {
        const rData = readRes.value.data?.data || readRes.value.data;
        const vArr = Array.isArray(rData?.vehicles) ? rData.vehicles : (Array.isArray(rData) ? rData : []);
        setVehiclesList(vArr);
      } else if (readRes.reason?.name !== 'CanceledError' && readRes.reason?.name !== 'AbortError' && readRes.reason?.code !== 'ERR_CANCELED') {
        console.warn('Readiness fetch warning:', readRes.reason);
      }

      if (annRes.status === 'fulfilled') {
        const aData = annRes.value.data?.data || annRes.value.data;
        const aArr = Array.isArray(aData?.announcements) ? aData.announcements : (Array.isArray(aData) ? aData : []);
        setAnnouncements(aArr);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching mobile dashboard data:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memuat data operasional terbaru.'));
      setErrorMsg(msg);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(false, controller.signal);

    const handleDataUpdated = () => fetchDashboardData(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(true);
      }
    };

    window.addEventListener('arff:leave-updated', handleDataUpdated);
    window.addEventListener('arff:announcements-updated', handleDataUpdated);
    window.addEventListener('arff:deployments-updated', handleDataUpdated);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Polling berkala 30 detik agar perubahan penugasan dari Chief langsung tampil seketika
    const pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchDashboardData(true);
      }
    }, 30000);

    return () => {
      controller.abort();
      clearInterval(pollTimer);
      window.removeEventListener('arff:leave-updated', handleDataUpdated);
      window.removeEventListener('arff:announcements-updated', handleDataUpdated);
      window.removeEventListener('arff:deployments-updated', handleDataUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchDashboardData]);

  // Ekstrak penugasan user saat ini
  const allDeployments = deploymentsData?.deployments || [];
  const currentPersonnelId = user?.personnel_id ? Number(user.personnel_id) : null;
  const currentUserId = user?.id ? Number(user.id) : null;
  const currentUserName = (user?.name || user?.full_name || '').trim().toLowerCase();

  const userDeployment = allDeployments.find((d) => {
    if (currentPersonnelId && Number(d.personnel_id) === currentPersonnelId) return true;
    if (currentUserId && Number(d.user_id) === currentUserId) return true;
    if (currentUserName && (d.full_name || '').trim().toLowerCase() === currentUserName) return true;
    return false;
  });

  // Apakah user sedang izin/cuti aktif pada shift ini?
  const isOnLeave = Boolean(userDeployment && userDeployment.deployment_type === 'absent');
  const userLeaveRecord = isOnLeave ? userDeployment : null;

  // Apakah user Lepas Piket (Off Duty)?
  // User lepas piket jika tidak terploting DAN jadwal dinas regu user bukan regu shift ini
  const scheduledTeamForShift = getScheduledTeam(activeDate, activeShiftNumber);
  const userTeam = cleanTeam(user?.team_group || '');
  const isUserTeamScheduled = userTeam ? userTeam.toLowerCase() === scheduledTeamForShift.toLowerCase() : true;

  const isOffDuty = !userDeployment && !isUserTeamScheduled;

  // Deteksi penugasan kendaraan & status PIC
  let dutyInfo = null;
  if (userDeployment && !isOnLeave) {
    const matchedVehicle = vehiclesList.find(
      (v) => Number(v.id || v.vehicle_id) === Number(userDeployment.vehicle_id)
    );
    const isWatchroom =
      userDeployment.deployment_type === 'watchroom' ||
      userDeployment.vehicle_code === 'WATCHROOM' ||
      matchedVehicle?.category === 'posko';

    dutyInfo = {
      vehicle_id: userDeployment.vehicle_id || matchedVehicle?.id,
      vehicle_code: userDeployment.vehicle_code || matchedVehicle?.code_name || (isWatchroom ? 'WATCHROOM' : ''),
      vehicle_name: userDeployment.vehicle_name || matchedVehicle?.vehicle_name || (isWatchroom ? 'Posko Komunikasi (Watchroom)' : ''),
      is_pic: Boolean(userDeployment.is_pic === 1 || userDeployment.is_pic === true),
      role_name: userDeployment.is_pic
        ? (isWatchroom ? 'PIC Watchroom' : 'Operator Utama (PIC)')
        : (userDeployment.notes || userDeployment.role_name || (isWatchroom ? 'Operator Komunikasi' : 'Kru Lapangan'))
    };
  } else if (!isOffDuty && !isOnLeave) {
    // Cek apakah user tercatat sebagai PIC di daftar kesiapan kendaraan
    const picVehicle = vehiclesList.find(
      (v) =>
        (currentPersonnelId && Number(v.pic_personnel_id) === currentPersonnelId) ||
        (currentUserId && Number(v.pic_user_id) === currentUserId) ||
        v.is_current_user_pic
    );

    if (picVehicle) {
      const isWatchroom = picVehicle.category === 'posko' || picVehicle.code_name === 'WATCHROOM';
      dutyInfo = {
        vehicle_id: picVehicle.id || picVehicle.vehicle_id,
        vehicle_code: picVehicle.code_name,
        vehicle_name: picVehicle.vehicle_name || (isWatchroom ? 'Posko Komunikasi (Watchroom)' : ''),
        is_pic: true,
        role_name: isWatchroom ? 'PIC Watchroom' : 'Operator Utama (PIC)'
      };
    }
  }

  // Cari data kesiapan kendaraan yang dipegang user jika PIC
  const picVehicleReadiness = dutyInfo?.vehicle_id
    ? vehiclesList.find((v) => Number(v.id || v.vehicle_id) === Number(dutyInfo.vehicle_id))
    : null;

  const handleOpenGlobalLeaveModal = () => {
    window.dispatchEvent(
      new CustomEvent('arff:open-leave-modal', {
        detail: { activeUserLeave: userLeaveRecord },
      })
    );
  };

  const unserviceableVehicles = vehiclesList.filter((v) => v.status === 'unserviceable');

  // Handler buka pengumuman / dokumen lampiran
  const handleOpenPdf = (ann) => {
    if (ann?.file_path) {
      const fileUrl = ann.file_path.startsWith('http')
        ? ann.file_path
        : `${import.meta.env.VITE_API_URL || '/api'}/announcements/${ann.id}/attachment?token=${encodeURIComponent(token || localStorage.getItem('arff_token') || '')}`;
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } else if (typeof onNavigateToAnnouncements === 'function') {
      onNavigateToAnnouncements();
    } else {
      window.dispatchEvent(new CustomEvent('arff:open-announcements-modal'));
    }
  };

  const handleArchiveFromDashboard = async (item) => {
    // Sinkronisasi optimis seketika pada level state Dashboard
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, is_archived: 1 } : a))
    );
    try {
      await api.post(`/announcements/${item.id}/archive`);
      if (typeof window !== 'undefined') {
        window.__arff_announcements_cache = null;
      }
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      console.error('Gagal mengarsipkan pengumuman dari mobile dashboard:', err);
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_archived: 0 } : a))
      );
      throw err;
    }
  };

  return (
    <div className="space-y-2.5 pb-6 font-sans">
      {errorMsg && (
        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'Gagal memuat data operasional terbaru.')}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 md:gap-4 items-start">
        {/* Kolom Kiri (md:col-span-5) */}
        <div className="md:col-span-5 space-y-2.5">
          {/* 1. KARTU TUGAS DINAS SAYA */}
          <MobileDutyCard
            user={user}
            dutyInfo={dutyInfo}
            isOffDuty={isOffDuty}
            isOnLeave={isOnLeave}
            leaveInfo={userLeaveRecord}
            vehicleReadiness={picVehicleReadiness}
            onOpenLeaveModal={handleOpenGlobalLeaveModal}
          />

          {/* 2. FORMULIR KESIAPAN PIC (KONDISIONAL: HANYA TAMPIL JIKA USER = PIC & BUKAN OFF-DUTY) */}
          {!isOffDuty && !isOnLeave && dutyInfo?.is_pic && (
            <MobilePicReadinessForm
              user={user}
              dutyInfo={dutyInfo}
              activeDate={activeDate}
              activeShiftNumber={activeShiftNumber}
              activeTeam={cleanTeam(activeTeam)}
              vehicleReadiness={picVehicleReadiness}
              onSuccess={() => fetchDashboardData(true)}
              onOpenAuditModal={(vId) => setAuditVehicleId(vId)}
            />
          )}
        </div>

        {/* Kolom Kanan (md:col-span-7) */}
        <div className="md:col-span-7 space-y-2.5">
          {/* 4. WIDGET KENDALA ARMADA (KONDISIONAL: HANYA JIKA ADA UNIT UNSERVICEABLE) */}
          <MobileUnserviceableWidget
            unserviceableVehicles={unserviceableVehicles}
            onOpenAuditModal={(vId) => setAuditVehicleId(vId)}
          />

          {/* 5. WIDGET PENGUMUMAN DINAS (DIPALING BAWAH, 3 TERBARU) */}
          <MobileRecentAnnouncements
            announcements={announcements}
            onOpenAllAnnouncements={onNavigateToAnnouncements}
            onOpenPdf={handleOpenPdf}
            onArchive={handleArchiveFromDashboard}
          />
        </div>
      </div>

      {/* MODAL JEJAK AUDIT KENDALA ARMADA */}
      <MobileUnitAuditModal
        isOpen={Boolean(auditVehicleId)}
        onClose={() => setAuditVehicleId(null)}
        unit={vehiclesList.find((v) => Number(v.id || v.vehicle_id) === Number(auditVehicleId))}
      />
    </div>
  );
}
