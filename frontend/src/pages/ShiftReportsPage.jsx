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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import { fetchShiftReportData, downloadShiftReportPdf } from '../services/reportService';
import Button from '../components/common/Button';
import MobileUnitAuditModal from '../components/mobile/reports/MobileUnitAuditModal';
import MobilePdfViewerModal from '../components/mobile/reports/MobilePdfViewerModal';
import MobileSignaturesSection from '../components/mobile/reports/MobileSignaturesSection';

export default function ShiftReportsPage() {
  const { activeDate, activeShiftNumber, activeTeam } = useAuth();
  const abortControllerRef = useRef(null);
  const successTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Data State Sesuai Standar Operasional Resmi ARFF YIA
  const [shiftData, setShiftData] = useState(null);
  const [deptHeadData, setDeptHeadData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [watchroomData, setWatchroomData] = useState({});
  const [deployments, setDeployments] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [vehicleIssues, setVehicleIssues] = useState({
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  });
  const [activities, setActivities] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Modal State
  const [selectedAuditUnit, setSelectedAuditUnit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const currentTeam = cleanTeam(activeTeam || 'Alpha');

  // Fetch data laporan operasional terpadu (Single Source of Truth)
  const fetchShiftData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setFetchError(null);

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
      console.error('Fetch shift report preview error:', err);
      setFetchError(
        'Gagal memuat pratinjau data operasional shift. Silakan periksa koneksi server atau coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchShiftData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [fetchShiftData]);

  const handleExportPDF = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      setDownloadSuccess(null);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }

      await downloadShiftReportPdf({
        date: activeDate,
        shift: activeShiftNumber,
        team: activeTeam,
      });

      setDownloadSuccess('Berkas PDF dokumen dinas resmi berhasil diunduh.');
      successTimerRef.current = setTimeout(() => {
        setDownloadSuccess(null);
      }, 4000);
    } catch (err) {
      console.error('Download PDF error:', err);
      setDownloadError(
        'Gagal mengunduh berkas PDF laporan dinas. Pastikan data shift valid.'
      );
    } finally {
      setDownloading(false);
    }
  };


  const presentDeployments = deployments.filter((d) => d.deployment_type !== 'absent');
  const serviceableCount =
    vehicles.filter((v) => v.status === 'serviceable').length +
    (watchroomData?.status === 'serviceable' ? 1 : 0);
  const unserviceableCount =
    vehicles.filter((v) => v.status === 'unserviceable').length +
    (watchroomData?.status === 'unserviceable' ? 1 : 0);
  const unverifiedCount =
    vehicles.filter((v) => !v.status || v.status === 'belum_dilaporkan').length +
    (!watchroomData?.status || watchroomData?.status === 'belum_dilaporkan' ? 1 : 0);
  const totalUnits = vehicles.length + (watchroomData?.status ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Executive Document Control Card + Integrated Horizontal Metric Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Row: Title & Document Export Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 font-sans">
              Laporan Operasional Dinas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-sans">
              Ketua Regu: <span className="font-semibold text-slate-700">{typeof shiftData?.supervisor_name === 'string' ? shiftData.supervisor_name : '-'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
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
              onClick={fetchShiftData}
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

        {/* Bottom Row: Compact 4-Column Tabular Ledger Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60 text-xs font-sans">
          {/* 1. Kesiapan Armada */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Truck className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Kesiapan Armada</span>
            </div>
            <div className="text-right">
              <span className="font-black text-slate-900 font-mono tabular-nums">{serviceableCount}/{totalUnits || 8}</span>
              <span className="ml-1.5 text-xs font-bold">
                {unserviceableCount > 0 ? (
                  <span className="text-red-600">(<span className="font-mono tabular-nums">{unserviceableCount}</span> Rusak)</span>
                ) : unverifiedCount > 0 ? (
                  <span className="text-amber-700">(<span className="font-mono tabular-nums">{unverifiedCount}</span> Belum Dicek)</span>
                ) : (
                  <span className="text-emerald-700">(Serviceable)</span>
                )}
              </span>
            </div>
          </div>

          {/* 2. Personel Dinas */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Personel Dinas</span>
            </div>
            <div className="text-right">
              <span className="font-black text-slate-900 font-mono tabular-nums">{presentDeployments.length}</span>{' '}
              <span className="font-bold text-slate-900">Hadir</span>
              <span className="ml-1.5 text-xs font-bold">
                {absents.length > 0 ? (
                  <span className="text-amber-700">(<span className="font-mono tabular-nums">{absents.length}</span> Cuti)</span>
                ) : (
                  <span className="text-emerald-700">(Nihil Cuti)</span>
                )}
              </span>
            </div>
          </div>

          {/* 3. Watch Room */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Radio className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Watch Room</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-xs font-bold ${
                watchroomData?.status === 'serviceable'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : watchroomData?.status === 'unserviceable'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {watchroomData?.status === 'serviceable'
                ? 'Serviceable'
                : watchroomData?.status === 'unserviceable'
                ? 'Unserviceable'
                : 'Belum Dicek'}
            </span>
          </div>

          {/* 4. Aktivitas & Insiden */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Logbook & Insiden</span>
            </div>
            <div className="text-right font-bold">
              <span className="text-slate-900"><span className="font-mono tabular-nums">{activities.length}</span> Giat</span>
              <span className="text-slate-300 mx-1.5">•</span>
              <span className={incidents.length > 0 ? 'text-red-600' : 'text-emerald-700'}>
                <span className="font-mono tabular-nums">{incidents.length}</span> Insiden
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Error Pemuatan Data */}
      {fetchError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{typeof fetchError === 'string' ? fetchError : (fetchError?.message || 'Gagal memuat pratinjau data operasional shift.')}</span>
          </div>
          <button
            type="button"
            onClick={fetchShiftData}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 text-xs transition-colors duration-100"
          >
            Muat Ulang Data
          </button>
        </div>
      )}

      {/* Banner Error Unduh PDF */}
      {downloadError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{typeof downloadError === 'string' ? downloadError : (downloadError?.message || 'Gagal mengunduh berkas PDF laporan dinas.')}</span>
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

      {/* Banner Sukses Unduh PDF */}
      {downloadSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{typeof downloadSuccess === 'string' ? downloadSuccess : 'Berkas PDF dokumen dinas resmi berhasil diunduh.'}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              if (successTimerRef.current) {
                clearTimeout(successTimerRef.current);
              }
              setDownloadSuccess(null);
            }}
            className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Grid Utama Laporan Dinas Format Modular */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* KOLOM KIRI: Kesiapan Unit Operasional & Posko */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Kesiapan Fasilitas & Unit Armada Operasional */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Kesiapan Unit Operasional & Posko
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih unit untuk melihat riwayat audit kendala lintas shift
                </p>
              </div>
              <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                <span className="font-mono tabular-nums">{serviceableCount}/{totalUnits || 8}</span> Serviceable
              </span>
            </div>

            {/* List Flat Rows Armada & Posko */}
            <div className="divide-y divide-slate-100">
              {vehicles.map((v) => {
                const isServ = v.status === 'serviceable';
                const isUnserv = v.status === 'unserviceable';

                return (
                  <div
                    key={v.id || v.code_name || `veh-${v.vehicle_name}`}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm truncate">
                          <span className="font-mono tabular-nums">{v.code_name}</span> - {v.vehicle_name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold font-sans uppercase">
                          {v.category === 'utama' ? 'Utama' : 'Pendukung'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                        <span>
                          PIC: <strong className="text-slate-700">{v.pic_name || 'Belum Ditunjuk'}</strong>
                        </span>
                        {v.justification && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-red-700 font-medium truncate max-w-xs">
                              {v.justification}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAuditUnit(v);
                        setIsAuditModalOpen(true);
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors duration-100 flex items-center gap-1.5 shrink-0 ${
                        isServ
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          : isUnserv
                          ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                          : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                      }`}
                      title="Klik untuk membuka riwayat audit kendala unit"
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isServ ? 'bg-emerald-600' : isUnserv ? 'bg-red-600' : 'bg-slate-400'
                        }`}
                      />
                      <span>
                        {isServ ? 'Serviceable' : isUnserv ? 'Unserviceable' : 'Belum Dicek'}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </div>
                );
              })}

              {/* Baris Posko Watch Room */}
              <div className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">
                      <span className="font-mono tabular-nums">WATCHROOM</span> - Posko ARFF
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold font-sans uppercase">
                      Posko Komunikasi
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>
                      PIC: <strong className="text-slate-700">{watchroomData?.pic_name || 'Belum Ditunjuk'}</strong>
                    </span>
                    {watchroomData?.notes && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="truncate max-w-xs">{watchroomData.notes}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAuditUnit({
                      id: 'WATCHROOM',
                      code_name: 'WATCHROOM',
                      vehicle_name: 'Posko ARFF',
                      category: 'posko',
                      status: watchroomData?.status || 'belum_dilaporkan',
                      justification: watchroomData?.notes || '',
                    });
                    setIsAuditModalOpen(true);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors duration-100 flex items-center gap-1.5 shrink-0 ${
                    watchroomData?.status === 'unserviceable'
                      ? 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                      : watchroomData?.status === 'serviceable'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
                  }`}
                  title="Klik untuk membuka audit trail watch room"
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      watchroomData?.status === 'unserviceable'
                        ? 'bg-red-600'
                        : watchroomData?.status === 'serviceable'
                        ? 'bg-emerald-600'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span>
                    {watchroomData?.status === 'unserviceable'
                      ? 'Unserviceable'
                      : watchroomData?.status === 'serviceable'
                      ? 'Serviceable'
                      : 'Belum Dicek'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Logbook Kegiatan, Insiden, & Pengesahan */}
        <div className="lg:col-span-5 space-y-6">
          {/* 2. Rangkaian Kegiatan Shift (Logbook) */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Rangkaian Kegiatan Shift
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                <span className="font-mono tabular-nums">{activities.length}</span> Kegiatan
              </span>
            </div>

            {activities.length === 0 ? (
              <p className="text-xs text-slate-600 font-medium italic p-3 text-center bg-slate-50 rounded-lg border border-slate-200">
                Belum ada kegiatan rutin yang dicatat pada sesi shift ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => (
                  <div
                    key={act.id || `act-${act.activity_time || act.title}`}
                    className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {act.title}
                      </span>
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

          {/* 3. Rekapitulasi Insiden & Kejadian Airside */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Rekapitulasi Kejadian & Insiden
              </h3>
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
              <p className="text-xs text-emerald-700 bg-emerald-50/60 p-3 rounded-lg border border-emerald-200">
                ✓ Nihil kejadian darurat maupun insiden luar biasa pada shift ini.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {incidents.map((inc) => (
                  <div
                    key={inc.id || `inc-${inc.incident_time || inc.title}`}
                    className="p-3 rounded-lg bg-red-50/50 border border-red-200 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">
                        {inc.title}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-xs uppercase">
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

          {/* 4. Pengesahan Pejabat Dinas Dinamis */}
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
            isClosed={(shiftData?.status || '').toLowerCase() === 'closed'}
          />
        </div>
      </div>

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
