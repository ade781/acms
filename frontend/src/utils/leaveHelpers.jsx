import React from 'react';

// Helper ekstrak rentang tanggal dari catatan cuti
export const extractDateRange = (notes, activeDate) => {
  if (!notes) return activeDate || '-';
  const match = notes.match(/\((?:Rentang:\s*)?([0-9]{4}-[0-9]{2}-[0-9]{2})\s*s\/?d\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\)/i);
  if (match) {
    return `${match[1]} s/d ${match[2]}`;
  }
  return activeDate || '-';
};

// Helper membersihkan catatan dari string format tanggal agar tidak redundan
export const cleanNotes = (notes) => {
  if (!notes) return '-';
  const cleaned = notes.replace(/\((?:Rentang:\s*)?[0-9]{4}-[0-9]{2}-[0-9]{2}\s*s\/?d\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\)/gi, '').trim();
  return cleaned || '-';
};

// Helper badge kategori izin / cuti
export const getReasonBadge = (reason) => {
  switch (reason) {
    case 'cuti':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          Cuti Tahunan
        </span>
      );
    case 'sakit':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200">
          Sakit
        </span>
      );
    case 'dinas':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          Dinas Luar
        </span>
      );
    case 'tukar_dinas':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
          Tukar Dinas
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200 uppercase">
          {reason || 'Cuti'}
        </span>
      );
  }
};

export const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
