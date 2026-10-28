import React, { useState, useEffect } from 'react';
import { Check, X, Camera, AlertCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { compressImageToWebP } from '../../../utils/imageCompressor';

export default function MobilePicReadinessForm({
  user,
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

  // State kesiapan
  const existingStatus = vehicleReadiness?.status === 'unserviceable' ? 'unserviceable' : 'serviceable';
  const [status, setStatus] = useState(existingStatus);
  const [justification, setJustification] = useState(vehicleReadiness?.justification || '');
  const [notes, setNotes] = useState(vehicleReadiness?.notes || '');
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

  useEffect(() => {
    if (vehicleReadiness) {
      if (vehicleReadiness.status === 'unserviceable') {
        setStatus('unserviceable');
        setJustification(vehicleReadiness.justification || '');
      } else if (vehicleReadiness.status === 'serviceable') {
        setStatus('serviceable');
      }
      if (vehicleReadiness.photo_webp_url) {
        setPhotoPreview(vehicleReadiness.photo_webp_url);
      }
    }
  }, [vehicleReadiness]);

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
      setPhotoFile(compressedWebP);
      const objectUrl = URL.createObjectURL(compressedWebP);
      setPhotoPreview(objectUrl);
    } catch (err) {
      setErrorMsg(`Gagal memproses gambar: ${err.message}`);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validasi Foto Fisik Wajib untuk Keduanya (Serviceable & Unserviceable)
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
      formData.append('team_group', activeTeam);
      formData.append('status', status);

      if (status === 'unserviceable') {
        formData.append('justification', justification.trim());
        formData.append('follow_up_status', 'pending');
      } else {
        if (wasInitiallyUnserviceable) {
          formData.append('follow_up_status', 'resolved');
        } else {
          formData.append('follow_up_status', 'resolved');
        }
      }

      if (notes.trim()) {
        formData.append('notes', notes.trim());
      }

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      const res = await api.post('/readiness/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const msg = res.data?.message || 'Kesiapan armada berhasil dilaporkan.';
      setSuccessMsg(msg);
      if (onSuccess) {
        onSuccess(res.data?.data || res.data);
      }
    } catch (err) {
      console.error('Error submitting vehicle readiness:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan status kesiapan armada.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs space-y-2">
      {/* Header Formulir PIC */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
        <div>
          <h3 className="text-xs font-bold text-slate-900 uppercase leading-none">
            Lapor Kesiapan Unit (PIC)
          </h3>
          <p className="text-[9px] text-slate-500 mt-0.5">
            Pemeriksaan fisik wajib dilaporkan oleh Penanggung Jawab
          </p>
        </div>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
          {vehicleCode}
        </span>
      </div>

      {/* Banner Status Bawaan (Carried-over dari shift/regu sebelumnya) */}
      {isCarriedOver && (
        <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-xs space-y-0.5">
          <div className="flex items-center justify-between text-red-800 font-bold text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              <span>Status Estafet: UNSERVICEABLE</span>
            </span>
            {onOpenAuditModal && (
              <button
                type="button"
                onClick={() => onOpenAuditModal(vehicleId)}
                className="text-[9px] text-red-700 underline font-semibold"
              >
                Riwayat
              </button>
            )}
          </div>
          <p className="text-[9.5px] text-red-700 leading-snug">
            Unit berstatus kendala estafet
            {vehicleReadiness?.carried_from?.shift_date
              ? ` sejak ${vehicleReadiness.carried_from.shift_date} (Regu ${vehicleReadiness.carried_from.team_group || ''})`
              : ''}
            : {vehicleReadiness?.justification || vehicleReadiness?.notes || 'Kendala mekanis/fungsi'}.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-2 text-xs">
        {/* Pilihan 2 Status Baku: Serviceable vs Unserviceable */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => setStatus('serviceable')}
            className={`p-2 rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors duration-100 ${
              status === 'serviceable'
                ? 'border-2 border-emerald-600 bg-emerald-50/50 text-emerald-800 shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Serviceable</span>
          </button>
          <button
            type="button"
            onClick={() => setStatus('unserviceable')}
            className={`p-2 rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-0.5 transition-colors duration-100 ${
              status === 'unserviceable'
                ? 'border-2 border-red-600 bg-red-50/50 text-red-800 shadow-2xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-red-300'
            }`}
          >
            <X className="w-4 h-4 text-red-500" />
            <span>Unserviceable</span>
          </button>
        </div>

        {/* Input Justifikasi Kerusakan jika Unserviceable */}
        {status === 'unserviceable' && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 block">
              Keterangan Kerusakan & Kendala * <span className="text-red-600 font-bold">(Wajib)</span>
            </label>
            <textarea
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Jelaskan komponen yang rusak atau malfungsi secara spesifik..."
              className="w-full p-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:bg-white focus:border-red-500 outline-none transition-colors duration-100"
            />
          </div>
        )}

        {/* Catatan Tindak Lanjut jika memulihkan unit dari unserviceable ke serviceable */}
        {status === 'serviceable' && wasInitiallyUnserviceable && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-700 block">
              Catatan Tindak Lanjut Pemulihan * <span className="text-emerald-600 font-bold">(Wajib)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan perbaikan teknisi atau hasil uji fungsi normal..."
              className="w-full p-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-colors duration-100"
            />
          </div>
        )}

        {/* Catatan Opsional jika serviceable biasa */}
        {status === 'serviceable' && !wasInitiallyUnserviceable && (
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-600 block">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={1}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Keterangan tambahan jika diperlukan..."
              className="w-full p-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:bg-white focus:border-slate-400 outline-none transition-colors duration-100"
            />
          </div>
        )}

        {/* Upload Foto Fisik Armada (WAJIB untuk Serviceable & Unserviceable) */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-700 block">
            Foto Fisik Armada / Posko * <span className="text-red-600 font-bold">(Wajib)</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors duration-100">
              <Camera className="w-4 h-4 text-slate-500" />
              <span className="truncate text-[11px]">
                {compressing
                  ? 'Mengompres WebP...'
                  : (photoFile ? `WebP: ${photoFile.name}` : 'Ambil / Unggah Foto Bukti')}
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
              <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shrink-0">
                <img
                  src={photoPreview}
                  alt="Bukti Fisik"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tombol Simpan Kesiapan Unit */}
        <button
          type="submit"
          disabled={submitting || compressing}
          className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-xs tracking-wide shadow-xs flex items-center justify-center gap-1.5 transition-colors duration-100 cursor-pointer"
        >
          {submitting || compressing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-300" />
              <span>{compressing ? 'Mengompres Foto WebP...' : 'Menyimpan Laporan...'}</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Simpan Kesiapan {vehicleCode}</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
