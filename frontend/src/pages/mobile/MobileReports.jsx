import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  MapPin,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatIndoDate,
  cleanTeam,
  formatTeam,
} from '../../utils/shiftHelper';
import { fetchShiftReportData } from '../../services/reportService';
import MobileReportSummaryCard from '../../components/mobile/reports/MobileReportSummaryCard';
import MobileUnitAuditModal from '../../components/mobile/reports/MobileUnitAuditModal';
import MobilePdfViewerModal from '../../components/mobile/reports/MobilePdfViewerModal';
import MobileSignaturesSection from '../../components/mobile/reports/MobileSignaturesSection';

/**
 * Halaman Rekapitulasi Laporan Dinas Shift Komprehensif (Mobile)
 * Dapat diakses oleh Kru (Read-Only) dan Chief untuk pemantauan bersama.
 * Alur satu pintu dokumen A4: Menampilkan pratinjau surat dan unduh berkas resmi.
 * Data ditarik dinamis secara real-time dari database.
 */
export default function MobileReports() {
  const { activeDate, activeShiftNumber, activeTeam } = useAuth();
  const abortControllerRef = useRef(null);

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

  const currentTeam = cleanTeam(activeTeam || 'Alpha');

  // Fetch seluruh data operasional shift secara agregat via modul service terpadu (Single Source of Truth)
  const fetchReportData = useCallback(
    async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
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
        if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
        console.error('Error fetching mobile report data:', err);
        const msg = typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Sebagian data operasional shift belum lengkap atau sedang disinkronkan.'));
        setErrorMessage(msg);
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

  // Handler Klik Unit untuk Buka Audit Modal
  const handleOpenUnitAudit = (unit) => {
    setSelectedAuditUnit(unit);
    setIsAuditModalOpen(true);
  };

  const isClosed = Boolean(shiftData?.is_official || (shiftData?.status || '').toLowerCase() === 'closed');

  return (
    <div className="space-y-3 pb-6 font-sans">
      {/* 1. KOP RESMI DOKUMEN LAPORAN OPERASIONAL DINAS SHIFT */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            Laporan Dinas Shift
          </h2>
        </div>

        {/* Info Grid Shift Terpadu */}
        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Tanggal Dinas:</span>
            <span className="font-semibold text-slate-700">
              {formatIndoDate(activeDate)}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="text-slate-500">Ketua Regu:</span>
            <span className="font-bold text-slate-900">
              {shiftData?.supervisor_name || `Chief ${formatTeam(currentTeam)}`}
            </span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span className="truncate text-xs">
              {typeof errorMessage === 'string' ? errorMessage : (errorMessage?.message || 'Terjadi kesalahan.')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-bold text-red-600 hover:text-red-800 underline shrink-0"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. REKAPITULASI UNIT OPERASIONAL & AUDIT TRAIL TRIGGER */}
      <MobileReportSummaryCard
        vehicles={vehicles}
        deployments={deployments}
        activities={activities}
        incidents={incidents}
        onOpenUnitAudit={handleOpenUnitAudit}
      />

      {/* 3. LOGBOOK KEGIATAN SHIFT */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Rangkaian Kegiatan Shift
          </h4>
          <span className="text-xs font-semibold text-slate-500">
            <span className="font-mono tabular-nums">{activities.length}</span> Kegiatan
          </span>
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-1">
            Belum ada kegiatan rutin yang dicatat pada sesi shift ini.
          </p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {activities.map((act, actIdx) => (
              <div
                key={act.id ?? `act-${act.activity_time || actIdx}`}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs truncate">
                    {act.title}
                  </span>
                  <span className="font-mono tabular-nums text-red-600 text-xs font-bold shrink-0">
                    {act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB
                  </span>
                </div>
                {act.description && (
                  <p className="text-xs text-slate-600 leading-snug">
                    {act.description}
                  </p>
                )}
                {(act.attachment_url || act.photo_webp_url) && (
                  <div className="mt-1 flex items-center gap-2 p-1.5 rounded bg-white border border-slate-200 text-xs text-slate-700">
                    <img
                      src={act.attachment_url || act.photo_webp_url}
                      alt="Dokumentasi"
                      className="w-8 h-8 rounded object-cover border border-slate-300 shrink-0"
                    />
                    <span className="truncate">Dokumentasi Terlampir</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. REKAPITULASI KEJADIAN / INSIDEN (AIRSIDE) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Rekapitulasi Insiden & Kejadian
          </h4>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              incidents.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {incidents.length > 0 ? (
              <>
                <span className="font-mono tabular-nums">{incidents.length}</span> Kejadian
              </>
            ) : (
              'Nihil Kejadian'
            )}
          </span>
        </div>

        {incidents.length === 0 ? (
          <p className="text-xs text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Nihil kejadian darurat maupun insiden luar biasa pada shift ini.</span>
          </p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {incidents.map((inc, incIdx) => (
              <div
                key={inc.id ?? `inc-${inc.incident_time || incIdx}`}
                className="p-2 rounded-lg bg-red-50/40 border border-red-200 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs truncate">
                    {inc.title}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-xs uppercase shrink-0">
                    {inc.priority || 'Siaga'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {inc.location || 'Airside'}
                  </span>
                  <span>•</span>
                  <span>
                    Waktu: <span className="font-mono tabular-nums">{inc.incident_time || '-'}</span>
                  </span>
                </div>
                {inc.action_taken && (
                  <p className="text-xs text-slate-700 leading-snug bg-white/80 p-1.5 rounded border border-slate-100">
                    <strong>Tindakan:</strong> {inc.action_taken}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. PEJABAT PENANDATANGAN DINAMIS DARI DATABASE */}
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
        isClosed={isClosed}
      />

      {/* 6. TOMBOL AKSI UTAMA DOKUMEN PDF (ALUR SATU PINTU KE PRATINJAU & UNDUH SURAT A4) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setIsPdfModalOpen(true)}
          className="w-full min-h-[44px] py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100 active:scale-[0.99] cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Pratinjau Surat Resmi (A4)</span>
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

      {/* MODAL PRATINJAU DOKUMEN RESMI A4 (Universal Mobile & Desktop) */}
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
