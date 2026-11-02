import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  formatIndoDate,
  cleanTeam,
  formatTeam,
  getDailyRoster,
  SHIFT_DEFINITIONS,
} from '../../utils/shiftHelper';
import { getErrorMessage } from '../../utils/errorHelper';
import { fetchShiftReportData, downloadShiftReportPdf } from '../../services/reportService';
import MobileReportSummaryCard from '../../components/mobile/reports/MobileReportSummaryCard';
import MobileUnitAuditModal from '../../components/mobile/reports/MobileUnitAuditModal';
import MobileSignaturesSection from '../../components/mobile/reports/MobileSignaturesSection';
import MobilePdfViewerModal from '../../components/mobile/reports/MobilePdfViewerModal';

/**
 * Halaman Rekapitulasi Laporan Dinas Operasional Harian ARFF YIA (24 Jam) - Mobile View
 * Merangkum 3 Shift dan 3 Regu Dinas (Shift 1 Pagi, Shift 2 Siang, Shift 3 Malam, dan Regu Off) dalam 1 Tanggal.
 * STRICT GEMINI.md BUTIR 2: Bebas dari tombol "Sahkan Shift" manual.
 */
export default function MobileReports() {
  const { activeDate } = useAuth();
  const abortControllerRef = useRef(null);

  // Tanggal yang dipilih
  const [selectedDate, setSelectedDate] = useState(
    activeDate || new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Tab Shift Kru Aktif (1, 2, atau 3)
  const [activeCrewShift, setActiveCrewShift] = useState(1);

  // Data State Laporan 24 Jam
  const [roster, setRoster] = useState(() => getDailyRoster(selectedDate));
  const [deptHeadData, setDeptHeadData] = useState(null);
  const [shiftsData, setShiftsData] = useState(null);
  const [vehiclesDaily, setVehiclesDaily] = useState([]);
  const [activities24h, setActivities24h] = useState([]);
  const [incidents24h, setIncidents24h] = useState([]);
  const [absents24h, setAbsents24h] = useState([]);
  const [vehicleIssues, setVehicleIssues] = useState({
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  });

  // Backward compatibility
  const [vehicles, setVehicles] = useState([]);
  const [watchroomData, setWatchroomData] = useState({});

  // Modal State
  const [selectedAuditUnit, setSelectedAuditUnit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Fetch data harian 24 jam
  const fetchReportData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setErrorMessage(null);

      const data = await fetchShiftReportData({
        date: selectedDate,
        signal: controller.signal,
      });

      setRoster(data.roster || getDailyRoster(selectedDate));
      setDeptHeadData(data.deptHeadData);
      setShiftsData(data.shiftsData);
      setVehiclesDaily(data.vehiclesDaily || []);
      setActivities24h(data.activities24h || []);
      setIncidents24h(data.incidents24h || []);
      setAbsents24h(data.absents24h || []);
      setVehicleIssues(data.vehicleIssues || { current_issues: [], backlog_issues: [], resolved_this_shift: [] });
      setVehicles(data.vehicles || []);
      setWatchroomData(data.watchroomData || {});
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching mobile daily report data:', err);
      setErrorMessage(
        getErrorMessage(err, 'Sebagian data operasional harian belum lengkap atau sedang disinkronkan.')
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchReportData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchReportData]);

  // Navigasi Tanggal Harian
  const changeDateBy = (offset) => {
    const d = new Date(selectedDate);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + offset);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setErrorMessage(null);

      await downloadShiftReportPdf({
        date: selectedDate,
      });
    } catch (err) {
      console.error('Download PDF error:', err);
      setErrorMessage(
        getErrorMessage(err, 'Gagal mengunduh berkas PDF laporan dinas. Pastikan data tanggal valid.')
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenUnitAudit = (unit) => {
    setSelectedAuditUnit(unit);
    setIsAuditModalOpen(true);
  };

  const isAllClosed = shiftsData
    ? Object.values(shiftsData).every((s) => (s.status || '').toLowerCase() === 'closed')
    : false;

  const totalCrewPresent = shiftsData
    ? (shiftsData[1]?.presentDeployments?.length || 0) +
      (shiftsData[2]?.presentDeployments?.length || 0) +
      (shiftsData[3]?.presentDeployments?.length || 0)
    : 0;

  const activeShiftInfo = shiftsData?.[activeCrewShift] || {
    shiftNumber: activeCrewShift,
    teamGroup: activeCrewShift === 1 ? roster.shift1 : activeCrewShift === 2 ? roster.shift2 : roster.shift3,
    shiftName: `Shift ${activeCrewShift}`,
    supervisor_name: '-',
    supervisor_nip: '-',
    deployments: [],
    presentDeployments: [],
    absents: [],
  };

  return (
    <div className="space-y-3 pb-8 font-sans">
      {/* 1. KOP RESMI DOKUMEN LAPORAN OPERASIONAL HARIAN (24 JAM) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              Laporan Harian Operasional (24 Jam)
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Bandara Internasional Yogyakarta</p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
              isAllClosed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}
          >
            {isAllClosed ? 'Sah' : 'Draft'}
          </span>
        </div>

        {/* Date Switcher Controller */}
        <div className="flex items-center justify-between bg-slate-50 rounded-lg border border-slate-200 p-1">
          <button
            type="button"
            onClick={() => changeDateBy(-1)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors duration-100"
            title="Hari Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="text-xs font-bold font-mono text-slate-900 bg-transparent border-0 focus:ring-0 p-0 cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => changeDateBy(1)}
            className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors duration-100"
            title="Hari Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-2 py-1 rounded bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors duration-100"
          >
            Hari Ini
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span className="truncate text-xs">{errorMessage}</span>
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

      {/* 2. ROSTER BAR 3 SHIFT CARD */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <h4 className="text-xs font-bold text-slate-900 uppercase">
              Roster 3 Shift • {formatIndoDate(selectedDate, { shortMonth: true })}
            </h4>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-0.5">
            <span className="text-[10px] font-bold text-emerald-800 uppercase block">Shift 1 (Pagi)</span>
            <span className="font-bold text-slate-900 block">Regu {roster.shift1}</span>
            <span className="text-[11px] text-slate-500 truncate block">Chief: {shiftsData?.[1]?.supervisor_name || '-'}</span>
          </div>

          <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-200 space-y-0.5">
            <span className="text-[10px] font-bold text-amber-800 uppercase block">Shift 2 (Siang)</span>
            <span className="font-bold text-slate-900 block">Regu {roster.shift2}</span>
            <span className="text-[11px] text-slate-500 truncate block">Chief: {shiftsData?.[2]?.supervisor_name || '-'}</span>
          </div>

          <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-200 space-y-0.5">
            <span className="text-[10px] font-bold text-indigo-800 uppercase block">Shift 3 (Malam)</span>
            <span className="font-bold text-slate-900 block">Regu {roster.shift3}</span>
            <span className="text-[11px] text-slate-500 truncate block">Chief: {shiftsData?.[3]?.supervisor_name || '-'}</span>
          </div>

          <div className="p-2 rounded-lg bg-slate-100/70 border border-slate-200 space-y-0.5">
            <span className="text-[10px] font-bold text-slate-600 uppercase block">Lepas Piket (Off)</span>
            <span className="font-bold text-slate-700 block">Regu {roster.offTeam}</span>
            <span className="text-[11px] text-slate-400 block">Istirahat Bebas Dinas</span>
          </div>
        </div>
      </div>

      {/* 3. REKAPITULASI UNIT OPERASIONAL 24 JAM */}
      <MobileReportSummaryCard
        vehicles={vehicles}
        vehiclesDaily={vehiclesDaily}
        totalCrew={totalCrewPresent}
        onOpenUnitAudit={handleOpenUnitAudit}
      />

      {/* 4. PENUGASAN KRU PER SHIFT */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Penugasan Kru Per Shift
          </h4>

          {/* Segmented Shift Tabs */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
            {[1, 2, 3].map((num) => (
              <button
                key={`m-crew-tab-${num}`}
                type="button"
                onClick={() => setActiveCrewShift(num)}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors duration-100 ${
                  activeCrewShift === num
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                S{num}
              </button>
            ))}
          </div>
        </div>

        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Regu & Supervisor:</span>
            <span className="font-bold text-slate-900">
              Regu {activeShiftInfo.teamGroup} • {activeShiftInfo.supervisor_name || '-'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="text-slate-500">Presensi Shift:</span>
            <span className="font-bold text-slate-900">
              <span className="font-mono tabular-nums">{activeShiftInfo.presentDeployments?.length || 0}</span> Hadir • <span className="font-mono tabular-nums text-amber-700">{activeShiftInfo.absents?.length || 0}</span> Cuti
            </span>
          </div>
        </div>
      </div>

      {/* 5. LOGBOOK KEGIATAN 24 JAM */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Rangkaian Kegiatan 24 Jam
          </h4>
          <span className="text-xs font-semibold text-slate-500">
            <span className="font-mono tabular-nums">{activities24h.length}</span> Kegiatan
          </span>
        </div>

        {activities24h.length === 0 ? (
          <p className="text-xs text-slate-400 italic p-1">
            Belum ada kegiatan rutin yang dicatat pada hari ini.
          </p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {activities24h.map((act, actIdx) => (
              <div
                key={act.id ?? `act-${actIdx}`}
                className="p-2 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold text-[10px] shrink-0">
                      S{act.shift_number || 1}
                    </span>
                    <span className="font-bold text-slate-900 text-xs truncate">
                      {act.title}
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-red-600 text-xs font-bold shrink-0">
                    {act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB
                  </span>
                </div>
                {act.description && (
                  <p className="text-xs text-slate-600 leading-snug">
                    {act.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. REKAPITULASI KEJADIAN / INSIDEN 24 JAM */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Rekapitulasi Kejadian & Insiden
          </h4>
          <span
            className={`text-xs font-bold px-2 py-0.5 rounded ${
              incidents24h.length > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {incidents24h.length > 0 ? (
              <>
                <span className="font-mono tabular-nums">{incidents24h.length}</span> Kejadian
              </>
            ) : (
              'Nihil Kejadian'
            )}
          </span>
        </div>

        {incidents24h.length === 0 ? (
          <p className="text-xs text-emerald-700 bg-emerald-50/60 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Nihil kejadian darurat maupun insiden luar biasa selama 24 jam.</span>
          </p>
        ) : (
          <div className="space-y-1.5 text-xs">
            {incidents24h.map((inc, incIdx) => (
              <div
                key={inc.id ?? `inc-${incIdx}`}
                className="p-2 rounded-lg bg-red-50/40 border border-red-200 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 text-xs truncate">
                    {inc.title}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase shrink-0">
                    S{inc.shift_number || 1}
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 7. PEJABAT PENANDATANGAN 4 PEJABAT */}
      <MobileSignaturesSection
        deptHead={deptHeadData}
        shiftsData={shiftsData}
        shiftDate={selectedDate}
        isSheet={false}
        isClosed={isAllClosed}
      />

      {/* 8. TOMBOL AKSI UTAMA DOKUMEN PDF (PRATINJAU & UNDUH) */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => setIsPdfModalOpen(true)}
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 border border-slate-300 shadow-2xs transition-colors duration-100 active:scale-[0.99] cursor-pointer"
        >
          <Eye className="w-4 h-4 text-slate-500" />
          <span>Pratinjau A4</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="min-h-[44px] py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs tracking-wide flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100 disabled:opacity-50 active:scale-[0.99] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{downloading ? 'Membuat PDF...' : 'Unduh PDF'}</span>
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
        deptHeadData={deptHeadData}
        vehicles={vehicles}
        watchroomData={watchroomData}
        vehicleIssues={vehicleIssues}
        shiftDate={selectedDate}
        roster={roster}
        shiftsData={shiftsData}
        vehiclesDaily={vehiclesDaily}
        activities24h={activities24h}
        incidents24h={incidents24h}
        absents24h={absents24h}
      />
    </div>
  );
}
