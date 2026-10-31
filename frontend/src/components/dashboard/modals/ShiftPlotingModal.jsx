import React from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatIndoDate } from '../../../utils/shiftHelper';

export default function ShiftPlotingModal({
  isOpen,
  onClose,
  activeShiftNumber = 1,
  currentTeam = 'A',
  activeDate,
  supervisorName,
  shiftInfo,
  personnelComposition,
  getShiftLabel = (s) => `Shift ${s}`,
  getShiftHours = () => ''
}) {
  if (!isOpen) return null;

  const onDutyDeployments = personnelComposition?.onDutyDeployments || [];
  const activeTeamStats = personnelComposition?.activeTeamStats || { total: 0, organik: 0, outsourcing: 0 };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rincian Pelaksanaan ${getShiftLabel(activeShiftNumber)} • Regu ${currentTeam}`}
      subtitle={`${formatIndoDate(activeDate)} • Jam Operasional ${getShiftHours(activeShiftNumber)}`}
      maxWidth="max-w-2xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4 text-xs font-sans">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-xs font-medium">Ketua Regu (Chief)</div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{supervisorName || '-'}</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-xs font-medium">Kekuatan Shift Regu {currentTeam}</div>
            <div className="font-semibold text-slate-900 text-sm mt-0.5">
              <span className="font-mono tabular-nums font-bold">{personnelComposition?.onDutyCount ?? 0}</span> Hadir /{' '}
              <span className="font-mono tabular-nums font-bold">{activeTeamStats.total}</span> Anggota
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-slate-500 text-xs font-medium">Komposisi Regu {currentTeam}</div>
            <div className="font-semibold text-slate-900 text-sm mt-0.5">
              <span className="font-mono tabular-nums font-bold">{activeTeamStats.organik}</span> Organik •{' '}
              <span className="font-mono tabular-nums font-bold">{activeTeamStats.outsourcing}</span> Outsourcing
            </div>
          </div>
        </div>

        {shiftInfo?.handover_notes && (
          <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200">
            <div className="font-bold text-amber-900 mb-1">Catatan Serah Terima Shift:</div>
            <p className="text-slate-700 leading-relaxed">{shiftInfo.handover_notes}</p>
          </div>
        )}

        <div>
          <h4 className="font-bold text-slate-900 mb-2">
            Daftar Penugasan Personel pada Shift Ini (
            <span className="font-mono tabular-nums">{onDutyDeployments.length}</span> Orang)
          </h4>
          {onDutyDeployments.length === 0 ? (
            <div className="py-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
              Belum ada personel yang diploting pada shift ini.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {onDutyDeployments.map((dep, i) => (
                <div key={dep.id || `dep-${i}`} className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">
                      {typeof dep.full_name === 'string' ? dep.full_name : String(dep.full_name || '')}
                      {dep.is_pic ? (
                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800">
                          PIC Unit
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-slate-500">
                      NIP: <span className="font-mono tabular-nums">{dep.nip || '-'}</span> •{' '}
                      {String(dep.employment_status || 'organik').toLowerCase() === 'organik'
                        ? 'Organik'
                        : 'Outsourcing (Training)'}
                    </div>
                  </div>
                  <div className="text-right font-medium text-slate-800">
                    {dep.deployment_type === 'watchroom'
                      ? 'Posko Watchroom'
                      : dep.vehicle_name || dep.vehicle_code || 'Unit Operasional'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
