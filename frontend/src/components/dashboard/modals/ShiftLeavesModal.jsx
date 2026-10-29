import React, { useState } from 'react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatIndoDate, cleanTeam, formatRoleName } from '../../../utils/shiftHelper';

export default function ShiftLeavesModal({
  isOpen,
  onClose,
  activeDate,
  activeShiftNumber = 1,
  currentTeam = 'A',
  personnelComposition,
  getShiftLabel = (s) => `Shift ${s}`
}) {
  const [leaveTab, setLeaveTab] = useState('shift');

  if (!isOpen) return null;

  const absentDeployments = personnelComposition?.absentDeployments || [];
  const allLeaves = personnelComposition?.allLeaves || [];
  const activeAbsentCount = personnelComposition?.activeTeamAbsentCount ?? absentDeployments.length;
  const totalAbsentCount = personnelComposition?.totalAllAbsentCount ?? (personnelComposition?.allLeaves?.length || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Daftar Personel Izin / Cuti"
      subtitle={`${formatIndoDate(activeDate)} • ${getShiftLabel(activeShiftNumber)}`}
      maxWidth="max-w-xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-3">
        {/* Segmented Tab: Regu Shift Ini vs Semua 4 Regu */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setLeaveTab('shift')}
            className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition-colors duration-100 text-center cursor-pointer ${
              leaveTab === 'shift'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Regu {cleanTeam(currentTeam)} (Shift Ini) ({activeAbsentCount})
          </button>
          <button
            type="button"
            onClick={() => setLeaveTab('all')}
            className={`flex-1 py-1.5 px-3 rounded-md font-semibold transition-colors duration-100 text-center cursor-pointer ${
              leaveTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua Regu ({totalAbsentCount})
          </button>
        </div>

        {/* List Content */}
        {leaveTab === 'shift' ? (
          absentDeployments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Seluruh personel Regu {currentTeam} hadir lengkap (tidak ada catatan izin/cuti pada shift ini).
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs">
              {absentDeployments.map((item, idx) => (
                <div key={item.id || `shift-absent-${idx}`} className="p-3.5 flex items-start justify-between gap-3 bg-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {typeof item.full_name === 'string' ? item.full_name : (item.personnel_name || '-')}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Regu {cleanTeam(item.personnel_team || currentTeam)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      NIP: {item.nip || item.personnel_nip || '-'} • {formatRoleName(item.rank_position || item.personnel_role)}
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        Keterangan: {typeof item.notes === 'string' ? item.notes : String(item.notes)}
                      </div>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    {typeof item.absent_reason === 'string' ? item.absent_reason : 'Cuti / Izin'}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          allLeaves.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Tidak ada catatan cuti operasional untuk seluruh regu pada tanggal ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden text-xs max-h-[380px] overflow-y-auto">
              {allLeaves.map((item, idx) => (
                <div key={item.id || `all-leave-${idx}`} className="p-3.5 flex items-start justify-between gap-3 bg-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">
                        {item.personnel_name || item.full_name || '-'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        Regu {cleanTeam(item.personnel_team || item.shift_team || currentTeam)}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      NIP: {item.personnel_nip || item.nip || '-'} • {formatRoleName(item.personnel_role || item.rank_position)}
                    </div>
                    {(item.notes || item.raw_notes) && (
                      <div className="text-[11px] text-slate-600 mt-1">
                        Keterangan: {item.notes || item.raw_notes}
                      </div>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                    {item.absent_reason || 'Cuti / Izin'}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </Modal>
  );
}
