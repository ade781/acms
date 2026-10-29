import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileQuestion
} from 'lucide-react';

/**
 * Panel Kanan Pratinjau Dokumen PDF Surat Edaran / Pengumuman Dinas
 * Fokus pada Viewer & Dokumen Ekspor (Clean / Anti-Redundansi)
 */
export default function AnnouncementPdfPreview({
  selectedAnnouncement,
  formatDateTime,
  getPdfUrl
}) {
  const [pdfLoadedForId, setPdfLoadedForId] = useState(null);

  if (!selectedAnnouncement) {
    return (
      <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden items-center justify-center p-8 text-center text-slate-400">
        <FileText className="w-12 h-12 text-slate-300 mb-2" />
        <p className="text-sm font-medium">Pilih surat edaran dari daftar sebelah kiri</p>
        <p className="text-xs text-slate-400 mt-1">
          Dokumen PDF akan langsung dapat dibaca di sini tanpa perlu diunduh terlebih dahulu.
        </p>
      </div>
    );
  }

  const hasFile = Boolean(selectedAnnouncement.file_path);
  const pdfUrl = hasFile && getPdfUrl
    ? getPdfUrl(selectedAnnouncement.file_path, selectedAnnouncement.id)
    : null;

  return (
    <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
      {/* Header Preview */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Pratinjau Dokumen
            </span>
            {selectedAnnouncement.circular_number && (
              <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded">
                {selectedAnnouncement.circular_number}
              </span>
            )}
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {formatDateTime(selectedAnnouncement.published_date || selectedAnnouncement.created_at)}
            </span>
          </div>
          <h3 className="text-sm font-bold text-slate-900 truncate mt-0.5">
            {selectedAnnouncement.title ? String(selectedAnnouncement.title).replace(/^\[MENDESAK\]\s*/i, '').trim() : ''}
          </h3>
        </div>

        {/* Toolbar Aksi Dokumen (Fokus Viewer & Ekspor Berkas) */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {hasFile ? (
            <>
              <a
                href={pdfUrl}
                download={selectedAnnouncement.file_name || 'pengumuman.pdf'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors duration-100 shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Unduh PDF</span>
              </a>

              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 text-xs font-bold transition-colors duration-100 shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Tab Baru</span>
              </a>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-medium border border-slate-200 cursor-not-allowed">
              <FileQuestion className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanpa Berkas Lampiran</span>
            </span>
          )}
        </div>
      </div>

      {/* In-Web Viewer Iframe with On-Demand Preview */}
      <div className="flex-1 w-full bg-slate-100 relative overflow-hidden flex flex-col">
        {!hasFile ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/90">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 border border-slate-200 flex items-center justify-center mb-3 shadow-xs">
              <FileQuestion className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              Tidak Ada Berkas Lampiran PDF
            </h4>
            <p className="text-xs text-slate-500 max-w-sm">
              Surat edaran atau pengumuman dinas ini diterbitkan sebagai teks pengumuman resmi tanpa dokumen fisik PDF terlampir.
            </p>
            {selectedAnnouncement.description && (
              <div className="mt-4 p-4 rounded-xl bg-white border border-slate-200 text-left max-w-md w-full shadow-xs">
                <p className="text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">Ringkasan / Uraian:</p>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {selectedAnnouncement.description}
                </p>
              </div>
            )}
          </div>
        ) : pdfLoadedForId === selectedAnnouncement.id ? (
          <iframe
            src={`${pdfUrl}#toolbar=1&navpanes=0`}
            title={selectedAnnouncement.title}
            className="w-full h-full border-none flex-1"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50/80">
            <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mb-3 shadow-xs">
              <FileText className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              Pratinjau Dokumen PDF Siap Dimuat
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mb-4">
              {selectedAnnouncement.file_name || 'Dokumen surat edaran resmi'}.
              Pemuatan dokumen dilakukan on-demand demi menghemat kuota dan bandwidth operasional.
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => setPdfLoadedForId(selectedAnnouncement.id)}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors duration-100 shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Muat Pratinjau Dokumen PDF</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
