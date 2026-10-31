import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Award,
  RefreshCw,
  FileCheck,
  FileX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import StateView from '../components/common/StateView';
import { getErrorMessage } from '../utils/errorHelper';
import { buildAuthenticatedFileUrl } from '../utils/fileHelper';

export default function OfficialsManagementPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [officials, setOfficials] = useState({
    dept_head: null,
    chiefs: { Alpha: null, Bravo: null, Charlie: null, Delta: null },
    administrasi: [],
  });

  const [allPersonnel, setAllPersonnel] = useState([]);

  // Modal Kelola Dept Head Mandiri (Aturan GEMINI.md Rule 18 & task_agent1.md)
  const [dhModalOpen, setDhModalOpen] = useState(false);
  const [dhFullName, setDhFullName] = useState('');
  const [dhNip, setDhNip] = useState('');
  const [dhRankPosition, setDhRankPosition] = useState('Airport Technology & ARFF Dept. Head');
  const [dhSignatureFile, setDhSignatureFile] = useState(null);
  const [dhSignaturePreview, setDhSignaturePreview] = useState(null);
  const [savingDh, setSavingDh] = useState(false);
  const [dhError, setDhError] = useState(null);



  // Modal Ganti Chief
  const [chiefModalOpen, setChiefModalOpen] = useState(false);
  const [targetTeam, setTargetTeam] = useState('Alpha');
  const [newChiefPersonnelId, setNewChiefPersonnelId] = useState('');
  const [oldChiefTargetRole, setOldChiefTargetRole] = useState('ARFF Operation Senior Fire Fighter');
  const [savingChief, setSavingChief] = useState(false);
  const [chiefError, setChiefError] = useState(null);

  const fetchData = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const offRes = await api.get('/personnel/officials', { signal });

      const offData = offRes.data?.data || offRes.data;
      setOfficials({
        dept_head: offData.dept_head || null,
        chiefs: offData.chiefs || { Alpha: null, Bravo: null, Charlie: null, Delta: null },
        administrasi: Array.isArray(offData.administrasi) ? offData.administrasi : [],
      });
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching officials:', err);
      const rawErr = err.response?.data?.message || err.message;
      setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal memuat data pejabat struktural.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  // Open Kelola Dept Head Modal (Input Data Mandiri)
  const openReplaceDeptHeadModal = () => {
    setDhError(null);
    setDhFullName(officials.dept_head?.full_name || '');
    setDhNip(officials.dept_head?.nip || '');
    setDhRankPosition(officials.dept_head?.rank_position || 'Airport Technology & ARFF Dept. Head');
    setDhSignatureFile(null);
    setDhSignaturePreview(null);
    setDhModalOpen(true);
  };



  // Handler unggah spesimen tanda tangan Dept Head dengan validasi sisi klien
  const handleDhSignatureChange = (e) => {
    const file = e.target.files?.[0];
    setDhError(null);
    if (!file) {
      setDhSignatureFile(null);
      setDhSignaturePreview(null);
      return;
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setDhError('Format berkas tidak valid. Harap pilih gambar bertipe PNG, JPG, atau WEBP.');
      e.target.value = '';
      setDhSignatureFile(null);
      setDhSignaturePreview(null);
      return;
    }

    const maxSizeBytes = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSizeBytes) {
      setDhError(`Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(1)} MB). Batas maksimum tanda tangan adalah 2 MB.`);
      e.target.value = '';
      setDhSignatureFile(null);
      setDhSignaturePreview(null);
      return;
    }

    setDhSignatureFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setDhSignaturePreview(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleClearDhSignatureFile = () => {
    setDhSignatureFile(null);
    setDhSignaturePreview(null);
  };

  // Submit Kelola Dept Head (Input Data Mandiri)
  const handleSaveDeptHead = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!dhFullName.trim()) {
      setDhError('Nama lengkap Dept. Head wajib diisi.');
      return;
    }

    setSavingDh(true);
    setDhError(null);
    try {
      const res = await api.post('/personnel/officials/dept-head', {
        full_name: dhFullName.trim(),
        nip: dhNip.trim() || null,
        rank_position: dhRankPosition.trim() || 'Airport Technology & ARFF Dept. Head',
      });

      const deptHeadId = res.data?.data?.id || officials.dept_head?.id;

      // Unggah tanda tangan digital jika ada berkas yang dipilih
      if (dhSignatureFile && deptHeadId) {
        const formData = new FormData();
        formData.append('signature', dhSignatureFile);
        await api.post(`/personnel/${deptHeadId}/signature`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      const rawMsg = res.data?.message;
      setSuccessMsg(typeof rawMsg === 'string' ? rawMsg : (rawMsg?.message || 'Data Dept. Head berhasil disimpan.'));
      setDhModalOpen(false);
      fetchData();
    } catch (err) {
      const rawErr = err.response?.data?.message || err.response?.data?.error || err.message;
      setDhError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal menyimpan data Dept. Head.'));
    } finally {
      setSavingDh(false);
    }
  };

  // Open Ganti Chief Modal
  const openReplaceChiefModal = async (teamName) => {
    setChiefError(null);
    setTargetTeam(teamName);
    setNewChiefPersonnelId('');
    setOldChiefTargetRole('ARFF Operation Senior Fire Fighter');
    setChiefModalOpen(true);
    if (allPersonnel.length === 0) {
      try {
        const pRes = await api.get('/personnel?is_active=1&compact=true');
        const pList = Array.isArray(pRes.data?.data)
          ? pRes.data.data
          : (Array.isArray(pRes.data?.personnel) ? pRes.data.personnel : []);
        setAllPersonnel(pList);
      } catch (err) {
        console.error('Error lazy fetching personnel for chief modal:', err);
      }
    }
  };

  // Submit Ganti Chief
  const handleSaveChief = async (e) => {
    e.preventDefault();
    if (!newChiefPersonnelId) {
      setChiefError(`Silakan pilih personel yang akan diangkat sebagai Ketua Regu ${targetTeam}.`);
      return;
    }

    setSavingChief(true);
    setChiefError(null);
    try {
      const res = await api.post('/personnel/officials/chief', {
        team_group: targetTeam,
        new_chief_id: Number(newChiefPersonnelId),
        old_chief_target_role: oldChiefTargetRole,
      });

      const rawMsg = res.data?.message;
      setSuccessMsg(typeof rawMsg === 'string' ? rawMsg : (rawMsg?.message || `Ketua Regu ${targetTeam} berhasil diperbarui.`));
      setChiefModalOpen(false);
      fetchData();
    } catch (err) {
      const rawErr = err.response?.data?.message || err.response?.data?.error || err.message;
      setChiefError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || 'Gagal mengganti Ketua Regu.'));
    } finally {
      setSavingChief(false);
    }
  };

  const currentOldChief = officials.chiefs[targetTeam];

  const teamColors = {
    Alpha: { border: 'border-red-400', badge: 'bg-red-100 text-red-800 border-red-300', bg: 'bg-red-50/40' },
    Bravo: { border: 'border-blue-400', badge: 'bg-blue-100 text-blue-800 border-blue-300', bg: 'bg-blue-50/40' },
    Charlie: { border: 'border-emerald-400', badge: 'bg-emerald-100 text-emerald-800 border-emerald-300', bg: 'bg-emerald-50/40' },
    Delta: { border: 'border-purple-400', badge: 'bg-purple-100 text-purple-800 border-purple-300', bg: 'bg-purple-50/40' },
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/personnel')}
            title="Kembali ke Katalog Personel"
          >
            Kembali
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Kelola Pejabat Struktural ARFF
            </h2>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{typeof successMsg === 'string' ? successMsg : (successMsg?.message || 'Operasi berhasil')}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold px-2 py-1 text-xs"
          >
            Tutup
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{getErrorMessage(error, 'Gagal memuat data pejabat struktural.')}</span>
        </div>
      )}

      <StateView loading={loading} error={typeof error === 'string' ? error : error?.message || null} onRetry={fetchData}>
        {/* Section 1: Dept Head */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider mb-1">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                Pimpinan Unit
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Airport Technology & ARFF Dept. Head
              </h3>
            </div>

            {isAdmin && (
              <Button
                variant="primary"
                size="sm"
                icon={RefreshCw}
                onClick={openReplaceDeptHeadModal}
              >
                Ganti Dept. Head
              </Button>
            )}
          </div>

          {officials.dept_head ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="space-y-1">
                <span className="text-sm font-extrabold text-slate-900 block">
                  {officials.dept_head.full_name}
                </span>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-sans">
                  <span>NIP: <span className="font-mono tabular-nums text-slate-700 font-semibold">{officials.dept_head.nip || '-'}</span></span>
                  <span>•</span>
                  <span>Jabatan: <span className="text-slate-700 font-medium">{officials.dept_head.rank_position}</span></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {officials.dept_head.signature_url ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Tanda Tangan Aktif
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    <FileX className="w-3.5 h-3.5 text-amber-600" />
                    Belum Ada Tanda Tangan
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/personnel/${officials.dept_head.id}`)}
                >
                  Detail Profil
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300">
              <p className="text-xs text-slate-500 font-medium">
                Belum ada pejabat Airport Technology & ARFF Dept. Head yang ditetapkan.
              </p>
            </div>
          )}
        </div>



        {/* Section 2: 4 Chief Regu */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Ketua Regu Dinas Operasional (4 Shift)
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {['Alpha', 'Bravo', 'Charlie', 'Delta'].map((teamName) => {
              const chief = officials.chiefs[teamName];
              const theme = teamColors[teamName];

              return (
                <div
                  key={teamName}
                  className={`bg-white rounded-xl border ${theme.border} p-3.5 shadow-xs flex flex-col justify-between space-y-2.5 transition-colors duration-100`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-1.5">
                      <span className={`text-xs font-extrabold uppercase px-1.5 py-0.5 rounded border ${theme.badge}`}>
                        REGU {teamName.toUpperCase()}
                      </span>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="xs"
                          icon={RefreshCw}
                          onClick={() => openReplaceChiefModal(teamName)}
                          className="h-7 text-xs px-2"
                        >
                          Ganti
                        </Button>
                      )}
                    </div>

                    <div className="mt-2.5 space-y-1">
                      {chief ? (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-amber-500 font-bold text-xs shrink-0">★</span>
                            <span className="text-xs font-bold text-slate-900 truncate" title={chief.full_name}>
                              {chief.full_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono tabular-nums pl-3.5">
                            NIP: {chief.nip || '-'}
                          </p>
                          <div className="pt-1.5 pl-3.5 flex items-center gap-1.5">
                            {chief.signature_url ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                <FileCheck className="w-3 h-3 text-emerald-600" />
                                TTD Ada
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                <FileX className="w-3 h-3 text-amber-600" />
                                TTD Belum Ada
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="py-2.5 text-center">
                          <p className="text-xs text-slate-400 italic">
                            Belum ada Ketua Regu.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {chief && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                      <span className="text-xs text-slate-400">
                        Status: <strong className="text-emerald-600">Aktif</strong>
                      </span>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => navigate(`/personnel/${chief.id}`)}
                        className="h-7 text-xs px-1.5 text-slate-600 hover:text-slate-900"
                      >
                        Lihat Profil
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Administrasi */}
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5 text-slate-600" />
                Administrasi
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Staf Administrasi & Pemeliharaan (Non-Shift)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
              Total: <span className="font-mono tabular-nums">{officials.administrasi?.length || 0}</span> Personel
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {officials.administrasi && officials.administrasi.length > 0 ? (
              officials.administrasi.map((staff, sIdx) => (
                <div
                  key={staff.id || `staff-${sIdx}`}
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors duration-100"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        Administrasi
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        @{staff.username || 'admin'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 pt-1 leading-snug">
                      {staff.full_name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono tabular-nums">
                      NIP: {staff.nip || '-'}
                    </p>
                    <p className="text-xs text-slate-600 font-medium">
                      {staff.rank_position || 'Staf Administrasi'}
                    </p>
                  </div>

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Role: Administrasi
                    </span>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => navigate(`/personnel/${staff.id}`)}
                    >
                      Detail
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
                Belum ada data personel administrasi.
              </div>
            )}
          </div>
        </div>
      </StateView>

      {/* Modal 1: Kelola Dept Head (Input Data Mandiri Sesuai Aturan GEMINI.md Rule 18) */}
      {dhModalOpen && (
        <Modal
          isOpen={dhModalOpen}
          onClose={() => setDhModalOpen(false)}
          title="Pengaturan Airport Technology & ARFF Dept. Head"
          subtitle="Input data mandiri pejabat struktural pimpinan unit (bukan memilih dari anggota regu operasional)"
          footer={
            <>
              <Button variant="outline" onClick={() => setDhModalOpen(false)} disabled={savingDh}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveDeptHead} loading={savingDh}>
                Simpan & Tetapkan Dept. Head
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveDeptHead} className="space-y-4">
            {dhError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {getErrorMessage(dhError, 'Gagal menyimpan data Dept. Head.')}
              </div>
            )}

            <InputField
              label="Nama Lengkap Pejabat"
              value={dhFullName}
              onChange={(e) => setDhFullName(e.target.value)}
              placeholder="Masukkan nama lengkap beserta gelar resmi..."
              required
            />

            <InputField
              label="Nomor Induk Pegawai (NIP)"
              value={dhNip}
              onChange={(e) => setDhNip(e.target.value)}
              placeholder="Contoh: 198001012005011001"
              helperText="Kosongkan jika belum memiliki NIP resmi"
            />

            <InputField
              label="Jabatan Resmi Struktural"
              value={dhRankPosition}
              onChange={(e) => setDhRankPosition(e.target.value)}
              placeholder="Airport Technology & ARFF Dept. Head"
              required
            />

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700">
                Spesimen Tanda Tangan Digital Resmi
              </label>

              {/* Pratinjau Tanda Tangan Aktif dari Database / Pratinjau Berkas Baru */}
              {dhSignaturePreview ? (
                <div className="p-3 bg-emerald-50/50 border border-emerald-300 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Pratinjau Berkas Baru Terpilih (Belum Disimpan)
                    </span>
                    <button
                      type="button"
                      onClick={handleClearDhSignatureFile}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold underline cursor-pointer"
                    >
                      Batal Ganti
                    </button>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center max-h-28 overflow-hidden">
                    <img
                      src={dhSignaturePreview}
                      alt="Pratinjau Tanda Tangan Baru"
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Nama file: {dhSignatureFile?.name} (<span className="font-mono tabular-nums">{(dhSignatureFile?.size / 1024).toFixed(0)} KB</span>)
                  </p>
                </div>
              ) : officials.dept_head?.signature_url ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Tanda Tangan Aktif Tersimpan di Server
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                      Aktif
                    </span>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center max-h-28 overflow-hidden">
                    <img
                      src={buildAuthenticatedFileUrl(officials.dept_head.signature_url)}
                      alt="Tanda Tangan Aktif Dept Head"
                      className="max-h-24 w-auto object-contain"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Pilih berkas baru di bawah jika ingin memperbarui spesimen tanda tangan ini.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                  <FileX className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Belum ada tanda tangan aktif untuk Dept. Head ini di server.</span>
                </div>
              )}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleDhSignatureChange}
                className="text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 border border-slate-300 rounded-lg p-1.5 bg-white cursor-pointer"
              />
              <p className="text-xs text-slate-500">
                Format yang didukung: PNG transparan disarankan, JPG, atau WEBP. Maksimal ukuran berkas 2 MB.
              </p>
            </div>
          </form>
        </Modal>
      )}



      {/* Modal 2: Ganti Ketua Regu (Opsi C) */}
      {chiefModalOpen && (
        <Modal
          isOpen={chiefModalOpen}
          onClose={() => setChiefModalOpen(false)}
          title={`Pergantian Ketua Regu ${targetTeam}`}
          subtitle="Pilih Ketua Regu baru serta alihkan penugasan Ketua Regu lama"
          footer={
            <>
              <Button variant="outline" onClick={() => setChiefModalOpen(false)} disabled={savingChief}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveChief} loading={savingChief}>
                Simpan Pergantian Ketua
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveChief} className="space-y-4">
            {chiefError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {getErrorMessage(chiefError, 'Gagal mengganti Ketua Regu.')}
              </div>
            )}

            {currentOldChief ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                <span className="font-bold text-slate-900 block">Ketua Regu Saat Ini:</span>
                <p>
                  <strong>{currentOldChief.full_name}</strong> (NIP: <span className="font-mono tabular-nums">{currentOldChief.nip || '-'}</span>)
                </p>
                <p className="text-xs text-slate-500 pt-0.5">
                  Tanda tangan digital Ketua Regu lama akan otomatis dihapus dari database.
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900">
                Regu {targetTeam} saat ini belum memiliki Ketua Regu terdaftar.
              </div>
            )}

            <SelectField
              label={`Pilih Ketua Regu Baru (${targetTeam})`}
              value={newChiefPersonnelId}
              onChange={(e) => setNewChiefPersonnelId(e.target.value)}
              options={[
                { value: '', label: '-- Pilih Personel --' },
                ...allPersonnel
                  .filter((p) => !currentOldChief || p.id !== currentOldChief.id)
                  .map((p) => {
                    const teamStr = typeof p.team_group === 'string' ? p.team_group : (p.team_group?.name || 'Non-Regu');
                    return {
                      value: p.id,
                      label: `${p.full_name || 'Personel'} (${p.rank_position || '-'} | Regu Saat Ini: ${teamStr})`,
                    };
                  }),
              ]}
              required
            />

            {currentOldChief && (
              <SelectField
                label="Posisi / Jabatan Baru untuk Ketua Regu Lama (Opsi C)"
                value={oldChiefTargetRole}
                onChange={(e) => setOldChiefTargetRole(e.target.value)}
                options={[
                  {
                    value: 'ARFF Operation Senior Fire Fighter',
                    label: 'ARFF Operation Senior Fire Fighter (Rekomendasi)',
                  },
                  {
                    value: 'ARFF Operation Chief Assistant',
                    label: 'ARFF Operation Chief Assistant (Asisten Chief)',
                  },
                  {
                    value: 'ARFF Operation Junior Fire Fighter',
                    label: 'ARFF Operation Junior Fire Fighter (Pelaksana Regu)',
                  },
                ]}
                required
              />
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
