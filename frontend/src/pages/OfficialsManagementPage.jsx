import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
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

export default function OfficialsManagementPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [officials, setOfficials] = useState({
    dept_head: null,
    chiefs: { Alpha: null, Bravo: null, Charlie: null, Delta: null },
  });

  const [allPersonnel, setAllPersonnel] = useState([]);
  const [activeDutyPersonnelIds, setActiveDutyPersonnelIds] = useState([]);

  // Modal Kelola Dept Head Mandiri (Aturan GEMINI.md Rule 18)
  const [dhModalOpen, setDhModalOpen] = useState(false);
  const [dhFullName, setDhFullName] = useState('');
  const [dhNip, setDhNip] = useState('');
  const [dhRankPosition, setDhRankPosition] = useState('Airport Technology & ARFF Dept. Head');
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
      if (Array.isArray(offData?.active_duty_personnel_ids)) {
        setActiveDutyPersonnelIds(offData.active_duty_personnel_ids);
      }
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
    setDhModalOpen(true);
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
    try {
      const [pRes, offRes] = await Promise.all([
        api.get('/personnel?is_active=1&compact=true'),
        api.get('/personnel/officials')
      ]);
      const pList = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel) ? pRes.data.personnel : []);
      setAllPersonnel(pList);
      const offData = offRes.data?.data || offRes.data;
      if (Array.isArray(offData?.active_duty_personnel_ids)) {
        setActiveDutyPersonnelIds(offData.active_duty_personnel_ids);
      }
    } catch (err) {
      console.error('Error fetching personnel for chief modal:', err);
    }
  };

  // Submit Ganti Chief
  const handleSaveChief = async (e) => {
    e.preventDefault();
    if (!newChiefPersonnelId) {
      setChiefError(`Silakan pilih personel yang akan diangkat sebagai Ketua Regu ${targetTeam}.`);
      return;
    }

    if (activeDutyPersonnelIds.includes(Number(newChiefPersonnelId))) {
      setChiefError('Personel yang dipilih sedang bertugas aktif pada shift dinas saat ini. Lepaskan penugasan di menu Ploting terlebih dahulu.');
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
                Ubah Pejabat
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
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1">
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
      </StateView>

      {/* Modal 1: Kelola Dept Head (Input Data Mandiri Sesuai Aturan GEMINI.md Rule 18) */}
      {dhModalOpen && (
        <Modal
          isOpen={dhModalOpen}
          onClose={() => setDhModalOpen(false)}
          title="Pengaturan Department Head"
          subtitle="Input data mandiri pejabat struktural pimpinan unit"
          footer={
            <>
              <Button variant="outline" onClick={() => setDhModalOpen(false)} disabled={savingDh}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveDeptHead} loading={savingDh}>
                Simpan Pejabat
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

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
              <FileCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">Pengelolaan Spesimen Tanda Tangan:</span>
                Spesimen tanda tangan digital resmi dikelola langsung melalui halaman detail profil pejabat terkait setelah data ditetapkan.
              </div>
            </div>
          </form>
        </Modal>
      )}



      {/* Modal 2: Ganti Ketua Regu */}
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

            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-chief-select" className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span>
                  {`Pilih Ketua Regu Baru (${targetTeam})`} <span className="text-red-500">*</span>
                </span>
              </label>
              <select
                id="new-chief-select"
                value={newChiefPersonnelId}
                onChange={(e) => setNewChiefPersonnelId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 min-h-[44px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-red-600 disabled:bg-slate-100 disabled:text-slate-500"
              >
                <option value="">-- Pilih Personel --</option>
                {allPersonnel
                  .filter((p) => !currentOldChief || p.id !== currentOldChief.id)
                  .map((p) => {
                    const teamStr = typeof p.team_group === 'string' ? p.team_group : (p.team_group?.name || 'Non-Regu');
                    const isOnDuty = activeDutyPersonnelIds.includes(Number(p.id));
                    const label = `${p.full_name || 'Personel'} (${p.rank_position || '-'} | Regu Saat Ini: ${teamStr})${isOnDuty ? ' [Sedang Berdinas Shift Ini]' : ''}`;
                    return (
                      <option key={p.id} value={p.id} disabled={isOnDuty}>
                        {label}
                      </option>
                    );
                  })}
              </select>
              {activeDutyPersonnelIds.length > 0 && (
                <p className="text-xs text-slate-500">
                  Personel yang sedang aktif berdinas pada shift berjalan ditandai <span className="font-semibold text-slate-700">[Sedang Berdinas Shift Ini]</span> dan dinonaktifkan dari pilihan demi integritas operasional.
                </p>
              )}
            </div>

            {currentOldChief && (
              <SelectField
                label="Jabatan Penugasan Baru untuk Pejabat Sebelumnya"
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
