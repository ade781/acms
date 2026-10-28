import React, { useState } from 'react';
import { AlertCircle, Radio } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import { cleanTeam, formatTeam, formatIndoDate } from '../../utils/shiftHelper';
import api from '../../services/api';

export default function WatchroomReadinessModal({
  isOpen,
  onClose,
  logItem,
  activeDate,
  activeShiftNumber,
  activeTeam,
  onSuccess,
}) {
  const [status, setStatus] = useState(logItem?.status || 'serviceable');
  const [radioVhf, setRadioVhf] = useState(true);
  const [hotlineAtc, setHotlineAtc] = useState(true);
  const [crashBell, setCrashBell] = useState(true);
  const [cctvPc, setCctvPc] = useState(true);
  const [notes, setNotes] = useState(logItem?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleToggleCheck = (setter, currentVal) => {
    const nextVal = !currentVal;
    setter(nextVal);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const allChecked = radioVhf && hotlineAtc && crashBell && cctvPc;
    const finalStatus = !allChecked ? 'unserviceable' : status;

    if (finalStatus === 'unserviceable' && !notes.trim()) {
      setError('Catatan kendala fasilitas watchroom wajib diisi apabila ada item yang unserviceable.');
      return;
    }

    const checkSummary = `[Fasilitas: Radio VHF: ${radioVhf ? 'OK' : 'FAIL'} | Hotline ATC: ${hotlineAtc ? 'OK' : 'FAIL'} | Crash Bell: ${crashBell ? 'OK' : 'FAIL'} | CCTV/PC: ${cctvPc ? 'OK' : 'FAIL'}] ${notes.trim()}`;

    setSubmitting(true);
    try {
      await api.post('/readiness/watchroom', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        status: finalStatus,
        notes: checkSummary,
      });

      if (onSuccess) onSuccess('Hasil pemeriksaan fasilitas Posko Watchroom berhasil disimpan.');
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan status watchroom.';
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
      title="Pemeriksaan Kesiapan Fasilitas Watchroom"
      subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${formattedDate}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Batal
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={submitting}>
            Simpan Status Watchroom
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

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-100 text-red-700 flex items-center justify-center flex-shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-600">
            <p className="font-semibold text-slate-900">Watchroom & Komunikasi Darurat</p>
            <p>Pemeriksaan rutin kelayakan fasilitas peringatan dini dan saluran komunikasi ke Tower.</p>
          </div>
        </div>

        {/* 4 Checklist Fasilitas */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2.5">
          <p className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
            Daftar Uji Kesiapan Fasilitas:
          </p>

          <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={radioVhf}
              onChange={() => handleToggleCheck(setRadioVhf, radioVhf)}
              className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
            />
            <span>1. Radio Komunikasi (HT Kru & Base Station VHF Ground)</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={hotlineAtc}
              onChange={() => handleToggleCheck(setHotlineAtc, hotlineAtc)}
              className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
            />
            <span>2. Direct Phone / PABX Hotline ke ATC Tower</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={crashBell}
              onChange={() => handleToggleCheck(setCrashBell, crashBell)}
              className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
            />
            <span>3. Crash Bell / Sirine Peringatan Darurat Lapangan</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer text-xs font-medium text-slate-700 hover:text-slate-900">
            <input
              type="checkbox"
              checked={cctvPc}
              onChange={() => handleToggleCheck(setCctvPc, cctvPc)}
              className="w-4 h-4 rounded text-arff-primary focus:ring-0 cursor-pointer"
            />
            <span>4. Komputer Pantau Operasional & CCTV Runway/Apron</span>
          </label>
        </div>

        <SelectField
          label="Status Kesiapan Keseluruhan"
          value={(!radioVhf || !hotlineAtc || !crashBell || !cctvPc) ? 'unserviceable' : status}
          onChange={(e) => setStatus(e.target.value)}
          required
          options={[
            { value: 'serviceable', label: 'Serviceable (Siap Pantau & Komunikasi Normal)' },
            { value: 'unserviceable', label: 'Unserviceable (Terdapat Gangguan Fasilitas)' },
          ]}
        />

        <TextareaField
          label={status === 'unserviceable' || (!radioVhf || !hotlineAtc || !crashBell || !cctvPc) ? 'Rincian Kendala Fasilitas (Wajib)' : 'Catatan Fasilitas Tambahan (Opsional)'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tuliskan catatan teknis atau kendala fasilitas jika ada..."
          required={status === 'unserviceable' || (!radioVhf || !hotlineAtc || !crashBell || !cctvPc)}
          rows={3}
        />
      </form>
    </Modal>
  );
}
