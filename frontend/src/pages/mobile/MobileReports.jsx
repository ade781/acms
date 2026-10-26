import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileText,
  Download,
  Eye,
  AlertCircle,
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  RefreshCw,
  Camera,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatIndoDate,
  cleanTeam,
  formatTeam,
  SHIFT_DEFINITIONS,
} from '../../utils/shiftHelper';
import api from '../../services/api';
import { fetchShiftReportData, downloadShiftReportPdf } from '../../services/reportService';
import MobileReportSummaryCard from '../../components/mobile/reports/MobileReportSummaryCard';
import MobileUnitAuditModal from '../../components/mobile/reports/MobileUnitAuditModal';
import MobilePdfViewerModal from '../../components/mobile/reports/MobilePdfViewerModal';
import MobileSignaturesSection from '../../components/mobile/reports/MobileSignaturesSection';

/**
 * Halaman Rekapitulasi Laporan Dinas Shift Komprehensif (Mobile)
 * Dapat diakses oleh Kru (Read-Only) dan Chief untuk pemantauan bersama.
 * STRICT GEMINI.md BUTIR 2: Bebas dari tombol "Sahkan Shift" manual.
 * Data ditarik dinamis secara real-time dari database.
 */
export default function MobileReports() {
  const { activeDate, activeShiftNumber, activeTeam } = useAuth();
  const abortControllerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Data State
  const [shiftData, setShiftData] = useState(null);
  const [deptHeadData, setDeptHeadData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [watchroomData, setWatchroomData] = useState({});
  const [deployments, setDeployments] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [vehicleIssues, setVehicleIssues] = useState({
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  });

  // Modal State
  const [selectedAuditUnit, setSelectedAuditUnit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const currentShiftNum = Number(activeShiftNumber || 1);
  const currentTeam = cleanTeam(activeTeam || 'Alpha');
  const shiftDef =
    SHIFT_DEFINITIONS.find((s) => s.number === currentShiftNum) ||
    SHIFT_DEFINITIONS[0];

  // Fetch seluruh data operasional shift secara agregat via modul service terpadu (Single Source of Truth)
  const fetchReportData = useCallback(
    async (isManualRefresh = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);
        setErrorMessage(null);

        const data = await fetchShiftReportData({
          date: activeDate,
          shift: activeShiftNumber,
          team: activeTeam,
          signal: controller.signal,
        });

        setShiftData(data.shiftData);
        setDeptHeadData(data.deptHeadData);
        setDeployments(data.deployments);
        setAbsents(data.absents);
        setVehicles(data.vehicles);
        setWatchroomData(data.watchroomData);
        setVehicleIssues(data.vehicleIssues);
        setActivities(data.activities);
        setIncidents(data.incidents);
      } catch (err) {
        if (err.name === 'CanceledError' || err.name === 'AbortError') return;
        console.error('Error fetching mobile report data:', err);
        setErrorMessage(
          'Sebagian data operasional shift belum lengkap atau sedang disinkronkan.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeDate, activeShiftNumber, activeTeam]
  );

  useEffect(() => {
    fetchReportData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchReportData]);

  // Handler Download PDF Langsung via Service Terpadu
  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setErrorMessage(null);

      await downloadShiftReportPdf({
        date: activeDate,
        shift: activeShiftNumber,
        team: activeTeam,
      });
    } catch (err) {
      console.error('Download PDF error:', err);
      setErrorMessage('Gagal mengunduh berkas PDF laporan dinas. Pastikan data shift valid.');
    } finally {
      setDownloading(false);
    }
  };


  // Handler Klik Unit untuk Buka Audit Modal
  const handleOpenUnitAudit = (unit) => {
    setSelectedAuditUnit(unit);
    setIsAuditModalOpen(true);
  };

  return (
    <div className="space-y-2 pb-6">
      {/* 1. KOP RESMI DOKUMEN LAPORAN OPERASIONAL DINAS SHIFT */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div>
              <h2 className="text-xs font-bold text-slate-900 leading-tight">
                Laporan Dinas Shift
              </h2>
              <p className="text-[8.5px] text-slate-500 font-medium">
                ARFF Section • Kode WAHI • Kategori 8
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchReportData(true)}
            disabled={refreshing}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-100"
            title="Muat ulang data rekapitulasi shift"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-600' : ''}`} />
          </button>
        </div>

        {/* Info Grid Shift Terpadu */}
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500">Regu & Shift:</span>
            <span className="font-bold text-slate-800 text-[10.5px]">
              {formatTeam(currentTeam)} • {shiftDef.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-slate-500">Tanggal Dinas:</span>
            <span className="font-mono text-slate-700 text-[9.5px]">
              {formatIndoDate(activeDate)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-200/60">
            <span className="text-[9px] text-slate-500">Ketua Regu (Chief):</span>
            <span className="font-bold text-slate-900 text-[10.5px]">
              {shiftData?.supervisor_name || `Chief ${formatTeam(currentTeam)}`}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span className="truncate text-[10px]">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[9px] font-bold text-red-600 hover:text-red-800 underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. REKAPITULASI 8 UNIT OPERASIONAL & AUDIT TRAIL TRIGGER */}
      <MobileReportSummaryCard
        vehicles={vehicles}
        watchroomData={watchroomData}
        deployments={deployments}
        absents={absents}
        onOpenUnitAudit={handleOpenUnitAudit}
      />

      {/* 3. PRESENSI & DISTRIBUSI PENEMPATAN PERSONEL */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Presensi & Penempatan Kru
          </h4>
          <span className="text-[9px] font-mono font-bold text-slate-700">
            {deployments.length} Hadir • {absents.length} Izin
          </span>
        </div>

        {absents.length > 0 ? (
          <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[10px] space-y-0.5">
            <p className="font-bold text-amber-900">Personel Izin / Cuti Terdata:</p>
            {absents.map((ab, idx) => (
              <p key={ab.id || idx} className="text-amber-800">
                • <strong>{ab.full_name || ab.name}</strong> ({ab.leave_type || ab.notes || 'Cuti'})
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-emerald-700 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-200">
            ✓ Seluruh anggota regu terdata hadir dinas dan teralokasikan pada unit tugas.
          </p>
        )}
      </div>

      {/* 4. LOGBOOK KEGIATAN SHIFT */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Rangkaian Kegiatan Shift
          </h4>
          <span className="text-[9px] font-semibold text-slate-500">
            {activities.length} Kegiatan
          </span>
        </div>

        {activities.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic p-1">
            Belum ada kegiatan rutin yang dicatat pada sesi shift ini.
          </p>
        ) : (
          <div className="space-y-1 text-xs">
            {activities.map((act) => (
              <div
                key={act.id}
                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200/70 space-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px] truncate">
                    {act.title}
                  </span>
                  <span className="font-mono text-red-600 text-[9px] font-bold shrink-0">
                    {act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB
                  </span>
                </div>
                {act.description && (
                  <p className="text-[10px] text-slate-600 leading-snug">
                    {act.description}
                  </p>
                )}
                {act.photo_webp_url && (
                  <div className="mt-1 flex items-center gap-1.5 p-1 rounded bg-white border border-slate-200 text-[8.5px] text-slate-700">
                    <img
                      src={act.photo_webp_url}
                      alt="Dokumentasi"
                      className="w-7 h-7 rounded object-cover border border-slate-300 shrink-0"
                    />
                    <span className="truncate">Dokumentasi Terlampir</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. REKAPITULASI KEJADIAN / INSIDEN (AIRSIDE) */}
      <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Rekapitulasi Insiden & Kejadian
          </h4>
          <span
            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${incidents.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
              }`}
          >
            {incidents.length > 0 ? `${incidents.length} Kejadian` : 'Nihil Kejadian'}
          </span>
        </div>

        {incidents.length === 0 ? (
          <p className="text-[10px] text-emerald-700 bg-emerald-50/60 p-1.5 rounded-lg border border-emerald-200">
            ✓ Nihil kejadian darurat maupun insiden luar biasa. Operasional sisi udara (airside) normal dan aman.
          </p>
        ) : (
          <div className="space-y-1 text-xs">
            {incidents.map((inc) => (
              <div
                key={inc.id}
                className="p-1.5 rounded-lg bg-red-50/40 border border-red-200 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px] truncate">
                    {inc.title}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-800 font-bold text-[8px] uppercase">
                    {inc.priority || 'Siaga'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[8.5px] text-slate-500">
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                    {inc.location || 'Airside'}
                  </span>
                  <span>•</span>
                  <span>Waktu: {inc.incident_time || '-'}</span>
                </div>
                {inc.action_taken && (
                  <p className="text-[9.5px] text-slate-700 leading-snug bg-white/80 p-1 rounded border border-slate-100">
                    <strong>Tindakan:</strong> {inc.action_taken}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. PEJABAT PENANDATANGAN DINAMIS DARI DATABASE */}
      <MobileSignaturesSection
        deptHead={deptHeadData}
        supervisor={{
          name: shiftData?.supervisor_name,
          nip: shiftData?.supervisor_nip,
          signature_url: shiftData?.supervisor_signature_url,
          team_group: currentTeam,
        }}
        shiftDate={activeDate}
        teamGroup={currentTeam}
        isSheet={false}
      />

      {/* 7. DUAL-ACTION TOMBOL AKSI UTAMA DOKUMEN PDF */}
      <div className="pt-1 grid grid-cols-2 gap-2">
        {/* Tombol Pratinjau Lembar Surat A4 */}
        <button
          type="button"
          onClick={() => setIsPdfModalOpen(true)}
          className="py-2.5 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100 active:scale-[0.99]"
        >
          <Eye className="w-4 h-4 text-slate-600" />
          <span>Pratinjau Surat (A4)</span>
        </button>

        {/* Tombol Unduh PDF Resmi */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100 disabled:opacity-50 active:scale-[0.99]"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Membuat PDF...' : 'Unduh PDF Resmi'}</span>
        </button>
      </div>

      {/* MODAL AUDIT TRAIL UNIT */}
      <MobileUnitAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setSelectedAuditUnit(null);
        }}
        unit={selectedAuditUnit}
        vehicleIssues={vehicleIssues}
      />

      {/* MODAL PRATINJAU DOKUMEN RESMI A4 */}
      <MobilePdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        shiftData={shiftData}
        deptHeadData={deptHeadData}
        vehicles={vehicles}
        watchroomData={watchroomData}
        deployments={deployments}
        absents={absents}
        activities={activities}
        incidents={incidents}
        vehicleIssues={vehicleIssues}
        shiftDate={activeDate}
        shiftNumber={activeShiftNumber}
        teamGroup={activeTeam}
      />
    </div>
  );
}
