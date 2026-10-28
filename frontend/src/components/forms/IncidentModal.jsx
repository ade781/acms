import React, { useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Check, Plus, X } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import { compressImageToWebP } from '../../utils/imageCompressor';
import { cleanTeam, formatTeam } from '../../utils/shiftHelper';
import { getErrorMessage } from '../../utils/errorHelper';
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

export const ARFF_FLEET_OPTIONS = [
  'Foam Tender 1',
  'Foam Tender 2',
  'Foam Tender 3',
  'Rapid Intervention Vehicle (RIV)',
  'Nurse Tender',
  'Ambulance',
  'Command Car',
];

export default function IncidentModal({
  isOpen,
  onClose,
  activeDate,
  activeShiftNumber,
  activeTeam,
  onSuccess,
}) {
  const auth = useAuth();
  const { user, isAdmin, isSupervisor } = auth;
  const effectiveDate = activeDate || auth.activeDate;
  const effectiveShift = activeShiftNumber || auth.activeShiftNumber;
  const effectiveTeam = activeTeam || auth.activeTeam;

  const canReportIncident = isAdmin || isSupervisor || ['admin', 'chief', 'chief_assistant', 'supervisor', 'dept_head'].includes(user?.role);
  const [classification, setClassification] = useState(OFFICIAL_INCIDENT_CLASSIFICATIONS[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [location, setLocation] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('sedang');
  const [aircraftInfo, setAircraftInfo] = useState('');
  const [sourceInfo, setSourceInfo] = useState('');
  const [coordinatedParties, setCoordinatedParties] = useState('');
  const [chronology, setChronology] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [deployedVehicles, setDeployedVehicles] = useState([]);
  const [lastCondition, setLastCondition] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - photoFiles.length;
    if (remainingSlots <= 0) {
      setError('Maksimal 5 foto bukti dokumentasi kejadian.');
      return;
    }

    const validFiles = files.slice(0, remainingSlots).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Harap pilih berkas gambar yang sah (JPEG, PNG, WebP).');
      return;
    }

    setError(null);
    setCompressing(true);
    try {
      const newFiles = [];
      const newPreviews = [];
      for (const file of validFiles) {
        const compressedWebP = await compressImageToWebP(file, {
          maxWidth: 1280,
          maxHeight: 1280,
          quality: 0.8,
        });
        newFiles.push(compressedWebP);
        newPreviews.push({
          name: file.name,
          url: URL.createObjectURL(compressedWebP),
          size: Math.round(compressedWebP.size / 1024),
        });
      }
      setPhotoFiles((prev) => [...prev, ...newFiles]);
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    } catch (err) {
      setError(`Gagal mengompres gambar insiden: ${err.message}`);
    } finally {
      setCompressing(false);
    }
  };

  const handleRemovePhoto = (index) => {
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
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
      let recordedAction = actionTaken.trim();
      if (deployedVehicles.length > 0) {
        const fleetNote = `[Armada Dikerahkan: ${deployedVehicles.join(', ')}]`;
        if (!recordedAction.includes('[Armada Dikerahkan:')) {
          recordedAction = recordedAction ? `${fleetNote}\n${recordedAction}` : fleetNote;
        }
      }

      const formData = new FormData();
      formData.append('title', finalTitle);
      formData.append('category', mappedCategory);
      formData.append('incident_date', effectiveDate);
      formData.append('incident_time', new Date().toTimeString().slice(0, 5));
      formData.append('shift_number', effectiveShift);
      formData.append('team_group', cleanTeam(effectiveTeam));
      formData.append('location', location);
      formData.append('priority_level', priorityLevel);
      formData.append('aircraft_info', aircraftInfo);
      formData.append('chronology', chronology);
      formData.append('action_taken', recordedAction);
      formData.append('last_condition', lastCondition);

      if (sourceInfo.trim()) formData.append('source_info', sourceInfo.trim());
      if (coordinatedParties.trim()) formData.append('coordinated_parties', coordinatedParties.trim());

      photoFiles.forEach((file) => {
        formData.append('photos', file);
      });

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
      subtitle={`Shift ${effectiveShift || 1} | ${formatTeam(effectiveTeam || 'Alpha')} | ${effectiveDate || ''}`}
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
              <span>{getErrorMessage(error, 'Gagal melaporkan insiden.')}</span>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Asal Informasi Kejadian (Opsional)"
            value={sourceInfo}
            onChange={(e) => setSourceInfo(e.target.value)}
            placeholder="Contoh: Tower ATC (121.9 MHz) / AMC / Ground Handling"
          />
          <InputField
            label="Pihak yang Dikoordinasikan (Opsional)"
            value={coordinatedParties}
            onChange={(e) => setCoordinatedParties(e.target.value)}
            placeholder="Contoh: Avsec, AMC, KKP, Polsek Bandara"
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

        {/* Checklist Multi-Select Armada Aktif ke TKP */}
        <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 block">
              Armada ARFF yang Dikerahkan ke TKP (Multi-Select)
            </label>
            {deployedVehicles.length > 0 && (
              <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                {deployedVehicles.length} Armada Terpilih
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Klik armada yang meluncur ke lokasi kejadian untuk dicatat otomatis ke riwayat penanganan:
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {ARFF_FLEET_OPTIONS.map((veh) => {
              const isSelected = deployedVehicles.includes(veh);
              return (
                <button
                  key={veh}
                  type="button"
                  onClick={() => {
                    setDeployedVehicles((prev) =>
                      prev.includes(veh) ? prev.filter((v) => v !== veh) : [...prev, veh]
                    );
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors duration-100 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-red-600 text-white border-red-700 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  )}
                  <span>{veh}</span>
                </button>
              );
            })}
          </div>
        </div>

        <TextareaField
          label="Kondisi Terakhir Lokasi"
          value={lastCondition}
          onChange={(e) => setLastCondition(e.target.value)}
          placeholder="Situasi aman terkendali, area telah dibersihkan dari ceceran, dsb..."
          rows={2}
        />

        {/* Photo Upload with Client-Side WebP Compression (Max 5 photos) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 block">
              Dokumentasi Foto TKP (Kompresi WebP Otomatis, Maks. 5 Foto)
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              {photoFiles.length} / 5 Foto Terpilih
            </span>
          </div>

          <div className="flex items-center gap-4">
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors duration-100 min-h-[44px]">
              <Camera className="w-4 h-4 text-slate-500" />
              <span>{compressing ? 'Mengompres WebP...' : (photoFiles.length > 0 ? 'Tambah Foto TKP' : 'Pilih Foto TKP')}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                disabled={compressing || submitting || photoFiles.length >= 5}
                className="hidden"
              />
            </label>

            {photoFiles.length > 0 && (
              <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Siap Diunggah ({photoFiles.length} file WebP)
              </span>
            )}
          </div>

          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
              {photoPreviews.map((p, idx) => (
                <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video group">
                  <img
                    src={p.url}
                    alt={p.name || `Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="p-1 rounded-full bg-red-600 text-white hover:bg-red-700"
                      title="Hapus foto ini"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-white font-mono">
                    {p.size} KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </form>
      )}
    </Modal>
  );
}
