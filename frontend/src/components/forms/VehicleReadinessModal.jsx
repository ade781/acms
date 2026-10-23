import React, { useState } from 'react';
import { Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import { compressImageToWebP } from '../../utils/imageCompressor';
import { cleanTeam, formatTeam } from '../../utils/shiftHelper';
import api from '../../services/api';

export default function VehicleReadinessModal({
  isOpen,
  onClose,
  vehicle,
  activeDate,
  activeShiftNumber,
  activeTeam,
  onSuccess,
}) {
  const initialStatus = vehicle?.status || vehicle?.current_log?.status;
  const wasInitiallyUnserviceable = initialStatus === 'unserviceable';

  const [status, setStatus] = useState(initialStatus || 'serviceable');
  const [justification, setJustification] = useState(vehicle?.justification || vehicle?.current_log?.justification || '');
  const [notes, setNotes] = useState(vehicle?.notes || vehicle?.current_log?.notes || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(vehicle?.photo_webp_url || vehicle?.current_log?.photo_webp_url || null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!vehicle) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setCompressing(true);
    try {
      // Compress in browser via HTML5 canvas to WebP
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

    // Validasi Foto Bukti Fisik Wajib
    if (!photoFile && !photoPreview) {
      setError('Foto bukti fisik kelaikan armada wajib disertakan untuk verifikasi kondisi lapangan.');
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
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan data kesiapan kendaraan.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Pemeriksaan Kondisi Kendaraan: ${vehicle.code_name || vehicle.vehicle_name}`}
      subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${activeDate}`}
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
            Simpan Hasil Pemeriksaan
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs text-slate-600 flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="font-semibold text-slate-800">Nama Kendaraan:</span>
            <span>{vehicle.vehicle_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-800">Plat Nomor:</span>
            <span className="font-mono">{vehicle.license_plate || '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-slate-800">Kategori:</span>
            <span className="capitalize">{vehicle.category || 'utama'}</span>
          </div>
        </div>

        {/* Status Selection */}
        <SelectField
          label="Status Kesiapan Fisik & Operasional"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          options={[
            { value: 'serviceable', label: 'Serviceable (Siap Operasi Penuh)' },
            { value: 'unserviceable', label: 'Unserviceable (Kendala / Rusak / Perbaikan)' },
          ]}
        />

        {/* Justification Field (mandatory if unserviceable) */}
        {status === 'unserviceable' && (
          <TextareaField
            label="Justifikasi & Rincian Kendala Kerusakan"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Jelaskan secara rinci komponen atau fungsi yang mengalami kerusakan / tidak memenuhi syarat operasi..."
            required
            rows={3}
            helperText="Wajib diisi untuk pelaporan tindak lanjut teknisi dan penggantian armada cadangan."
          />
        )}

        {/* General notes */}
        <TextareaField
          label="Catatan Tambahan Kondisi Kendaraan (Opsional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Catatan kondisi fisik kendaraan, kelengkapan peralatan kabin, dll..."
          rows={2}
        />

        {/* Photo Upload with Client-Side WebP Compression */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Dokumentasi Foto Fisik <span className="text-red-500 font-bold">* Wajib</span> (Otomatis Kompresi WebP di Klien)
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
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
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
      </form>
    </Modal>
  );
}
