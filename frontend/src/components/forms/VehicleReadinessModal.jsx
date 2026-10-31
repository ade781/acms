import React, { useState, useEffect } from 'react';
import { Camera, AlertCircle, CheckCircle2, Radio } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import TextareaField from '../common/TextareaField';
import { compressImageToWebP } from '../../utils/imageCompressor';
import { cleanTeam, formatTeam, formatIndoDate } from '../../utils/shiftHelper';
import { getErrorMessage } from '../../utils/errorHelper';
import api from '../../services/api';

export default function VehicleReadinessModal({
  isOpen,
  onClose,
  vehicle: propVehicle,
  logItem,
  activeDate,
  activeShiftNumber,
  activeTeam,
  onSuccess,
}) {
  const vehicle = propVehicle || logItem;

  const isPosko = vehicle?.category === 'posko' || vehicle?.code_name === 'WATCHROOM';
  const initialStatus = vehicle?.status || vehicle?.current_log?.status;
  const wasInitiallyUnserviceable = initialStatus === 'unserviceable';
  const isCarriedOver = Boolean(vehicle?.is_carried_over);

  const hasExistingShiftLog = Boolean(
    vehicle?.has_shift_log && (vehicle?.status === 'serviceable' || vehicle?.status === 'unserviceable') && !isCarriedOver
  );

  const rawNotes = vehicle?.notes || vehicle?.current_log?.notes || '';

  const [status, setStatus] = useState(
    isPosko
      ? (initialStatus === 'unserviceable' ? 'unserviceable' : 'serviceable')
      : (hasExistingShiftLog ? vehicle.status : '')
  );

  // 4 Fasilitas Posko Watchroom
  const [radioVhf, setRadioVhf] = useState(!rawNotes.includes('Radio VHF: FAIL'));
  const [hotlineAtc, setHotlineAtc] = useState(!rawNotes.includes('Hotline ATC: FAIL'));
  const [crashBell, setCrashBell] = useState(!rawNotes.includes('Crash Bell: FAIL'));
  const [cctvPc, setCctvPc] = useState(!rawNotes.includes('CCTV/PC: FAIL'));

  const [justification, setJustification] = useState(vehicle?.justification || vehicle?.current_log?.justification || '');
  const [notes, setNotes] = useState(
    isPosko
      ? rawNotes.replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim()
      : (vehicle?.notes || vehicle?.current_log?.notes || '')
  );

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(
    isCarriedOver ? null : (vehicle?.photo_webp_url || vehicle?.current_log?.photo_webp_url || null)
  );
  const carriedOverPhotoUrl = isCarriedOver ? (vehicle?.photo_webp_url || vehicle?.current_log?.photo_webp_url || null) : null;
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && vehicle) {
      const isP = vehicle?.category === 'posko' || vehicle?.code_name === 'WATCHROOM';
      const raw = vehicle?.notes || vehicle?.current_log?.notes || '';
      const initSt = vehicle?.status || vehicle?.current_log?.status;
      const carried = Boolean(vehicle?.is_carried_over);
      const hasLog = Boolean(
        vehicle?.has_shift_log && (vehicle?.status === 'serviceable' || vehicle?.status === 'unserviceable') && !carried
      );

      if (isP) {
        setStatus(initSt === 'unserviceable' ? 'unserviceable' : 'serviceable');
        setRadioVhf(!raw.includes('Radio VHF: FAIL'));
        setHotlineAtc(!raw.includes('Hotline ATC: FAIL'));
        setCrashBell(!raw.includes('Crash Bell: FAIL'));
        setCctvPc(!raw.includes('CCTV/PC: FAIL'));
        setNotes(raw.replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim());
        setJustification('');
        setPhotoFile(null);
        setPhotoPreview(null);
      } else {
        setStatus(hasLog ? vehicle.status : '');
        setJustification(vehicle?.justification || vehicle?.current_log?.justification || '');
        setNotes(vehicle?.notes || vehicle?.current_log?.notes || '');
        setPhotoFile(null);
        setPhotoPreview(carried ? null : (vehicle?.photo_webp_url || vehicle?.current_log?.photo_webp_url || null));
      }
      setError(null);
    }
  }, [isOpen, vehicle]);

  if (!vehicle) return null;

  const allChecked = radioVhf && hotlineAtc && crashBell && cctvPc;
  const effectiveStatus = isPosko ? (!allChecked ? 'unserviceable' : (status || 'serviceable')) : status;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // 1. Validasi Tipe MIME (wajib berkas gambar)
    if (!file.type || !file.type.startsWith('image/')) {
      setError('Format berkas tidak didukung. Harap pilih berkas foto/gambar (JPG, JPEG, PNG, atau WEBP).');
      if (e.target) e.target.value = '';
      return;
    }

    // 2. Validasi Batas Ukuran Berkas Maksimal 15 MB
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
    if (file.size > MAX_FILE_SIZE) {
      setError('Ukuran file foto terlalu besar (maksimal 15 MB). Harap pilih foto dengan resolusi lebih rendah.');
      if (e.target) e.target.value = '';
      return;
    }

    setCompressing(true);
    try {
      const compressedWebP = await compressImageToWebP(file, {
        maxWidth: 1280,
        maxHeight: 1280,
        quality: 0.8,
      });
      setPhotoFile(compressedWebP);
      setPhotoPreview(URL.createObjectURL(compressedWebP));
    } catch (err) {
      setError(`Gagal mengompres gambar: ${err.message}`);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Jalur 1: Posko Watchroom
    if (isPosko) {
      const finalStatus = !allChecked ? 'unserviceable' : (status || 'serviceable');
      const cleanNotes = notes.replace(/\[Fasilitas:[^\]]+\]\s*/g, '').trim();

      if (finalStatus === 'unserviceable' && !cleanNotes) {
        setError('Catatan kendala fasilitas watchroom wajib diisi apabila ada item yang unserviceable.');
        return;
      }

      const checkSummary = `[Fasilitas: Radio VHF: ${radioVhf ? 'OK' : 'FAIL'} | Hotline ATC: ${hotlineAtc ? 'OK' : 'FAIL'} | Crash Bell: ${crashBell ? 'OK' : 'FAIL'} | CCTV/PC: ${cctvPc ? 'OK' : 'FAIL'}] ${cleanNotes}`.trim();

      setSubmitting(true);
      try {
        await api.post('/readiness/watchroom', {
          shift_date: activeDate,
          shift_number: activeShiftNumber,
          team_group: cleanTeam(activeTeam),
          status: finalStatus,
          notes: checkSummary,
        });

        const successText = `Hasil pemeriksaan fasilitas ${vehicle.code_name || vehicle.vehicle_name || 'Posko Watchroom'} berhasil disimpan.`;
        if (onSuccess) onSuccess(successText);
        onClose();
      } catch (err) {
        const msg = typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan status watchroom.'));
        setError(msg);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Jalur 2: Kendaraan Bermotor Operasional Biasa
    if (!status) {
      setError('Harap tentukan status kelaikan armada terlebih dahulu (pilih Serviceable atau Unserviceable).');
      return;
    }

    // Validasi Foto Bukti Fisik Wajib untuk Kendaraan
    if (!photoFile && (!photoPreview || isCarriedOver)) {
      setError(
        isCarriedOver
          ? 'Unit berstatus estafet (carry-over) wajib mengunggah foto bukti fisik baru kondisi terkini untuk shift berjalan.'
          : 'Foto bukti fisik kelaikan armada wajib disertakan untuk verifikasi kondisi lapangan.'
      );
      return;
    }

    if (status === 'unserviceable' && (!justification || !justification.trim())) {
      setError('Justifikasi kendala wajib diisi apabila status unserviceable.');
      return;
    }

    // Validasi Catatan Tindak Lanjut saat Pemulihan Armada
    if (status === 'serviceable' && wasInitiallyUnserviceable && (!notes || notes.trim().length < 3)) {
      setError('Catatan tindak lanjut pemulihan/perbaikan wajib diisi ketika memulihkan status armada ke Serviceable.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('vehicle_id', vehicle.id || vehicle.vehicle_id);
      formData.append('shift_date', activeDate);
      formData.append('shift_number', activeShiftNumber);
      formData.append('team_group', cleanTeam(activeTeam));
      formData.append('status', status);
      formData.append('justification', status === 'unserviceable' ? justification.trim() : '');
      formData.append('notes', notes.trim());

      if (status === 'serviceable' && wasInitiallyUnserviceable) {
        formData.append('follow_up_status', 'resolved');
      }

      if (photoFile) {
        formData.append('photo', photoFile);
      }

      await api.post('/readiness/vehicles', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const successText = `Status kesiapan ${vehicle.code_name || vehicle.vehicle_name} berhasil disimpan.`;
      if (onSuccess) onSuccess(successText);
      onClose();
    } catch (err) {
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menyimpan data kesiapan kendaraan.'));
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formattedDate = formatIndoDate(activeDate);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isPosko
          ? 'Pemeriksaan Kesiapan Fasilitas Posko Watchroom'
          : `Pemeriksaan Kondisi Kendaraan: ${vehicle.code_name || vehicle.vehicle_name}`
      }
      subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${formattedDate}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting || compressing}
          >
            {isPosko ? 'Simpan Status Watchroom' : 'Simpan Hasil Pemeriksaan'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        {/* Banner Notifikasi Estafet (Carry-Over) */}
        {isCarriedOver && !isPosko && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Unit Berstatus Estafet (Carry-Over)</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-700">
              Kendala unit ini diteruskan dari shift sebelumnya. Foto bukti fisik baru untuk shift berjalan <strong>wajib diunggah</strong> oleh PIC sebelum menyimpan kesiapan armada.
            </p>
            {carriedOverPhotoUrl && (
              <div className="pt-1">
                <span className="text-xs font-semibold text-slate-600 block mb-1">Foto Bukti Shift Sebelumnya (Referensi):</span>
                <img
                  src={carriedOverPhotoUrl}
                  alt="Referensi shift sebelumnya"
                  className="w-24 h-16 object-cover rounded-md border border-amber-300 opacity-80"
                />
              </div>
            )}
          </div>
        )}

        {isCarriedOver && isPosko && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Kendala Posko Estafet (Carry-Over)</span>
            </div>
            <p className="text-xs leading-relaxed text-amber-700">
              Kendala fasilitas posko ini diteruskan dari shift sebelumnya. Periksa kondisi seluruh fasilitas dan perbarui status operasional.
            </p>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{getErrorMessage(error, 'Gagal mencatat status kesiapan armada/posko.')}</span>
          </div>
        )}

        {/* Informasi Ringkas Unit */}
        {isPosko ? (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-600">
              <p className="font-semibold text-slate-900">Watchroom & Komunikasi Darurat</p>
              <p>Pemeriksaan kelayakan fasilitas peringatan dini dan saluran komunikasi ke Tower.</p>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col gap-1">
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800">Nama Kendaraan:</span>
              <span>{vehicle.vehicle_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800">Plat Nomor:</span>
              <span className="font-mono tabular-nums">{vehicle.license_plate || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-800">Kategori:</span>
              <span className="capitalize">{vehicle.category || 'utama'}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200/60 pt-1 mt-0.5">
              <span className="font-semibold text-slate-800">Status Saat Ini:</span>
              <span
                className={`font-bold ${
                  vehicle.status === 'serviceable'
                    ? 'text-emerald-700'
                    : vehicle.status === 'unserviceable'
                    ? 'text-red-700'
                    : 'text-slate-500'
                }`}
              >
                {vehicle.status === 'serviceable'
                  ? 'Serviceable'
                  : vehicle.status === 'unserviceable'
                  ? 'Tidak Laik / Rusak'
                  : 'Belum Dicek'}
              </span>
            </div>
          </div>
        )}

        {/* 4 Checklist Fasilitas Khusus Posko Watchroom */}
        {isPosko && (
          <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Daftar Uji Kesiapan Fasilitas:
            </p>

            <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={radioVhf}
                onChange={() => setRadioVhf(!radioVhf)}
                className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
              />
              <span>1. Radio Komunikasi (HT Kru & Base Station VHF Ground)</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={hotlineAtc}
                onChange={() => setHotlineAtc(!hotlineAtc)}
                className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
              />
              <span>2. Direct Phone / PABX Hotline ke ATC Tower</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={crashBell}
                onChange={() => setCrashBell(!crashBell)}
                className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
              />
              <span>3. Crash Bell / Sirine Peringatan Darurat Lapangan</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
              <input
                type="checkbox"
                checked={cctvPc}
                onChange={() => setCctvPc(!cctvPc)}
                className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
              />
              <span>4. Komputer Pantau Operasional & CCTV Runway/Apron</span>
            </label>
          </div>
        )}

        {/* Status Selection: Segmented Radio Cards */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 block">
            Status Kesiapan {isPosko ? 'Fasilitas Posko' : 'Fisik & Operasional'}{' '}
            <span className="text-red-500 font-bold">* Wajib Dipilih</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opsi 1: Serviceable */}
            <button
              type="button"
              onClick={() => {
                if (isPosko && (!radioVhf || !hotlineAtc || !crashBell || !cctvPc)) {
                  setError('Seluruh 4 fasilitas watchroom wajib lolos uji (centang semua) untuk memilih status Serviceable.');
                  return;
                }
                setStatus('serviceable');
                setError(null);
              }}
              className={`p-3.5 rounded-xl text-left border flex items-start gap-3 transition-colors duration-100 cursor-pointer ${
                effectiveStatus === 'serviceable'
                  ? 'border-2 border-emerald-600 bg-emerald-50/70 text-emerald-950 shadow-sm ring-1 ring-emerald-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/20'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-100 ${
                  effectiveStatus === 'serviceable'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Serviceable
                  </span>
                  {effectiveStatus === 'serviceable' && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Dipilih
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {isPosko ? 'Fasilitas komunikasi berfungsi normal.' : 'Kondisi fisik dan mesin berfungsi normal.'}
                </p>
              </div>
            </button>

            {/* Opsi 2: Unserviceable */}
            <button
              type="button"
              onClick={() => {
                setStatus('unserviceable');
                setError(null);
              }}
              className={`p-3.5 rounded-xl text-left border flex items-start gap-3 transition-colors duration-100 cursor-pointer ${
                effectiveStatus === 'unserviceable'
                  ? 'border-2 border-red-600 bg-red-50/70 text-red-950 shadow-sm ring-1 ring-red-500/20'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50/20'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-100 ${
                  effectiveStatus === 'unserviceable'
                    ? 'bg-red-600 text-white'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide">
                    Tidak Laik / Rusak
                  </span>
                  {effectiveStatus === 'unserviceable' && (
                    <span className="text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                      Dipilih
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                  {isPosko ? 'Terdapat gangguan fasilitas komunikasi.' : 'Kendala fisik / malfungsi / dalam perbaikan.'}
                </p>
              </div>
            </button>
          </div>
          {!effectiveStatus && (
            <p className="text-xs text-amber-700 italic flex items-center gap-1 mt-1">
              <span>* Belum ada status yang dipilih. Silakan klik salah satu kartu di atas.</span>
            </p>
          )}
        </div>

        {/* Input Kendala & Catatan Khusus Posko */}
        {isPosko ? (
          <TextareaField
            label={
              effectiveStatus === 'unserviceable'
                ? 'Rincian Kendala Fasilitas (Wajib)'
                : 'Catatan Fasilitas Tambahan (Opsional)'
            }
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Tuliskan catatan teknis atau rincian kendala fasilitas jika ada..."
            required={effectiveStatus === 'unserviceable'}
            rows={3}
          />
        ) : (
          <>
            {/* Justification Field (mandatory if unserviceable) untuk Kendaraan */}
            {status === 'unserviceable' && (
              <TextareaField
                label="Justifikasi & Rincian Kendala Kerusakan"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Jelaskan secara rinci komponen atau fungsi yang mengalami kerusakan..."
                required
                rows={3}
                helperText="Wajib diisi untuk pelaporan tindak lanjut teknisi."
              />
            )}

            {/* General notes untuk Kendaraan */}
            <TextareaField
              label="Catatan Tambahan Kondisi Kendaraan (Opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan kondisi fisik kendaraan, kelengkapan peralatan kabin, dll..."
              rows={2}
            />
          </>
        )}

        {/* Photo Upload with Client-Side WebP Compression (Khusus Kendaraan Bermotor Operasional) */}
        {!isPosko && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">
              Dokumentasi Foto Fisik <span className="text-red-500 font-bold">* Wajib</span>
            </label>

            <div className="flex items-center gap-4">
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-100 min-h-[44px]">
                <Camera className="w-4 h-4 text-slate-500" />
                <span>{compressing ? 'Mengompres WebP...' : 'Pilih Foto Kendaraan'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={compressing || submitting}
                  className="hidden"
                />
              </label>

              {photoFile && (
                <span className="text-xs text-emerald-700 font-medium flex items-center gap-1 font-mono tabular-nums">
                  <CheckCircle2 className="w-4 h-4" />
                  Format WebP ({Math.round(photoFile.size / 1024)} KB)
                </span>
              )}
            </div>

            {photoPreview && (
              <div className="mt-2 relative w-full h-44 rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <img
                  src={photoPreview}
                  alt="Preview Pemeriksaan Kendaraan"
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        )}
      </form>
    </Modal>
  );
}
