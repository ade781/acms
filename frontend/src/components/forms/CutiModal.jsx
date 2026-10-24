import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, Upload, User, ShieldCheck } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import api from '../../services/api';

export default function CutiModal({
  isOpen,
  onClose,
  onSuccess,
  user,
  activeDate = '',
}) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('cuti');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      const initialDate = activeDate || new Date().toISOString().split('T')[0];
      setStartDate(initialDate);
      setEndDate(initialDate);
      setReason('cuti');
      setNotes('');
      setFile(null);
      setError(null);
    }
  }, [isOpen, activeDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const targetPersonnelId = user?.personnel_id;
    if (!targetPersonnelId) {
      setError('Akun Anda tidak terhubung dengan data personel operasional untuk mengajukan cuti mandiri.');
      return;
    }

    if (!startDate || !endDate) {
      setError('Tanggal mulai dan tanggal selesai cuti wajib diisi.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai cuti.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('personnel_id', targetPersonnelId);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('absent_reason', reason);
      if (notes.trim()) formData.append('notes', notes.trim());
      if (file) formData.append('document', file);

      const res = await api.post('/deployments/leave-range', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (onSuccess) {
        onSuccess(res.data?.message || 'Pengajuan cuti mandiri berhasil dicatat.');
      }
      onClose();
    } catch (err) {
      console.error('Error submitting leave range:', err);
      setError(err.response?.data?.message || err.message || 'Gagal mengajukan cuti.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      title="Ajukan Izin / Cuti Mandiri"
      subtitle="Kru, Chief, dan Asisten Chief mengajukan izin/cuti murni untuk diri sendiri"
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
          >
            Simpan Pengajuan Cuti
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Data Pemohon Cuti (Terkunci Murni untuk Diri Sendiri) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Nama Pemohon Cuti (Self-Service)
          </label>
          <div className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {user?.name || user?.full_name || 'Personel Mandiri'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                  NIP: {user?.nip || user?.username || '-'} • Regu: {user?.team_group || user?.team || '-'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex-shrink-0">
              Terkunci (Diri Sendiri)
            </span>
          </div>
        </div>

        {/* Rentang Tanggal Kalender */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Tanggal Mulai Cuti"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
          <InputField
            label="Tanggal Selesai Cuti"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>

        {/* Kategori Keterangan Cuti */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Kategori Keterangan Izin / Cuti
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            required
          >
            <option value="cuti">Cuti Tahunan</option>
            <option value="sakit">Sakit</option>
            <option value="dinas">Dinas Luar / Penugasan Khusus</option>
            <option value="tukar_dinas">Tukar Dinas</option>
          </select>
        </div>

        {/* Keterangan Tambahan / Alasan */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Keterangan / Alasan Tambahan
          </label>
          <textarea
            rows={2}
            placeholder="Contoh: Keperluan keluarga mendesak / Istirahat rawat jalan..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Unggah Berkas Bukti (Opsional) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Unggah Surat / Dokumen Bukti (Opsional)
          </label>
          <input
            type="file"
            accept=".pdf,image/png,image/jpeg,image/webp"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Format berkas: PDF, WebP, JPEG, atau PNG (Maks. 5 MB)
          </span>
        </div>
      </form>
    </Modal>
  );
}
