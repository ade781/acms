import React, { useState, useEffect } from 'react';
import { Check, X, Camera, AlertCircle, RefreshCw, Pencil } from 'lucide-react';
import api from '../../../services/api';
import { compressImageToWebP } from '../../../utils/imageCompressor';
import { blobToDataUrl } from '../../../utils/fileHelper';
import { cleanTeam } from '../../../utils/shiftHelper';

export default function MobilePicReadinessForm({
  dutyInfo,
  activeDate,
  activeShiftNumber,
  activeTeam,
  vehicleReadiness,
  onSuccess,
  onOpenAuditModal
}) {
  // Hanya tampil jika user adalah PIC yang sah
  if (!dutyInfo || !dutyInfo.is_pic) {
    return null;
  }

  const vehicleId = dutyInfo.vehicle_id;
  const vehicleName = dutyInfo.vehicle_name || dutyInfo.vehicle_code || 'Armada Operasional';
  const vehicleCode = dutyInfo.vehicle_code || 'UNIT';

  const isPosko = Boolean(
    dutyInfo?.category === 'posko' ||
    dutyInfo?.vehicle_code === 'WATCHROOM' ||
    dutyInfo?.code_name === 'WATCHROOM' ||
    dutyInfo?.deployment_type === 'watchroom' ||
    vehicleReadiness?.category === 'posko' ||
    vehicleReadiness?.code_name === 'WATCHROOM'
  );

  // Periksa apakah unit ini sudah dilaporkan pada shift berjalan
  // Unit HANYA dianggap sudah dilaporkan jika statusnya bukan 'belum_dilaporkan' dan bukan unserviceable estafet
  const hasShiftLog = Boolean(
    vehicleReadiness?.has_shift_log ||
    (vehicleReadiness?.status && vehicleReadiness.status !== 'belum_dilaporkan' && !vehicleReadiness?.is_carried_over)
  );

  const isCurrentlyServiceable = vehicleReadiness?.status === 'serviceable';
  const isCurrentlyUnserviceable = vehicleReadiness?.status === 'unserviceable' && !vehicleReadiness?.is_carried_over;

  // State mode edit jika laporan sudah ada
  const [isEditing, setIsEditing] = useState(false);

  // State kesiapan: inisialisasi '' jika unit belum dilaporkan
  const initialStatus = vehicleReadiness?.status === 'unserviceable'
    ? 'unserviceable'
    : (hasShiftLog && vehicleReadiness?.status === 'serviceable' ? 'serviceable' : '');
  const [status, setStatus] = useState(initialStatus);

  // 4 Checklist Fasilitas Khusus Posko Watchroom
  const rawNotes = vehicleReadiness?.notes || '';
  const [radioVhf, setRadioVhf] = useState(!rawNotes.includes('Radio VHF: FAIL'));
  const [hotlineAtc, setHotlineAtc] = useState(!rawNotes.includes('Hotline ATC: FAIL'));
  const [crashBell, setCrashBell] = useState(!rawNotes.includes('Crash Bell: FAIL'));
  const [cctvPc, setCctvPc] = useState(!rawNotes.includes('CCTV/PC: FAIL'));

  const [justification, setJustification] = useState(vehicleReadiness?.justification || '');
  const [notes, setNotes] = useState(
    isPosko
      ? rawNotes.replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim()
      : (vehicleReadiness?.notes || '')
  );
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(vehicleReadiness?.photo_webp_url || null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Periksa apakah unit ini berstatus estafet / bawaan unserviceable
  const isCarriedOver = Boolean(
    vehicleReadiness?.is_carried_over ||
    (vehicleReadiness?.status === 'unserviceable' && vehicleReadiness?.carried_from)
  );

  const wasInitiallyUnserviceable = vehicleReadiness?.status === 'unserviceable';

  const allChecked = radioVhf && hotlineAtc && crashBell && cctvPc;
  const effectiveStatus = isPosko ? (!allChecked ? 'unserviceable' : status) : status;

  useEffect(() => {
    if (vehicleReadiness) {
      if (vehicleReadiness.status === 'unserviceable') {
        setStatus('unserviceable');
        setJustification(vehicleReadiness.justification || vehicleReadiness.notes || '');
      } else if (vehicleReadiness.status === 'serviceable' && (vehicleReadiness.has_shift_log || !vehicleReadiness.is_carried_over)) {
        setStatus('serviceable');
        setNotes(vehicleReadiness.notes || '');
      } else {
        setStatus('');
      }
      if (vehicleReadiness.photo_webp_url) {
        setPhotoPreview(vehicleReadiness.photo_webp_url);
      }
      const raw = vehicleReadiness.notes || '';
      if (isPosko) {
        setRadioVhf(!raw.includes('Radio VHF: FAIL'));
        setHotlineAtc(!raw.includes('Hotline ATC: FAIL'));
        setCrashBell(!raw.includes('Crash Bell: FAIL'));
        setCctvPc(!raw.includes('CCTV/PC: FAIL'));
        setNotes(raw.replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim());
      }
    }
  }, [vehicleReadiness, isPosko]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setErrorMsg(null);
    if (vehicleReadiness) {
      if (vehicleReadiness.status === 'unserviceable') {
        setStatus('unserviceable');
      } else if (vehicleReadiness.status === 'serviceable' && (vehicleReadiness.has_shift_log || !vehicleReadiness.is_carried_over)) {
        setStatus('serviceable');
      } else {
        setStatus('');
      }
      setJustification(vehicleReadiness.justification || '');
      setNotes(vehicleReadiness.notes || '');
      setPhotoPreview(vehicleReadiness.photo_webp_url || null);
      setPhotoFile(null);
      const raw = vehicleReadiness.notes || '';
      if (isPosko) {
        setRadioVhf(!raw.includes('Radio VHF: FAIL'));
        setHotlineAtc(!raw.includes('Hotline ATC: FAIL'));
        setCrashBell(!raw.includes('Crash Bell: FAIL'));
        setCctvPc(!raw.includes('CCTV/PC: FAIL'));
        setNotes(raw.replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim());
      }
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setCompressing(true);
    try {
      const compressedWebP = await compressImageToWebP(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8,
      });
      const dataUrl = await blobToDataUrl(compressedWebP);
      setPhotoFile(compressedWebP);
      setPhotoPreview(dataUrl);
    } catch (err) {
      setErrorMsg(`Gagal memproses gambar: ${err?.message || 'Format tidak valid'}`);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Percabangan 1: Posko Watchroom
    if (isPosko) {
      const finalStatus = !allChecked ? 'unserviceable' : status;
      if (!finalStatus) {
        setErrorMsg('Harap tentukan status kelaikan posko watchroom terlebih dahulu (pilih Serviceable atau Unserviceable).');
        return;
      }

      const cleanNotes = (notes || '').replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim();
      const cleanJustification = (justification || '').trim();
      const poskoNotes = cleanNotes || cleanJustification;

      if (finalStatus === 'unserviceable' && !poskoNotes) {
        setErrorMsg('Catatan kendala fasilitas watchroom wajib diisi apabila ada item yang unserviceable.');
        return;
      }

      const checkSummary = `[Fasilitas: Radio VHF: ${radioVhf ? 'OK' : 'FAIL'} | Hotline ATC: ${hotlineAtc ? 'OK' : 'FAIL'} | Crash Bell: ${crashBell ? 'OK' : 'FAIL'} | CCTV/PC: ${cctvPc ? 'OK' : 'FAIL'}] ${poskoNotes}`.trim();

      setSubmitting(true);
      try {
        const res = await api.post('/readiness/watchroom', {
          shift_date: activeDate,
          shift_number: activeShiftNumber,
          team_group: cleanTeam(activeTeam),
          status: finalStatus,
          notes: checkSummary,
        });

        const msg = res.data?.message || 'Kesiapan fasilitas posko watchroom berhasil dilaporkan.';
        setSuccessMsg(msg);
        setIsEditing(false);
        window.dispatchEvent(new CustomEvent('arff:readiness-updated', { detail: res.data }));
        if (onSuccess) {
          onSuccess(res.data?.data || res.data);
        }
      } catch (err) {
        console.error('Error submitting watchroom readiness:', err);
        const msg = typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan status watchroom.'));
        setErrorMsg(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Percabangan 2: Kendaraan Bermotor Operasional Biasa
    if (!status) {
      setErrorMsg('Harap tentukan status kelaikan armada terlebih dahulu (pilih Serviceable atau Unserviceable).');
      return;
    }

    // Validasi Foto Fisik Wajib untuk Kendaraan
    if (!photoFile && !photoPreview) {
      setErrorMsg('Foto fisik armada wajib diunggah/diambil untuk membuktikan pemeriksaan kondisi lapangan.');
      return;
    }

    // Validasi keterangan
    if (status === 'unserviceable' && (!justification || justification.trim().length < 3)) {
      setErrorMsg('Keterangan kerusakan dan justifikasi kendala wajib diisi jika kondisi armada Unserviceable.');
      return;
    }

    if (status === 'serviceable' && wasInitiallyUnserviceable && (!notes || notes.trim().length < 3)) {
      setErrorMsg('Catatan tindak lanjut pemulihan/perbaikan wajib diisi ketika memulihkan status armada ke Serviceable.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('vehicle_id', vehicleId);
      formData.append('shift_date', activeDate);
      formData.append('shift_number', activeShiftNumber);
      formData.append('team_group', cleanTeam(activeTeam));
      formData.append('status', status);

      if (status === 'unserviceable') {
        const cleanDesc = justification.trim();
        formData.append('justification', cleanDesc);
        formData.append('notes', cleanDesc);
        formData.append('follow_up_status', 'pending');
      } else {
        formData.append('follow_up_status', 'resolved');
        if (notes.trim()) {
          formData.append('notes', notes.trim());
        }
      }

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.post('/readiness/vehicles', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const msg = res.data?.message || 'Kesiapan armada berhasil dilaporkan.';
      setSuccessMsg(msg);
      setIsEditing(false);
      window.dispatchEvent(new CustomEvent('arff:readiness-updated', { detail: res.data }));
      if (onSuccess) {
        onSuccess(res.data?.data || res.data);
      }
    } catch (err) {
      console.error('Error submitting vehicle readiness:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan status kesiapan armada.'));
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={`rounded-xl border p-3 shadow-[0_1px_3px_rgba(28,25,23,0.04)] space-y-2.5 transition-colors duration-100 font-sans ${hasShiftLog && !isEditing
          ? isCurrentlyServiceable
            ? 'bg-emerald-50/15 border-emerald-300'
            : 'bg-red-50/20 border-red-300'
          : hasShiftLog && isEditing
            ? 'bg-white border-[#E5DFD5]'
            : 'bg-white border-amber-200/90'
        }`}
    >
      {/* Header Formulir PIC */}
      <div className="flex items-center justify-between border-b border-[#EFECE6] pb-2">
        <div>
          <h3 className="text-xs font-bold text-[#1C1917] uppercase leading-none">
            Lapor Kesiapan Unit (PIC)
          </h3>
          {hasShiftLog && vehicleReadiness?.logged_at && (
            <p className="text-xs text-[#57534E] mt-1">
              Tercatat pukul{' '}
              <span className="font-mono tabular-nums">
                {new Date(vehicleReadiness.logged_at)
                  .toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                  .replace('.', ':')}
              </span>{' '}
              WIB
            </p>
          )}
        </div>
        <span className="text-xs font-mono tabular-nums font-bold px-1.5 py-0.5 rounded bg-[#F7F5F0] text-[#44403C] border border-[#EAE4DC] shrink-0">
          {vehicleCode}
        </span>
      </div>

      {/* TAMPILAN 1: KETIKA SUDAH DICEK DAN TIDAK SEDANG DALAM MODE EDIT */}
      {hasShiftLog && !isEditing ? (
        <div className="space-y-2.5">
          {/* Banner Status Konfirmasi Verifikasi (Tunggal & Bersih) */}
          <div
            className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 ${isCurrentlyServiceable
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
              }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCurrentlyServiceable ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                  }`}
              >
                {isCurrentlyServiceable ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold leading-tight truncate">
                    {isCurrentlyServiceable
                      ? 'Serviceable'
                      : isCarriedOver
                        ? 'Estafet: Unserviceable'
                        : isCurrentlyUnserviceable
                          ? 'Unserviceable'
                          : 'Belum Dicek'}
                  </p>
                  {isCarriedOver && onOpenAuditModal && (
                    <button
                      type="button"
                      onClick={() => onOpenAuditModal(vehicleId)}
                      className="text-xs text-red-700 underline font-semibold shrink-0 cursor-pointer"
                    >
                      Riwayat
                    </button>
                  )}
                </div>
                <p className="text-xs opacity-80 mt-0.5 truncate">
                  {isCurrentlyServiceable
                    ? vehicleReadiness?.notes || 'Unit terverifikasi fisik.'
                    : (isCarriedOver && vehicleReadiness?.carried_from?.shift_date
                        ? `Estafet sejak ${vehicleReadiness.carried_from.shift_date} (Regu ${vehicleReadiness.carried_from.team_group || ''}): `
                        : '') + (vehicleReadiness?.justification || vehicleReadiness?.notes || 'Terdapat kendala teknis pada unit.')}
                </p>
              </div>
            </div>
            {photoPreview && (
              <div className="w-10 h-10 rounded-lg border border-[#E5DFD5] overflow-hidden shrink-0 bg-white">
                <img src={photoPreview} alt="Bukti Fisik" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {successMsg && (
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>{typeof successMsg === 'string' ? successMsg : (successMsg?.message || 'Berhasil')}</span>
            </div>
          )}

          {/* Tombol Perbarui: Saat diklik membuka form input */}
          <button
            type="button"
            onClick={() => {
              setIsEditing(true);
              setErrorMsg(null);
              setSuccessMsg(null);
            }}
            className="w-full py-2 px-3 rounded-xl border border-[#E5DFD5] bg-white hover:bg-[#F7F5F0] text-[#1C1917] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors duration-100 cursor-pointer shadow-2xs"
          >
            <Pencil className="w-3.5 h-3.5 text-[#57534E]" />
            <span>Perbarui Laporan Kesiapan</span>
          </button>
        </div>
      ) : (
        /* TAMPILAN 2: FORMULIR INPUT (KETIKA BELUM DICEK ATAU DALAM MODE EDIT) */
        <div className="space-y-2.5">
          {/* Banner Peringatan Belum Dicek (Jika Belum Ada Laporan Shift Ini) */}
          {!hasShiftLog && (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-xs leading-snug">
                <strong className="font-bold block">Kondisi Fisik: Belum Dicek</strong>
                Pilih status kelaikan fisik dan lampirkan foto bukti pemeriksaan unit.
              </div>
            </div>
          )}

          {/* Banner Mode Edit jika sedang memperbarui */}
          {hasShiftLog && isEditing && (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#F7F5F0] border border-[#EAE4DC] text-xs text-[#57534E]">
              <span className="font-bold text-[#1C1917]">Mode Perbarui Laporan</span>
            </div>
          )}

          {/* Banner Status Bawaan jika ada */}
          {isCarriedOver && (
            <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs space-y-0.5">
              <div className="flex items-center justify-between text-red-800 font-bold text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600"></span>
                  <span>Estafet: UNSERVICEABLE</span>
                </span>
                {onOpenAuditModal && (
                  <button
                    type="button"
                    onClick={() => onOpenAuditModal(vehicleId)}
                    className="text-xs text-red-700 underline font-semibold"
                  >
                    Riwayat
                  </button>
                )}
              </div>
              <p className="text-xs text-red-700 leading-snug">
                Unit berstatus kendala estafet
                {vehicleReadiness?.carried_from?.shift_date
                  ? ` sejak ${vehicleReadiness.carried_from.shift_date} (Regu ${vehicleReadiness.carried_from.team_group || ''})`
                  : ''}
                : {vehicleReadiness?.justification || vehicleReadiness?.notes || 'Kendala mekanis/fungsi'}.
              </p>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
              <span>{typeof errorMsg === 'string' ? errorMsg : (errorMsg?.message || 'Terjadi kesalahan')}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2 text-xs">
            {/* Checklist Posko Watchroom */}
            {isPosko && (
              <div className="border border-[#EAE4DC] rounded-lg p-2.5 bg-[#F7F5F0] space-y-2 mb-2">
                <p className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                  Uji Kesiapan Fasilitas Posko Watchroom:
                </p>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#57534E] hover:text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={radioVhf}
                    onChange={() => {
                      const next = !radioVhf;
                      setRadioVhf(next);
                      if (!next) setStatus('unserviceable');
                    }}
                    className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
                  />
                  <span>1. Radio VHF Air-to-Ground & HT</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#57534E] hover:text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={hotlineAtc}
                    onChange={() => {
                      const next = !hotlineAtc;
                      setHotlineAtc(next);
                      if (!next) setStatus('unserviceable');
                    }}
                    className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
                  />
                  <span>2. Hotline ATC Tower</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#57534E] hover:text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={crashBell}
                    onChange={() => {
                      const next = !crashBell;
                      setCrashBell(next);
                      if (!next) setStatus('unserviceable');
                    }}
                    className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
                  />
                  <span>3. Crash Bell / Sirine Alarm Darurat</span>
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-[#57534E] hover:text-[#1C1917]">
                  <input
                    type="checkbox"
                    checked={cctvPc}
                    onChange={() => {
                      const next = !cctvPc;
                      setCctvPc(next);
                      if (!next) setStatus('unserviceable');
                    }}
                    className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
                  />
                  <span>4. PC CCTV Monitoring</span>
                </label>
              </div>
            )}

            {/* Pilihan 2 Status Baku: Serviceable vs Unserviceable */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (isPosko && (!radioVhf || !hotlineAtc || !crashBell || !cctvPc)) {
                    setErrorMsg('Seluruh 4 fasilitas posko watchroom wajib lolos uji (centang semua) untuk memilih status Serviceable.');
                    return;
                  }
                  setStatus('serviceable');
                  setErrorMsg(null);
                }}
                className={`p-2 rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors duration-100 cursor-pointer ${effectiveStatus === 'serviceable'
                    ? 'border-2 border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-2xs'
                    : 'border border-[#E5DFD5] bg-white text-[#57534E] hover:border-[#D6CFC2]'
                  }`}
              >
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Serviceable</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('unserviceable');
                  setErrorMsg(null);
                }}
                className={`p-2 rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors duration-100 cursor-pointer ${effectiveStatus === 'unserviceable'
                    ? 'border-2 border-red-600 bg-red-50/50 text-red-800 shadow-2xs'
                    : 'border border-[#E5DFD5] bg-white text-[#57534E] hover:border-red-300'
                  }`}
              >
                <X className="w-4 h-4 text-red-500" />
                <span>Unserviceable</span>
              </button>
            </div>

            {/* Input Tunggal Uraian Kendala / Kerusakan jika Unserviceable */}
            {effectiveStatus === 'unserviceable' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917] block">
                  Uraian Kendala {isPosko ? 'Fasilitas Posko' : '& Kerusakan Fisik'} * <span className="text-red-600 font-bold">(Wajib)</span>
                </label>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder={
                    isPosko
                      ? 'Jelaskan fasilitas posko watchroom yang mengalami kendala atau malfungsi...'
                      : 'Jelaskan secara spesifik komponen yang rusak, malfungsi teknis, atau kendala fisik lapangan...'
                  }
                  className="w-full p-2 text-xs border border-[#EAE4DC] rounded-lg bg-[#F7F5F0] text-[#1C1917] focus:bg-white focus:border-red-500 outline-none transition-colors duration-100"
                />
              </div>
            )}

            {/* Catatan Tindak Lanjut jika memulihkan unit dari unserviceable ke serviceable */}
            {effectiveStatus === 'serviceable' && wasInitiallyUnserviceable && !isPosko && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917] block">
                  Catatan Tindak Lanjut Pemulihan * <span className="text-emerald-600 font-bold">(Wajib)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Catatan perbaikan teknisi atau hasil uji fungsi normal..."
                  className="w-full p-1.5 text-xs border border-[#EAE4DC] rounded-lg bg-[#F7F5F0] text-[#1C1917] focus:bg-white focus:border-emerald-500 outline-none transition-colors duration-100"
                />
              </div>
            )}

            {/* Catatan Opsional jika serviceable biasa */}
            {effectiveStatus === 'serviceable' && (isPosko || !wasInitiallyUnserviceable) && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#57534E] block">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={1}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Keterangan tambahan jika diperlukan..."
                  className="w-full p-1.5 text-xs border border-[#EAE4DC] rounded-lg bg-[#F7F5F0] text-[#1C1917] focus:bg-white focus:border-[#A8A29E] outline-none transition-colors duration-100"
                />
              </div>
            )}

            {/* Upload Foto Fisik Armada (Khusus Kendaraan) */}
            {!isPosko && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#1C1917] block">
                  Foto Fisik Armada <span className="text-red-600 font-bold">* (Wajib)</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-[#D6CFC2] bg-[#F7F5F0] hover:bg-[#EFECE6] text-[#57534E] text-xs font-semibold transition-colors duration-100">
                    <Camera className="w-4 h-4 text-[#78716C]" />
                    <span className="truncate text-xs">
                      {compressing
                        ? 'Mengompres WebP...'
                        : (photoFile ? `WebP: ${photoFile.name}` : (photoPreview ? 'Ganti Foto Bukti' : 'Ambil / Unggah Foto Bukti'))}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={compressing || submitting}
                      className="hidden"
                      onChange={handlePhotoChange}
                    />
                  </label>
                  {photoPreview && (
                    <div className="w-10 h-10 rounded-lg border border-[#EAE4DC] bg-[#F7F5F0] overflow-hidden shrink-0">
                      <img
                        src={photoPreview}
                        alt="Bukti Fisik"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tombol Aksi: Simpan vs (Batal & Simpan Perubahan) */}
            {hasShiftLog && isEditing ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={submitting || compressing}
                  className="w-full py-2 rounded-xl font-bold text-xs border border-[#E5DFD5] bg-white hover:bg-[#F7F5F0] text-[#1C1917] transition-colors duration-100 cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!effectiveStatus || submitting || compressing}
                  className="w-full py-2 rounded-xl font-bold text-xs bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center justify-center gap-1.5 transition-colors duration-100 cursor-pointer disabled:bg-slate-400"
                >
                  {submitting || compressing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!effectiveStatus || submitting || compressing}
                className="w-full py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-xs flex items-center justify-center gap-1.5 transition-colors duration-100 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white font-extrabold disabled:bg-slate-400"
              >
                {submitting || compressing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
                    <span>{compressing ? 'Mengompres Foto WebP...' : 'Menyimpan Laporan...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Simpan Laporan Kesiapan {isPosko ? 'Posko Watchroom' : vehicleCode}</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
