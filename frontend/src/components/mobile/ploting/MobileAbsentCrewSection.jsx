import React from 'react';
import { UserX } from 'lucide-react';

export default function MobileAbsentCrewSection({
  absentList = [],
  personnelMap = {},
  onRequestCancel,
  onOpenCutiSaya,
}) {
  const formatReason = (r) => {
    switch (r) {
      case 'cuti':
        return { label: 'Cuti Tahunan', cls: 'bg-amber-100 text-amber-800' };
      case 'sakit':
        return { label: 'Sakit', cls: 'bg-red-100 text-red-800' };
      case 'dinas':
        return { label: 'Dinas Luar', cls: 'bg-blue-100 text-blue-800' };
      case 'tukar_dinas':
        return { label: 'Tukar Dinas', cls: 'bg-purple-100 text-purple-800' };
      default:
        return { label: r || 'Izin/Cuti', cls: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-xs space-y-1">
      {/* Header Bagian Absen / Cuti */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
        <div className="flex items-center gap-1.5">
          <UserX className="w-3.5 h-3.5 text-amber-600" />
          <h4 className="text-[11px] font-bold text-slate-900 uppercase">
            Personel Izin / Cuti
          </h4>
          <span className="text-[9px] font-mono text-slate-400">
            ({absentList.length})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenCutiSaya && (
            <button
              type="button"
              onClick={onOpenCutiSaya}
              className="text-[10px] font-bold text-blue-600 hover:underline"
            >
              + Cuti Saya
            </button>
          )}
        </div>
      </div>

      {/* Daftar Personel Tidak Hadir */}
      <div className="space-y-1 pt-0.5">
        {absentList.length === 0 ? (
          <p className="text-[10px] text-slate-400 italic p-1">
            Seluruh personel terdata hadir lengkap.
          </p>
        ) : (
          absentList.map((item, idx) => {
            const pId = item.personnel_id ? Number(item.personnel_id) : null;
            const person = pId ? personnelMap[pId] : null;
            const displayName = person?.full_name || person?.name || item.name || `Personel #${pId}`;
            const reasonInfo = formatReason(item.reason || item.absent_reason);

            return (
              <div
                key={item.id ?? pId ?? `abs-${idx}`}
                className="flex items-center justify-between p-1.5 rounded-lg bg-amber-50/70 border border-amber-200 text-[10px]"
              >
                <div className="truncate pr-2">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="font-bold text-slate-900 block truncate text-[11px]">
                      {displayName}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-semibold text-[8px] uppercase shrink-0 ${reasonInfo.cls}`}
                    >
                      {reasonInfo.label}
                    </span>
                  </div>
                  {item.notes && (
                    <p className="text-[9px] text-slate-500 truncate mt-0.5">
                      {item.notes}
                    </p>
                  )}
                </div>

                {/* Tombol Cancel Cuti Resmi (Tanpa ✕ liar) */}
                <button
                  type="button"
                  onClick={() => onRequestCancel(item)}
                  className="px-2 py-0.5 rounded border border-amber-300 bg-white hover:bg-amber-100 text-amber-900 font-bold text-[9px] shadow-2xs transition-colors duration-100 shrink-0"
                >
                  Cancel Cuti
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
