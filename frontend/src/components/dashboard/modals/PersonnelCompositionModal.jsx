import React from 'react';
import { UserCheck } from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatRoleName, cleanTeam } from '../../../utils/shiftHelper';

export default function PersonnelCompositionModal({
  isOpen,
  onClose,
  personnelComposition,
  selectedTeamTab,
  setSelectedTeamTab,
  filteredModalPersonnel = [],
  deploymentByPersonnelId,
  currentTeam = 'A',
  activeShiftNumber = 1,
  getShiftLabel = (s) => `Shift ${s}`
}) {
  if (!isOpen) return null;

  const byTeam = personnelComposition?.byTeam || [];
  const selectedStat =
    selectedTeamTab === 'ALL'
      ? {
          label: 'Gabungan 4 Regu (Alpha, Bravo, Charlie, Delta)',
          total: personnelComposition?.totalAllTeams || 0,
          onShift: personnelComposition?.onDutyCount || 0,
          organik: personnelComposition?.totalAllOrganik || 0,
          outsourcing: personnelComposition?.totalAllOutsourcing || 0,
        }
      : (() => {
          const found = byTeam.find((x) => x.team === selectedTeamTab);
          return {
            label: `Regu ${selectedTeamTab}`,
            total: found?.total || 0,
            onShift: found?.onDutyCount || 0,
            organik: found?.organik || 0,
            outsourcing: found?.outsourcing || 0,
          };
        })();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Rincian Kekuatan & Komposisi Personel Regu"
      subtitle={`Data anggota aktif 4 regu operasional, status shift (${getShiftLabel(activeShiftNumber)}), serta rincian Organik dan Outsourcing (Training)`}
      maxWidth="max-w-4xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Tab Filter Regu */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setSelectedTeamTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedTeamTab === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Semua 4 Regu ({personnelComposition?.totalAllTeams || 0})
          </button>
          {byTeam.map((t) => (
            <button
              key={t.team}
              type="button"
              onClick={() => setSelectedTeamTab(t.team)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                selectedTeamTab === t.team
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>Regu {t.team}</span>
              <span className="font-mono text-[11px] opacity-80">({t.total})</span>
            </button>
          ))}
        </div>

        {/* Ringkasan Angka Sesuai Tab yang Dipilih */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-[11px] text-slate-500">Total Anggota Regu</div>
            <div className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {selectedStat.total}
            </div>
            <div className="text-[10px] text-slate-400 truncate">{selectedStat.label}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200">
            <div className="text-[11px] text-emerald-800">Sedang Shift Saat Ini</div>
            <div className="text-xl font-bold font-mono tabular-nums text-emerald-900 mt-0.5">
              {selectedStat.onShift}
            </div>
            <div className="text-[10px] text-emerald-700">
              Regu Bertugas: Regu {currentTeam}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
            <div className="text-[11px] text-blue-800">Status Organik</div>
            <div className="text-xl font-bold font-mono tabular-nums text-blue-900 mt-0.5">
              {selectedStat.organik}
            </div>
            <div className="text-[10px] text-blue-700">Karyawan Tetap</div>
          </div>
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
            <div className="text-[11px] text-amber-800">Outsourcing (Training)</div>
            <div className="text-xl font-bold font-mono tabular-nums text-amber-900 mt-0.5">
              {selectedStat.outsourcing}
            </div>
            <div className="text-[10px] text-amber-700">Personel Kontrak / Training</div>
          </div>
        </div>

        {/* Tabel Daftar Anggota */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">No</th>
                  <th className="py-2.5 px-3 font-semibold">Nama Personel & NIP</th>
                  <th className="py-2.5 px-3 font-semibold">Regu</th>
                  <th className="py-2.5 px-3 font-semibold">Jabatan</th>
                  <th className="py-2.5 px-3 font-semibold">Status Kepegawaian</th>
                  <th className="py-2.5 px-3 font-semibold">Status Shift Ini</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredModalPersonnel.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Tidak ada data personel pada regu ini.
                    </td>
                  </tr>
                ) : (
                  filteredModalPersonnel.map((person, index) => {
                    const isOrganik =
                      String(person.employment_status || 'organik').toLowerCase() === 'organik';
                    const dep = deploymentByPersonnelId?.get(Number(person.id));
                    const isOnDuty = dep && dep.deployment_type !== 'absent';
                    const isAbsent = dep && dep.deployment_type === 'absent';

                    return (
                      <tr key={person.id || `person-${index}`} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-mono text-slate-400">{index + 1}</td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900">{typeof person.full_name === 'string' ? person.full_name : String(person.full_name || '')}</div>
                          <div className="text-[11px] font-mono text-slate-500">
                            NIP: {person.nip || '-'}
                          </div>
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">
                          Regu {cleanTeam(person.team_group)}
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {formatRoleName(person.rank_position)}
                        </td>
                        <td className="py-2 px-3">
                          {isOrganik ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                              Organik
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Outsourcing (Training)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {isOnDuty ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <UserCheck className="w-3 h-3" />
                              <span>
                                {dep.deployment_type === 'watchroom'
                                  ? 'Posko Watchroom'
                                  : dep.vehicle_code || dep.vehicle_name || 'Bertugas'}
                                {dep.is_pic ? ' (PIC)' : ''}
                              </span>
                            </span>
                          ) : isAbsent ? (
                            <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Izin / Cuti ({dep.absent_reason || 'Cuti'})
                            </span>
                          ) : cleanTeam(person.team_group).toLowerCase() ===
                            (currentTeam || '').toLowerCase() ? (
                            <span className="text-[11px] text-slate-400">Belum Diploting</span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Lepas Piket / Off</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
