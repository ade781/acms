import React from 'react';

// Helper ekstrak rentang tanggal dari catatan cuti
export const extractDateRange = (notes, activeDate) => {
  if (typeof notes !== 'string' || !notes) return activeDate || '-';
  const match = notes.match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
  if (match) {
    return `${match[1]} s/d ${match[2]}`;
  }
  return activeDate || '-';
};

// Helper membersihkan catatan dari string format tanggal agar tidak redundan
export const cleanNotes = (notes) => {
  if (typeof notes !== 'string' || !notes) return '-';
  // Hapus format rentang tanggal dalam kurung, e.g. (2026-11-01 s/d 2026-11-03) atau (Rentang: 2026-11-01 s/d 2026-11-03)
  let cleaned = notes
    .replace(/\((?:Rentang:\s*)?[0-9]{4}-[0-9]{2}-[0-9]{2}(?:\s*s\/?d\s*[0-9]{4}-[0-9]{2}-[0-9]{2})?\)/gi, '')
    .trim();
  // Hapus awalan repetitif seperti "Pengajuan Cuti - " atau "Pengajuan Cuti: "
  cleaned = cleaned.replace(/^pengajuan\s+cuti\s*[-:]\s*/i, '').trim();
  // Jika hanya tersisa "Pengajuan Cuti" atau "Cuti" bawaan sistem tanpa keterangan spesifik, tampilkan '-'
  if (!cleaned || /^pengajuan\s+cuti$/i.test(cleaned) || /^cuti$/i.test(cleaned)) {
    return '-';
  }
  return cleaned;
};

// Helper badge kategori izin / cuti
export const getReasonBadge = (reason) => {
  switch (reason) {
    case 'cuti':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          Cuti Tahunan
        </span>
      );
    case 'sakit':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          Sakit
        </span>
      );
    case 'dinas':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          Dinas Luar
        </span>
      );
    case 'tukar_dinas':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Tukar Dinas
        </span>
      );
    case 'libur':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          Libur
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
          {reason || 'Cuti'}
        </span>
      );
  }
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
