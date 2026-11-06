import React, { useState, useEffect } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  FileText,
  UploadCloud,
  X,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import TextareaField from '../common/TextareaField';
import api from '../../services/api';
import { buildAuthenticatedFileUrl, downloadBlob } from '../../utils/fileHelper';

export const TEAM_GROUPS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
export const SHIFT_NUMBERS = [1, 2, 3];
const EMPTY_ARRAY = [];

export default function VehicleMaintenanceModal({
  isOpen,
  onClose,
  initialData = null,
  vehicles = EMPTY_ARRAY,
  personnel = EMPTY_ARRAY,
  onSuccess,
}) {
  const rawRecordId = initialData?.id || initialData?.maintenance_id || null;
  const isEditMode = Boolean(initialData && rawRecordId);

  // Form State
  const [vehicleId, setVehicleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startShiftNumber, setStartShiftNumber] = useState(1);
  const [startTeamGroup, setStartTeamGroup] = useState('Alpha');
  const [reportedById, setReportedById] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [status, setStatus] = useState('ongoing');

  // Resolved fields
  const [endDate, setEndDate] = useState('');
  const [endShiftNumber, setEndShiftNumber] = useState(1);
  const [endTeamGroup, setEndTeamGroup] = useState('Alpha');
  const [resolvedById, setResolvedById] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [technicianVendor, setTechnicianVendor] = useState('');

  // Document attachment
  const [selectedFile, setSelectedFile] = useState(null);
  const [existingDocUrl, setExistingDocUrl] = useState('');
  const [existingDocName, setExistingDocName] = useState('');
  const [removeDocument, setRemoveDocument] = useState(false);

  // Personnel List State
  const [personnelList, setPersonnelList] = useState(personnel);

  // Submission & Validation State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [errorTitle, setErrorTitle] = useState('Gagal Menyimpan Data');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  // Ambil daftar personel aktif satu kali saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    if (Array.isArray(personnel) && personnel.length > 0) {
      setPersonnelList(personnel);
      return;
    }

    // Hindari pemanggilan berulang jika data sudah ada
    if (personnelList.length > 0) return;

    let isMounted = true;
    api
      .get('/personnel?is_active=1&compact=true')
      .then((res) => {
        if (isMounted && res.data?.data) {
          setPersonnelList(res.data.data);
        }
      })
      .catch((err) => {
        console.warn('Gagal mengambil daftar personel:', err.message);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset / Populate form when modal opens or initialData changes
  useEffect(() => {
    setShowDeleteConfirm(false);
    if (!isOpen) {
      setSelectedFile(null);
      setError(null);
      setErrorTitle('Gagal Menyimpan Data');
      return;
    }

    if (initialData) {
      setVehicleId(initialData.vehicle_id ? String(initialData.vehicle_id) : (vehicles.length > 0 ? String(vehicles[0].id) : ''));
      setStartDate(initialData.start_date || initialData.shift_date || todayStr);
      setStartShiftNumber(Number(initialData.start_shift_number || initialData.shift_number || 1));
      setStartTeamGroup(initialData.start_team_group || initialData.team_group || 'Alpha');
      setReportedById(initialData.reported_by_id ? String(initialData.reported_by_id) : '');

      // Bersihkan prefix [Kategori] agar tidak berulang bertumpuk
      const rawDesc = initialData.issue_description || initialData.justification || initialData.notes || '';
      setIssueDescription(rawDesc.replace(/^\[.*?\]\s*/, '').trim());

      const resolved = initialData.status === 'resolved' || initialData.is_resolved;
      setStatus(resolved ? 'resolved' : 'ongoing');

      setEndDate(initialData.end_date || initialData.resolved_date || todayStr);
      setEndShiftNumber(Number(initialData.end_shift_number || initialData.resolved_shift_number || 1));
      setEndTeamGroup(initialData.end_team_group || initialData.resolved_team_group || 'Alpha');
      setResolvedById(initialData.resolved_by_id ? String(initialData.resolved_by_id) : '');
      setResolutionNotes(initialData.resolution_notes || '');
      setTechnicianVendor(initialData.technician_vendor || initialData.resolved_by || '');

      setExistingDocUrl(initialData.document_url || '');
      setExistingDocName(initialData.document_name || (initialData.document_url ? 'Dokumen_Lampiran.pdf' : ''));
      setRemoveDocument(false);
    } else {
      setVehicleId(vehicles.length > 0 ? String(vehicles[0].id) : '');
      setStartDate(todayStr);
      setStartShiftNumber(1);
      setStartTeamGroup('Alpha');
      setReportedById('');
      setIssueDescription('');
      setStatus('ongoing');

      setEndDate(todayStr);
      setEndShiftNumber(1);
      setEndTeamGroup('Alpha');
      setResolvedById('');
      setResolutionNotes('');
      setTechnicianVendor('');

      setExistingDocUrl('');
      setExistingDocName('');
      setRemoveDocument(false);
    }
    setSelectedFile(null);
    setError(null);
    setErrorTitle('Gagal Menyimpan Data');
  }, [isOpen, initialData]);

  // Handle PDF file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi format: Wajib PDF
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorTitle('Format Berkas Tidak Sesuai');
      setError('Format berkas tidak valid. Harap pilih berkas PDF (.pdf).');
      e.target.value = '';
      return;
    }

    // Validasi ukuran: Maksimal 10MB
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrorTitle('Ukuran Berkas Melebihi Batas');
      setError(`Ukuran berkas melebihi batas 10MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      e.target.value = '';
      return;
    }

    setError(null);
    setErrorTitle('Gagal Menyimpan Data');
    setSelectedFile(file);
    setRemoveDocument(false);
  };

  const handleRemoveExistingDoc = () => {
    setRemoveDocument(true);
    setExistingDocUrl('');
    setExistingDocName('');
  };

  const handleCancelNewFile = () => {
    setSelectedFile(null);
  };

  const handleConfirmDelete = async () => {
    if (!rawRecordId) return;
    setIsDeleting(true);
    setError(null);
    try {
      await api.delete(`/readiness/maintenance/${rawRecordId}`);
      setShowDeleteConfirm(false);
      onClose();
      if (onSuccess) {
        onSuccess('Catatan pemeliharaan / kendala armada berhasil dihapus.');
      }
    } catch (err) {
      console.error('Error deleting maintenance record:', err);
      const errMsg =
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : typeof err.response?.data === 'string'
            ? err.response.data
            : err.message || 'Gagal menghapus catatan pemeliharaan armada.';
      setErrorTitle('Gagal Menghapus Data');
      setError(errMsg);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorTitle('Gagal Menyimpan Data');
    setError(null);

    if (!vehicleId) {
      setError('Unit armada wajib dipilih.');
      return;
    }
    if (!startDate) {
      setError('Tanggal mulai kendala wajib diisi.');
      return;
    }
    if (!issueDescription.trim()) {
      setError('Uraian kendala / kerusakan fisik wajib diisi.');
      return;
    }

    if (status === 'resolved') {
      if (!endDate) {
        setError('Tanggal pemulihan armada wajib diisi jika status perbaikan selesai.');
        return;
      }
      if (endDate < startDate) {
        setError('Tanggal pemulihan armada tidak boleh lebih awal dari tanggal mulai kendala.');
        return;
      }
      if (endDate > todayStr) {
        setError('Tanggal pemulihan armada tidak boleh melebihi tanggal hari ini.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('vehicle_id', vehicleId);
      formData.append('start_date', startDate);
      formData.append('start_shift_number', String(startShiftNumber));
      formData.append('start_team_group', startTeamGroup);
      if (reportedById) {
        formData.append('reported_by_id', reportedById);
      }
      // Bersihkan uraian kendala dari prefix tanda kurung siku jika ada
      const cleanDesc = issueDescription.replace(/^\[.*?\]\s*/, '').trim();
      formData.append('issue_description', cleanDesc);
      formData.append('status', status);

      if (status === 'resolved') {
        formData.append('end_date', endDate);
        formData.append('end_shift_number', String(endShiftNumber));
        formData.append('end_team_group', endTeamGroup);
        if (resolvedById) {
          formData.append('resolved_by_id', resolvedById);
        }
        if (resolutionNotes.trim()) {
          formData.append('resolution_notes', resolutionNotes.trim());
        }
        if (technicianVendor.trim()) {
          formData.append('technician_vendor', technicianVendor.trim());
        }
      }

      if (selectedFile) {
        formData.append('document', selectedFile);
      } else if (removeDocument) {
        formData.append('remove_document', 'true');
      }

      if (isEditMode && rawRecordId) {
        await api.put(`/readiness/maintenance/${rawRecordId}`, formData);
      } else {
        await api.post('/readiness/maintenance', formData);
      }

      if (onSuccess) {
        onSuccess(
          isEditMode
            ? 'Catatan pemeliharaan / kendala armada berhasil diperbarui.'
            : 'Catatan pemeliharaan / kendala armada baru berhasil disimpan.'
        );
      }
      onClose();
    } catch (err) {
      console.error('Error saving maintenance record:', err);
      const errMsg =
        typeof err.response?.data?.message === 'string'
          ? err.response.data.message
          : typeof err.response?.data === 'string'
            ? err.response.data
            : err.message || 'Gagal menyimpan catatan pemeliharaan armada.';
      setErrorTitle('Gagal Menyimpan Data');
      setError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleOptions = vehicles.map((v) => ({
    value: String(v.id),
    label: `${v.code_name} - ${v.vehicle_name}`,
  }));

  const shiftOptions = SHIFT_NUMBERS.map((s) => ({
    value: String(s),
    label: `Shift ${s}`,
  }));

  const teamOptions = TEAM_GROUPS.map((t) => ({
    value: t,
    label: `Regu ${t}`,
  }));

  const personnelOptions = [
    { value: '', label: '-- Pilih Personel (Opsional) --' },
    ...personnelList.map((p) => ({
      value: String(p.id),
      label: `${p.full_name} (${p.nip || p.role_name || 'Kru'})`,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Catatan Pemeliharaan Armada' : 'Catat Pemeliharaan / Kendala Armada'}
      subtitle={
        isEditMode
          ? 'Pencatatan resmi status kesiapan fisik, kendala teknis, dan riwayat perbaikan armada ARFF YIA'
          : 'Pencatatan tiket perbaikan baru, kendala fisik, atau SPK perawatan armada ARFF YIA'
      }
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between gap-2.5 w-full">
          <div>
            {isEditMode && !showDeleteConfirm && (
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setShowDeleteConfirm(true)}
                disabled={submitting || isDeleting}
              >
                Hapus Catatan
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!showDeleteConfirm && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={submitting || isDeleting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={submitting || isDeleting}
                >
                  {isEditMode ? 'Simpan Perubahan' : 'Simpan Catatan'}
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
        {/* Pesan Kesalahan / Error Banner */}
        {error && (
          <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 flex items-start gap-2.5 text-xs">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block">
                {errorTitle || 'Gagal Menyimpan Data'}
              </strong>
              <span>{typeof error === 'string' ? error : 'Terjadi kesalahan sistem.'}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700 p-0.5 cursor-pointer transition-colors duration-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Banner Konfirmasi Hapus Catatan Kendala */}
        {showDeleteConfirm && (
          <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-900 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold text-xs text-red-800 uppercase tracking-wider block">
                  Konfirmasi Hapus Catatan Kendala
                </strong>
                <p className="text-xs text-red-700 mt-0.5">
                  Apakah Anda yakin ingin menghapus catatan kendala / pemeliharaan armada ini? Berkas dokumen dan riwayat terkait akan dihapus secara permanen.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-red-200/80">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={handleConfirmDelete}
                loading={isDeleting}
                disabled={isDeleting}
              >
                Ya, Hapus Sekarang
              </Button>
            </div>
          </div>
        )}

        {/* Seksi 1: Data Identitas Armada & Pelaporan Kendala */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
            <Wrench className="w-4 h-4 text-slate-700 shrink-0" />
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Identitas Armada & Awal Kendala
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Unit Armada - Terkunci saat mode edit */}
            <div className="sm:col-span-2">
              <SelectField
                label="Unit Kendaraan Operasional"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                options={vehicleOptions}
                placeholder="Pilih Unit Armada..."
                required
                disabled={isEditMode || submitting}
              />
              {isEditMode ? (
                <p className="text-slate-400 text-xs mt-1 italic">
                  Unit armada dikunci sesuai catatan kendala yang sedang diedit.
                </p>
              ) : (
                <p className="text-slate-400 text-xs mt-1">
                  Pilih unit armada yang mengalami kendala fisik atau membutuhkan perawatan.
                </p>
              )}
            </div>

            {/* Tanggal Mulai Kendala (Batas maksimal hari ini) */}
            <InputField
              type="date"
              label="Tanggal Mulai Kendala"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={todayStr}
              required
              disabled={submitting}
            />

            {/* Shift Mulai */}
            <SelectField
              label="Shift Terdeteksi"
              value={String(startShiftNumber)}
              onChange={(e) => setStartShiftNumber(Number(e.target.value))}
              options={shiftOptions}
              required
              disabled={submitting}
            />

            {/* Regu Pelapor */}
            <SelectField
              label="Regu Pelapor"
              value={startTeamGroup}
              onChange={(e) => setStartTeamGroup(e.target.value)}
              options={teamOptions}
              required
              disabled={submitting}
            />

            {/* Personel Pelapor (PIC) */}
            <SelectField
              label="Personel Pelapor (PIC / Petugas Terkait)"
              value={reportedById}
              onChange={(e) => setReportedById(e.target.value)}
              options={personnelOptions}
              disabled={submitting}
            />
          </div>

          {/* Uraian Kendala / Kerusakan Fisik */}
          <TextareaField
            label="Uraian Kendala / Kerusakan Fisik"
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            placeholder="Jelaskan secara rinci kerusakan komponen, indikasi tidak normal, atau kendala lapangan..."
            rows={3}
            required
            disabled={submitting}
          />
        </div>

        {/* Seksi 2: Status Pemeliharaan & Tindakan Perbaikan */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-700 shrink-0" />
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Status Penanganan Pemeliharaan
              </h4>
            </div>

            {/* Status Switcher (Segmented Control) */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setStatus('ongoing')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${status === 'ongoing'
                    ? 'bg-amber-500 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Dalam Penanganan
              </button>
              <button
                type="button"
                onClick={() => setStatus('resolved')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors duration-100 cursor-pointer ${status === 'resolved'
                    ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Selesai (Serviceable)
              </button>
            </div>
          </div>

          {status === 'ongoing' ? (
            <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 text-amber-900 flex items-center gap-2.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
              <p>
                Armada saat ini tercatat <strong>Unserviceable</strong> dan dalam proses perbaikan/pengadaan suku cadang.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tanggal Pemulihan */}
                <InputField
                  type="date"
                  label="Tanggal Pemulihan (Serviceable)"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || undefined}
                  max={todayStr}
                  required={status === 'resolved'}
                  disabled={submitting}
                />

                {/* Shift Pemulihan */}
                <SelectField
                  label="Shift Pemulihan"
                  value={String(endShiftNumber)}
                  onChange={(e) => setEndShiftNumber(Number(e.target.value))}
                  options={shiftOptions}
                  required={status === 'resolved'}
                  disabled={submitting}
                />

                {/* Regu Pemulih */}
                <SelectField
                  label="Regu Pemulih"
                  value={endTeamGroup}
                  onChange={(e) => setEndTeamGroup(e.target.value)}
                  options={teamOptions}
                  required={status === 'resolved'}
                  disabled={submitting}
                />

                {/* Teknisi / Pelaksana Pemulihan (Input Terpadu) */}
                <InputField
                  type="text"
                  label="Teknisi / Pelaksana Pemulihan"
                  value={technicianVendor}
                  onChange={(e) => setTechnicianVendor(e.target.value)}
                  placeholder="Contoh: Teknisi ARFF YIA / Bengkel Rekanan / Petugas"
                  disabled={submitting}
                />
              </div>

              {/* Tindakan Perbaikan */}
              <TextareaField
                label="Tindakan Perbaikan / Suku Cadang yang Diganti"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Uraikan tindakan perbaikan yang telah dilaksanakan, penggantian spare part, atau hasil uji pancar..."
                rows={2}
                disabled={submitting}
              />
            </div>
          )}
        </div>

        {/* Seksi 3: Unggah Dokumen Lampiran (PDF) */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
            <FileText className="w-4 h-4 text-slate-700 shrink-0" />
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              Dokumen Lampiran (Format PDF)
            </h4>
          </div>

          {/* Jika ada dokumen lampiran yang sudah tersimpan sebelumnya */}
          {existingDocUrl && !removeDocument && (
            <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 text-xs truncate max-w-[280px]">
                    {existingDocName || 'Dokumen_Lampiran.pdf'}
                  </p>
                  <p className="text-slate-400 text-xs">Berkas tersimpan di server</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.get(existingDocUrl, { responseType: 'blob' });
                      const blob = new Blob([res.data], { type: 'application/pdf' });
                      downloadBlob(blob, existingDocName || 'Dokumen_Lampiran.pdf');
                    } catch (err) {
                      console.error('Error downloading existing doc:', err);
                      window.open(buildAuthenticatedFileUrl(existingDocUrl), '_blank');
                    }
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors duration-100 inline-flex items-center gap-1 cursor-pointer"
                  title="Buka / Unduh berkas dokumen"
                >
                  <FileText className="w-3.5 h-3.5 text-red-600" />
                  Buka Dokumen
                </button>
                <button
                  type="button"
                  onClick={handleRemoveExistingDoc}
                  className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded border border-red-200 transition-colors duration-100 cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          )}

          {/* Jika user memilih file baru */}
          {selectedFile ? (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-emerald-900 text-xs truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-emerald-700 text-xs font-mono tabular-nums">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diunggah
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelNewFile}
                className="p-1 rounded text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 transition-colors duration-100 cursor-pointer"
                title="Batalkan Pilihan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-slate-400 bg-white rounded-xl p-4 cursor-pointer transition-colors duration-100 text-center">
                <UploadCloud className="w-6 h-6 text-slate-400 mb-1" />
                <span className="font-semibold text-slate-700 text-xs">
                  {existingDocUrl && !removeDocument
                    ? 'Klik untuk Mengganti Berkas PDF'
                    : 'Pilih Berkas Lampiran PDF'}
                </span>
                <span className="text-slate-400 text-xs mt-0.5">
                  Format dokumen resmi .pdf (Maksimal 10MB)
                </span>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onClick={(e) => { e.target.value = null; }}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={submitting}
                />
              </label>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
