import React from 'react';
import { formatIndoDate, cleanTeam, formatTeam, SHIFT_DEFINITIONS } from '../../utils/shiftHelper';

/**
 * Komponen Presentasional Baku Lembar Pratinjau Dokumen A4 (Shared Component)
 * Mengabstraksikan Kop Resmi AP1 YIA, Metadata Shift, Margin A4, dan Tanda Tangan Pejabat
 * Dapat digunakan secara seragam di Desktop (HalamanLaporan) dan Mobile (MobilePdfViewerModal)
 */
const getAuthorizedUrl = (url) => {
  if (!url) return null;
  const token = localStorage.getItem('token') || localStorage.getItem('arff_token');
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

export default function A4DocumentLayout({
  shiftDate,
  shiftNumber = 1,
  teamGroup = 'Alpha',
  shiftData,
  deptHeadData,
  children,
  reportTitle = 'LAPORAN OPERASIONAL DINAS SHIFT',
  reportNumber,
  className = '',
  hideSignatures = false,
}) {
  const currentTeam = cleanTeam(teamGroup || shiftData?.team_group || 'Alpha');
  const currentShiftNum = Number(shiftNumber || shiftData?.shift_number || 1);
  const currentDate = shiftDate || shiftData?.shift_date || new Date().toISOString().split('T')[0];

  const shiftDef =
    SHIFT_DEFINITIONS.find((s) => s.number === currentShiftNum) ||
    SHIFT_DEFINITIONS[0];

  const autoReportNumber =
    reportNumber ||
    `DSR/ARFF-YIA/${currentDate.replace(/-/g, '')}/S${currentShiftNum}`;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto print:p-0 print:border-0 print:shadow-none text-slate-800 ${className}`}
    >
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 12mm;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .a4-avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* 1. KOP RESMI DOKUMEN PT ANGKASA PURA INDONESIA */}
      <div className="text-center pb-5 border-b-2 border-slate-900 mb-5">
        <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 leading-tight">
          PT ANGKASA PURA INDONESIA
        </h3>
        <p className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
          KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA (YIA)
        </p>
        <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
          AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION • KODE WAHI • KATEGORI 8
        </p>

        <div className="mt-4 pt-2 border-t border-slate-200">
          <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide underline">
            {reportTitle}
          </h4>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">
            NOMOR: {autoReportNumber}
          </p>
        </div>

        {/* Metadata Shift Strip Bar */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs text-slate-700 font-medium bg-slate-50 py-2 px-3 sm:px-4 rounded-lg border border-slate-200">
          <span>
            Tanggal: <strong>{formatIndoDate(currentDate)}</strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            Shift:{' '}
            <strong>
              {shiftDef.name} ({shiftDef.startTime} - {shiftDef.endTime} WIB)
            </strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            Regu: <strong>{formatTeam(currentTeam)}</strong>
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>
            Ketua Regu:{' '}
            <strong>
              {shiftData?.supervisor_name || `Chief ${formatTeam(currentTeam)}`}
            </strong>
          </span>
        </div>
      </div>

      {/* 2. KONTEN DOKUMEN LEMBAR A4 */}
      <div className="space-y-6 text-xs text-slate-700">
        {children}

        {/* 3. PENGESAHAN & TANDA TANGAN PEJABAT RESMI */}
        {!hideSignatures && (
          <div className="pt-6 border-t border-slate-200 a4-avoid-break">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider mb-3">
              Pengesahan & Validasi Serah Terima Dinas
            </h4>
            <div className="pt-2 flex flex-col sm:flex-row justify-between items-center sm:items-end gap-6 sm:gap-0">
              {/* Pejabat Section Head */}
              <div className="text-center min-w-[200px]">
                <p className="text-slate-500 mb-1 text-[11px]">Mengetahui / Menyetujui,</p>
                <p className="text-slate-700 font-bold mb-2 text-xs">
                  AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD
                </p>
                {deptHeadData?.signature_url ? (
                  <div className="h-16 flex items-center justify-center my-1">
                    <img
                      src={getAuthorizedUrl(deptHeadData.signature_url)}
                      alt="Tanda Tangan Section Head"
                      className="max-h-14 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 flex items-end justify-center pb-1">
                    <span className="text-slate-400 font-mono tracking-widest text-xs">( ......................................... )</span>
                  </div>
                )}
                <p className="font-bold text-slate-900 underline mt-1 uppercase">
                  {deptHeadData?.name || 'SECTION HEAD ARFF'}
                </p>
                {deptHeadData?.nip && deptHeadData.nip !== '-' && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIP. {deptHeadData.nip}
                  </p>
                )}
              </div>

              {/* Pejabat Supervisor / Ketua Regu */}
              <div className="text-center min-w-[200px]">
                <p className="text-slate-500 mb-1 text-[11px]">Pejabat Penanggung Jawab Shift,</p>
                <p className="text-slate-700 font-bold mb-2 text-xs">
                  KETUA REGU / SUPERVISOR DINAS ({cleanTeam(currentTeam)})
                </p>
                {shiftData?.supervisor_signature_url ? (
                  <div className="h-16 flex items-center justify-center my-1">
                    <img
                      src={getAuthorizedUrl(shiftData.supervisor_signature_url)}
                      alt="Tanda Tangan Ketua Regu"
                      className="max-h-14 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-16 flex items-end justify-center pb-1">
                    <span className="text-slate-400 font-mono tracking-widest text-xs">( ......................................... )</span>
                  </div>
                )}
                <p className="font-bold text-slate-900 underline mt-1 uppercase">
                  {shiftData?.supervisor_name || `KETUA REGU ${formatTeam(currentTeam)}`}
                </p>
                {shiftData?.supervisor_nip && shiftData.supervisor_nip !== '-' && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIP. {shiftData.supervisor_nip}
                  </p>
                )}
              </div>
            </div>

            {/* Catatan Kaki Dokumen */}
            <div className="mt-8 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
              <span>Dokumen Resmi Rekapitulasi Operasional ARFF YIA</span>
              <span>Dicetak otomatis melalui Sistem Monitoring Operasional Terpadu</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
