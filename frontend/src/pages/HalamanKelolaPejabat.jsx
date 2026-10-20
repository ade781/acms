import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldAlert,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Users,
  Award,
  RefreshCw,
  FileCheck,
  FileX
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import SelectField from '../components/common/SelectField';
import StateView from '../components/common/StateView';

export default function HalamanKelolaPejabat() {
  const { isAdmin, isSupervisor } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [officials, setOfficials] = useState({
    dept_head: null,
    chiefs: { Alpha: null, Bravo: null, Charlie: null, Delta: null },
  });

  const [allPersonnel, setAllPersonnel] = useState([]);

  // Modal Ganti Dept Head
  const [dhModalOpen, setDhModalOpen] = useState(false);
  const [newDhPersonnelId, setNewDhPersonnelId] = useState('');
  const [savingDh, setSavingDh] = useState(false);
  const [dhError, setDhError] = useState(null);

  // Modal Ganti Chief
  const [chiefModalOpen, setChiefModalOpen] = useState(false);
  const [targetTeam, setTargetTeam] = useState('Alpha');
  const [newChiefPersonnelId, setNewChiefPersonnelId] = useState('');
  const [oldChiefTargetRole, setOldChiefTargetRole] = useState('ARFF Operation Senior Fire Fighter');
  const [savingChief, setSavingChief] = useState(false);
  const [chiefError, setChiefError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offRes, pRes] = await Promise.all([
        api.get('/personnel/officials'),
        api.get('/personnel?is_active=1'),
      ]);

      const offData = offRes.data?.data || offRes.data;
      setOfficials({
        dept_head: offData.dept_head || null,
        chiefs: offData.chiefs || { Alpha: null, Bravo: null, Charlie: null, Delta: null },
      });

      const pList = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel) ? pRes.data.personnel : []);
      setAllPersonnel(pList);
    } catch (err) {
      console.error('Error fetching officials:', err);
      setError('Gagal memuat data pejabat struktural.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Ganti Dept Head Modal
  const openReplaceDeptHeadModal = () => {
    setDhError(null);
    setNewDhPersonnelId('');
    setDhModalOpen(true);
  };

  // Submit Ganti Dept Head
  const handleSaveDeptHead = async (e) => {
    e.preventDefault();
    if (!newDhPersonnelId) {
      setDhError('Silakan pilih personel yang akan diangkat sebagai Dept. Head.');
      return;
    }

    setSavingDh(true);
    setDhError(null);
    try {
      const res = await api.post('/personnel/officials/dept-head', {
        new_personnel_id: Number(newDhPersonnelId),
      });

      setSuccessMsg(res.data?.message || 'Dept. Head berhasil diperbarui.');
      setDhModalOpen(false);
      fetchData();
    } catch (err) {
      setDhError(err.response?.data?.message || err.message || 'Gagal memperbarui Dept. Head.');
    } finally {
      setSavingDh(false);
    }
  };

  // Open Ganti Chief Modal
  const openReplaceChiefModal = (teamName) => {
    setChiefError(null);
    setTargetTeam(teamName);
    setNewChiefPersonnelId('');
    setOldChiefTargetRole('ARFF Operation Senior Fire Fighter');
    setChiefModalOpen(true);
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

      setSuccessMsg(res.data?.message || `Ketua Regu ${targetTeam} berhasil diperbarui.`);
      setChiefModalOpen(false);
      fetchData();
    } catch (err) {
      setChiefError(err.response?.data?.message || err.message || 'Gagal mengganti Ketua Regu.');
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
            <p className="text-xs text-slate-500">
              Pengaturan penanggung jawab Airport Technology & ARFF Dept. Head serta 4 Ketua Regu
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMsg}</span>
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
          <span>{error}</span>
        </div>
      )}

      <StateView loading={loading} error={error} onRetry={fetchData}>
        {/* Section 1: Dept Head */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider mb-1">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                Pimpinan Unit
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Airport Technology & ARFF Dept. Head
              </h3>
              <p className="text-xs text-slate-500">
                Pejabat tertinggi unit yang bertindak sebagai pihak yang mengesahkan laporan dinas bulanan & berkas resmi.
              </p>
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
                <div className="flex items-center gap-3 text-xs text-slate-500 font-mono">
                  <span>NIP: {officials.dept_head.nip || '-'}</span>
                  <span>•</span>
                  <span>Jabatan: {officials.dept_head.rank_position}</span>
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
              <p className="text-xs text-slate-500 font-medium mb-3">
                Belum ada pejabat Airport Technology & ARFF Dept. Head yang ditetapkan.
              </p>
              {isAdmin && (
                <Button variant="primary" size="sm" onClick={openReplaceDeptHeadModal}>
                  Tunjuk Dept. Head Sekarang
                </Button>
              )}
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
              <p className="text-xs text-slate-500">
                Masing-masing shift dipimpin oleh tepat 1 orang ARFF Operation Chief yang bertindak sebagai Supervisor shift.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Alpha', 'Bravo', 'Charlie', 'Delta'].map((teamName) => {
              const chief = officials.chiefs[teamName];
              const theme = teamColors[teamName];

              return (
                <div
                  key={teamName}
                  className={`bg-white rounded-xl border-2 ${theme.border} p-5 shadow-xs flex flex-col justify-between space-y-4`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded border ${theme.badge}`}>
                          REGU {teamName.toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-700">ARFF Operation Chief</span>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          icon={RefreshCw}
                          onClick={() => openReplaceChiefModal(teamName)}
                        >
                          Ganti
                        </Button>
                      )}
                    </div>

                    <div className="mt-4 space-y-1">
                      {chief ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-500 font-bold text-sm">★</span>
                            <span className="text-sm font-extrabold text-slate-900">
                              {chief.full_name}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-mono">
                            NIP: {chief.nip || '-'}
                          </p>
                          <div className="pt-2 flex items-center gap-2">
                            {chief.signature_url ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <FileCheck className="w-3 h-3 text-emerald-600" />
                                Tanda Tangan Terdaftar
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <FileX className="w-3 h-3 text-amber-600" />
                                Tanda Tangan Belum Ada
                              </span>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-xs text-slate-400 italic">
                            Belum ada Ketua Regu yang terdaftar untuk Regu {teamName}.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {chief && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Status: <strong className="text-slate-600">Aktif</strong>
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/personnel/${chief.id}`)}
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

      {/* Modal 1: Ganti Dept Head */}
      {dhModalOpen && (
        <Modal
          isOpen={dhModalOpen}
          onClose={() => setDhModalOpen(false)}
          title="Pergantian Airport Technology & ARFF Dept. Head"
          subtitle="Pilih personel yang akan diangkat sebagai kepala departemen baru"
          footer={
            <>
              <Button variant="outline" onClick={() => setDhModalOpen(false)} disabled={savingDh}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveDeptHead} loading={savingDh}>
                Simpan & Sahkan Pejabat Baru
              </Button>
            </>
          }
        >
          <form onSubmit={handleSaveDeptHead} className="space-y-4">
            {dhError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {dhError}
              </div>
            )}

            {officials.dept_head && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <span className="font-bold block">Pejabat Saat Ini:</span>
                <p>
                  <strong>{officials.dept_head.full_name}</strong> (NIP: {officials.dept_head.nip || '-'})
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed pt-1">
                  * Catatan Keamanan: Tanda tangan digital milik pejabat lama akan otomatis dihapus dari database untuk mencegah penyalahgunaan pengesahan dokumen baru.
                </p>
              </div>
            )}

            <SelectField
              label="Pilih Personel Pengganti (Dept. Head Baru)"
              value={newDhPersonnelId}
              onChange={(e) => setNewDhPersonnelId(e.target.value)}
              options={[
                { value: '', label: '-- Pilih Personel --' },
                ...allPersonnel
                  .filter((p) => !officials.dept_head || p.id !== officials.dept_head.id)
                  .map((p) => ({
                    value: p.id,
                    label: `${p.full_name} (${p.rank_position || '-'} | Regu: ${p.team_group || 'Non-Regu'})`,
                  })),
              ]}
              required
            />
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
                {chiefError}
              </div>
            )}

            {currentOldChief ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 space-y-1">
                <span className="font-bold text-slate-900 block">Ketua Regu Saat Ini:</span>
                <p>
                  <strong>{currentOldChief.full_name}</strong> (NIP: {currentOldChief.nip || '-'})
                </p>
                <p className="text-[11px] text-slate-500 pt-0.5">
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
                  .map((p) => ({
                    value: p.id,
                    label: `${p.full_name} (${p.rank_position || '-'} | Regu Saat Ini: ${p.team_group || 'Non-Regu'})`,
                  })),
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
