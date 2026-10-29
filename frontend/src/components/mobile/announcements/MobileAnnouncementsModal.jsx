import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Download,
  Bell,
  Archive,
  RotateCcw,
  Check
} from 'lucide-react';
import api from '../../../services/api';
import { formatIndoDate } from '../../../utils/shiftHelper';
import SwipeableAnnouncementCard from './SwipeableAnnouncementCard';

const ITEMS_PER_PAGE = 10;

function cleanTitle(str) {
  return String(str || '').replace(/^\[MENDESAK\]\s*/i, '').trim();
}

export default function MobileAnnouncementsModal({ isOpen, onClose }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'archived'
  const [currentPage, setCurrentPage] = useState(1);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchAnnouncements = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);
      const res = await api.get('/announcements');
      const list = res.data?.data?.announcements || res.data?.announcements || res.data?.data || [];
      setAnnouncements(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Error fetching announcements:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memuat arsip pengumuman dinas'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const isSelfMutatingRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      fetchAnnouncements(true);
    }
  }, [isOpen, fetchAnnouncements]);

  // Listener event sinkronisasi seketika saat ada perubahan arsip dari dashboard atau modal lain
  useEffect(() => {
    const handleUpdate = () => {
      if (isOpen && !isSelfMutatingRef.current) {
        fetchAnnouncements(false);
      }
    };
    window.addEventListener('arff:announcements-updated', handleUpdate);
    return () => {
      window.removeEventListener('arff:announcements-updated', handleUpdate);
    };
  }, [isOpen, fetchAnnouncements]);

  if (!isOpen) return null;

  // Filter daftar pengumuman berdasarkan tab dengan normalisasi boolean ketat
  const isItemArchived = (a) => Boolean(Number(a.is_archived) === 1 || a.is_archived === true);
  const activeList = announcements.filter((a) => !isItemArchived(a));
  const archivedList = announcements.filter((a) => isItemArchived(a));
  const currentList = activeTab === 'active' ? activeList : archivedList;

  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = currentList.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleOpenDoc = async (item) => {
    setPreviewDoc(item);
    const isUnread = Boolean(!item.is_read || item.is_read === 0);
    if (isUnread) {
      try {
        await api.post(`/announcements/${item.id}/read`);
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === item.id ? { ...a, is_read: 1 } : a))
        );
        window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
      } catch (e) {
        console.warn('Gagal menandai status baca di mobile:', e);
      }
    }
  };

  const handleArchive = async (item) => {
    isSelfMutatingRef.current = true;
    try {
      // Optimistic update tanpa toast mengganggu
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_archived: 1 } : a))
      );

      await api.post(`/announcements/${item.id}/archive`);
      if (typeof window !== 'undefined') {
        window.__arff_announcements_cache = null;
      }
      // Dispatch event SETELAH mutasi backend selesai
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      console.error('Error archiving announcement:', err);
      // Revert if error
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_archived: 0 } : a))
      );
      showToast('Gagal memindahkan ke arsip');
    } finally {
      setTimeout(() => {
        isSelfMutatingRef.current = false;
      }, 300);
    }
  };

  const handleUnarchive = async (item) => {
    isSelfMutatingRef.current = true;
    try {
      // Optimistic update tanpa toast mengganggu
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_archived: 0 } : a))
      );

      await api.post(`/announcements/${item.id}/unarchive`);
      if (typeof window !== 'undefined') {
        window.__arff_announcements_cache = null;
      }
      // Dispatch event SETELAH mutasi backend selesai
      window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
    } catch (err) {
      console.error('Error unarchiving announcement:', err);
      // Revert if error
      setAnnouncements((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_archived: 1 } : a))
      );
      showToast('Gagal mengembalikan pengumuman');
    } finally {
      setTimeout(() => {
        isSelfMutatingRef.current = false;
      }, 300);
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
                Pengumuman Dinas
              </h4>
              <p className="text-[9px] text-slate-500 mt-0.5">Surat Edaran & Instruksi Operasional</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded-md cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notifikasi Toast Singkat */}
        {toastMsg && (
          <div className="p-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-semibold flex items-center gap-1.5 animate-fadeIn">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* 2 Tabs: Pengumuman Aktif vs Arsip Dinas */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-lg shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('active');
              setCurrentPage(1);
            }}
            className={`py-1.5 px-2 rounded-md transition-colors duration-100 flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'active'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Bell className="w-3.5 h-3.5 text-red-600" />
            <span>Aktif</span>
            {activeList.length > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'active' ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-600'
                  }`}
              >
                {activeList.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('archived');
              setCurrentPage(1);
            }}
            className={`py-1.5 px-2 rounded-md transition-colors duration-100 flex items-center justify-center gap-1.5 cursor-pointer ${activeTab === 'archived'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <Archive className="w-3.5 h-3.5 text-slate-500" />
            <span>Arsip Dinas</span>
            {archivedList.length > 0 && (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${activeTab === 'archived' ? 'bg-slate-200 text-slate-800' : 'bg-slate-200 text-slate-600'
                  }`}
              >
                {archivedList.length}
              </span>
            )}
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
              <span>{typeof error === 'string' ? error : (error?.message || 'Gagal memuat pengumuman')}</span>
            </div>
          ) : currentList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              {activeTab === 'active'
                ? 'Tidak ada pengumuman aktif saat ini.'
                : 'Belum ada pengumuman yang masuk ke arsip dinas.'}
            </div>
          ) : activeTab === 'active' ? (
            // TAB 1: PENGUMUMAN AKTIF DENGAN FITUR SLAP/SWIPE KE SAMPING
            paginatedItems.map((item, itemIdx) => (
              <SwipeableAnnouncementCard
                key={item.id ?? `ann-active-${itemIdx}`}
                item={item}
                onOpen={handleOpenDoc}
                onArchive={handleArchive}
              />
            ))
          ) : (
            // TAB 2: ARSIP PENGUMUMAN DINAS (DENGAN TOMBOL PULIHKAN)
            paginatedItems.map((item, itemIdx) => (
              <div
                key={item.id ?? `ann-archived-${itemIdx}`}
                className="p-2.5 rounded-lg border border-slate-200/80 bg-slate-50 space-y-1"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">
                      {cleanTitle(item.title)}
                    </h5>
                    {item.circular_number && (
                      <p className="text-[9.5px] font-mono text-slate-500">
                        No: {item.circular_number}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnarchive(item)}
                    title="Kembalikan ke Pengumuman Aktif"
                    className="shrink-0 px-2 py-1 rounded bg-white hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-[9px] flex items-center gap-1 transition-colors duration-100 cursor-pointer shadow-2xs"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    <span>Pulihkan</span>
                  </button>
                </div>

                {item.description && (
                  <p className="text-[10px] text-slate-600 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5">
                  <span>{formatIndoDate(item.published_date || item.created_at, { shortMonth: true })}</span>
                  <button
                    type="button"
                    onClick={() => handleOpenDoc(item)}
                    className="text-red-600 font-semibold underline cursor-pointer"
                  >
                    Lihat Dokumen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination per 10 */}
        {!loading && currentList.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] shrink-0">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-100 flex items-center gap-0.5 cursor-pointer"
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
              className="px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors duration-100 flex items-center gap-0.5 cursor-pointer"
            >
              <span>Selanjutnya</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Sub-modal Pratinjau Lembar Edaran In-App */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5 truncate">
                <FileText className="w-4 h-4 text-red-600 shrink-0" />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {cleanTitle(previewDoc.title)}
                  </h4>
                  <p className="text-[9px] text-slate-500 font-mono">
                    {previewDoc.circular_number || 'EDARAN-ARFF'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* In-app Document Sheet Preview */}
            <div className="overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-3 text-xs space-y-2">
              <div className="text-center border-b border-slate-300 pb-1.5">
                <p className="text-[10px] font-black uppercase text-slate-900">
                  PT ANGKASA PURA INDONESIA
                </p>
                <p className="text-[8.5px] font-bold text-slate-700">
                  AIRPORT RESCUE & FIRE FIGHTING (ARFF) - YIA
                </p>
                <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                  Ref: {previewDoc.circular_number || 'ARFF/EDARAN/2026'}
                </p>
              </div>

              <div className="space-y-1">
                <h5 className="font-bold text-slate-900 text-xs">
                  {cleanTitle(previewDoc.title)}
                </h5>
                <p className="text-[10px] text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {previewDoc.description || 'Surat edaran resmi dinas operasional ARFF Bandara Internasional Yogyakarta.'}
                </p>
              </div>
            </div>

            {/* Aksi Unduh / Buka Dokumen */}
            <div className="grid grid-cols-2 gap-1.5">
              {previewDoc.file_path ? (
                <a
                  href={
                    previewDoc.file_path.startsWith('http')
                      ? previewDoc.file_path
                      : `${import.meta.env.VITE_API_URL || '/api'}/announcements/${previewDoc.id}/attachment?token=${encodeURIComponent(localStorage.getItem('arff_token') || '')}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors duration-100"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka Berkas</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center gap-1 transition-colors duration-100"
                >
                  <Download className="w-3 h-3" />
                  <span>Cetak / Simpan</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] transition-colors duration-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
