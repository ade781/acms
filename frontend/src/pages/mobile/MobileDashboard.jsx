import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam, getScheduledTeam } from '../../utils/shiftHelper';

// Subcomponents
import MobileDutyCard from '../../components/mobile/dashboard/MobileDutyCard';
import MobilePicReadinessForm from '../../components/mobile/dashboard/MobilePicReadinessForm';
import MobileOpsSummaryCards from '../../components/mobile/dashboard/MobileOpsSummaryCards';
import MobileUnserviceableWidget from '../../components/mobile/dashboard/MobileUnserviceableWidget';
import MobileRecentAnnouncements from '../../components/mobile/dashboard/MobileRecentAnnouncements';

import { RefreshCw, AlertTriangle, FileText, Download, ExternalLink } from 'lucide-react';

export default function MobileDashboard({ onNavigateToAnnouncements }) {
  const { user, token, activeDate, activeShiftNumber, activeTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  // Data states
  const [deploymentsData, setDeploymentsData] = useState(null);
  const [vehiclesList, setVehiclesList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Modal states
  const [auditVehicleId, setAuditVehicleId] = useState(null);
  const [previewPdfDoc, setPreviewPdfDoc] = useState(null);

  const fetchDashboardData = useCallback(async (isSilent = false, signal = null) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
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
      setErrorMsg('Gagal memuat data operasional terbaru.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    const controller = new AbortController();
    fetchDashboardData(false, controller.signal);
    const handleLeaveUpdated = () => fetchDashboardData(true);
    window.addEventListener('arff:leave-updated', handleLeaveUpdated);
    return () => {
      controller.abort();
      window.removeEventListener('arff:leave-updated', handleLeaveUpdated);
    };
  }, [fetchDashboardData]);

  // Ekstrak penugasan user saat ini
  const allDeployments = deploymentsData?.deployments || [];
  const currentPersonnelId = user?.personnel_id ? Number(user.personnel_id) : null;
  const currentUserId = user?.id ? Number(user.id) : null;

  const userDeployment = allDeployments.find((d) => {
    if (currentPersonnelId && Number(d.personnel_id) === currentPersonnelId) return true;
    if (currentUserId && Number(d.user_id) === currentUserId) return true;
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
    dutyInfo = {
      vehicle_id: userDeployment.vehicle_id,
      vehicle_code: userDeployment.vehicle_code,
      vehicle_name: userDeployment.vehicle_name,
      is_pic: Boolean(userDeployment.is_pic === 1 || userDeployment.is_pic === true),
      role_name: userDeployment.is_pic ? 'Operator Utama (PIC)' : (userDeployment.role_name || 'Kru Lapangan')
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
      dutyInfo = {
        vehicle_id: picVehicle.id || picVehicle.vehicle_id,
        vehicle_code: picVehicle.code_name,
        vehicle_name: picVehicle.vehicle_name,
        is_pic: true,
        role_name: 'Operator Utama (PIC)'
      };
    }
  }

  // Cari data kesiapan kendaraan yang dipegang user jika PIC
  const picVehicleReadiness = dutyInfo?.vehicle_id
    ? vehiclesList.find((v) => Number(v.id || v.vehicle_id) === Number(dutyInfo.vehicle_id))
    : null;

  // Hitungan Metrik Situasi Operasional
  const presentCount = allDeployments.filter((d) => d.deployment_type !== 'absent').length;
  const absentDeployments = allDeployments.filter((d) => d.deployment_type === 'absent');
  const absentCount = absentDeployments.length;
  const totalStrength = Number(deploymentsData?.total_team_members) > 0
    ? Number(deploymentsData.total_team_members)
    : (presentCount + absentCount);

  const handleOpenGlobalLeaveModal = () => {
    window.dispatchEvent(
      new CustomEvent('arff:open-leave-modal', {
        detail: { activeUserLeave: userLeaveRecord },
      })
    );
  };

  const serviceableCount = vehiclesList.filter((v) => v.status === 'serviceable').length;
  const totalVehiclesCount = vehiclesList.length;
  const unserviceableVehicles = vehiclesList.filter((v) => v.status === 'unserviceable');
  const unserviceableCount = unserviceableVehicles.length;

  // Handler buka PDF
  const handleOpenPdf = (ann) => {
    setPreviewPdfDoc(ann);
  };

  return (
    <div className="space-y-2 pb-6">
      {/* Tombol Refresh Ringan */}
      <div className="flex items-center justify-end px-1">
        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="text-[10px] text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors duration-100 cursor-pointer"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
          <span>{refreshing ? 'Memperbarui...' : 'Segarkan'}</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. KARTU TUGAS DINAS SAYA */}
      <MobileDutyCard
        user={user}
        dutyInfo={dutyInfo}
        isOffDuty={isOffDuty}
        isOnLeave={isOnLeave}
        leaveInfo={userLeaveRecord}
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

      {/* 3. RINGKASAN SITUASI OPERASIONAL (PERSONEL & ARMADA) */}
      <MobileOpsSummaryCards
        presentCount={presentCount}
        totalPersonnel={totalStrength}
        absentCount={absentCount}
        serviceableCount={serviceableCount}
        totalVehicles={totalVehiclesCount}
        unserviceableCount={unserviceableCount}
        onOpenLeaveModal={handleOpenGlobalLeaveModal}
      />

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
      />

      {/* MODAL JEJAK AUDIT KENDALA ARMADA */}
      {auditVehicleId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase leading-none">
                    Riwayat Kesiapan Armada
                  </h4>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    Jejak Perubahan Status Operasional (Audit Trail)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAuditVehicleId(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 text-xs">
              {(() => {
                const targetV = vehiclesList.find(
                  (v) => Number(v.id || v.vehicle_id) === Number(auditVehicleId)
                );
                const vName = targetV?.vehicle_name || targetV?.code_name || 'Armada';
                const vStatus = targetV?.status || 'belum_dilaporkan';
                const isServ = vStatus === 'serviceable';

                return (
                  <>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Unit Armada:</span>
                        <span className="font-bold text-slate-900 text-xs">{vName}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          isServ
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {vStatus.toUpperCase()}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg border border-slate-200 bg-white space-y-1">
                      <p className="text-[10px] font-bold text-slate-800">Keterangan Kondisi Lapangan:</p>
                      <p className="text-[10px] text-slate-600 leading-snug">
                        {targetV?.justification || targetV?.notes || 'Tidak ada catatan kerusakan spesifik.'}
                      </p>
                      {targetV?.photo_webp_url && (
                        <div className="pt-1">
                          <p className="text-[9px] font-semibold text-slate-500 mb-1">Foto Bukti Fisik:</p>
                          <img
                            src={targetV.photo_webp_url}
                            alt="Bukti Fisik"
                            className="w-full h-32 object-cover rounded-lg border border-slate-200"
                          />
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            <button
              type="button"
              onClick={() => setAuditVehicleId(null)}
              className="w-full py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors duration-100"
            >
              Tutup Jejak Kendala
            </button>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU DOKUMEN PDF PENGUMUMAN */}
      {previewPdfDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="w-4 h-4 text-red-600 shrink-0" />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {previewPdfDoc.title}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-mono">
                    {previewPdfDoc.reference_number || 'EDARAN-ARFF'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPdfDoc(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* In-app Document Sheet Preview */}
            <div className="overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-3 text-xs space-y-2">
              <div className="text-center border-b border-slate-300 pb-1.5">
                <p className="text-[10px] font-black uppercase text-slate-900">
                  PT ANGKASA PURA INDONESIA
                </p>
                <p className="text-[8.5px] font-bold text-slate-700">
                  AIRPORT RESCUE & FIRE FIGHTING (ARFF) - YIA
                </p>
                <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                  Ref: {previewPdfDoc.reference_number || 'ARFF/EDARAN/2026'}
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 text-xs">
                  {previewPdfDoc.title}
                </h5>
                <p className="text-[10px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewPdfDoc.content || previewPdfDoc.description || 'Surat edaran resmi dinas operasional ARFF Bandara Internasional Yogyakarta.'}
                </p>
              </div>
            </div>

            {/* Aksi Unduh / Buka Dokumen */}
            <div className="grid grid-cols-2 gap-1.5">
              {previewPdfDoc.file_path ? (
                <a
                  href={
                    previewPdfDoc.file_path.startsWith('http')
                      ? previewPdfDoc.file_path
                      : `${import.meta.env.VITE_API_URL || '/api'}/announcements/${previewPdfDoc.id}/attachment?token=${encodeURIComponent(token || localStorage.getItem('arff_token') || '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors duration-100"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Berkas</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors duration-100"
                >
                  <Download className="w-3 h-3" />
                  <span>Cetak / Simpan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewPdfDoc(null)}
                className="py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10px] transition-colors duration-100"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
