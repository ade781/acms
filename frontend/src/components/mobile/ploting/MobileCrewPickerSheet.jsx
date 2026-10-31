import React, { useState, useMemo } from 'react';
import { X, Search, Trash2, Check, AlertCircle } from 'lucide-react';

export default function MobileCrewPickerSheet({
  isOpen,
  onClose,
  title = 'Pilih Personel',
  subtitle = '',
  personnelList = [],
  currentPersonnelId = null,
  assignedMap = {},
  absentSet = new Set(),
  onSelect,
}) {
  const [search, setSearch] = useState('');

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return personnelList;
    return personnelList.filter((p) => {
      const name = (p.full_name || p.name || '').toLowerCase();
      const nip = (p.nip || '').toLowerCase();
      const cert = (p.cert_level || p.cert || '').toLowerCase();
      return name.includes(q) || nip.includes(q) || cert.includes(q);
    });
  }, [personnelList, search]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 font-sans">
      <div className="w-full max-w-[412px] bg-white rounded-t-2xl border-t border-slate-200 p-3 space-y-2 max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header Sheet */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="truncate pr-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase leading-tight">
              {title}
            </h4>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate leading-tight mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Pencarian */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama atau NIP personel..."
            className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 text-slate-900 focus:bg-white focus:border-red-500 outline-none transition-colors duration-100"
          />
        </div>

        {/* Pilihan Kosongkan / Hapus Slot (Opsi Bersih di Atas) */}
        <button
          type="button"
          onClick={() => {
            onSelect(null);
            onClose();
          }}
          className="w-full p-2 rounded-lg border border-dashed border-red-200 bg-red-50/50 hover:bg-red-50 text-red-700 flex items-center justify-between text-xs font-bold transition-colors duration-100 cursor-pointer"
        >
          <span className="text-xs">— Kosongkan Slot Ini (Hapus) —</span>
          <Trash2 className="w-3.5 h-3.5 text-red-500 shrink-0" />
        </button>

        {/* Daftar Personel Siap Dinas */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-0.5 min-h-[180px]">
          {filteredList.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              Tidak ada personel yang sesuai pencarian.
            </div>
          ) : (
            filteredList.map((p, pIdx) => {
              const pId = Number(p.id);
              const isCurrent = Number(currentPersonnelId) === pId;
              const isAbsent = absentSet.has(pId);
              const assignedUnit = assignedMap[pId];
              const isAssignedElsewhere = assignedUnit && !isCurrent;

              return (
                <div
                  key={pId || `pers-${p.nip || pIdx}`}
                  onClick={() => {
                    if (isAbsent) return;
                    onSelect(pId);
                    onClose();
                  }}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-colors duration-100 ${
                    isCurrent
                      ? 'border-blue-300 bg-blue-50/60'
                      : isAbsent
                      ? 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed'
                      : isAssignedElsewhere
                      ? 'border-amber-200 bg-amber-50/40 hover:bg-amber-50 cursor-pointer'
                      : 'border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <p className="font-bold text-slate-900 text-xs truncate">
                        {p.full_name || p.name}
                      </p>
                      {isCurrent && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-bold shrink-0">
                          Slot Ini
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <span>NIP: <span className="font-mono tabular-nums">{p.nip || '-'}</span></span>
                      {p.cert_level && (
                        <span className="text-slate-600 font-sans font-semibold">
                          • {p.cert_level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isAbsent ? (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                        Izin / Cuti
                      </span>
                    ) : isAssignedElsewhere ? (
                      <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-semibold flex items-center gap-0.5">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Di: {assignedUnit}</span>
                      </span>
                    ) : isCurrent ? (
                      <Check className="w-4 h-4 text-blue-600" />
                    ) : (
                      <span className="text-xs text-blue-600 font-semibold hover:underline">
                        Pilih
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
