import React, { useState, useEffect } from 'react';
import { Trash2, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import InputField from '../common/InputField';
import SelectField from '../common/SelectField';
import { TEAMS, cleanTeam, formatTeam, OPERATIONAL_ROLES } from '../../utils/shiftHelper';
import api from '../../services/api';

export default function EditPersonnelModal({
  isOpen,
  onClose,
  personnel,
  onSuccess,
  onRequestDelete,
  isAdmin = false,
  isSupervisor = false,
}) {
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [rankPosition, setRankPosition] = useState('');
  const [teamGroup, setTeamGroup] = useState('Alpha');
  const [certLevel, setCertLevel] = useState('Junior');
  const [certNumber, setCertNumber] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [formalEducation, setFormalEducation] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('organik');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen && personnel) {
      setFullName(personnel.full_name || '');
      setNip(personnel.nip || '');
      setRankPosition(personnel.rank_position || '');
      setTeamGroup(cleanTeam(personnel.team_group) || 'Alpha');
      setCertLevel(personnel.cert_level || 'Junior');
      setCertNumber(personnel.cert_number || '');
      setCertExpiryDate(personnel.cert_expiry_date ? personnel.cert_expiry_date.split('T')[0] : '');
      setBirthDate(personnel.birth_date ? personnel.birth_date.split('T')[0] : '');
      setFormalEducation(personnel.formal_education || '');
      setEmploymentStatus(personnel.employment_status || 'organik');
      setFormError(null);
      setSaving(false);
    }
  }, [isOpen, personnel]);

  if (!isOpen) return null;

  const handleUpdate = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError(null);

    if (!fullName.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/personnel/${personnel.id}`, {
        nip: nip.trim() || null,
        full_name: fullName.trim(),
        rank_position: rankPosition.trim() || null,
        team_group: teamGroup,
        cert_level: certLevel,
        cert_number: certNumber.trim() || null,
        cert_expiry_date: certExpiryDate || null,
        birth_date: birthDate || null,
        formal_education: formalEducation.trim() || null,
        employment_status: employmentStatus,
      });

      if (onSuccess) {
        onSuccess('Data profil personel berhasil diperbarui.');
      }
      onClose();
    } catch (err) {
      console.error('Error updating personnel:', err);
      setFormError(err.response?.data?.message || err.message || 'Gagal memperbarui data personel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Lengkapi & Perbarui Data Personel"
      subtitle="Isi atau perbarui data kepegawaian, nomor lisensi, tanggal lahir, dan pendidikan"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {(isAdmin || isSupervisor) && onRequestDelete && (
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={onRequestDelete}
                disabled={saving}
              >
                Hapus Anggota
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              loading={saving}
            >
              Simpan Profil
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleUpdate} className="space-y-4">
        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Nama Lengkap & Gelar"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!isAdmin}
            required
          />

          <InputField
            label="NIP (Nomor Induk Pegawai)"
            placeholder="Contoh: 20240123 atau -"
            value={nip}
            onChange={(e) => setNip(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Jabatan Operasional (Role)"
            id="rankPosition"
            value={rankPosition}
            onChange={(e) => setRankPosition(e.target.value)}
            options={OPERATIONAL_ROLES.map((r) => ({
              value: r.rank_position,
              label: r.label,
            }))}
            required
            disabled={!isAdmin && !isSupervisor}
          />

          <SelectField
            label="Regu Kedinasan"
            value={teamGroup}
            onChange={(e) => setTeamGroup(e.target.value)}
            options={TEAMS.map((t) => ({ value: cleanTeam(t), label: formatTeam(t) }))}
            disabled={!isAdmin && !isSupervisor}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField
            label="Tingkat Lisensi PKP-PK"
            value={certLevel}
            onChange={(e) => setCertLevel(e.target.value)}
            options={[
              { value: 'Basic', label: 'Basic Fire Fighter' },
              { value: 'Junior', label: 'Junior Fire Fighter' },
              { value: 'Senior', label: 'Senior Fire Fighter' },
            ]}
          />

          <InputField
            label="Nomor Registrasi Lisensi"
            placeholder="Contoh: LIS-ARFF-2024-001 atau -"
            value={certNumber}
            onChange={(e) => setCertNumber(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Masa Berlaku Lisensi"
            type="date"
            value={certExpiryDate}
            onChange={(e) => setCertExpiryDate(e.target.value)}
          />

          <InputField
            label="Tanggal Lahir"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputField
            label="Pendidikan Terakhir"
            placeholder="Contoh: SMA/SMK, D3 Penerbangan, S1"
            value={formalEducation}
            onChange={(e) => setFormalEducation(e.target.value)}
          />

          <SelectField
            label="Status Kepegawaian"
            value={employmentStatus}
            onChange={(e) => setEmploymentStatus(e.target.value)}
            options={[
              { value: 'organik', label: 'Organik (Karyawan Tetap)' },
              { value: 'outsourcing', label: 'Outsourcing / Kontrak' },
            ]}
            disabled={!isAdmin && !isSupervisor}
          />
        </div>
      </form>
    </Modal>
  );
}
