import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Download,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Truck,
  Radio,
  Users,
  FileText,
  Eye,
  MapPin,
  ChevronRight,
  Calendar,
  ChevronLeft,
  Clock,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  cleanTeam,
  formatTeam,
  formatIndoDate,
  getDailyRoster,
  SHIFT_DEFINITIONS,
} from '../utils/shiftHelper';
import { getErrorMessage } from '../utils/errorHelper';
import { fetchShiftReportData, downloadShiftReportPdf } from '../services/reportService';
import Button from '../components/common/Button';
import MobileUnitAuditModal from '../components/mobile/reports/MobileUnitAuditModal';
import MobilePdfViewerModal from '../components/mobile/reports/MobilePdfViewerModal';
import MobileSignaturesSection from '../components/mobile/reports/MobileSignaturesSection';

/**
 * Halaman Rekapitulasi Laporan Dinas Operasional Harian ARFF YIA (24 Jam) - Desktop View
 * Merangkum 3 Shift dan 3 Regu Dinas (Shift 1 Pagi, Shift 2 Siang, Shift 3 Malam, dan Regu Off) dalam 1 Tanggal.
 * Sesuai panduan GEMINI.md & AGENTS.md: Bebas tombol sahkan manual, anti-slop, dan tipografi padat profesional.
 */
export default function ShiftReportsPage() {
  const { activeDate } = useAuth();
  const abortControllerRef = useRef(null);
  const successTimerRef = useRef(null);

  // Kontrol Tanggal Dinas Harian
  const [selectedDate, setSelectedDate] = useState(
    activeDate || new Date().toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Tab kru shift aktif (1, 2, atau 3)
  const [selectedCrewShift, setSelectedCrewShift] = useState(1);

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

  // Backward compatibility state untuk modal audit
  const [vehicles, setVehicles] = useState([]);
  const [watchroomData, setWatchroomData] = useState({});

  // Modal State
  const [selectedAuditUnit, setSelectedAuditUnit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Fetch data laporan operasional 24 jam terpadu
  const loadDailyReport = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setFetchError(null);

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
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Fetch daily report preview error:', err);
      setFetchError(
        getErrorMessage(err, 'Gagal memuat pratinjau data laporan harian 24 jam. Silakan coba kembali.')
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDailyReport();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [loadDailyReport]);

  // Navigasi Tanggal Harian
  const changeDateBy = (offsetDays) => {
    const d = new Date(selectedDate);
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + offsetDays);
      setSelectedDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSetToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleExportPDF = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      setDownloadSuccess(null);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }

      await downloadShiftReportPdf({
        date: selectedDate,
      });

      setDownloadSuccess('Berkas PDF dokumen dinas resmi 24 jam berhasil diunduh.');
      successTimerRef.current = setTimeout(() => {
        setDownloadSuccess(null);
      }, 4000);
    } catch (err) {
      console.error('Download PDF error:', err);
      setDownloadError(
        getErrorMessage(err, 'Gagal mengunduh berkas PDF laporan dinas. Pastikan data tanggal valid.')
      );
    } finally {
      setDownloading(false);
    }
  };

  // Metrik Ringkasan 24 Jam
  const totalFleetUnits = vehiclesDaily.length || 8;
  const serviceableAnywhereCount = vehiclesDaily.filter((v) => {
    const s1 = v.shift1?.status === 'serviceable';
    const s2 = v.shift2?.status === 'serviceable';
    const s3 = v.shift3?.status === 'serviceable';
    return s1 || s2 || s3;
  }).length;

  const totalCrewPresent = shiftsData
    ? (shiftsData[1]?.presentDeployments?.length || 0) +
      (shiftsData[2]?.presentDeployments?.length || 0) +
      (shiftsData[3]?.presentDeployments?.length || 0)
    : 0;

  const watchroomUnit = vehiclesDaily.find((v) => v.category === 'posko' || v.code_name === 'WATCHROOM');

  // Status penutupan shift keseluruhan
  const isAllClosed = shiftsData
    ? Object.values(shiftsData).every((s) => (s.status || '').toLowerCase() === 'closed')
    : false;

  // Data kru shift terpilih untuk tab penugasan
  const activeShiftInfo = shiftsData?.[selectedCrewShift] || {
    shiftNumber: selectedCrewShift,
    teamGroup: selectedCrewShift === 1 ? roster.shift1 : selectedCrewShift === 2 ? roster.shift2 : roster.shift3,
    shiftName: `Shift ${selectedCrewShift}`,
    supervisor_name: '-',
    supervisor_nip: '-',
    deployments: [],
    presentDeployments: [],
    absents: [],
  };

  return (
    <div className="space-y-4 font-sans">
      {/* 1. EXECUTIVE DOCUMENT CONTROL CARD & DATE PICKER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Row: Title, Date Navigation, & Action Buttons */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 font-sans">
                Laporan Harian Operasional ARFF (24 Jam)
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                  isAllClosed
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {isAllClosed ? 'Sah • Rekapitulasi Final' : 'Draft • Belum Disahkan'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Rekapitulasi terpadu 3 shift operasional & rotasi 4 regu dinas Bandara Internasional Yogyakarta
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Switcher Controller */}
            <div className="flex items-center bg-slate-50 rounded-lg border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => changeDateBy(-1)}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors duration-100"
                title="Hari Sebelumnya"
                aria-label="Hari Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2">
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
                aria-label="Hari Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSetToday}
                className="ml-1 px-2 py-1 rounded bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors duration-100"
              >
                Hari Ini
              </button>
            </div>

            {/* Aksi Dokumen */}
            <Button
              variant="outline"
              size="sm"
              icon={Eye}
              onClick={() => setIsPdfModalOpen(true)}
              disabled={loading}
            >
              Pratinjau Surat (A4)
            </Button>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={loadDailyReport}
              disabled={loading || downloading}
            >
              {loading ? 'Menyinkron...' : 'Segarkan'}
            </Button>

            <Button
              variant="primary"
              size="sm"
              icon={Download}
              onClick={handleExportPDF}
              disabled={downloading}
            >
              {downloading ? 'Membuat PDF...' : 'Unduh PDF Resmi'}
            </Button>
          </div>
        </div>

        {/* Bottom Row: Tabular Ledger Strip 24 Jam */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60 text-xs font-sans">
          {/* 1. Kesiapan Armada 24 Jam */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Truck className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Armada Siaga</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 font-mono tabular-nums">
                {serviceableAnywhereCount}/{totalFleetUnits}
              </span>{' '}
              <span className="text-emerald-700 font-bold text-xs">(Serviceable)</span>
            </div>
          </div>

          {/* 2. Total Presensi Kru 24 Jam */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Presensi Kru (3 Shift)</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 font-mono tabular-nums">
                {totalCrewPresent}
              </span>{' '}
              <span className="font-bold text-slate-900">Bertugas</span>
              <span className="ml-1 text-xs font-bold text-amber-700">
                ({absents24h.length} Cuti)
              </span>
            </div>
          </div>

          {/* 3. Posko Watchroom */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Radio className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Watch Room</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                watchroomUnit?.shift1?.status === 'serviceable' || watchroomUnit?.shift2?.status === 'serviceable' || watchroomUnit?.shift3?.status === 'serviceable'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {watchroomUnit?.shift1?.status === 'serviceable' || watchroomUnit?.shift2?.status === 'serviceable' || watchroomUnit?.shift3?.status === 'serviceable'
                ? 'Serviceable'
                : 'Belum Dicek'}
            </span>
          </div>

          {/* 4. Logbook & Insiden 24 Jam */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Logbook & Insiden 24 Jam</span>
            </div>
            <div className="text-right font-bold">
              <span className="text-slate-900">
                <span className="font-mono tabular-nums">{activities24h.length}</span> Giat
              </span>
              <span className="text-slate-300 mx-1.5">•</span>
              <span className={incidents24h.length > 0 ? 'text-red-600' : 'text-emerald-700'}>
                <span className="font-mono tabular-nums">{incidents24h.length}</span> Insiden
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Error & Sukses */}
      {fetchError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={loadDailyReport}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 text-xs transition-colors duration-100"
          >
            Muat Ulang
          </button>
        </div>
      )}

      {downloadError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 2. ROSTER BAR 3 SHIFT ELEGAN */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900 tracking-wide">
              Komposisi Roster Dinas 24 Jam • {formatIndoDate(selectedDate)}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">Siklus Rotasi 8 Hari ARFF</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Shift 1 (Pagi) */}
          <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Shift 1 (Pagi)
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500">07:00 – 13:00</span>
            </div>
            <div className="pt-1">
              <span className="text-sm font-bold text-slate-900 block">Regu {roster.shift1}</span>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                Chief: <strong className="text-slate-800">{shiftsData?.[1]?.supervisor_name || `Chief ${roster.shift1}`}</strong>
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kru: <span className="font-mono tabular-nums text-slate-800 font-bold">{shiftsData?.[1]?.presentDeployments?.length || 0}</span> Hadir • <span className="font-mono tabular-nums text-amber-700">{shiftsData?.[1]?.absents?.length || 0}</span> Cuti
              </p>
            </div>
          </div>

          {/* Shift 2 (Siang) */}
          <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                Shift 2 (Siang)
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500">13:00 – 20:00</span>
            </div>
            <div className="pt-1">
              <span className="text-sm font-bold text-slate-900 block">Regu {roster.shift2}</span>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                Chief: <strong className="text-slate-800">{shiftsData?.[2]?.supervisor_name || `Chief ${roster.shift2}`}</strong>
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kru: <span className="font-mono tabular-nums text-slate-800 font-bold">{shiftsData?.[2]?.presentDeployments?.length || 0}</span> Hadir • <span className="font-mono tabular-nums text-amber-700">{shiftsData?.[2]?.absents?.length || 0}</span> Cuti
              </p>
            </div>
          </div>

          {/* Shift 3 (Malam) */}
          <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                Shift 3 (Malam)
              </span>
              <span className="text-xs font-mono font-semibold text-slate-500">20:00 – 07:00</span>
            </div>
            <div className="pt-1">
              <span className="text-sm font-bold text-slate-900 block">Regu {roster.shift3}</span>
              <p className="text-xs text-slate-600 truncate mt-0.5">
                Chief: <strong className="text-slate-800">{shiftsData?.[3]?.supervisor_name || `Chief ${roster.shift3}`}</strong>
              </p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Kru: <span className="font-mono tabular-nums text-slate-800 font-bold">{shiftsData?.[3]?.presentDeployments?.length || 0}</span> Hadir • <span className="font-mono tabular-nums text-amber-700">{shiftsData?.[3]?.absents?.length || 0}</span> Cuti
              </p>
            </div>
          </div>

          {/* Lepas Piket (Off) */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300">
                Lepas Piket (Off)
              </span>
              <span className="text-xs font-mono font-semibold text-slate-400">24 Jam</span>
            </div>
            <div className="pt-1">
              <span className="text-sm font-bold text-slate-700 block">Regu {roster.offTeam}</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Status: <strong className="text-slate-600">Istirahat Bebas Dinas</strong>
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Tidak ada penugasan armada
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MATRIKS KESIAPAN ARMADA OPERASIONAL 24 JAM */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Matriks Kesiapan Armada Operasional & Posko (24 Jam)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemantauan status fisik kelaikan dan PIC penanggung jawab di setiap pergantian shift
            </p>
          </div>
          <span className="text-xs text-slate-500 font-medium">Klik baris untuk riwayat audit</span>
        </div>

        {/* Tabel Matriks 3 Shift */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                <th className="py-2.5 px-3">Armada / Fasilitas</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Shift 1 (Pagi • Regu {roster.shift1})</span>
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>Shift 2 (Siang • Regu {roster.shift2})</span>
                  </div>
                </th>
                <th className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>Shift 3 (Malam • Regu {roster.shift3})</span>
                  </div>
                </th>
                <th className="py-2.5 px-3 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehiclesDaily.map((v) => {
                const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';

                const renderShiftCell = (shiftObj) => {
                  const status = shiftObj?.status || 'belum_dilaporkan';
                  const isServ = status === 'serviceable';
                  const isUnserv = status === 'unserviceable';

                  return (
                    <div className="space-y-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${
                          isServ
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : isUnserv
                            ? 'bg-red-50 text-red-800 border-red-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {isServ ? 'Serviceable' : isUnserv ? 'Unserviceable' : 'Belum Dicek'}
                      </span>
                      <p className="text-[11px] text-slate-500 truncate max-w-[140px]">
                        PIC: <strong className="text-slate-700">{shiftObj?.pic_name || 'Belum Ditunjuk'}</strong>
                      </p>
                      {shiftObj?.justification && (
                        <p className="text-[10px] text-red-600 truncate max-w-[140px]">
                          {shiftObj.justification}
                        </p>
                      )}
                    </div>
                  );
                };

                return (
                  <tr
                    key={v.id || v.code_name}
                    onClick={() => {
                      setSelectedAuditUnit(v);
                      setIsAuditModalOpen(true);
                    }}
                    className="hover:bg-slate-50/70 transition-colors duration-100 cursor-pointer"
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        {isPosko && <Radio className="w-4 h-4 text-blue-600 shrink-0" />}
                        <div>
                          <span className="font-bold text-slate-900 font-mono tabular-nums block text-xs">
                            {v.code_name}
                          </span>
                          <span className="text-slate-600 text-xs">{v.vehicle_name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isPosko ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isPosko ? 'Posko' : v.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">{renderShiftCell(v.shift1)}</td>
                    <td className="py-2.5 px-3">{renderShiftCell(v.shift2)}</td>
                    <td className="py-2.5 px-3">{renderShiftCell(v.shift3)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAuditUnit(v);
                          setIsAuditModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors duration-100"
                        title="Buka Audit Trail Unit"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. PENUGASAN KRU & PRESENSI PER SHIFT */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Penugasan Armada & Presensi Personel Per Shift
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih tab shift untuk melihat formasi kru lapangan dan personel yang izin/cuti
            </p>
          </div>

          {/* Shift Tab Selector (Segmented Clean Bar) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            {[1, 2, 3].map((num) => {
              const isActive = selectedCrewShift === num;
              const shiftTeam = num === 1 ? roster.shift1 : num === 2 ? roster.shift2 : roster.shift3;
              return (
                <button
                  key={`crew-tab-${num}`}
                  type="button"
                  onClick={() => setSelectedCrewShift(num)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors duration-100 ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shift {num} (Regu {shiftTeam})
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Card Supervisor / Chief Shift Terpilih */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block font-semibold text-xs">Ketua Regu (Chief):</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {activeShiftInfo.supervisor_name || `Chief Regu ${activeShiftInfo.teamGroup}`}
            </span>
            {activeShiftInfo.supervisor_nip && activeShiftInfo.supervisor_nip !== '-' && (
              <span className="text-slate-500 font-mono tabular-nums text-xs">
                NIP. {activeShiftInfo.supervisor_nip}
              </span>
            )}
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-xs">Jam Dinas:</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              {selectedCrewShift === 1 ? '07:00 – 13:00 WIB (Pagi)' : selectedCrewShift === 2 ? '13:00 – 20:00 WIB (Siang)' : '20:00 – 07:00 WIB (Malam)'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-semibold text-xs">Presensi Personel:</span>
            <span className="font-bold text-slate-900 mt-0.5 block">
              <span className="font-mono tabular-nums text-slate-900 font-bold">{activeShiftInfo.presentDeployments?.length || 0}</span> Hadir Bertugas
              <span className="text-amber-700 ml-1.5 font-bold">({activeShiftInfo.absents?.length || 0} Izin/Cuti)</span>
            </span>
          </div>
        </div>

        {/* Grid Ploting Penugasan Armada Pada Shift Terpilih */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Formasi Penugasan Kru Unit & Posko ({activeShiftInfo.shiftName})
          </h4>

          {activeShiftInfo.deployments?.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-4 text-center bg-slate-50 rounded-lg border border-slate-200">
              Belum ada data penugasan formasi personel yang tercatat pada shift ini.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Kelompokkan deployment per vehicle */}
              {(() => {
                const groupMap = new Map();
                activeShiftInfo.deployments.forEach((d) => {
                  const vName = d.vehicle_name || d.vehicle_code || (d.deployment_type === 'posko' ? 'Posko Komunikasi' : 'Lainnya');
                  if (!groupMap.has(vName)) {
                    groupMap.set(vName, { code: d.vehicle_code, name: vName, crew: [] });
                  }
                  groupMap.get(vName).crew.push(d);
                });

                return Array.from(groupMap.values()).map((grp, gIdx) => (
                  <div
                    key={`grp-${gIdx}`}
                    className="p-3 rounded-lg border border-slate-200 bg-white shadow-2xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="font-bold text-slate-900 truncate">
                        {grp.code ? `${grp.code} - ` : ''}{grp.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {grp.crew.length} Kru
                      </span>
                    </div>

                    <div className="space-y-1">
                      {grp.crew.map((c, cIdx) => (
                        <div
                          key={`crew-member-${c.personnel_id || cIdx}`}
                          className="flex items-center justify-between text-xs py-0.5"
                        >
                          <span className="text-slate-800 font-medium truncate max-w-[150px]">
                            {c.full_name}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              c.is_pic
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.is_pic ? 'PIC' : 'Kru'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Daftar Cuti / Izin Shift Terpilih */}
          {activeShiftInfo.absents?.length > 0 && (
            <div className="mt-3 p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1">
              <span className="font-bold text-amber-900 block">
                Personel Berhalangan / Cuti ({activeShiftInfo.absents.length} Personel):
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeShiftInfo.absents.map((ab, abIdx) => (
                  <span
                    key={`abs-${ab.personnel_id || abIdx}`}
                    className="px-2 py-1 rounded bg-white border border-amber-300 text-slate-800 font-medium text-xs"
                  >
                    {ab.full_name} ({ab.absent_reason || ab.notes || 'Cuti/Izin'})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. DUA KOLOM: JURNAL KEGIATAN 24 JAM & REKAPITULASI INSIDEN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: Logbook Rangkaian Kegiatan 24 Jam */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Jurnal Kegiatan Dinas Operasional 24 Jam (Logbook)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kronologis pelaksanaan tugas, latihan, pemeliharaan, dan siaga pergerakan
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {activities24h.length} Kegiatan
              </span>
            </div>

            {activities24h.length === 0 ? (
              <p className="text-xs text-slate-500 font-medium italic p-4 text-center bg-slate-50 rounded-lg border border-slate-200">
                Belum ada kegiatan rutin yang dicatat pada hari ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activities24h.map((act, actIdx) => (
                  <div
                    key={act.id || `act-${actIdx}`}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            act.shift_number === 1
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : act.shift_number === 2
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          }`}
                        >
                          Shift {act.shift_number || 1} • {act.team_group || 'Alpha'}
                        </span>
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {act.title}
                        </span>
                      </div>
                      <span className="font-mono tabular-nums text-red-600 text-xs font-bold shrink-0">
                        {act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB
                      </span>
                    </div>

                    {act.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {act.description}
                      </p>
                    )}

                    {act.photo_webp_url && (
                      <div className="mt-2 flex items-center gap-2 p-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
                        <img
                          src={act.photo_webp_url}
                          alt="Dokumentasi"
                          className="w-10 h-10 rounded object-cover border border-slate-300 shrink-0"
                        />
                        <span className="truncate font-medium">Dokumentasi Terlampir</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* KOLOM KANAN: Rekapitulasi Insiden 24 Jam */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Rekapitulasi Kejadian & Insiden (24 Jam)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Laporan kejadian gawat darurat dan insiden keselamatan airside
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700">
                {incidents24h.length} Insiden
              </span>
            </div>

            {incidents24h.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                <span className="font-bold block flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Kondisi Aman & Terkendali</span>
                </span>
                <p className="text-slate-600">
                  Nihil kejadian darurat maupun insiden luar biasa dilaporkan selama 24 jam operasional hari ini.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {incidents24h.map((inc, incIdx) => (
                  <div
                    key={inc.id || `inc-${incIdx}`}
                    className="p-3 rounded-lg bg-red-50/50 border border-red-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px] uppercase">
                          Shift {inc.shift_number || 1}
                        </span>
                        <span className="font-bold text-slate-900 text-sm truncate">
                          {inc.title}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-xs uppercase shrink-0">
                        {inc.priority || 'Siaga'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {inc.location || 'Airside'}
                      </span>
                      <span>•</span>
                      <span>
                        Waktu: <span className="font-mono tabular-nums">{inc.incident_time || '-'}</span> WIB
                      </span>
                    </div>

                    {inc.action_taken && (
                      <p className="text-xs text-slate-700 leading-relaxed bg-white/90 p-2 rounded border border-slate-200">
                        <strong>Tindakan:</strong> {inc.action_taken}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. PENGESAHAN 4 PEJABAT RESMI OPERASIONAL 24 JAM */}
      <MobileSignaturesSection
        deptHead={deptHeadData}
        shiftsData={shiftsData}
        shiftDate={selectedDate}
        isSheet={false}
        isClosed={isAllClosed}
      />

      {/* MODAL AUDIT TRAIL UNIT ARMADA */}
      <MobileUnitAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => {
          setIsAuditModalOpen(false);
          setSelectedAuditUnit(null);
        }}
        unit={selectedAuditUnit}
        vehicleIssues={vehicleIssues}
      />

      {/* MODAL PRATINJAU DOKUMEN RESMI A4 (Native in-app viewer) */}
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
