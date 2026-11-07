import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ExternalLink,
  Download,
  Printer,
  FileText,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { formatIndoDate } from '../../../utils/shiftHelper';
import MobileSignaturesSection from './MobileSignaturesSection';
import { downloadShiftReportPdf } from '../../../services/reportService';

/**
 * Universal A4 Document Sheet & Print Preview Modal (Desktop & Mobile)
 * Laporan Harian Kesiapan Armada & Operasional Airside (3 Shift)
 * 1. Kop Resmi PT Angkasa Pura Indonesia & ARFF YIA
 * 2. Strip Tanggal Kedinasan (Cukup Tanggal Saja)
 * 3. Matriks Kesiapan Armada: No | Armada | [Regu 1] | [Regu 2] | [Regu 3] (Tanpa Kolom Catatan/Kendala)
 * 4. Kekuatan Personel 3 Regu, Jurnal 24 Jam, dan Rekapitulasi Insiden
 * 5. 4 Blok Pengesahan Resmi (3 Ketua Regu di KIRI, Section Head di KANAN)
 */
export default function MobilePdfViewerModal({
  isOpen,
  onClose,
  shiftDate,
  roster = { shift_1: 'Delta', shift_2: 'Charlie', shift_3: 'Alpha', off_team: 'Bravo' },
  matrixVehicles = [],
  vehicles = [],
  personnelSummary = {},
  activities = [],
  incidents = [],
  chiefs = {},
  deptHeadData = null,
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const currentDate = shiftDate || new Date().toISOString().split('T')[0];
  const unitList = matrixVehicles.length > 0 ? matrixVehicles : vehicles;

  const team1 = roster?.shift_1 || 'Shift 1';
  const team2 = roster?.shift_2 || 'Shift 2';
  const team3 = roster?.shift_3 || 'Shift 3';

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);

      await downloadShiftReportPdf({
        date: currentDate,
      });
    } catch (err) {
      console.error('Download PDF error:', err);
      let msg = 'Gagal mengunduh dokumen PDF. Silakan coba kembali.';
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const json = JSON.parse(text);
          msg = json.message || json.error || text;
        } catch {
          msg = err?.message || msg;
        }
      } else if (typeof err?.response?.data?.message === 'string') {
        msg = err.response.data.message;
      } else if (typeof err?.response?.data === 'string') {
        msg = err.response.data;
      } else if (err?.message) {
        msg = err.message;
      }
      setDownloadError(msg);
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenNativePdf = async () => {
    await handleDownloadPdf();
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      className="print-a4-modal-root fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 md:p-6 pb-8 safe-pb sm:pb-4 md:pb-6 animate-in fade-in duration-100"
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
                  Pratinjau Lembar Surat Dinas (A4)
                </h4>
                <span className="px-2 py-0.5 rounded text-xs font-bold border bg-slate-100 text-slate-700 border-slate-300">
                  Laporan Harian
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono tabular-nums truncate mt-0.5">
                laporan-harian-arff-{currentDate}.pdf
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
                onClick={handleDownloadPdf}
                disabled={downloading}
                className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors duration-100 disabled:opacity-50 active:scale-[0.99]"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Mengunduh...' : 'Unduh Dokumen PDF'}</span>
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
        <div className="grid grid-cols-2 gap-2 sm:hidden print:hidden font-sans">
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="min-h-[40px] py-2 px-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100 disabled:opacity-50 active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Mengunduh...' : 'Unduh Dokumen PDF'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="min-h-[40px] py-2 px-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors duration-100 active:scale-[0.99]"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Cetak</span>
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
            {/* WATERMARK RESMI BERSIH DIAGONAL */}
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

            {/* 1. KOP NASKAH DINAS RESMI PT ANGKASA PURA INDONESIA & ARFF YIA (4 BARIS BAKU) */}
            <div className="text-center pb-2 relative z-10">
              <p className="text-xs sm:text-sm md:text-base font-extrabold tracking-wider text-slate-900 uppercase">
                PT ANGKASA PURA INDONESIA
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wide mt-0.5">
                KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA (YIA)
              </p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide mt-0.5">
                AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION
              </p>
              <p className="text-xs font-bold text-red-700 tracking-wide mt-0.5">
                KODE WAHI • KATEGORI 8
              </p>

              {/* Garis Ganda Kedinasan (Double Rule Line: Tebal 2px & Tipis 0.75px) */}
              <div className="mt-2.5 space-y-[2px]" aria-hidden="true">
                <div className="h-[2px] bg-slate-900 w-full" />
                <div className="h-[0.75px] bg-slate-400 w-full" />
              </div>
            </div>

            {/* 2. STRIP INFORMASI TANGGAL KEDINASAN RINGKAS (CUKUP TANGGAL SAJA) */}
            <div className="px-3.5 py-2 bg-slate-50 rounded-lg border border-slate-200 text-xs sm:text-sm relative z-10">
              <span className="text-slate-500 font-semibold uppercase text-xs mr-2">Hari / Tanggal:</span>
              <span className="font-bold text-slate-900">{formatIndoDate(currentDate)}</span>
            </div>

            {/* 3. ISI DOKUMEN: SEKSI I S/D IV */}
            <div className="space-y-5 text-xs sm:text-sm text-slate-800 leading-relaxed relative z-10">
              {/* Bagian I: Matriks Kesiapan Armada Operasional & Posko (Tanpa Catatan / Kendala) */}
              <div className="space-y-2">
                <div className="border-b-2 border-slate-300 pb-1">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 uppercase">
                    I. Matriks Kesiapan Armada Operasional & Posko Komunikasi
                  </p>
                </div>

                <div className="border border-[#cbd5e1] rounded-lg overflow-hidden bg-white shadow-2xs">
                  {/* Table Header Row 5 Kolom: No (1) | Armada (5) | [Regu 1] (2) | [Regu 2] (2) | [Regu 3] (2) */}
                  <div className="grid grid-cols-12 bg-[#f1f5f9] border-b border-[#cbd5e1] text-xs font-bold text-[#0f172a] py-2 px-2.5">
                    <span className="col-span-1 text-center">No</span>
                    <span className="col-span-5">Armada</span>
                    <span className="col-span-2 text-center">{team1}</span>
                    <span className="col-span-2 text-center">{team2}</span>
                    <span className="col-span-2 text-center">{team3}</span>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {unitList.map((v, idx) => {
                      const s1Stat = (v.shift_1?.status || 'belum_dilaporkan').toLowerCase();
                      const s2Stat = (v.shift_2?.status || 'belum_dilaporkan').toLowerCase();
                      const s3Stat = (v.shift_3?.status || 'belum_dilaporkan').toLowerCase();

                      const renderStatusBadge = (stat) => {
                        if (stat === 'serviceable') {
                          return <span className="font-bold text-emerald-700">Serviceable</span>;
                        }
                        if (stat === 'unserviceable') {
                          return <span className="font-bold text-red-600">Unserviceable</span>;
                        }
                        return <span className="font-medium text-slate-500">Belum Dicek</span>;
                      };

                      return (
                        <div
                          key={v.id ?? `v-row-${idx}`}
                          className={`grid grid-cols-12 items-center py-2 px-2.5 ${
                            idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'
                          }`}
                        >
                          <span className="col-span-1 text-center font-mono tabular-nums text-slate-500">
                            {idx + 1}
                          </span>
                          <span className="col-span-5 font-bold text-slate-900 truncate pr-2">
                            {v.vehicle_name || v.code_name}
                          </span>
                          <span className="col-span-2 text-center">
                            {renderStatusBadge(s1Stat)}
                          </span>
                          <span className="col-span-2 text-center">
                            {renderStatusBadge(s2Stat)}
                          </span>
                          <span className="col-span-2 text-center">
                            {renderStatusBadge(s3Stat)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Bagian II: Kekuatan & Distribusi Personel Dinas (3 Regu Operasional) */}
              <div className="space-y-2">
                <div className="border-b-2 border-slate-300 pb-1">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 uppercase">
                    II. Kekuatan & Distribusi Personel Dinas (3 Regu Operasional)
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  {[
                    { sNum: 1, team: team1, time: 'Pagi (07:00 – 13:00 WIB)', data: personnelSummary?.shift_1 },
                    { sNum: 2, team: team2, time: 'Siang (13:00 – 20:00 WIB)', data: personnelSummary?.shift_2 },
                    { sNum: 3, team: team3, time: 'Malam (20:00 – 07:00 WIB)', data: personnelSummary?.shift_3 },
                  ].map((s) => {
                    const pData = s.data || {};
                    const presentCount = pData.present_count || (Array.isArray(pData.present) ? pData.present.length : 0);
                    const absentList = Array.isArray(pData.absents) ? pData.absents : [];
                    const absentCount = absentList.length;

                    return (
                      <div key={`summary-box-${s.sNum}`} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                        <span className="font-bold text-slate-900 block">
                          Shift {s.sNum} — Regu {s.team}
                        </span>
                        <span className="text-slate-500 block text-[11px]">{s.time}</span>
                        <p className="text-emerald-700 font-semibold pt-0.5">
                          ✓ <span className="font-mono tabular-nums">{presentCount}</span> Personel Hadir
                        </p>
                        {absentCount > 0 ? (
                          <p className="text-red-700 text-[11px] truncate" title={absentList.map(a => a.full_name).join(', ')}>
                            • <span className="font-mono tabular-nums">{absentCount}</span> Cuti/Izin
                          </p>
                        ) : (
                          <p className="text-slate-500 text-[11px]">Nihil izin / cuti dinas.</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bagian III: Jurnal Kegiatan Rutin Operasional (24 Jam) */}
              <div className="space-y-1.5">
                <div className="border-b-2 border-slate-300 pb-1">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 uppercase">
                    III. Jurnal Kegiatan Rutin Operasional (24 Jam)
                  </p>
                </div>
                {activities.length > 0 ? (
                  <div className="space-y-1 pt-0.5">
                    {activities.map((act, actIdx) => (
                      <div
                        key={act.id ?? `act-${actIdx}`}
                        className="text-slate-700 flex items-start gap-1.5 text-xs"
                      >
                        <span className="font-bold text-slate-900 shrink-0 font-mono tabular-nums">
                          • {act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB:
                        </span>
                        <span>
                          <strong>{act.title}</strong>
                          {act.description && <span className="text-slate-600"> — {act.description}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic pt-0.5 text-xs">Belum ada agenda operasional harian yang tercatat.</p>
                )}
              </div>

              {/* Bagian IV: Rekapitulasi Kejadian & Insiden Operasional (24 Jam) */}
              <div className="space-y-1.5">
                <div className="border-b-2 border-slate-300 pb-1">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 uppercase">
                    IV. Rekapitulasi Kejadian & Insiden Operasional (24 Jam)
                  </p>
                </div>
                {incidents.length > 0 ? (
                  <div className="space-y-1 pt-0.5">
                    {incidents.map((inc, incIdx) => (
                      <div
                        key={inc.id ?? `inc-${incIdx}`}
                        className="p-2 rounded bg-red-50/70 border border-red-200 text-xs text-slate-700"
                      >
                        <p className="font-bold text-red-900 font-mono tabular-nums">
                          [{inc.report_number || 'INSIDEN'}] {inc.title} (Waktu: {inc.incident_time || '-'})
                        </p>
                        <p className="text-red-800 text-[11px] mt-0.5">
                          Lokasi: {inc.location || '-'} | Tindakan: {inc.action_taken || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-700 text-xs pt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>NIHIL — Seluruh operasional penerbangan dan fasilitas bandara berlangsung dalam kondisi aman terkendali.</span>
                  </p>
                )}
              </div>
            </div>

            {/* 4. PENGESAHAN PEJABAT RESMI: 3 Ketua Regu di KIRI + Section Head di KANAN */}
            <MobileSignaturesSection
              deptHead={deptHeadData}
              chiefs={chiefs}
              shiftDate={currentDate}
              roster={roster}
              isSheet={true}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
