import React, { useState } from 'react';
import { AlertCircle, Radio } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import { cleanTeam, formatTeam } from '../../utils/shiftHelper';
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
  const [notes, setNotes] = useState(logItem?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (status === 'unserviceable' && !notes.trim()) {
      setError('Catatan kendala wajib diisi apabila watchroom dinyatakan unserviceable.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/readiness/watchroom', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        status,
        notes,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal menyimpan status watchroom.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pemeriksaan Kesiapan Fasilitas Watchroom"
      subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${activeDate}`}
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
            <p>Pemeriksaan perangkat radio HT, hotline ATC, direct phone, sirine darurat, dan CCTV apron.</p>
          </div>
        </div>

        <SelectField
          label="Status Kesiapan Watchroom"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          required
          options={[
            { value: 'serviceable', label: 'Serviceable (Siap Pantau & Komunikasi Normal)' },
            { value: 'unserviceable', label: 'Unserviceable (Terdapat Gangguan Fasilitas)' },
          ]}
        />

        <TextareaField
          label={status === 'unserviceable' ? 'Rincian Kendala Fasilitas (Wajib)' : 'Catatan Fasilitas & Kelengkapan (Opsional)'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={
            status === 'unserviceable'
              ? 'Sebutkan perangkat yang tidak berfungsi (contoh: Radio VHF ground offline, crash phone kresek, dsb)...'
              : 'Catatan kondisi baterai backup radio, pengujian sirine darurat, kelancaran saluran langsung tower...'
          }
          required={status === 'unserviceable'}
          rows={3}
        />
      </form>
    </Modal>
  );
}
