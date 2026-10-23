import React, { useState } from 'react';
import { X, ExternalLink, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { formatIndoDate, cleanTeam, formatTeam, SHIFT_DEFINITIONS } from '../../../utils/shiftHelper';
import MobileSignaturesSection from './MobileSignaturesSection';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

/**
 * Dual-Action Mobile PDF Viewer Modal (Anti-Iframe Bug)
 * 1. Merender pratinjau lembar A4 resmi secara native in-app (bebas freeze/glitch iframe)
 * 2. Tombol "Buka Layar Penuh" (membuka PDF asli di viewer bawaan mobile)
 * 3. Tombol "Unduh Berkas" (mengunduh PDF resmi langsung ke storage smartphone)
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
}) {
  const { token } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);

  if (!isOpen) return null;

  const currentTeam = cleanTeam(teamGroup || shiftData?.team_group || 'Alpha');
  const currentShiftNum = Number(shiftNumber || shiftData?.shift_number || 1);
  const currentDate = shiftDate || shiftData?.shift_date || new Date().toISOString().split('T')[0];

  const shiftDef = SHIFT_DEFINITIONS.find((s) => s.number === currentShiftNum) || SHIFT_DEFINITIONS[0];

  // Helper untuk hitung unit serviceable
  const serviceableCount = vehicles.filter((v) => v.status === 'serviceable').length + (watchroomData?.status === 'serviceable' ? 1 : 0);
  const totalUnits = Math.max(vehicles.length + (watchroomData?.status ? 1 : 0), 8);

  // Buat URL endpoint PDF resmi ber-token agar aman saat dibuka di tab baru (native PDF viewer)
  const authToken = token || localStorage.getItem('arff_token') || '';
  const apiBase = import.meta.env.VITE_API_URL || '/api';
  const cleanBase = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase;
  const encodedToken = authToken ? encodeURIComponent(authToken) : '';
  const pdfApiUrl = `${cleanBase}/reports/pdf?date=${currentDate}&shift=${currentShiftNum}&team_group=${currentTeam}${encodedToken ? `&token=${encodedToken}` : ''}`;

  const handleOpenNativePdf = () => {
    if (!authToken) {
      setDownloadError('Sesi autentikasi tidak ditemukan. Harap masuk kembali.');
      return;
    }
    // Buka di tab baru (native PDF viewer smartphone)
    window.open(pdfApiUrl, '_blank');
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);

      // Gunakan path relatif tanpa awalan /api ganda karena baseURL Axios sudah /api
      const res = await api.get(
        `/reports/pdf?date=${currentDate}&shift=${currentShiftNum}&team_group=${currentTeam}`,
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Laporan-Shift-${currentShiftNum}-${currentTeam}-${currentDate}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download PDF error:', err);
      setDownloadError('Gagal mengunduh dokumen PDF. Silakan coba kembali.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[412px] bg-white rounded-t-2xl border-t border-slate-200 p-3 space-y-2.5 max-h-[92vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="p-1 rounded-md bg-red-100 text-red-600 flex-shrink-0">
              <FileText className="w-4 h-4" />
            </span>
            <div className="truncate">
              <h4 className="text-xs font-bold text-slate-900 truncate">
                Pratinjau Lembar Dokumen A4
              </h4>
              <p className="text-[9px] text-slate-500 font-mono truncate">
                Laporan-Shift-{currentShiftNum}-{currentTeam}-{currentDate}.pdf
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors duration-100 flex-shrink-0"
            aria-label="Tutup Pratinjau"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual-Action Quick Buttons */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={handleOpenNativePdf}
            className="py-2 px-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[10.5px] flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100 active:scale-[0.99]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Layar Penuh</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="py-2 px-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[10.5px] flex items-center justify-center gap-1.5 transition-colors duration-100 disabled:opacity-50 active:scale-[0.99]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>{downloading ? 'Mengunduh...' : 'Unduh Berkas'}</span>
          </button>
        </div>

        {downloadError && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
        )}

        {/* In-App Visual Document Sheet Preview (Simulasi Lembar Standar A4) */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-slate-100 p-2 text-xs">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs p-3 space-y-2.5 min-h-[380px] text-[9.5px] text-slate-800 font-sans">
            {/* Kop Dokumen Resmi PT Angkasa Pura Indonesia */}
            <div className="text-center border-b-2 border-slate-900 pb-1.5 mb-1.5">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-900 leading-tight">
                PT ANGKASA PURA INDONESIA
              </h3>
              <p className="text-[9px] font-bold text-slate-800 leading-tight">
                KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA (YIA)
              </p>
              <p className="text-[8px] text-slate-600 font-medium leading-tight">
                AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION • KODE WAHI • KATEGORI 8
              </p>
            </div>

            {/* Judul & Nomor Surat */}
            <div className="text-center py-0.5">
              <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-wide underline leading-tight">
                LAPORAN OPERASIONAL DINAS SHIFT
              </h4>
              <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                NOMOR: DSR/ARFF-YIA/{currentDate.replace(/-/g, '')}/S{currentShiftNum}
              </p>
            </div>

            {/* Matriks Info Dinas */}
            <div className="grid grid-cols-2 gap-1 text-[8.5px] bg-slate-50 p-1.5 rounded border border-slate-200">
              <div>
                Tanggal Dinas: <strong>{formatIndoDate(currentDate)}</strong>
              </div>
              <div>
                Shift: <strong>{shiftDef.name} ({shiftDef.startTime} – {shiftDef.endTime} WIB)</strong>
              </div>
              <div>
                Regu Dinas: <strong>{formatTeam(currentTeam)}</strong>
              </div>
              <div>
                Ketua Regu: <strong>{shiftData?.supervisor_name || `Chief ${formatTeam(currentTeam)}`}</strong>
              </div>
            </div>

            {/* Isi Bagian Dokumen */}
            <div className="space-y-2 text-[8.5px] text-slate-800 leading-relaxed">
              {/* Bagian I: Armada */}
              <div>
                <p className="font-bold border-b border-slate-200 pb-0.5 text-slate-900 uppercase">
                  I. Rekapitulasi Kesiapan 8 Unit Armada Operasional
                </p>
                <div className="pt-0.5 space-y-0.5 text-slate-700">
                  {vehicles.length > 0 ? (
                    vehicles.map((v) => (
                      <div key={v.id || v.code_name} className="flex justify-between items-center py-0.2">
                        <span>
                          • <strong>{v.code_name} - {v.vehicle_name}</strong> ({v.pic_name ? `PIC: ${v.pic_name}` : 'PIC Belum Ditunjuk'})
                        </span>
                        <span
                          className={`font-bold text-[8px] px-1 py-0.2 rounded ${
                            v.status === 'serviceable'
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {v.status === 'serviceable' ? 'Serviceable' : 'Unserviceable'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic">Data pemeriksaan armada terangkum otomatis.</p>
                  )}
                  {watchroomData && watchroomData.status && (
                    <div className="flex justify-between items-center py-0.2 border-t border-slate-100 mt-0.5 pt-0.5">
                      <span>• <strong>Watchroom Posko ARFF</strong></span>
                      <span className="font-bold text-[8px] px-1 py-0.2 rounded text-emerald-700 bg-emerald-50">
                        {watchroomData.status === 'serviceable' ? 'Serviceable' : 'Unserviceable'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Catatan Audit Trail jika ada */}
                {(vehicleIssues.current_issues?.length > 0 || vehicleIssues.resolved_this_shift?.length > 0) && (
                  <div className="mt-1 p-1 bg-amber-50/70 border border-amber-200 rounded text-[7.5px] text-slate-700 space-y-0.5">
                    <strong className="text-amber-900 block">Catatan Jejak Audit Kendala:</strong>
                    {vehicleIssues.current_issues?.map((iss) => (
                      <p key={`iss-${iss.id}`} className="text-red-800">
                        • {iss.code_name}: Kendala tercatat ({iss.justification || 'Gangguan operasional'}).
                      </p>
                    ))}
                    {vehicleIssues.resolved_this_shift?.map((iss) => (
                      <p key={`res-${iss.id}`} className="text-emerald-800">
                        • {iss.code_name}: Pulih serviceable pada shift ini setelah perbaikan.
                      </p>
                    ))}
                  </div>
                )}
                <p className="text-slate-500 text-[7.5px] italic mt-0.5">
                  Kesiapan: {serviceableCount} Unit Serviceable • {totalUnits - serviceableCount} Unserviceable / Perbaikan.
                </p>
              </div>

              {/* Bagian II: Presensi */}
              <div>
                <p className="font-bold border-b border-slate-200 pb-0.5 text-slate-900 uppercase">
                  II. Presensi & Distribusi Personel Dinas
                </p>
                <p className="text-slate-700 pt-0.5">
                  Distribusi Penugasan: <strong>{deployments.length} Personel Aktif</strong> bertugas pada unit armada dan posko watchroom.
                </p>
                {absents.length > 0 ? (
                  <p className="text-slate-700">
                    Personel Berhalangan ({absents.length}):{' '}
                    {absents.map((a) => `${a.full_name || a.name || 'Personel'} (${a.leave_type || a.notes || 'Cuti/Izin'})`).join(', ')}.
                  </p>
                ) : (
                  <p className="text-emerald-700 text-[8px]">
                    ✓ Seluruh anggota regu terdata hadir lengkap tanpa keterangan izin/cuti.
                  </p>
                )}
              </div>

              {/* Bagian III: Logbook Kegiatan */}
              <div>
                <p className="font-bold border-b border-slate-200 pb-0.5 text-slate-900 uppercase">
                  III. Rangkaian Kegiatan Shift (Logbook)
                </p>
                {activities.length > 0 ? (
                  <div className="space-y-0.5 pt-0.5">
                    {activities.map((act) => (
                      <div key={act.id} className="text-slate-700">
                        • <strong>{act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB</strong>: {act.title}
                        {act.description && <span className="text-slate-500"> — {act.description}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic pt-0.5">Belum ada kegiatan rutin yang tercatat pada sesi shift ini.</p>
                )}
              </div>

              {/* Bagian IV: Laporan Insiden */}
              <div>
                <p className="font-bold border-b border-slate-200 pb-0.5 text-slate-900 uppercase">
                  IV. Rekapitulasi Kejadian & Insiden (Airside)
                </p>
                {incidents.length > 0 ? (
                  <div className="space-y-0.5 pt-0.5">
                    {incidents.map((inc) => (
                      <div key={inc.id} className="text-slate-700">
                        • <strong>{inc.report_number || 'INC'}:</strong> {inc.title} ({inc.location || 'Airside'}), status {inc.status || 'siaga'}.
                        {inc.action_taken && <span className="text-slate-500"> Tindakan: {inc.action_taken}</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-700 text-[8px] pt-0.5">
                    ✓ Nihil kejadian atau insiden luar biasa selama shift berlangsung. Kondisi pergerakan airside aman dan lancar.
                  </p>
                )}
              </div>
            </div>

            {/* Pejabat Penandatangan Resmi (Sesuai Aturan GEMINI.md Butir 4 & 7) */}
            <MobileSignaturesSection
              deptHead={deptHeadData}
              supervisor={{
                name: shiftData?.supervisor_name,
                nip: shiftData?.supervisor_nip,
                signature_url: shiftData?.supervisor_signature_url,
                team_group: currentTeam,
              }}
              shiftDate={currentDate}
              teamGroup={currentTeam}
              isSheet={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
