import React, { useState } from 'react';
import { Camera, X, AlertTriangle, Check, Clock, MapPin, Plane, AlertCircle } from 'lucide-react';
import api from '../../../services/api';
import { cleanTeam } from '../../../utils/shiftHelper';

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

export default function MobileIncidentModal({
  isOpen,
  onClose,
  onSuccess,
  shiftDate,
  shiftNumber,
  teamGroup,
}) {
  const [incidentDate, setIncidentDate] = useState(() => {
    return shiftDate || new Date().toISOString().split('T')[0];
  });
  const [incidentTime, setIncidentTime] = useState(() => {
    return new Date().toTimeString().slice(0, 5);
  });
  const [priorityLevel, setPriorityLevel] = useState('sedang');
  const [classification, setClassification] = useState(OFFICIAL_INCIDENT_CLASSIFICATIONS[0]);
  const [customTitle, setCustomTitle] = useState('');
  const [location, setLocation] = useState('');
  const [aircraftInfo, setAircraftInfo] = useState('');
  const [chronology, setChronology] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [lastCondition, setLastCondition] = useState('');
  const [coordinatedParties, setCoordinatedParties] = useState('');
  const [sourceInfo, setSourceInfo] = useState('');

  // Upload photos (max 5)
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 5 - selectedPhotos.length;
    if (remainingSlots <= 0) {
      setErrorMsg('Maksimal 5 foto bukti dokumentasi per insiden.');
      return;
    }

    const validFiles = files.slice(0, remainingSlots).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setErrorMsg('Harap pilih berkas gambar yang sah (JPEG, PNG, WebP).');
      return;
    }

    const newPhotos = [...selectedPhotos, ...validFiles];
    setSelectedPhotos(newPhotos);

    // Generate previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoPreviews((prev) => [...prev, { name: file.name, url: ev.target.result }]);
      };
      reader.readAsDataURL(file);
    });

    setErrorMsg('');
  };

  const handleRemovePhoto = (index) => {
    setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const finalTitle = classification === 'Kejadian Lainnya' && customTitle.trim()
      ? customTitle.trim()
      : classification;

    if (!finalTitle) {
      setErrorMsg('Klasifikasi atau judul kejadian wajib diisi.');
      return;
    }
    if (!location.trim()) {
      setErrorMsg('Lokasi kejadian (sisi udara) wajib diisi.');
      return;
    }
    if (!chronology.trim()) {
      setErrorMsg('Uraian kronologis kejadian wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('incident_date', incidentDate);
      formData.append('incident_time', incidentTime);
      formData.append('shift_number', String(shiftNumber || 1));
      formData.append('team_group', cleanTeam(teamGroup) || 'Alpha');
      formData.append('priority_level', priorityLevel);
      formData.append('title', finalTitle);
      formData.append('location', location.trim());
      formData.append('chronology', chronology.trim());

      // Petakan ke enum category baku di database
      let mappedCategory = 'other';
      if (classification === 'Aircraft Accident') mappedCategory = 'aircraft_accident';
      else if (classification === 'Aircraft Incident' || classification === 'Aircraft Go-Around') mappedCategory = 'aircraft_incident';
      else if (classification.includes('Kebakaran')) mappedCategory = 'fire';
      else if (classification.includes('Emergency')) mappedCategory = 'medical_emergency';
      else if (classification.includes('Hewan') || classification.includes('Wildlife')) mappedCategory = 'hazmat';
      formData.append('category', mappedCategory);

      if (aircraftInfo.trim()) formData.append('aircraft_info', aircraftInfo.trim());
      if (actionTaken.trim()) formData.append('action_taken', actionTaken.trim());
      if (lastCondition.trim()) formData.append('last_condition', lastCondition.trim());
      if (coordinatedParties.trim()) formData.append('coordinated_parties', coordinatedParties.trim());
      if (sourceInfo.trim()) formData.append('source_info', sourceInfo.trim());

      // Append photos under field name 'photos'
      selectedPhotos.forEach((photo) => {
        formData.append('photos', photo);
      });

      await api.post('/incidents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Reset
      setCustomTitle('');
      setLocation('');
      setAircraftInfo('');
      setChronology('');
      setActionTaken('');
      setLastCondition('');
      setCoordinatedParties('');
      setSourceInfo('');
      setSelectedPhotos([]);
      setPhotoPreviews([]);

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error create incident:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal menyimpan laporan insiden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Laporan Insiden Baru
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[10.5px] flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-2 pr-0.5 text-xs">
          {/* Tanggal & Waktu Kejadian */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Tanggal Kejadian *
              </label>
              <input
                type="date"
                value={incidentDate}
                onChange={(e) => setIncidentDate(e.target.value)}
                required
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Waktu Kejadian (WIB) *
              </label>
              <input
                type="time"
                value={incidentTime}
                onChange={(e) => setIncidentTime(e.target.value)}
                required
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
          </div>

          {/* Tingkat Prioritas Siaga */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Tingkat Prioritas Siaga *
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[
                { key: 'rendah', label: 'Rendah (Info)', color: 'border-blue-200 hover:bg-blue-50 text-blue-800' },
                { key: 'sedang', label: 'Sedang (III)', color: 'border-amber-200 hover:bg-amber-50 text-amber-800' },
                { key: 'tinggi', label: 'Tinggi (II)', color: 'border-orange-200 hover:bg-orange-50 text-orange-800' },
                { key: 'kritis', label: 'Kritis (I)', color: 'border-red-200 hover:bg-red-50 text-red-800' },
              ].map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPriorityLevel(p.key)}
                  className={`py-1.5 px-0.5 rounded-lg border text-[9px] font-bold transition-colors duration-100 text-center ${
                    priorityLevel === p.key
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                      : `bg-white ${p.color}`
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* 10 Klasifikasi Baku Kejadian ARFF */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              10 Klasifikasi Baku Kejadian ARFF *
            </label>
            <select
              value={classification}
              onChange={(e) => setClassification(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
            >
              {OFFICIAL_INCIDENT_CLASSIFICATIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {classification === 'Kejadian Lainnya' && (
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Keterangan Klasifikasi Tambahan *
              </label>
              <input
                type="text"
                placeholder="Tuliskan spesifikasi kejadian lainnya..."
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                required
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
          )}

          {/* Lokasi Kejadian (Sisi Udara) & Info Pesawat */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Lokasi Kejadian *
              </label>
              <input
                type="text"
                placeholder="Contoh: Runway 11, Taxiway C"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Pesawat / Flight (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: PK-GIA / GA-204"
                value={aircraftInfo}
                onChange={(e) => setAircraftInfo(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100 font-mono"
              />
            </div>
          </div>

          {/* Uraian Kronologis Kejadian */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Uraian Kronologis Kejadian *
            </label>
            <textarea
              rows={2}
              placeholder="Tuliskan kronologi urutan kejadian, informasi awal yang diterima, dan perkembangan..."
              value={chronology}
              onChange={(e) => setChronology(e.target.value)}
              required
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100 leading-snug"
            />
          </div>

          {/* Tindakan Penanganan Operasional */}
          <div>
            <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
              Tindakan Penanganan Operasional
            </label>
            <textarea
              rows={2}
              placeholder="Armada yang dikerahkan, response time, proses pemadaman / evakuasi / sterilisasi..."
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100 leading-snug"
            />
          </div>

          {/* Kondisi Terakhir & Pihak yang Dikoordinasikan */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Kondisi Terakhir
              </label>
              <input
                type="text"
                placeholder="Aman terkendali / dalam observasi"
                value={lastCondition}
                onChange={(e) => setLastCondition(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-700 block mb-0.5">
                Pihak Koordinasi
              </label>
              <input
                type="text"
                placeholder="ATC, AMC, Avsec, dsb."
                value={coordinatedParties}
                onChange={(e) => setCoordinatedParties(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 text-xs outline-none focus:bg-white focus:border-red-500 transition-colors duration-100"
              />
            </div>
          </div>

          {/* Upload Foto Bukti Lapangan (Maks 5) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-700">
                Foto Bukti Visual Lapangan ({selectedPhotos.length}/5)
              </label>
              <span className="text-[9px] text-slate-400">WebP / JPG / PNG</span>
            </div>

            <div className="flex items-center gap-2">
              {selectedPhotos.length < 5 && (
                <label className="cursor-pointer flex items-center justify-center gap-1.5 p-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-colors duration-100 flex-1">
                  <Camera className="w-4 h-4 text-slate-500" />
                  <span>Ambil / Unggah Foto Bukti</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoSelect}
                  />
                </label>
              )}
            </div>

            {/* Thumbnail previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {photoPreviews.map((preview, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-square rounded-lg border border-slate-300 bg-slate-100 overflow-hidden"
                  >
                    <img
                      src={preview.url}
                      alt="Thumbnail bukti"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-bl p-0.5 text-[8px] leading-none"
                      title="Hapus foto"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tombol Simpan Laporan Insiden */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors duration-100"
          >
            {submitting ? (
              <span>Menyimpan Laporan Insiden...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Laporan Insiden</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
