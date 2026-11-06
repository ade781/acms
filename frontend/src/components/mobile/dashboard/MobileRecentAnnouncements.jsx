import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import api from '../../../services/api';
import SwipeableAnnouncementCard from '../announcements/SwipeableAnnouncementCard';

export default function MobileRecentAnnouncements({
  announcements = [],
  onOpenAllAnnouncements,
  onOpenPdf,
  onArchive
}) {
  const [localList, setLocalList] = useState(announcements);
  const processingIds = useRef(new Set());

  useEffect(() => {
    setLocalList(announcements || []);
  }, [announcements]);

  const isItemArchived = (a) => Boolean(Number(a.is_archived) === 1 || a.is_archived === true);
  const activeList = (localList || []).filter((a) => !isItemArchived(a));
  const top3 = activeList.slice(0, 3);

  const handleOpenAll = () => {
    if (onOpenAllAnnouncements) {
      onOpenAllAnnouncements();
    } else {
      window.dispatchEvent(new CustomEvent('arff:open-announcements-modal'));
    }
  };

  const handleArchiveAnnouncement = async (item) => {
    if (!item?.id || processingIds.current.has(item.id)) return;
    processingIds.current.add(item.id);

    // Optimistic UI update seketika tanpa delay
    setLocalList((prev) =>
      prev.map((a) => (a.id === item.id ? { ...a, is_archived: 1 } : a))
    );

    try {
      if (onArchive) {
        await onArchive(item);
      } else {
        await api.post(`/announcements/${item.id}/archive`);
        if (typeof window !== 'undefined') {
          window.__arff_announcements_cache = null;
        }
        // Dispatch event sinkronisasi SETELAH mutasi di backend selesai
        window.dispatchEvent(new CustomEvent('arff:announcements-updated'));
      }
    } catch (err) {
      console.error('Gagal mengarsipkan pengumuman dari dashboard:', err);
      // Revert jika gagal
      setLocalList((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_archived: 0 } : a))
      );
    } finally {
      processingIds.current.delete(item.id);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#DDD5C7] shadow-[0_2px_8px_-2px_rgba(28,25,23,0.05),0_1px_2px_rgba(28,25,23,0.03)] overflow-hidden font-sans">
      {/* Header Pengumuman Dinas */}
      <div className="px-3.5 py-2.5 bg-[#FAF7F2] border-b border-[#EAE3D5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-50 border border-red-200/80 flex items-center justify-center text-red-600 shrink-0">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
            Pengumuman Dinas
          </h3>
        </div>
        <button
          type="button"
          onClick={handleOpenAll}
          className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline transition-colors duration-100 cursor-pointer flex items-center gap-0.5"
        >
          <span>Lihat Semua</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Konten Pengumuman dengan Fitur Swipeable Card */}
      <div className="p-3">
        {top3.length === 0 ? (
          <div className="p-3 text-center text-[#57534E] bg-[#F7F5F0] rounded-xl border border-dashed border-[#EAE4DC]">
            <p className="text-xs">Belum ada pengumuman dinas.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {top3.map((ann, annIdx) => (
              <SwipeableAnnouncementCard
                key={ann.id ?? `ann-${annIdx}`}
                item={ann}
                onOpen={onOpenPdf}
                onArchive={handleArchiveAnnouncement}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
