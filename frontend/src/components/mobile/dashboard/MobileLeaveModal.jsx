import React, { useState, useEffect } from 'react';
import { X, Calendar, Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import api from '../../../services/api';

export default function MobileLeaveModal({
  isOpen,
  onClose,
  user,
  activeDate,
  activeShiftNumber,
  activeTeam,
  activeUserLeave,
  onSuccess
}) {
  if (!isOpen) return null;

  const isPrivileged = ['admin', 'supervisor', 'chief', 'chief_assistant', 'dept_head'].includes(user?.role);

  const [category, setCategory] = useState('cuti');
  const [startDate, setStartDate] = useState(activeDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(activeDate || new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Pilihan personel untuk Admin / Chief / Supervisor
  const [personnelList, setPersonnelList] = useState([]);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');

  useEffect(() => {
    if (activeDate) {
      setStartDate(activeDate);
      setEndDate(activeDate);
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [activeDate, isOpen]);

  useEffect(() => {
    if (isPrivileged && isOpen) {
      const fetchPersonnelForLeave = async () => {
        try {
          const team = activeTeam || user?.team_group || '';
          const res = await api.get(`/personnel?is_active=1${team ? `&team_group=${team}` : ''}`);
          const list = Array.isArray(res.data?.data)
            ? res.data.data
            : (Array.isArray(res.data?.personnel) ? res.data.personnel : (Array.isArray(res.data) ? res.data : []));
          setPersonnelList(list);
          if (list.length > 0 && !selectedPersonnelId) {
            setSelectedPersonnelId(String(list[0].id));
          }
        } catch (e) {
          console.error('Gagal mengambil daftar personel di MobileLeaveModal:', e);
        }
      };
      fetchPersonnelForLeave();
    }
  }, [isPrivileged, isOpen, activeTeam]);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const handleCancelLeave = async () => {
    if (!window.confirm('Batalkan status izin/cuti Anda dan kembali aktif berdinas pada shift ini?')) {
      return;
    }

    setCancelling(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (activeUserLeave?.id) {
        await api.delete(`/deployments/leave/${activeUserLeave.id}`);
      } else {
        await api.post('/deployments/cancel-leave', {
          deployment_id: activeUserLeave?.deployment_id,
          personnel_id: user?.personnel_id,
          shift_id: activeUserLeave?.shift_id,
          shift_date: activeDate,
          shift_number: activeShiftNumber
        });
      }

      setSuccessMsg('Izin/cuti berhasil dibatalkan. Status Anda kembali aktif berdinas.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error cancelling leave:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal membatalkan cuti.');
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetPId = isPrivileged ? selectedPersonnelId : user?.personnel_id;
    if (!targetPId) {
      setErrorMsg('Harap tentukan nama personel yang diajukan cuti.');
      return;
    }

    if (!startDate || !endDate || !reason.trim()) {
      setErrorMsg('Tanggal mulai, tanggal selesai, dan alasan cuti wajib diisi.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('personnel_id', targetPId);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('absent_reason', category);
      formData.append('notes', reason.trim());
      if (file) {
        formData.append('document', file);
      }

      const res = await api.post('/deployments/leave', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMsg(res.data?.message || 'Permohonan izin/cuti berhasil diajukan.');
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error submitting leave:', err);
      setErrorMsg(err.response?.data?.message || err.message || 'Gagal mengajukan izin/cuti.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2 shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <h4 className="text-xs font-bold text-slate-900 uppercase">
            Pengajuan Cuti / Izin Mandiri
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-[10px] flex items-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Kotak Status Cuti Aktif & Tombol Cancel Cuti */}
        {activeUserLeave && (
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
            <div className="flex items-center justify-between text-amber-900 font-bold text-[10px]">
              <span>STATUS: IZIN/CUTI AKTIF</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[8px] uppercase">
                {activeUserLeave.absent_reason || activeUserLeave.reason || 'Cuti'}
              </span>
            </div>
            <p className="text-[9.5px] text-amber-800 leading-snug">
              Anda tercatat mengajukan izin/cuti pada dinas shift ini.
            </p>
            <button
              type="button"
              onClick={handleCancelLeave}
              disabled={cancelling}
              className="w-full py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold text-[10px] flex items-center justify-center gap-1 shadow-2xs transition-colors duration-100 cursor-pointer"
            >
              {cancelling ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Membatalkan...</span>
                </>
              ) : (
                <>
                  <X className="w-3 h-3" />
                  <span>Cancel Cuti (Kembali Bertugas Aktif)</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Formulir Permohonan Cuti Baru */}
        <form onSubmit={handleSubmitLeave} className="space-y-1.5 text-xs">
          {/* Pilihan Nama Personel jika Admin / Chief / Supervisor */}
          {isPrivileged && (
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                Nama Personel *
              </label>
              <select
                value={selectedPersonnelId}
                onChange={(e) => setSelectedPersonnelId(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 outline-none text-xs transition-colors duration-100"
                required
              >
                <option value="">-- Pilih Personel --</option>
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.name} ({p.nip || '-'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
              Kategori Izin *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 outline-none transition-colors duration-100"
            >
              <option value="cuti">Cuti Tahunan</option>
              <option value="sakit">Sakit</option>
              <option value="dinas">Dinas Luar</option>
              <option value="tukar_dinas">Tukar Dinas</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                Mulai *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none transition-colors duration-100"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                Sampai *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 font-mono text-xs outline-none transition-colors duration-100"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
              Keterangan / Alasan *
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan rincian alasan permohonan izin/cuti..."
              className="w-full p-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-900 outline-none transition-colors duration-100"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
              Surat Keterangan / Bukti Lampiran
            </label>
            <div className="flex items-center gap-1.5">
              <label className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-[11px] flex items-center gap-1 shadow-2xs transition-colors duration-100 cursor-pointer">
                <Upload className="w-3 h-3 text-slate-500" />
                <span>Upload</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <span className="text-[10px] text-slate-500 italic truncate max-w-[200px]">
                {file ? file.name : 'Belum ada berkas surat diunggah'}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold text-xs rounded-xl shadow-xs mt-1 transition-colors duration-100 flex items-center justify-center gap-1 cursor-pointer"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Mengirim Permohonan...</span>
              </>
            ) : (
              <span>Kirim Permohonan Izin</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
