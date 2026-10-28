import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Filter, UserCheck, ChevronRight, Download, Settings, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TEAMS, cleanTeam, formatTeam, OPERATIONAL_ROLES } from '../utils/shiftHelper';
import { downloadBlob } from '../utils/fileHelper';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import InputField from '../components/common/InputField';
import Modal from '../components/common/Modal';
import SelectField from '../components/common/SelectField';
import PersonnelPdfPreviewModal from '../components/personnel/PersonnelPdfPreviewModal';

function isActualChief(p) {
  if (!p) return false;
  const rank = (p.rank_position || '').toLowerCase();
  const role = (p.user_role || '').toLowerCase();
  if (role === 'chief_assistant' || rank.includes('asisten') || rank.includes('assistant') || rank.includes('wakil')) {
    return false;
  }
  return role === 'chief' || role === 'supervisor' || rank.includes('chief') || rank.includes('ketua regu');
}

function isChiefAssistant(p) {
  if (!p) return false;
  const rank = (p.rank_position || '').toLowerCase();
  const role = (p.user_role || '').toLowerCase();
  return role === 'chief_assistant' || rank.includes('asisten') || rank.includes('assistant') || rank.includes('wakil');
}

function getStkpBadge(person) {
  const expiry = person?.cert_expiry_date || person?.stkp_expiry_date;
  if (!expiry) return null;

  const expiryDate = new Date(expiry);
  if (isNaN(expiryDate.getTime())) return null;

  const now = new Date();
  const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expiryStr = typeof expiry === 'string'
    ? expiry.split('T')[0]
    : (expiry instanceof Date ? expiry.toISOString().split('T')[0] : String(expiry || ''));

  if (diffDays <= 0) {
    return (
      <span
        className="text-[10px] bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 font-bold px-1.5 py-0.5 rounded tracking-tight shrink-0"
        title={`Lisensi STKP telah kedaluwarsa (${expiryStr})`}
      >
        Kedaluwarsa
      </span>
    );
  }

  if (diffDays <= 60) {
    return (
      <span
        className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold px-1.5 py-0.5 rounded tracking-tight shrink-0"
        title={`Masa berlaku STKP tersisa ${diffDays} hari (${expiryStr})`}
      >
        Hampir Habis ({diffDays} hari)
      </span>
    );
  }

  return (
    <span
      className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium px-1.5 py-0.5 rounded tracking-tight shrink-0"
      title={`Lisensi STKP aktif hingga ${expiryStr}`}
    >
      Aktif
    </span>
  );
}

export default function PersonnelPage() {
  const { isAdmin, isSupervisor, activeTeam, token } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [personnelList, setPersonnelList] = useState([]);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);

  // Filters
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Debounce input pencarian nama/NIP personel 350ms (Anti-Lag Form Input Rule)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
  const [errorNotification, setErrorNotification] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const fetchPersonnel = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      let queryParams = [];
      if (selectedTeam !== 'ALL') queryParams.push(`team_group=${selectedTeam}`);
      if (debouncedSearchQuery.trim()) queryParams.push(`search=${encodeURIComponent(debouncedSearchQuery.trim())}`);

      const url = `/personnel${queryParams.length > 0 ? '?' + queryParams.join('&') : ''}`;
      const res = await api.get(url, { signal });
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : (Array.isArray(res.data?.personnel)
          ? res.data.personnel
          : (Array.isArray(res.data) ? res.data : []));
      setPersonnelList(list);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Error fetching personnel:', err);
      const rawErr = err.response?.data?.message || err.message;
      setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat katalog personel.'));
    } finally {
      setLoading(false);
    }
  }, [selectedTeam, debouncedSearchQuery]);

  useEffect(() => {
    const controller = new AbortController();
    fetchPersonnel(controller.signal);
    setCurrentPage(1);
    return () => controller.abort();
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

      const rawMsg = res.data?.message;
      setSuccessNotification(
        typeof rawMsg === 'string'
          ? rawMsg
          : (rawMsg?.message || `Personel ${fullName} berhasil ditambahkan beserta akun login otomatis (Sandi: 123456).`)
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
      const rawErr = err.response?.data?.message || err.response?.data?.error || err.message;
      setFormError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal menambahkan personel.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadAccountList = async () => {
    try {
      setDownloadingPdf(true);
      const queryParams = selectedTeam !== 'ALL' ? `?team_group=${selectedTeam}` : '';
      const response = await api.get(`/personnel/export/pdf${queryParams}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const now = new Date().toISOString().split('T')[0];
      const reguSuffix = selectedTeam !== 'ALL' ? `_Regu_${selectedTeam}` : '';
      downloadBlob(blob, `Daftar_Akun_Personel_ARFF_YIA${reguSuffix}_${now}.pdf`);
    } catch (err) {
      console.error('Error downloading personnel PDF:', err);
      const rawErr = err.response?.data?.message || err.message;
      setErrorNotification(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal mengunduh dokumen PDF akun personel.'));
    } finally {
      setDownloadingPdf(false);
    }
  };

  const teamsToDisplay = selectedTeam === 'ALL'
    ? ['Alpha', 'Bravo', 'Charlie', 'Delta']
    : ['Alpha', 'Bravo', 'Charlie', 'Delta'].filter(
      (t) => cleanTeam(t).toLowerCase() === cleanTeam(selectedTeam).toLowerCase()
    );

  return (
    <div className="space-y-4">
      {/* Unified Roster Command Bar: Title, Segmented Team Selector, Search, & Actions */}
      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs space-y-3">
        {/* Top Row: Title + Live Stats + Action Buttons */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">
              Data Personel Operasional
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-bold text-slate-700 tabular-nums">
              {personnelList.length} Personel
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {(isAdmin || isSupervisor) && (
              <Button
                variant="outline"
                size="sm"
                icon={Settings}
                onClick={() => navigate('/personnel/officials')}
                title="Kelola Pejabat (Dept Head & 4 Ketua Regu)"
              >
                Kelola Pejabat
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                icon={FileText}
                onClick={() => setPdfPreviewOpen(true)}
              >
                Pratinjau PDF
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                loading={downloadingPdf}
                onClick={handleDownloadAccountList}
              >
                Unduh PDF
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setAddModalOpen(true)}
              >
                Tambah Personel
              </Button>
            )}
          </div>
        </div>

        {/* Bottom Row: Segmented Regu Filter Pills + Instant Search Input */}
        <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs w-fit flex-wrap">
            {[
              { id: 'ALL', label: 'Semua Regu' },
              { id: 'Alpha', label: 'Regu Alpha' },
              { id: 'Bravo', label: 'Regu Bravo' },
              { id: 'Charlie', label: 'Regu Charlie' },
              { id: 'Delta', label: 'Regu Delta' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTeam(tab.id)}
                className={`px-3 py-1 rounded-md font-bold transition-colors duration-100 cursor-pointer ${
                  selectedTeam === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="searchPersonnel"
              type="text"
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-100"
            />
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {successNotification && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <UserCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{typeof successNotification === 'string' ? successNotification : successNotification?.message || 'Operasi berhasil'}</span>
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

      {/* Error Notification Alert */}
      {errorNotification && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3 shadow-xs">
          <span>{typeof errorNotification === 'string' ? errorNotification : errorNotification?.message || 'Terjadi kesalahan'}</span>
          <button
            type="button"
            onClick={() => setErrorNotification(null)}
            className="text-red-700 hover:text-red-900 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 4 Pennant Banners (Panji Regu Operasional) */}
      <StateView
        loading={loading}
        error={typeof error === 'string' ? error : error?.message || null}
        isEmpty={personnelList.length === 0}
        emptyTitle="Tidak Ada Data Personel"
        emptyDescription="Data personel operasional belum tersedia atau tidak cocok dengan filter pencarian."
        emptyAction={
          isAdmin && (
            <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)}>
              Tambah Personel Baru
            </Button>
          )
        }
        onRetry={fetchPersonnel}
      >
        <div className={`grid grid-cols-1 ${teamsToDisplay.length === 1 ? 'max-w-md mx-auto sm:grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-4'} gap-6 pb-6`}>
          {teamsToDisplay.map((teamName) => {
            // Skema border dan warna per regu
            const teamKey = teamName.toLowerCase();
            const teamThemes = {
              alpha: {
                border: 'border-red-500',
                title: 'text-red-700',
                chiefRow: 'bg-red-50/70 border-red-200 text-slate-900',
                chiefStar: 'text-red-600',
                chiefBadge: 'bg-red-100 text-red-800 border-red-200',
                beamGradient: 'conic-gradient(from 0deg, transparent 0deg, transparent 90deg, #ef4444 145deg, transparent 180deg, transparent 270deg, #ef4444 325deg, transparent 360deg)',
              },
              bravo: {
                border: 'border-blue-500',
                title: 'text-blue-700',
                chiefRow: 'bg-blue-50/70 border-blue-200 text-slate-900',
                chiefStar: 'text-blue-600',
                chiefBadge: 'bg-blue-100 text-blue-800 border-blue-200',
                beamGradient: 'conic-gradient(from 0deg, transparent 0deg, transparent 90deg, #3b82f6 145deg, transparent 180deg, transparent 270deg, #3b82f6 325deg, transparent 360deg)',
              },
              charlie: {
                border: 'border-emerald-500',
                title: 'text-emerald-700',
                chiefRow: 'bg-emerald-50/70 border-emerald-200 text-slate-900',
                chiefStar: 'text-emerald-600',
                chiefBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                beamGradient: 'conic-gradient(from 0deg, transparent 0deg, transparent 90deg, #10b981 145deg, transparent 180deg, transparent 270deg, #10b981 325deg, transparent 360deg)',
              },
              delta: {
                border: 'border-purple-500',
                title: 'text-purple-700',
                chiefRow: 'bg-purple-50/70 border-purple-200 text-slate-900',
                chiefStar: 'text-purple-600',
                chiefBadge: 'bg-purple-100 text-purple-800 border-purple-200',
                beamGradient: 'conic-gradient(from 0deg, transparent 0deg, transparent 90deg, #a855f7 145deg, transparent 180deg, transparent 270deg, #a855f7 325deg, transparent 360deg)',
              },
            };
            const theme = teamThemes[teamKey] || teamThemes.alpha;

            // Filter anggota untuk regu ini
            let members = personnelList.filter(
              (p) => cleanTeam(p.team_group).toLowerCase() === teamKey
            );

            // Filter pencarian client-side: sembunyikan baris non-matching secara total (bukan sekadar opacity)
            if (debouncedSearchQuery.trim()) {
              const q = debouncedSearchQuery.trim().toLowerCase();
              members = members.filter(
                (p) =>
                  (p.full_name || '').toLowerCase().includes(q) ||
                  (p.nip || '').toLowerCase().includes(q)
              );
            }

            // Urutkan: Ketua Regu (Chief aktual) selalu paling atas #1, disusul Asisten Chief, lalu anggota lainnya
            const sortedMembers = [...members].sort((a, b) => {
              const isChiefA = isActualChief(a);
              const isChiefB = isActualChief(b);
              if (isChiefA && !isChiefB) return -1;
              if (!isChiefA && isChiefB) return 1;

              const isAsstA = isChiefAssistant(a);
              const isAsstB = isChiefAssistant(b);
              if (isAsstA && !isAsstB) return -1;
              if (!isAsstA && isAsstB) return 1;

              return a.id - b.id;
            });

            const hasChief = sortedMembers.some((m) => isActualChief(m));
            const isActiveShift = (cleanTeam(activeTeam) || '').toLowerCase() === teamKey;

            const cardBody = (
              <>
                <div>
                  {/* Header Nama Regu */}
                  <div className="text-center pb-3 mb-3 border-b border-slate-100">
                    <h3 className={`text-base font-extrabold tracking-wider uppercase ${theme.title}`}>
                      {teamName.toUpperCase()}
                    </h3>
                    <span className="text-xs font-medium text-slate-500 block mt-0.5">
                      {members.length} Personel
                    </span>
                  </div>

                  {/* List Nama Anggota */}
                  {sortedMembers.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 italic">
                      Tidak ada personel yang sesuai pencarian.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {sortedMembers
                        .slice((currentPage - 1) * perPage, currentPage * perPage)
                        .map((person, idx) => {
                          const isChief = isActualChief(person);
                          const isAssistant = isChiefAssistant(person);

                          // Nomor urut: Bintang ★ HANYA untuk Chief resmi
                          const globalIdx = (currentPage - 1) * perPage + idx;
                          const memberNumber = isChief
                            ? '★'
                            : String(hasChief ? globalIdx : globalIdx + 1).padStart(2, '0');

                          return (
                            <div
                              key={person.id || `person-${idx}`}
                              onClick={() => navigate(`/personnel/${person.id}`)}
                              className={`group px-2.5 py-1.5 rounded transition-colors duration-100 cursor-pointer flex items-center justify-between gap-2 border ${isChief
                                  ? `${theme.chiefRow} font-semibold shadow-xs`
                                  : isAssistant
                                    ? 'bg-amber-50/50 border-amber-200/60 hover:bg-amber-50 text-slate-800'
                                    : 'border-transparent hover:bg-slate-50 text-slate-800 hover:text-slate-900'
                                }`}
                              title={`Klik untuk melihat detail profil ${typeof person.full_name === 'string' ? person.full_name : ''}`}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span
                                  className={`text-xs font-mono shrink-0 ${isChief ? `${theme.chiefStar} font-bold` : 'text-slate-400'
                                    }`}
                                >
                                  {memberNumber}
                                </span>
                                <span
                                  className={`truncate text-xs ${isChief ? 'font-bold text-slate-900' : 'font-medium'
                                    }`}
                                >
                                  {typeof person.full_name === 'string' ? person.full_name : String(person.full_name || '')}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {getStkpBadge(person)}
                                {isChief && (
                                  <span className={`text-[10px] ${theme.chiefBadge} font-bold px-1.5 py-0.5 rounded border uppercase tracking-tight`}>
                                    Ketua
                                  </span>
                                )}
                                {isAssistant && !isChief && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 font-semibold px-1.5 py-0.5 rounded uppercase tracking-tight">
                                    Asisten
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-2.5 border-t border-slate-100 text-center text-[11px] text-slate-400 font-medium">
                  {members.length} Anggota Terdaftar
                </div>
              </>
            );

            if (isActiveShift) {
              return (
                <div
                  key={teamName}
                  className="relative rounded-xl overflow-hidden p-[2.5px] shadow-sm transition-all duration-300 flex flex-col"
                >
                  {/* Animasi Berkas Cahaya yang Mengitari Border Kartu (Rotating Border Beam) */}
                  <div
                    className="absolute inset-[-150%] animate-[spin_5s_linear_infinite] pointer-events-none"
                    style={{ background: theme.beamGradient }}
                  />

                  {/* Garis Border Dasar Transparan */}
                  <div className="absolute inset-0 rounded-xl border border-slate-200 pointer-events-none" />

                  {/* Isi Kartu Regu Utama */}
                  <div className="relative rounded-[10px] bg-white p-4 flex flex-col justify-between h-full">
                    {cardBody}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={teamName}
                className="rounded-xl border border-slate-200/90 bg-white p-4 flex flex-col justify-between shadow-xs transition-colors duration-100"
              >
                {cardBody}
              </div>
            );
          })}
        </div>

        {/* Komponen Paginasi Terstandar */}
        {(() => {
          const maxTeamCount = Math.max(
            ...teamsToDisplay.map(
              (k) => personnelList.filter((p) => cleanTeam(p.team_group).toLowerCase() === k.toLowerCase()).length
            ),
            1
          );
          const totalPages = Math.max(1, Math.ceil(maxTeamCount / perPage));

          return (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs mb-6">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Tampilkan:</span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-50 focus:outline-none"
                >
                  <option value={10}>10 per regu</option>
                  <option value={20}>20 per regu</option>
                  <option value={25}>25 per regu</option>
                  <option value={50}>Semua (50)</option>
                </select>
                <span className="text-slate-300">|</span>
                <span>Total <strong>{personnelList.length}</strong> personel pada daftar</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                >
                  Sebelumnya
                </Button>
                <span className="text-xs font-semibold px-2 text-slate-700">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          );
        })()}
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
                {typeof formError === 'string' ? formError : formError?.message || 'Terjadi kesalahan pada formulir'}
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
                options={OPERATIONAL_ROLES.filter(
                  (r) => !['dept_head', 'chief', 'admin'].includes(r.role)
                ).map((r) => ({
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

      {/* Modal Pratinjau Dokumen PDF Personel */}
      <PersonnelPdfPreviewModal
        isOpen={pdfPreviewOpen}
        onClose={() => setPdfPreviewOpen(false)}
        selectedTeam={selectedTeam}
        token={token}
      />
    </div>
  );
}
