import React, { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  PlusCircle,
  Save,
  CheckCircle,
  AlertCircle,
  Trash2,
  Calendar,
  Upload,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';

export default function HalamanCuti() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [existingDeployments, setExistingDeployments] = useState([]);
  const [absentList, setAbsentList] = useState([]);
  const [supervisorName, setSupervisorName] = useState('');
  const [saving, setSaving] = useState(false);

  // State Pengajuan Cuti Rentang Tanggal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leavePersonnelId, setLeavePersonnelId] = useState('');
  const [leaveStartDate, setLeaveStartDate] = useState(activeDate || '');
  const [leaveEndDate, setLeaveEndDate] = useState(activeDate || '');
  const [leaveReason, setLeaveReason] = useState('cuti');
  const [leaveNotes, setLeaveNotes] = useState('');
  const [leaveFile, setLeaveFile] = useState(null);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveModalError, setLeaveModalError] = useState(null);

  // Auto-dismiss timer untuk pesan sukses
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const fetchLeaveData = useCallback(async (options = {}) => {
    setLoading(true);
    setError(null);
    if (!options?.keepSuccessMsg) {
      setSuccessMsg(null);
    }

    try {
      const currentTeam = cleanTeam(activeTeam);

      const [pRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
      ]);

      const personnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel)
        ? pRes.data.personnel
        : (Array.isArray(pRes.data) ? pRes.data : []));
      setTeamPersonnel(personnel);

      const depData = depRes.data;
      setSupervisorName(depData?.supervisor_name || '');
      setExistingDeployments(depData?.deployments || []);

      const existingAbsent = (depData?.deployments || []).filter(
        (d) => d.deployment_type === 'absent'
      );

      if (existingAbsent.length > 0) {
        setAbsentList(
          existingAbsent.map((d) => ({
            personnel_id: d.personnel_id,
            reason: d.absent_reason || 'cuti',
            notes: d.notes || '',
          }))
        );
      } else {
        setAbsentList([]);
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('Gagal memuat data pencatatan cuti personel.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const handleOpenLeaveModal = () => {
    setLeaveModalError(null);
    setLeaveStartDate(activeDate || new Date().toISOString().split('T')[0]);
    setLeaveEndDate(activeDate || new Date().toISOString().split('T')[0]);
    setLeaveReason('cuti');
    setLeaveNotes('');
    setLeaveFile(null);
    if (!isAdmin && !isSupervisor && user?.personnel_id) {
      setLeavePersonnelId(String(user.personnel_id));
    } else {
      setLeavePersonnelId(teamPersonnel[0]?.id ? String(teamPersonnel[0].id) : '');
    }
    setLeaveModalOpen(true);
  };

  const handleSubmitLeaveRange = async (e) => {
    e.preventDefault();
    setLeaveModalError(null);

    const targetPId = (!isAdmin && !isSupervisor) ? user?.personnel_id : leavePersonnelId;
    if (!targetPId) {
      setLeaveModalError('Harap tentukan nama personel.');
      return;
    }
    if (!leaveStartDate || !leaveEndDate) {
      setLeaveModalError('Tanggal mulai dan tanggal selesai wajib diisi.');
      return;
    }
    if (new Date(leaveStartDate) > new Date(leaveEndDate)) {
      setLeaveModalError('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }

    setSubmittingLeave(true);
    try {
      const formData = new FormData();
      formData.append('personnel_id', targetPId);
      formData.append('start_date', leaveStartDate);
      formData.append('end_date', leaveEndDate);
      formData.append('absent_reason', leaveReason);
      if (leaveNotes.trim()) formData.append('notes', leaveNotes.trim());
      if (leaveFile) formData.append('document', leaveFile);

      const res = await api.post('/deployments/leave-range', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMsg(res.data?.message || 'Pengajuan cuti berhasil dicatat.');
      setLeaveModalOpen(false);
      fetchLeaveData({ keepSuccessMsg: true });
    } catch (err) {
      console.error('Error submitting leave range:', err);
      setLeaveModalError(err.response?.data?.message || err.message || 'Gagal mengajukan cuti.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleAddAbsent = () => {
    setAbsentList((prev) => [
      ...prev,
      { personnel_id: '', reason: 'cuti', notes: '' },
    ]);
  };

  const handleRemoveAbsent = (index) => {
    setAbsentList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveLeave = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      // Kumpulkan ID personel yang dicatat cuti
      const absentPersonnelIds = new Set(
        absentList
          .filter((abs) => abs.personnel_id)
          .map((abs) => Number(abs.personnel_id))
      );

      // Pertahankan ploting operasional yang sudah ada (selain absent dan selain yang dicatat cuti)
      const nonAbsentDeployments = existingDeployments
        .filter((d) => d.deployment_type !== 'absent' && !absentPersonnelIds.has(Number(d.personnel_id)))
        .map((d) => ({
          personnel_id: Number(d.personnel_id),
          deployment_type: d.deployment_type,
          vehicle_id: d.vehicle_id ? Number(d.vehicle_id) : null,
          is_pic: Boolean(d.is_pic),
          notes: d.notes || '',
        }));

      // Tambahkan absent yang baru diinput
      const newAbsentDeployments = absentList
        .filter((abs) => abs.personnel_id)
        .map((abs) => ({
          personnel_id: Number(abs.personnel_id),
          deployment_type: 'absent',
          vehicle_id: null,
          is_pic: false,
          absent_reason: abs.reason,
          notes: abs.notes || '',
        }));

      const payloadDeployments = [...nonAbsentDeployments, ...newAbsentDeployments];

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setSuccessMsg('Pencatatan cuti dan izin personel berhasil disimpan.');
      fetchLeaveData({ keepSuccessMsg: true });
    } catch (err) {
      console.error('Error saving leave data:', err);
      setError(`Gagal menyimpan data cuti: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Floating Viewport Toast Notifikasi (Selalu Terlihat di Posisi Scroll Manapun) */}
      {successMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{successMsg}</span>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="ml-2 hover:bg-emerald-700 p-0.5 rounded text-emerald-100"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-red-600 text-white shadow-xl text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-150">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-white" />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-2 hover:bg-red-700 p-0.5 rounded text-red-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info Shift */}
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={supervisorName}
        personnelStats={{
          total: teamPersonnel.length,
          duty: Math.max(0, teamPersonnel.length - absentList.length),
          absent: absentList.length,
          isPlotted: true,
        }}
      />

      <StateView loading={loading} onRetry={fetchLeaveData}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-arff-primary flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Pencatatan Cuti & Izin
                </h4>
                <p className="text-xs text-slate-500">
                  Personel yang tidak berdinas pada shift aktif
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="primary"
                size="sm"
                icon={Calendar}
                onClick={handleOpenLeaveModal}
              >
                {!isAdmin && !isSupervisor ? 'Ajukan Izin / Cuti Saya' : 'Ajukan Cuti (Rentang Tanggal)'}
              </Button>

              {(isAdmin || isSupervisor) && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={PlusCircle}
                  onClick={handleAddAbsent}
                >
                  Tambah Cuti Shift Ini
                </Button>
              )}
            </div>
          </div>

          {absentList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">Seluruh Personel Hadir</p>
              <p className="text-slate-400 mt-0.5">
                Tidak ada personel regu yang tercatat cuti atau berhalangan pada shift ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {absentList.map((abs, idx) => {
                const isMyOwnLeave = user?.personnel_id && Number(user.personnel_id) === Number(abs.personnel_id);
                const canModifyThis = isAdmin || isSupervisor;
                const canDeleteThis = isAdmin || isSupervisor || isMyOwnLeave;

                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                  >
                    {/* Pilihan Personel */}
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nama Personel:
                      </label>
                      <select
                        value={abs.personnel_id || ''}
                        disabled={!canModifyThis}
                        onChange={(e) => {
                          const updated = [...absentList];
                          updated[idx].personnel_id = e.target.value ? Number(e.target.value) : '';
                          setAbsentList(updated);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-600"
                      >
                        <option value="">(Pilih Personel)</option>
                        {teamPersonnel.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Kategori Izin/Cuti */}
                    <div className="w-full sm:w-44">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kategori Keterangan:
                      </label>
                      <select
                        value={abs.reason}
                        disabled={!canModifyThis}
                        onChange={(e) => {
                          const updated = [...absentList];
                          updated[idx].reason = e.target.value;
                          setAbsentList(updated);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-600"
                      >
                        <option value="cuti">Cuti Tahunan</option>
                        <option value="sakit">Sakit</option>
                        <option value="dinas">Dinas Luar</option>
                        <option value="tukar_dinas">Tukar Dinas</option>
                      </select>
                    </div>

                    {/* Catatan / Alasan */}
                    <div className="flex-1">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Keterangan / Alasan Tambahan:
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Izin keperluan keluarga, surat dokter..."
                        value={abs.notes || ''}
                        disabled={!canModifyThis}
                        onChange={(e) => {
                          const updated = [...absentList];
                          updated[idx].notes = e.target.value;
                          setAbsentList(updated);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-slate-100 disabled:text-slate-600"
                      />
                    </div>

                    {/* Tombol Hapus */}
                    {canDeleteThis && (
                      <div className="sm:pt-5">
                        <button
                          type="button"
                          onClick={() => handleRemoveAbsent(idx)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors duration-100"
                          title="Hapus baris cuti ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Action Footer (Khusus Supervisor / Admin) */}
          {(isAdmin || isSupervisor) && absentList.length > 0 && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                icon={Save}
                loading={saving}
                onClick={handleSaveLeave}
              >
                Simpan Pencatatan Cuti
              </Button>
            </div>
          )}
        </div>
      </StateView>

      {/* Modal Pengajuan Cuti / Izin Rentang Tanggal */}
      {leaveModalOpen && (
        <Modal
          isOpen={leaveModalOpen}
          onClose={() => {
            if (!submittingLeave) setLeaveModalOpen(false);
          }}
          title={!isAdmin && !isSupervisor ? 'Ajukan Izin / Cuti Mandiri' : 'Catat Izin / Cuti (Rentang Tanggal)'}
          subtitle="Pilih rentang tanggal kalender dan lampirkan bukti pendukung jika ada"
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setLeaveModalOpen(false)}
                disabled={submittingLeave}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmitLeaveRange}
                loading={submittingLeave}
              >
                Simpan Pengajuan Cuti
              </Button>
            </>
          }
        >
          <form onSubmit={handleSubmitLeaveRange} className="space-y-4">
            {leaveModalError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {leaveModalError}
              </div>
            )}

            {/* Nama Personel */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Personel
              </label>
              {isAdmin || isSupervisor ? (
                <select
                  value={leavePersonnelId}
                  onChange={(e) => setLeavePersonnelId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">(Pilih Personel)</option>
                  {teamPersonnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.nip || '-'})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-700 font-semibold">
                  {user?.name || 'Saya (Akun yang sedang login)'}
                </div>
              )}
            </div>

            {/* Rentang Tanggal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Tanggal Mulai Cuti"
                type="date"
                value={leaveStartDate}
                onChange={(e) => setLeaveStartDate(e.target.value)}
                required
              />
              <InputField
                label="Tanggal Selesai Cuti"
                type="date"
                value={leaveEndDate}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                required
              />
            </div>

            {/* Kategori Keterangan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kategori Keterangan
              </label>
              <select
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              >
                <option value="cuti">Cuti Tahunan</option>
                <option value="sakit">Sakit</option>
                <option value="dinas">Dinas Luar</option>
                <option value="tukar_dinas">Tukar Dinas</option>
              </select>
            </div>

            {/* Catatan / Keterangan Tambahan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Keterangan Tambahan / Alasan
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Keperluan keluarga mendesak / Istirahat rawat jalan"
                value={leaveNotes}
                onChange={(e) => setLeaveNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Unggah Berkas Dokumen Pendukung (Opsional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unggah Surat / Dokumen Bukti (Opsional)
              </label>
              <input
                type="file"
                accept=".pdf,image/png,image/jpeg,image/webp"
                onChange={(e) => setLeaveFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Format didukung: PDF, WebP, JPEG, atau PNG (Maks. 5 MB)
              </span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
