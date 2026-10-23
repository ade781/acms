import React, { useState } from 'react';
import { AlertCircle, Camera, CheckCircle2 } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import { compressImageToWebP } from '../../utils/imageCompressor';
import { cleanTeam, formatTeam } from '../../utils/shiftHelper';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export const OFFICIAL_INCIDENT_CLASSIFICATIONS = [
  'Aircraft Accident',
  'Aircraft Incident',
  'Kebakaran Gedung atau Terminal',
  'Kebakaran Fasilitas atau Objek Lain di Bandara',
  'Aircraft Go-Around',
  'Hewan Liar atau Wildlife Hazard',
  'Emergency atau Standby Operasional',
  'Temuan Gangguan Fasilitas',
  'Latihan atau Kegiatan Operasional',
  'Kejadian Lainnya',
];

export default function IncidentModal({
  isOpen,
  onClose,
  activeDate,
  activeShiftNumber,
  activeTeam,
  onSuccess,
}) {
  const { user, isAdmin, isSupervisor } = useAuth();
  const canReportIncident = isAdmin || isSupervisor || ['admin', 'chief', 'chief_assistant', 'supervisor', 'dept_head'].includes(user?.role);
  const [classification, setClassification] = useState(OFFICIAL_INCIDENT_CLASSIFICATIONS[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [location, setLocation] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('sedang');
  const [aircraftInfo, setAircraftInfo] = useState('');
  const [chronology, setChronology] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [lastCondition, setLastCondition] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
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
      setError(`Gagal mengompres gambar insiden: ${err.message}`);
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const finalTitle = classification === 'Kejadian Lainnya'
      ? customTitle.trim()
      : (customTitle.trim() ? `${classification} - ${customTitle.trim()}` : classification);

    if (!finalTitle || !location.trim() || !chronology.trim()) {
      setError('Klasifikasi/judul kejadian, lokasi, dan kronologis wajib diisi.');
      return;
    }

    // Pemetaan ke ENUM database baku
    let mappedCategory = 'other';
    if (classification === 'Aircraft Accident') mappedCategory = 'aircraft_accident';
    else if (classification === 'Aircraft Incident' || classification === 'Aircraft Go-Around') mappedCategory = 'aircraft_incident';
    else if (classification.includes('Kebakaran')) mappedCategory = 'fire';
    else if (classification.includes('Emergency')) mappedCategory = 'medical_emergency';
    else if (classification.includes('Hewan') || classification.includes('Wildlife')) mappedCategory = 'hazmat';

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('category', mappedCategory);
      formData.append('incident_date', activeDate);
      formData.append('incident_time', new Date().toTimeString().slice(0, 5));
      formData.append('shift_number', activeShiftNumber);
      formData.append('team_group', cleanTeam(activeTeam));
      formData.append('location', location);
      formData.append('priority_level', priorityLevel);
      formData.append('aircraft_info', aircraftInfo);
      formData.append('chronology', chronology);
      formData.append('action_taken', actionTaken);
      formData.append('last_condition', lastCondition);

      if (photoFile) {
        formData.append('photos', photoFile);
        formData.append('attachment', photoFile);
      }

      await api.post('/incidents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (onSuccess) onSuccess('Laporan insiden berhasil dikirimkan.');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan laporan kejadian.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Catat Laporan Kejadian / Insiden Operasional"
      subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${activeDate}`}
      maxWidth="max-w-2xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {canReportIncident ? 'Batal' : 'Tutup'}
          </Button>
          {canReportIncident && (
            <Button
              variant="danger"
              onClick={handleSubmit}
              loading={submitting || compressing}
            >
              Kirim Laporan Insiden
            </Button>
          )}
        </>
      }
    >
      {!canReportIncident ? (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Akses Terbatas: Hanya Chief / Asisten Chief</p>
            <p className="text-amber-800">
              Pelaporan insiden dan kejadian darurat operasional hanya dapat dibuat oleh Chief, Asisten Chief, atau Administrator yang bertugas.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Klasifikasi Baku Kejadian ARFF"
            value={classification}
            onChange={(e) => setClassification(e.target.value)}
            required
            options={OFFICIAL_INCIDENT_CLASSIFICATIONS.map((c) => ({
              value: c,
              label: c,
            }))}
          />

          <InputField
            label="Rincian Singkat / Sub-Judul"
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            placeholder={
              classification === 'Kejadian Lainnya'
                ? 'Wajib diisi: sebutkan jenis kejadian...'
                : 'Contoh: Stand 04 / Taxiway Echo (opsional)'
            }
            required={classification === 'Kejadian Lainnya'}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Lokasi Kejadian (Airside / Grid)"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Contoh: Apron Selatan, Taxiway Echo"
            required
          />

          <SelectField
            label="Tingkat Prioritas"
            value={priorityLevel}
            onChange={(e) => setPriorityLevel(e.target.value)}
            required
            options={[
              { value: 'rendah', label: 'Rendah (Pencegahan / Standby)' },
              { value: 'sedang', label: 'Sedang (Penanganan Lokal Tanpa Dampak Fatal)' },
              { value: 'tinggi', label: 'Tinggi (Kondisi Siaga II / Darurat Terkendali)' },
              { value: 'kritis', label: 'Kritis (Kondisi Siaga I / Full Emergency)' },
            ]}
          />
        </div>

        <InputField
          label="Informasi Pesawat / Tipe Armada Terkait (Opsional)"
          value={aircraftInfo}
          onChange={(e) => setAircraftInfo(e.target.value)}
          placeholder="Contoh: Boeing 737-800, Registrasi PK-GXX"
        />

        <TextareaField
          label="Kronologi Kejadian"
          value={chronology}
          onChange={(e) => setChronology(e.target.value)}
          placeholder="Jelaskan urutan waktu peristiwa dari awal deteksi hingga respon unit ARFF..."
          rows={3}
          required
        />

        <TextareaField
          label="Tindakan yang Telah Diambil (Firefighting / Rescue Actions)"
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="Penyemprotan foam, proteksi bahan bakar, evakuasi pax, koordinasi ATC..."
          rows={2}
        />

        <TextareaField
          label="Kondisi Terakhir Lokasi"
          value={lastCondition}
          onChange={(e) => setLastCondition(e.target.value)}
          placeholder="Situasi aman terkendali, area telah dibersihkan dari ceceran, dsb..."
          rows={2}
        />

        {/* Photo Upload with Client-Side WebP Compression */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 block">
            Dokumentasi Foto TKP (Otomatis Kompresi WebP di Klien)
          </label>

          <div className="flex items-center gap-4">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-100 min-h-[44px]">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>{compressing ? 'Mengompres WebP...' : 'Pilih Foto TKP'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
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
                alt="Preview Foto Insiden"
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </form>
      )}
    </Modal>
  );
}
