import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Filter, UserCheck, ChevronRight, Download, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEAMS, cleanTeam, formatTeam, OPERATIONAL_ROLES } from '../utils/shiftHelper';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import InputField from '../components/common/InputField';
import Modal from '../components/common/Modal';
import SelectField from '../components/common/SelectField';

export default function HalamanPersonel() {
  const { isAdmin, isSupervisor, activeTeam } = useAuth();
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
  const [nip, setNip] = useState('');
  const [rankPosition, setRankPosition] = useState(
    OPERATIONAL_ROLES.find((r) => r.role === 'junior_firefighter')?.rank_position || OPERATIONAL_ROLES[0].rank_position
  );
  const [teamGroup, setTeamGroup] = useState('Alpha');
  const [certLevel, setCertLevel] = useState('Junior');
  const [certNumber, setCertNumber] = useState('');
  const [certExpiryDate, setCertExpiryDate] = useState('');
  const [employmentStatus, setEmploymentStatus] = useState('organik');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successNotification, setSuccessNotification] = useState(null);

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
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : (Array.isArray(res.data?.personnel)
        ? res.data.personnel
        : (Array.isArray(res.data) ? res.data : []));
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
      const res = await api.post('/personnel', {
        nip: nip.trim() || null,
        full_name: fullName,
        rank_position: rankPosition,
        team_group: teamGroup,
        cert_level: certLevel,
        cert_number: certNumber,
        cert_expiry_date: certExpiryDate || null,
        employment_status: employmentStatus,
        is_active: 1,
      });

      setSuccessNotification(
        res.data?.message || `Personel ${fullName} berhasil ditambahkan beserta akun login otomatis (Sandi: 123456).`
      );
      setAddModalOpen(false);
      // Reset form
      setFullName('');
      setNip('');
      setRankPosition(
        OPERATIONAL_ROLES.find((r) => r.role === 'junior_firefighter')?.rank_position || OPERATIONAL_ROLES[0].rank_position
      );
      setCertNumber('');
      fetchPersonnel();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menambahkan personel.');
    } finally {
      setSaving(false);
    }
  };

  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadAccountList = async () => {
    try {
      setDownloadingPdf(true);
      const queryParams = selectedTeam !== 'ALL' ? `?team_group=${selectedTeam}` : '';
      const response = await api.get(`/personnel/export/pdf${queryParams}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const now = new Date().toISOString().split('T')[0];
      const reguSuffix = selectedTeam !== 'ALL' ? `_Regu_${selectedTeam}` : '';
      link.setAttribute('download', `Daftar_Akun_Personel_ARFF_YIA${reguSuffix}_${now}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading personnel PDF:', err);
      alert('Gagal mengunduh dokumen PDF akun personel.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDeletePersonnel = async (e, person) => {
    e.stopPropagation();
    const confirmMsg = `PERINGATAN: Apakah Anda yakin ingin menghapus data anggota "${person.full_name}"?\n\nTindakan ini akan menghapus profil personel, seluruh berkas dokumen terkait, serta akun login yang terhubung. Tindakan ini tidak dapat dibatalkan.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.delete(`/personnel/${person.id}`);
      setSuccessNotification(`Anggota ${person.full_name} berhasil dihapus.`);
      fetchPersonnel();
    } catch (err) {
      console.error('Error deleting personnel:', err);
      const errMsg = err.response?.data?.message || 'Gagal menghapus personel.';
      alert(errMsg);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Data Personel
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar anggota 4 regu
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              icon={Download}
              loading={downloadingPdf}
              onClick={handleDownloadAccountList}
            >
              Unduh Akun (PDF)
            </Button>
          )}

          {isAdmin && (
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setAddModalOpen(true)}
            >
              Tambah Personel
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotification && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{successNotification}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotification(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}



      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:max-w-md">
          <InputField
            id="searchPersonnel"
            placeholder="Cari nama personel di seluruh regu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={Search}
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Dinas Aktif: <span className="font-bold text-slate-800">{formatTeam(activeTeam)}</span>
          <span className="text-slate-300 mx-2">•</span>
          Menampilkan <span className="font-bold text-slate-800">{personnelList.length}</span> personel
        </div>
      </div>

      {/* 4 Pennant Banners (Panji Regu Operasional) */}
      <StateView
        loading={loading}
        error={error}
        isEmpty={personnelList.length === 0}
        emptyTitle="Tidak Ada Data Personel"
        emptyDescription="Data personel operasional belum tersedia di sistem."
        emptyAction={
          isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
              Tambah Personel Baru
            </Button>
          )
        }
        onRetry={fetchPersonnel}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pb-6">
          {['Alpha', 'Bravo', 'Charlie', 'Delta'].map((teamName) => {
            // Skema border dan warna per regu
            const teamKey = teamName.toLowerCase();
            const teamThemes = {
              alpha: {
                border: 'border-red-500',
                title: 'text-red-700',
                chiefRow: 'bg-red-50/70 border-red-200 text-slate-900',
                chiefStar: 'text-red-600',
                chiefBadge: 'bg-red-100 text-red-800 border-red-200',
              },
              bravo: {
                border: 'border-blue-500',
                title: 'text-blue-700',
                chiefRow: 'bg-blue-50/70 border-blue-200 text-slate-900',
                chiefStar: 'text-blue-600',
                chiefBadge: 'bg-blue-100 text-blue-800 border-blue-200',
              },
              charlie: {
                border: 'border-emerald-500',
                title: 'text-emerald-700',
                chiefRow: 'bg-emerald-50/70 border-emerald-200 text-slate-900',
                chiefStar: 'text-emerald-600',
                chiefBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
              },
              delta: {
                border: 'border-purple-500',
                title: 'text-purple-700',
                chiefRow: 'bg-purple-50/70 border-purple-200 text-slate-900',
                chiefStar: 'text-purple-600',
                chiefBadge: 'bg-purple-100 text-purple-800 border-purple-200',
              },
            };
            const theme = teamThemes[teamKey] || teamThemes.alpha;

            // Filter anggota untuk regu ini
            let members = personnelList.filter(
              (p) => cleanTeam(p.team_group).toLowerCase() === teamKey
            );

            // Filter berdasarkan pencarian jika ada
            const isFiltering = Boolean(searchQuery.trim());

            // Urutkan agar Ketua Regu (supervisor / Chief) selalu di urutan paling atas #1
            const sortedMembers = [...members].sort((a, b) => {
              const isChiefA =
                a.user_role === 'supervisor' ||
                a.user_role === 'chief' ||
                a.rank_position?.toLowerCase().includes('chief') ||
                a.rank_position?.toLowerCase().includes('ketua');
              const isChiefB =
                b.user_role === 'supervisor' ||
                b.user_role === 'chief' ||
                b.rank_position?.toLowerCase().includes('chief') ||
                b.rank_position?.toLowerCase().includes('ketua');
              if (isChiefA && !isChiefB) return -1;
              if (!isChiefA && isChiefB) return 1;
              return a.id - b.id;
            });

            const isOnDuty = cleanTeam(teamName).toLowerCase() === cleanTeam(activeTeam).toLowerCase();

            return (
              <div
                key={teamName}
                className={`rounded-xl border-2 p-4 flex flex-col justify-between transition-opacity duration-150 ${
                  isOnDuty
                    ? `bg-white ${theme.border} shadow-md ring-2 ring-offset-1 ring-red-500/20 opacity-100`
                    : `bg-slate-50/70 border-slate-200/90 shadow-xs opacity-50 hover:opacity-90`
                }`}
              >
                <div>
                  {/* Header Nama Regu (Tanpa teks UNIT PKP-PK) */}
                  <div className="text-center pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className={`text-base font-extrabold tracking-wider uppercase ${theme.title}`}>
                        REGU {teamName.toUpperCase()}
                      </h3>
                      {isOnDuty && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Shift Aktif
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500 block mt-0.5">
                      {members.length} Personel {!isOnDuty ? '(Off)' : ''}
                    </span>
                  </div>

                  {/* List Nama Anggota */}
                  <div className="space-y-1">
                    {sortedMembers.map((person, idx) => {
                      const isChief = idx === 0;
                      const isMatchedSearch =
                        !isFiltering ||
                        (person.full_name || '')
                          .toLowerCase()
                          .includes(searchQuery.trim().toLowerCase());

                      return (
                        <div
                          key={person.id}
                          onClick={() => navigate(`/personnel/${person.id}`)}
                          className={`group px-2.5 py-1.5 rounded transition-colors duration-100 cursor-pointer flex items-center justify-between gap-2 border ${
                            isChief
                              ? `${theme.chiefRow} font-semibold shadow-xs`
                              : 'border-transparent hover:bg-slate-50 text-slate-800 hover:text-slate-900'
                          } ${!isMatchedSearch ? 'opacity-30' : 'opacity-100'}`}
                          title={`Klik untuk melihat detail profil ${person.full_name}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`text-xs font-mono shrink-0 ${
                                isChief ? `${theme.chiefStar} font-bold` : 'text-slate-400'
                              }`}
                            >
                              {isChief ? '★' : String(idx + 1).padStart(2, '0')}
                            </span>
                            <span
                              className={`truncate text-xs ${
                                isChief ? 'font-bold text-slate-900' : 'font-medium'
                              }`}
                            >
                              {person.full_name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isChief && (
                              <span className={`text-[10px] ${theme.chiefBadge} font-bold px-1.5 py-0.5 rounded border uppercase tracking-tight`}>
                                Ketua
                              </span>
                            )}
                            {(isAdmin || isSupervisor) && (
                              <button
                                type="button"
                                onClick={(e) => handleDeletePersonnel(e, person)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity duration-100"
                                title={`Hapus ${person.full_name}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
                  {members.length} Anggota Terdaftar
                </div>
              </div>
            );
          })}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Nama Lengkap & Gelar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: M. OSCAR AVIANTO"
                required
              />

              <InputField
                label="NIP (Nomor Induk Pegawai)"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Contoh: 20241338"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Regu Dinas"
                value={teamGroup}
                onChange={(e) => setTeamGroup(e.target.value)}
                options={TEAMS.map((t) => ({ value: cleanTeam(t), label: formatTeam(t) }))}
                required
              />

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
