import React from 'react';
import { X, CheckCircle, Camera } from 'lucide-react';
import { formatIndoDate } from '../../../utils/shiftHelper';

/**
 * Modal Audit Trail Pelacakan Status Kendala Antar-Regu (Mobile)
 * Menampilkan siklus hidup status unit armada lintas shift dan regu:
 * - Awal kendala Unserviceable
 * - Estafet Handover (Backlog)
 * - Pemulihan (Resolved) kembali ke Serviceable
 */
export default function MobileUnitAuditModal({
  isOpen,
  onClose,
  unit,
  vehicleIssues = { current_issues: [], backlog_issues: [], resolved_this_shift: [] },
}) {
  if (!isOpen || !unit) return null;

  const unitCode = unit.code_name || unit.vehicle_code || unit.id || 'Armada';
  const unitName = unit.vehicle_name || unit.name || unitCode;
  const isServ = unit.status === 'serviceable';
  const isUnserv = unit.status === 'unserviceable';

  // Kumpulkan semua catatan isu & perubahan status yang berkaitan dengan unit ini
  const unitCurrent = (vehicleIssues.current_issues || []).filter(
    (i) => (unit.id && i.vehicle_id === unit.id) || (unit.code_name && i.code_name === unit.code_name)
  );

  const unitBacklog = (vehicleIssues.backlog_issues || []).filter(
    (i) => (unit.id && i.vehicle_id === unit.id) || (unit.code_name && i.code_name === unit.code_name)
  );

  const unitResolved = (vehicleIssues.resolved_this_shift || []).filter(
    (i) => (unit.id && i.vehicle_id === unit.id) || (unit.code_name && i.code_name === unit.code_name)
  );

  // Buat daftar kronologi event terpadu
  const events = [];

  // 1. Event Resolved pada shift ini (jika ada)
  unitResolved.forEach((item) => {
    events.push({
      id: `res-${item.id}`,
      type: 'PULIH_SERVICEABLE',
      title: 'Unit Pulih ke Serviceable',
      statusFrom: 'unserviceable',
      statusTo: 'serviceable',
      date: item.shift_date,
      time: item.resolved_at
        ? new Date(item.resolved_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
        : 'Shift Ini',
      shift: `Shift ${item.shift_number || '-'}`,
      team: item.team_group || '-',
      picName: item.resolved_by_name || item.reported_by_name || unit.pic_name || '-',
      picNip: item.resolved_by_nip || item.reported_by_nip || unit.pic_nip || '-',
      note: item.justification || item.notes || 'Perbaikan selesai dan unit dinyatakan serviceable setelah uji fungsi normal.',
      photoUrl: item.photo_webp_url || null,
      borderClass: 'border-emerald-200 bg-emerald-50/50',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      badgeLabel: 'Pulih Serviceable',
      dotClass: 'bg-emerald-500',
    });
  });

  // 2. Event Kendala pada shift saat ini (jika ada)
  unitCurrent.forEach((item) => {
    events.push({
      id: `cur-${item.id}`,
      type: 'AWAL_UNSERVICEABLE',
      title: 'Awal Kendala (Shift Ini)',
      statusFrom: 'serviceable',
      statusTo: 'unserviceable',
      date: item.shift_date,
      time: 'Shift Berjalan',
      shift: `Shift ${item.shift_number || '-'}`,
      team: item.team_group || '-',
      picName: item.reported_by_name || unit.pic_name || '-',
      picNip: item.reported_by_nip || unit.pic_nip || '-',
      note: item.justification || 'Unit dilaporkan mengalami gangguan teknis.',
      photoUrl: item.photo_webp_url || null,
      borderClass: 'border-red-200 bg-red-50/50',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      badgeLabel: 'Awal Unserviceable',
      dotClass: 'bg-red-500',
    });
  });

  // 3. Event Backlog dari shift-shift sebelumnya (jika ada)
  unitBacklog.forEach((item) => {
    events.push({
      id: `back-${item.id}`,
      type: 'ESTAFET_HANDOVER',
      title: 'Estafet Handover (Backlog)',
      statusFrom: 'unserviceable',
      statusTo: 'unserviceable',
      date: item.shift_date,
      time: 'Shift Terdahulu',
      shift: `Shift ${item.shift_number || '-'}`,
      team: item.team_group || '-',
      picName: item.reported_by_name || '-',
      picNip: item.reported_by_nip || '-',
      note: item.justification || 'Kendala bawaan dari shift sebelumnya dalam penanganan mekanik.',
      photoUrl: item.photo_webp_url || null,
      borderClass: 'border-amber-200 bg-amber-50/40',
      badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
      badgeLabel: 'Estafet Handover',
      dotClass: 'bg-amber-500',
    });
  });

  // Jika tidak ada data spesifik di issues tapi unit unserviceable, gunakan data langsung dari unit
  if (events.length === 0 && !isServ && unit.status === 'unserviceable') {
    events.push({
      id: 'unit-direct-unserv',
      type: 'AWAL_UNSERVICEABLE',
      title: 'Status Kesiapan Terkini',
      statusFrom: 'serviceable',
      statusTo: 'unserviceable',
      date: new Date().toISOString().split('T')[0],
      time: 'Pemeriksaan Shift',
      shift: 'Shift Aktif',
      team: unit.team_group || 'Alpha',
      picName: unit.pic_name || 'PIC Kendaraan',
      picNip: unit.pic_nip || '-',
      note: unit.justification || 'Unit dilaporkan unserviceable pada pemeriksaan shift.',
      photoUrl: unit.photo_webp_url || null,
      borderClass: 'border-red-200 bg-red-50/50',
      badgeClass: 'bg-red-100 text-red-800 border-red-300',
      badgeLabel: 'Unserviceable',
      dotClass: 'bg-red-500',
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 animate-in fade-in duration-100 font-sans"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 truncate">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isServ ? 'bg-emerald-500' : isUnserv ? 'bg-red-500' : 'bg-slate-400'
              }`}
            />
            <h4 className="text-sm font-bold text-slate-900 uppercase leading-none truncate">
              Riwayat Kesiapan Armada
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] p-2 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors duration-100 flex-shrink-0"
            aria-label="Tutup Riwayat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ringkasan Status Unit Saat Ini */}
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs gap-2">
          <div>
            <span className="text-xs text-slate-500 block">Unit Armada:</span>
            <span className="font-bold text-slate-900 text-xs block mt-0.5">
              <span className="font-mono tabular-nums">{unitCode}</span> - {unitName}
            </span>
            <span className="text-xs text-slate-500 block mt-0.5">
              Kategori: {unit.category === 'utama' ? 'Kendaraan Utama' : unit.category === 'posko' ? 'Posko Watchroom' : 'Kendaraan Pendukung'}
            </span>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs text-slate-500 block">Status Terkini:</span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold border inline-flex items-center gap-1.5 mt-1 ${
                isServ
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : isUnserv
                  ? 'bg-red-100 text-red-800 border-red-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isServ ? 'bg-emerald-600' : isUnserv ? 'bg-red-600' : 'bg-slate-400'
                }`}
              />
              <span>{isServ ? 'Serviceable' : isUnserv ? 'Unserviceable' : 'Belum Dicek'}</span>
            </span>
          </div>
        </div>

        {/* Linimasa Kronologis Audit Trail */}
        <div className="flex-1 overflow-y-auto space-y-2.5 text-xs pr-0.5">
          {events.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1.5">
              <CheckCircle className={`w-6 h-6 mx-auto ${isServ ? 'text-emerald-500' : 'text-slate-400'}`} />
              <p className="text-xs font-semibold text-slate-800">
                {isServ ? 'Kondisi Serviceable' : 'Belum Dicek'}
              </p>
              <p className="text-xs text-slate-500 leading-snug">
                {isServ
                  ? 'Unit beroperasi normal tanpa riwayat kendala maupun catatan backlog dari shift sebelumnya.'
                  : 'Unit belum diperiksa oleh PIC pada shift ini dan tidak memiliki riwayat kendala aktif.'}
              </p>
            </div>
          ) : (
            events.map((evt, idx) => (
              <div
                key={evt.id ?? `evt-${idx}`}
                className={`relative pl-4 border-l-2 ${idx === 0 ? 'border-red-600' : 'border-slate-300'} pb-1.5 space-y-1`}
              >
                {/* Bullet titik linimasa */}
                <span
                  className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${
                    idx === 0 ? 'bg-red-600 ring-2 ring-red-100' : 'bg-slate-400'
                  }`}
                />

                <div className={`rounded-lg border ${evt.borderClass} p-2.5 shadow-xs space-y-1.5`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-slate-900">
                      {formatIndoDate(evt.date)} • <span className="font-mono tabular-nums">{evt.time}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border inline-flex items-center gap-1 shrink-0 ${evt.badgeClass}`}>
                      {(evt.type === 'PULIH_SERVICEABLE' || evt.type === 'RESOLVED') && (
                        <CheckCircle className="w-3 h-3 shrink-0 text-emerald-600" />
                      )}
                      <span>{evt.badgeLabel}</span>
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span>
                      Regu: <strong className="text-slate-800">{evt.team}</strong>
                    </span>
                    <span className="font-mono tabular-nums text-xs text-slate-500">{evt.shift}</span>
                  </div>

                  <div className="p-2 rounded bg-white/90 border border-slate-100 text-xs text-slate-800 leading-snug">
                    <p className="font-semibold text-slate-700 text-xs mb-0.5">{evt.title}:</p>
                    <p>{evt.note}</p>
                  </div>

                  {/* Foto Bukti Fisik jika tersedia */}
                  {evt.photoUrl && (
                    <div className="mt-1 p-1.5 bg-white rounded border border-slate-200 flex items-center gap-2">
                      <img
                        src={evt.photoUrl}
                        alt="Foto Verifikasi"
                        className="w-9 h-9 rounded object-cover border border-slate-200 flex-shrink-0"
                      />
                      <div className="truncate text-xs text-slate-600">
                        <span className="font-semibold block truncate">Foto Verifikasi Fisik</span>
                        <span className="text-slate-400 text-xs">Dokumentasi Terlampir</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span>
                      PIC: <strong className="text-slate-700">{evt.picName}</strong>
                      {evt.picNip && evt.picNip !== '-' && (
                        <span className="font-mono tabular-nums"> ({evt.picNip})</span>
                      )}
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      Terverifikasi
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tombol Tutup */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100"
        >
          Tutup Riwayat
        </button>
      </div>
    </div>
  );
}
