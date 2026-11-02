import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Download,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { formatIndoDate, cleanTeam, formatTeam, SHIFT_DEFINITIONS, getDailyRoster } from '../../../utils/shiftHelper';
import MobileSignaturesSection from './MobileSignaturesSection';
import { downloadShiftReportPdf } from '../../../services/reportService';
import { useAuth } from '../../../context/AuthContext';

/**
 * Universal A4 Document Sheet & Print Preview Modal (Desktop & Mobile)
 * Menampilkan Laporan Harian Operasional ARFF YIA 24 Jam (Merangkum 3 Shift & 3 Regu)
 * 1. Kop Naskah Dinas resmi PT Angkasa Pura Indonesia & ARFF YIA dengan double rule line
 * 2. Watermark legalitas kedinasan
 * 3. Matriks Kesiapan Armada 24 Jam (Shift 1, 2, 3)
 * 4. Presensi Kru 3 Shift & Rangkaian Kegiatan 24 Jam
 * 5. Pengesahan 4 Pejabat Dinas (3 Chief Shift + Section Head ARFF)
 */
export default function MobilePdfViewerModal({
  isOpen,
  onClose,
  shiftData,
  deptHeadData,
  vehicles = [],
  watchroomData = {},
  deployments = [],
  absents = [],
  activities = [],
  incidents = [],
  vehicleIssues = { current_issues: [], backlog_issues: [], resolved_this_shift: [] },
  shiftDate,
  shiftNumber,
  teamGroup,
  roster: propRoster,
  shiftsData,
  vehiclesDaily = [],
  activities24h = [],
  incidents24h = [],
  absents24h = [],
}) {
  const { token } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!isOpen) return null;

  const currentDate = shiftDate || shiftData?.shift_date || new Date().toISOString().split('T')[0];
  const roster = propRoster || getDailyRoster(currentDate);

  // Periksa apakah semua shift berstatus closed
  const isAllClosed = shiftsData
    ? Object.values(shiftsData).every((s) => (s.status || '').toLowerCase() === 'closed')
    : (shiftData?.status || '').toLowerCase() === 'closed';

  // Siapkan data armada
  const vehicleList = vehiclesDaily.length > 0 ? vehiclesDaily : vehicles;

  // Siapkan data kegiatan & insiden
  const actList = activities24h.length > 0 ? activities24h : activities;
  const incList = incidents24h.length > 0 ? incidents24h : incidents;

  // Buat URL endpoint PDF resmi ber-token
  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('arff_token') : '') || '';
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const encodedToken = authToken ? encodeURIComponent(authToken) : '';
  const pdfApiUrl = `${cleanBase}/reports/pdf?date=${currentDate}${encodedToken ? `&token=${encodedToken}` : ''}`;

  const handleOpenNativePdf = () => {
    if (!authToken) {
      setDownloadError('Sesi autentikasi tidak ditemukan. Harap masuk kembali.');
      return;
    }
    window.open(pdfApiUrl, '_blank');
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);

      await downloadShiftReportPdf({
        date: currentDate,
      });
    } catch (err) {
      console.error('Download PDF error:', err);
      const msg =
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : typeof err.response?.data === 'string'
          ? err.response.data
          : err?.message || 'Gagal mengunduh dokumen PDF. Silakan coba kembali.';
      setDownloadError(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="print-a4-modal-root fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 md:p-6 animate-in fade-in duration-100"
      onClick={onClose}
    >
      {/* CSS Khusus Cetak A4 Mandiri via window.print() */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: white !important;
              }
              body > * {
                visibility: hidden !important;
              }
              .print-a4-modal-root,
              .print-a4-modal-root * {
                visibility: visible !important;
              }
              .print-a4-modal-root {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                height: auto !important;
                min-height: 100% !important;
                background: white !important;
                padding: 0 !important;
                margin: 0 !important;
                z-index: 99999 !important;
              }
              .print-a4-inner {
                max-width: 100% !important;
                max-height: none !important;
                height: auto !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
              }
              .print-a4-viewport {
                background: white !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                height: auto !important;
                max-height: none !important;
              }
              #a4-document-sheet {
                border: none !important;
                box-shadow: none !important;
                padding: 1.5cm 1cm !important;
                margin: 0 auto !important;
                max-width: 100% !important;
                min-height: auto !important;
                overflow: visible !important;
              }
              .print\\:hidden {
                display: none !important;
              }
            }
          `,
        }}
      />

      <div
        className="print-a4-inner w-full max-w-full sm:max-w-3xl md:max-w-4xl lg:max-w-5xl bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 p-3 sm:p-5 space-y-3 max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar / Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 gap-2 print:hidden font-sans">
          <div className="flex items-center gap-2 truncate">
            <span className="p-1.5 rounded-lg bg-red-100 text-red-600 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div className="truncate">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 truncate">
                  Pratinjau Lembar Surat Dinas Operasional (A4)
                </h4>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    isAllClosed
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                  }`}
                >
                  {isAllClosed ? 'Sah • Rekapitulasi Final' : 'Draft • Belum Disahkan'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono tabular-nums truncate mt-0.5">
                Laporan-Harian-Operasional-ARFF-{currentDate}.pdf
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Desktop Actions */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrint}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors duration-100 active:scale-[0.99]"
                title="Cetak Dokumen"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Cetak</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNativePdf}
                className="min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 transition-colors duration-100 active:scale-[0.99]"
                title="Buka PDF Asli di Tab Baru"
              >
                <ExternalLink className="w-4 h-4 text-slate-500" />
                <span>Buka PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors duration-100 disabled:opacity-50 active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Mengunduh...' : 'Unduh Berkas'}</span>
              </button>
            </div>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors duration-100"
              aria-label="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Quick Action Buttons (< sm screens) */}
        <div className="grid grid-cols-3 gap-1.5 sm:hidden print:hidden font-sans">
          <button
            type="button"
            onClick={handleOpenNativePdf}
            className="min-h-[40px] py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors duration-100 active:scale-[0.99]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka PDF</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[40px] py-2 px-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1 transition-colors duration-100 active:scale-[0.99]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="min-h-[40px] py-2 px-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition-colors duration-100 disabled:opacity-50 active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Mengunduh...' : 'Unduh'}</span>
          </button>
        </div>

        {downloadError && (
          <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 print:hidden font-sans">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              {typeof downloadError === 'string'
                ? downloadError
                : downloadError?.message || 'Gagal mengunduh dokumen PDF.'}
            </span>
          </div>
        )}

        {/* Viewport Area: Meja Kerja (bg-slate-200/80) dengan Lembar A4 Proposional */}
        <div className="print-a4-viewport flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-200/80 p-2 sm:p-6 md:p-8">
          {/* LEMBAR DOKUMEN A4 PROPOSIONAL */}
          <div
            className="w-full max-w-[794px] mx-auto bg-white rounded-xs sm:rounded shadow-md border border-slate-300 p-4 sm:p-8 md:p-12 space-y-4 md:space-y-6 text-slate-800 font-sans relative overflow-hidden min-h-[600px] sm:min-h-[850px] md:min-h-[1123px]"
            id="a4-document-sheet"
          >
            {/* WATERMARK LEGALITAS KEDINASAN DIAGONAL */}
            {!isAllClosed ? (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                aria-hidden="true"
              >
                <div className="transform -rotate-[32deg] border-4 border-dashed border-red-500/25 px-6 py-4 sm:px-12 sm:py-6 rounded-2xl text-center max-w-[90%]">
                  <span className="text-xl sm:text-3xl md:text-5xl font-black text-red-500/20 tracking-widest uppercase block">
                    DRAFT • BELUM DISAHKAN
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-red-500/20 tracking-wider block mt-1 uppercase">
                    Dokumen Sementara Operasional • Belum Sah Menjadi Arsip Kedinasan
                  </span>
                </div>
              </div>
            ) : (
              <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                aria-hidden="true"
              >
                <div className="transform -rotate-[32deg] text-center">
                  <span className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-400/[0.08] tracking-widest uppercase block">
                    ARFF YIA • DAILY OPS REPORT
                  </span>
                </div>
              </div>
            )}

            {/* 1. KOP NASKAH DINAS RESMI PT ANGKASA PURA INDONESIA & ARFF YIA */}
            <div className="text-center pb-2 relative z-10">
              <p className="text-xs sm:text-sm md:text-base font-extrabold tracking-wider text-slate-900 uppercase">
                PT ANGKASA PURA INDONESIA
              </p>
              <p className="text-xs sm:text-sm font-bold text-red-700 uppercase tracking-wide mt-0.5">
                AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION - BANDARA INTERNASIONAL YOGYAKARTA (YIA)
              </p>
              <p className="text-xs text-slate-500 font-medium tracking-tight mt-0.5">
                Kawasan Bandara Internasional Yogyakarta, Kulon Progo, D.I. Yogyakarta 55654
              </p>

              {/* Garis Ganda Kedinasan (Double Rule Line) */}
              <div className="mt-2.5 space-y-[2px]" aria-hidden="true">
                <div className="h-[2px] bg-slate-900 w-full" />
                <div className="h-[0.75px] bg-slate-400 w-full" />
              </div>
            </div>

            {/* 2. JUDUL & NOMOR SURAT */}
            <div className="text-center py-1 relative z-10">
              <h4 className="text-xs sm:text-sm md:text-base font-black uppercase text-slate-900 tracking-wide underline leading-tight">
                LAPORAN RESMI PELAKSANAAN DINAS HARIAN OPERASIONAL (24 JAM)
              </h4>
              <p className="text-xs sm:text-sm font-mono tabular-nums text-slate-600 mt-1">
                NOMOR: DSR/ARFF-YIA/{currentDate.replace(/-/g, '')}/24H
              </p>
            </div>

            {/* 3. ROSTER 3 SHIFT & INFORMASI DINAS HARIAN */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 relative z-10 space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div>
                  <span className="text-slate-500 text-xs uppercase font-semibold">Tanggal Dinas:</span>
                  <span className="font-bold text-slate-900 ml-2">{formatIndoDate(currentDate)}</span>
                </div>
                <div>
                  <span
                    className={`inline-flex items-center font-bold px-2 py-0.5 rounded text-xs ${
                      isAllClosed
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {isAllClosed ? 'REKAPITULASI RESMI (FINAL)' : 'DRAFT • BELUM DISAHKAN'}
                  </span>
                </div>
              </div>

              {/* Grid 4 Regu Rotasi Roster */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Shift 1 (Pagi • 07-13)</span>
                  <span className="font-bold text-slate-900 block mt-0.5">Regu {roster.shift1}</span>
                  <span className="text-slate-500 text-xs truncate block">Chief: {shiftsData?.[1]?.supervisor_name || '-'}</span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Shift 2 (Siang • 13-20)</span>
                  <span className="font-bold text-slate-900 block mt-0.5">Regu {roster.shift2}</span>
                  <span className="text-slate-500 text-xs truncate block">Chief: {shiftsData?.[2]?.supervisor_name || '-'}</span>
                </div>
                <div className="p-2 rounded bg-white border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Shift 3 (Malam • 20-07)</span>
                  <span className="font-bold text-slate-900 block mt-0.5">Regu {roster.shift3}</span>
                  <span className="text-slate-500 text-xs truncate block">Chief: {shiftsData?.[3]?.supervisor_name || '-'}</span>
                </div>
                <div className="p-2 rounded bg-slate-100/80 border border-slate-200">
                  <span className="text-slate-500 font-semibold block">Lepas Piket (Off)</span>
                  <span className="font-bold text-slate-700 block mt-0.5">Regu {roster.offTeam}</span>
                  <span className="text-slate-500 text-xs block">Istirahat Dinas</span>
                </div>
              </div>
            </div>

            {/* 4. ISI DOKUMEN (BAGIAN I S/D IV) */}
            <div className="space-y-4 text-xs sm:text-sm text-slate-800 leading-relaxed relative z-10">
              {/* Bagian I: Matriks Kesiapan Unit Armada Operasional 24 Jam */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between border-b-2 border-slate-300 pb-1">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 uppercase">
                    I. Matriks Kesiapan Unit Armada Operasional & Posko (24 Jam)
                  </p>
                  <span className="text-xs text-slate-500 font-medium">
                    Shift 1 • Shift 2 • Shift 3
                  </span>
                </div>

                <div className="space-y-1 pt-1">
                  {vehicleList.length > 0 ? (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden bg-white text-xs">
                      {/* Header Kolom Matriks */}
                      <div className="grid grid-cols-12 px-3 py-1.5 bg-slate-100/80 font-bold text-slate-700 text-xs">
                        <div className="col-span-4">Armada / Posko</div>
                        <div className="col-span-2 text-center">Shift 1 (Pagi)</div>
                        <div className="col-span-2 text-center">Shift 2 (Siang)</div>
                        <div className="col-span-2 text-center">Shift 3 (Malam)</div>
                        <div className="col-span-2 text-right">Kategori</div>
                      </div>

                      {vehicleList.map((v) => {
                        const s1Status = v.shift1?.status || v.status || 'belum_dilaporkan';
                        const s2Status = v.shift2?.status || v.status || 'belum_dilaporkan';
                        const s3Status = v.shift3?.status || v.status || 'belum_dilaporkan';
                        const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';

                        const renderBadge = (st) => {
                          const isServ = st === 'serviceable';
                          const isUnserv = st === 'unserviceable';
                          return (
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded text-[11px] inline-block ${
                                isServ
                                  ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                  : isUnserv
                                  ? 'text-red-700 bg-red-50 border border-red-200'
                                  : 'text-slate-500 bg-slate-100 border border-slate-200'
                              }`}
                            >
                              {isServ ? 'Serv' : isUnserv ? 'Unserv' : 'Belum'}
                            </span>
                          );
                        };

                        return (
                          <div
                            key={v.id ?? v.code_name ?? `veh-${v.vehicle_name}`}
                            className="grid grid-cols-12 px-3 py-1.5 items-center hover:bg-slate-50/70"
                          >
                            <div className="col-span-4 min-w-0 pr-2">
                              <span className="font-bold text-slate-900 font-mono tabular-nums">{v.code_name}</span>
                              <span className="text-slate-600 block text-[11px] truncate">{v.vehicle_name}</span>
                            </div>
                            <div className="col-span-2 text-center">{renderBadge(s1Status)}</div>
                            <div className="col-span-2 text-center">{renderBadge(s2Status)}</div>
                            <div className="col-span-2 text-center">{renderBadge(s3Status)}</div>
                            <div className="col-span-2 text-right">
                              <span className="text-slate-500 font-medium uppercase text-[10px]">
                                {isPosko ? 'Posko' : v.category}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic p-2 bg-slate-50 rounded">
                      Data pemeriksaan armada terangkum otomatis melalui sistem.
                    </p>
                  )}
                </div>

                {/* Catatan Jejak Audit Kendala (Jika Ada) */}
                {(vehicleIssues.current_issues?.length > 0 ||
                  vehicleIssues.resolved_this_shift?.length > 0) && (
                  <div className="mt-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-xs text-slate-700 space-y-1">
                    <strong className="text-amber-900 block flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Catatan Jejak Audit Kendala Kendaraan:</span>
                    </strong>
                    {vehicleIssues.current_issues?.map((iss, issIdx) => (
                      <p key={`iss-${iss.id ?? issIdx}`} className="text-red-800">
                        • <strong className="font-mono tabular-nums">{iss.code_name}</strong>: Kendala tercatat ({iss.justification || 'Gangguan operasional'}).
                      </p>
                    ))}
                    {vehicleIssues.resolved_this_shift?.map((iss, resIdx) => (
                      <p key={`res-${iss.id ?? resIdx}`} className="text-emerald-800">
                        • <strong className="font-mono tabular-nums">{iss.code_name}</strong>: Pulih serviceable setelah perbaikan selesai.
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Bagian II: Presensi & Distribusi Kru 3 Shift */}
              <div className="space-y-1.5">
                <p className="font-bold border-b-2 border-slate-300 pb-1 text-xs sm:text-sm text-slate-900 uppercase">
                  II. Presensi & Distribusi Personel Dinas (3 Shift)
                </p>
                <div className="pt-0.5 space-y-2 text-xs">
                  {shiftsData ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[1, 2, 3].map((num) => {
                        const s = shiftsData[num] || {};
                        const presentCount = s.presentDeployments?.length || 0;
                        const absentCount = s.absents?.length || 0;
                        return (
                          <div key={`pres-shift-${num}`} className="p-2 rounded bg-slate-50 border border-slate-200">
                            <span className="font-bold text-slate-900 block">{s.shiftName || `Shift ${num}`} ({s.teamGroup})</span>
                            <span className="text-slate-600 block mt-0.5">
                              Hadir: <strong className="font-mono tabular-nums text-slate-900">{presentCount}</strong> Kru
                            </span>
                            <span className="text-slate-500 block">
                              Izin/Cuti: <strong className="font-mono tabular-nums text-amber-700">{absentCount}</strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-700">Distribusi personel tercatat lengkap pada setiap sesi dinas shift.</p>
                  )}

                  {absents24h.length > 0 && (
                    <p className="text-slate-600 mt-1">
                      <strong>Personel Berhalangan (<span className="font-mono tabular-nums">{absents24h.length}</span>):</strong>{' '}
                      {absents24h
                        .map((a) => `${a.full_name || a.name || 'Personel'} (${a.absent_reason || a.notes || 'Cuti/Izin'})`)
                        .join(', ')}.
                    </p>
                  )}
                </div>
              </div>

              {/* Bagian III: Jurnal Kegiatan 24 Jam (Logbook) */}
              <div className="space-y-1.5">
                <p className="font-bold border-b-2 border-slate-300 pb-1 text-xs sm:text-sm text-slate-900 uppercase">
                  III. Rangkaian Kegiatan 24 Jam (Logbook Harian)
                </p>
                {actList.length > 0 ? (
                  <div className="space-y-1 pt-0.5">
                    {actList.map((act, actIdx) => (
                      <div
                        key={act.id ?? `act-${actIdx}`}
                        className="text-slate-700 flex items-start gap-1.5 text-xs"
                      >
                        <span className="font-bold text-slate-900 shrink-0 font-mono tabular-nums">
                          • [{act.activity_time ? act.activity_time.substring(0, 5) : '-'}] (Shift {act.shift_number || 1}):
                        </span>
                        <span>
                          <strong>{act.title}</strong>
                          {act.description && <span className="text-slate-600"> — {act.description}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic pt-0.5 text-xs">Belum ada kegiatan khusus yang tercatat pada hari ini.</p>
                )}
              </div>

              {/* Bagian IV: Rekapitulasi Kejadian & Insiden 24 Jam */}
              <div className="space-y-1.5">
                <p className="font-bold border-b-2 border-slate-300 pb-1 text-xs sm:text-sm text-slate-900 uppercase">
                  IV. Rekapitulasi Kejadian & Insiden (24 Jam)
                </p>
                {incList.length > 0 ? (
                  <div className="space-y-1 pt-0.5">
                    {incList.map((inc, incIdx) => (
                      <div
                        key={inc.id ?? `inc-${incIdx}`}
                        className="text-slate-700 flex items-start gap-1.5 text-xs"
                      >
                        <span className="font-bold text-red-700 shrink-0 font-mono tabular-nums">
                          • {inc.report_number || 'INC'} (Shift {inc.shift_number || 1}):
                        </span>
                        <span>
                          <strong>{inc.title}</strong> ({inc.location || 'Airside'}), status {inc.status || 'siaga'}.
                          {inc.action_taken && <span className="text-slate-600"> Tindakan: {inc.action_taken}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-700 text-xs pt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Nihil kejadian darurat maupun insiden luar biasa selama 24 jam operasional.</span>
                  </p>
                )}
              </div>
            </div>

            {/* 5. PENGESAHAN 4 PEJABAT RESMI */}
            <MobileSignaturesSection
              deptHead={deptHeadData}
              shiftsData={shiftsData}
              shiftDate={currentDate}
              isSheet={true}
              isClosed={isAllClosed}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
