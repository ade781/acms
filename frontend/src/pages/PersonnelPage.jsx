import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Filter, UserCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEAMS } from '../utils/shiftHelper';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import InputField from '../components/common/InputField';
import Modal from '../components/common/Modal';
import SelectField from '../components/common/SelectField';

export default function PersonnelPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personnelList, setPersonnelList] = useState([]);

  // Filters
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCert, setSelectedCert] = useState('ALL');

  // Add Personnel Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [rankPosition, setRankPosition] = useState('');
  const [teamGroup, setTeamGroup] = useState('Alpha');
  const [certLevel, setCertLevel] = useState('Junior');
  const [certNumber, setCertNumber] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('organik');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchPersonnel = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (selectedTeam !== 'ALL') queryParams.push(`team_group=${selectedTeam}`);
      if (selectedCert !== 'ALL') queryParams.push(`cert_level=${selectedCert}`);
      if (searchQuery.trim()) queryParams.push(`search=${encodeURIComponent(searchQuery.trim())}`);

      const url = `/personnel${queryParams.length > 0 ? '?' + queryParams.join('&') : ''}`;
      const res = await api.get(url);
      const list = Array.isArray(res.data?.personnel) ? res.data.personnel : (Array.isArray(res.data) ? res.data : []);
      setPersonnelList(list);
    } catch (err) {
      console.error('Error fetching personnel:', err);
      setError('Gagal memuat katalog personel.');
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, selectedCert, searchQuery]);

  useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  const handleAddPersonnel = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !rankPosition.trim()) {
      setFormError('Nama lengkap dan jabatan wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/personnel', {
        full_name: fullName,
        rank_position: rankPosition,
        team_group: teamGroup,
        cert_level: certLevel,
        cert_number: certNumber,
        cert_expiry_date: certExpiryDate || null,
        employment_status: employmentStatus,
        is_active: 1,
      });

      setAddModalOpen(false);
      // Reset form
      setFullName('');
      setRankPosition('');
      setCertNumber('');
      fetchPersonnel();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menambahkan personel.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Katalog Data Induk Personel ARFF
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Daftar personel resmi, lisensi kompetensi PKP-PK, dan pembagian regu operasional
          </p>
        </div>

        {isAdmin && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setAddModalOpen(true)}
          >
            Tambah Personel Baru
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="w-full md:flex-1">
          <InputField
            id="searchPersonnel"
            placeholder="Cari nama atau jabatan personel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>

        {/* Team Filter */}
        <div className="w-full md:w-48">
          <SelectField
            id="teamFilter"
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            options={[
              { value: 'ALL', label: 'Semua Regu' },
              ...TEAMS.map((t) => ({ value: t, label: `Regu ${t}` })),
            ]}
          />
        </div>

        {/* Cert Level Filter */}
        <div className="w-full md:w-48">
          <SelectField
            id="certFilter"
            value={selectedCert}
            onChange={(e) => setSelectedCert(e.target.value)}
            options={[
              { value: 'ALL', label: 'Semua Lisensi' },
              { value: 'Basic', label: 'Basic Fire Fighter' },
              { value: 'Junior', label: 'Junior Fire Fighter' },
              { value: 'Senior', label: 'Senior Fire Fighter' },
            ]}
          />
        </div>
      </div>

      {/* Personnel Table View */}
      <StateView
        loading={loading}
        error={error}
        isEmpty={personnelList.length === 0}
        emptyTitle="Tidak Ada Personel Ditemukan"
        emptyDescription="Belum ada data personel yang cocok dengan kriteria filter yang Anda pilih."
        emptyAction={
          isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
              Tambah Personel Pertama
            </Button>
          )
        }
        onRetry={fetchPersonnel}
      >
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Nama Personel</th>
                  <th className="px-5 py-3.5">Regu Dinas</th>
                  <th className="px-5 py-3.5">Jabatan Operasional</th>
                  <th className="px-5 py-3.5">Tingkat Lisensi</th>
                  <th className="px-5 py-3.5">Status Kepegawaian</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {personnelList.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/personnel/${p.id}`)}
                    className="hover:bg-slate-50 cursor-pointer transition-colors duration-100"
                  >
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{p.full_name}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant={`team${p.team_group || 'Alpha'}`} size="sm">
                        Regu {p.team_group || '-'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {p.rank_position || 'Anggota Regu'}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge variant="info" size="sm">
                        {p.cert_level || 'Junior'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 capitalize">
                      {p.employment_status || 'organik'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-arff-primary hover:underline font-semibold inline-flex items-center gap-1">
                        Profil <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </StateView>

      {/* Add Personnel Modal */}
      {addModalOpen && (
        <Modal
          isOpen={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Tambah Data Personel ARFF Baru"
          subtitle="Masukkan informasi kepegawaian dan kualifikasi lisensi"
          footer={
            <>
              <Button variant="outline" onClick={() => setAddModalOpen(false)} disabled={saving}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleAddPersonnel} loading={saving}>
                Simpan Personel
              </Button>
            </>
          }
        >
          <form onSubmit={handleAddPersonnel} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <InputField
              label="Nama Lengkap & Gelar"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Contoh: M. OSCAR AVIANTO"
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Regu Dinas"
                value={teamGroup}
                onChange={(e) => setTeamGroup(e.target.value)}
                options={TEAMS.map((t) => ({ value: t, label: `Regu ${t}` }))}
                required
              />

              <InputField
                label="Jabatan Operasional"
                value={rankPosition}
                onChange={(e) => setRankPosition(e.target.value)}
                placeholder="Contoh: ARFF Operation Junior Fire Fighter"
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
                required
              />

              <InputField
                label="Nomor Lisensi / Sertifikat"
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value)}
                placeholder="Contoh: KP-PK/2024/098"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Masa Berlaku Lisensi"
                type="date"
                value={certExpiryDate}
                onChange={(e) => setCertExpiryDate(e.target.value)}
              />

              <SelectField
                label="Status Kepegawaian"
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                options={[
                  { value: 'organik', label: 'Organik (Karyawan Tetap)' },
                  { value: 'outsourcing', label: 'Outsourcing / Kontrak' },
                ]}
              />
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
