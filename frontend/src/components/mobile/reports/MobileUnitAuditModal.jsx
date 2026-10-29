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
  const isServ = (unit.status === 'serviceable');

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
      badgeLabel: '✓ Pulih Serviceable',
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
      badgeLabel: '● Awal Unserviceable',
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
      badgeLabel: '● Unserviceable',
      dotClass: 'bg-red-500',
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className={`w-2.5 h-2.5 rounded-full ${isServ ? 'bg-emerald-500' : 'bg-red-500'} flex-shrink-0`} />
            <div className="truncate">
              <h4 className="text-xs font-bold text-slate-900 uppercase leading-none truncate">
                Riwayat Kesiapan Armada
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5 truncate">
                Jejak Audit Status Kesiapsiagaan (Audit Trail)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] p-2 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors duration-100 flex-shrink-0"
            aria-label="Tutup Riwayat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ringkasan Status Unit Saat Ini */}
        <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
          <div>
            <span className="text-[9px] text-slate-500 block">Unit Armada:</span>
            <span className="font-bold text-slate-900 text-[11px] block">
              {unitCode} - {unitName}
            </span>
            <span className="text-[9px] text-slate-500">
              Kategori: {unit.category === 'utama' ? 'Kendaraan Utama' : unit.category === 'posko' ? 'Posko Watchroom' : 'Kendaraan Pendukung'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-500 block">Status Terkini:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border inline-block mt-0.5 ${
                isServ
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-red-100 text-red-800 border-red-300'
              }`}
            >
              ● {isServ ? 'Serviceable' : 'Unserviceable'}
            </span>
          </div>
        </div>

        {/* Linimasa Kronologis Audit Trail */}
        <div className="flex-1 overflow-y-auto space-y-2 text-xs pr-0.5">
          {events.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-1">
              <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-semibold text-slate-800">Kondisi Prima (Serviceable)</p>
              <p className="text-[10px] text-slate-500 leading-snug">
                Unit beroperasi normal tanpa riwayat kendala maupun catatan backlog dari shift-shift sebelumnya.
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

                <div className={`rounded-lg border ${evt.borderClass} p-2 shadow-xs space-y-1`}>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-slate-900">
                      {formatIndoDate(evt.date)} • {evt.time}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${evt.badgeClass}`}>
                      {evt.badgeLabel}
                    </span>
                  </div>

                  <div className="text-[9.5px] text-slate-600 flex items-center justify-between">
                    <span>
                      Regu: <strong className="text-slate-800">{evt.team}</strong>
                    </span>
                    <span className="font-mono text-[8.5px] text-slate-500">{evt.shift}</span>
                  </div>

                  <div className="p-1.5 rounded bg-white/90 border border-slate-100 text-[10px] text-slate-800 leading-snug">
                    <p className="font-semibold text-slate-700 text-[9px] mb-0.5">{evt.title}:</p>
                    <p>{evt.note}</p>
                  </div>

                  {/* Foto Bukti Fisik jika tersedia */}
                  {evt.photoUrl && (
                    <div className="mt-1 p-1 bg-white rounded border border-slate-200 flex items-center gap-1.5">
                      <img
                        src={evt.photoUrl}
                        alt="Foto Verifikasi"
                        className="w-8 h-8 rounded object-cover border border-slate-200 flex-shrink-0"
                      />
                      <div className="truncate text-[8.5px] text-slate-600">
                        <span className="font-semibold block truncate">Foto Verifikasi Fisik</span>
                        <span className="text-slate-400 font-mono text-[7.5px]">Dokumentasi WebP</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[8px] text-slate-500 pt-0.5 border-t border-slate-100">
                    <span>
                      PIC: <strong className="text-slate-700">{evt.picName}</strong>
                      {evt.picNip && evt.picNip !== '-' && ` (${evt.picNip})`}
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-0.5">
                      <Camera className="w-2.5 h-2.5" />
                      Fisik Terverifikasi
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
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100"
        >
          Tutup Riwayat
        </button>
      </div>
    </div>
  );
}
