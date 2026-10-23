import React, { useState, useEffect } from 'react';
import { X, FileText, ChevronLeft, ChevronRight, AlertCircle, ExternalLink } from 'lucide-react';
import api from '../../../services/api';

const ITEMS_PER_PAGE = 10;

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function MobileAnnouncementsModal({ isOpen, onClose }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchAnnouncements() {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get('/announcements');
        const list = res.data?.data?.announcements || res.data?.announcements || res.data?.data || [];
        if (isMounted) {
          setAnnouncements(Array.isArray(list) ? list : []);
          setCurrentPage(1);
        }
      } catch (err) {
        console.error('Error fetching announcements:', err);
        if (isMounted) setError('Gagal memuat arsip pengumuman dinas');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchAnnouncements();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(announcements.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = announcements.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleOpenDoc = (item) => {
    if (item.file_path) {
      const url = item.file_path.startsWith('http') || item.file_path.startsWith('/')
        ? item.file_path
        : `/${item.file_path}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-600"></span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-tight leading-none">
                Arsip Pengumuman Dinas
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Surat Edaran & Instruksi Operasional</p>
            </div>
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-1.5 text-xs no-scrollbar pr-0.5">
          {loading ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-red-600 rounded-full animate-spin mx-auto mb-2" />
              Memuat pengumuman...
            </div>
          ) : error ? (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : announcements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              Belum ada surat edaran atau pengumuman dinas yang diterbitkan.
            </div>
          ) : (
            paginatedItems.map((item) => {
              const hasFile = Boolean(item.file_path);
              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenDoc(item)}
                  className={`p-2.5 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 transition-colors duration-100 space-y-1 ${
                    hasFile ? 'cursor-pointer hover:border-red-300' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <h5 className="font-bold text-slate-900 text-xs leading-snug">
                      {item.title}
                    </h5>
                    {hasFile && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[9px] flex items-center gap-0.5">
                        <FileText className="w-3 h-3" />
                        <span>PDF</span>
                      </span>
                    )}
                  </div>

                  {item.circular_number && (
                    <p className="text-[9.5px] font-mono text-slate-500">
                      No: {item.circular_number}
                    </p>
                  )}

                  {item.description && (
                    <p className="text-[10px] text-slate-600 leading-snug line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                    <span>{formatDateIndo(item.published_date || item.created_at)}</span>
                    {item.creator_name && <span>Oleh: {item.creator_name}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination per 10 */}
        {!loading && announcements.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] shrink-0">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-100 flex items-center gap-0.5"
            >
              <ChevronLeft className="w-3 h-3" />
              <span>Sebelumnya</span>
            </button>

            <span className="text-slate-500 font-medium">
              Halaman {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-100 flex items-center gap-0.5"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
