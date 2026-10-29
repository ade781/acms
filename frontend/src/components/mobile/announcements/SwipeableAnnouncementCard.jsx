import React, { useState, useRef } from 'react';
import { FileText, Archive } from 'lucide-react';
import { formatIndoDate } from '../../../utils/shiftHelper';

/**
 * Komponen Kartu Pengumuman dengan Gestur Geser / Swipe / Slap Mulus (Ultra Smooth).
 * Menggunakan Pointer Events dengan fisika 1:1 tanpa jeda, efek snap elastis,
 * dan animasi slide-out collapse saat diarsipkan.
 */
export default function SwipeableAnnouncementCard({
  item,
  onOpen,
  onArchive
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const startX = useRef(0);
  const startY = useRef(0);
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const directionLocked = useRef(null); // 'h' | 'v' | null
  const pointerIdRef = useRef(null);

  const triggerArchive = () => {
    if (isDismissing) return;
    setIsDismissing(true);
    // Jalankan animasi slide-out penuh ke kiri
    setOffsetX(-350);
    setTimeout(() => {
      if (onArchive) {
        onArchive(item);
      }
    }, 200);
  };

  const handlePointerDown = (e) => {
    if (isDismissing) return;
    if (e.button && e.button !== 0) return;
    startX.current = e.clientX;
    startY.current = e.clientY;
    isDragging.current = true;
    hasMoved.current = false;
    directionLocked.current = null;
    pointerIdRef.current = e.pointerId;
    setIsDraggingState(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current || isDismissing) return;
    const diffX = e.clientX - startX.current;
    const diffY = e.clientY - startY.current;

    // Kunci arah gerakan setelah melewati ambang batas 5px
    if (!directionLocked.current) {
      if (Math.abs(diffX) > 5 || Math.abs(diffY) > 5) {
        if (Math.abs(diffX) >= Math.abs(diffY)) {
          directionLocked.current = 'h';
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch (_) {}
        } else {
          directionLocked.current = 'v';
          isDragging.current = false;
          setIsDraggingState(false);
          return;
        }
      } else {
        return;
      }
    }

    if (directionLocked.current === 'h') {
      hasMoved.current = true;
      if (isOpen) {
        // Posisi awal terbuka (-76px)
        const targetX = -76 + diffX;
        setOffsetX(Math.max(-180, Math.min(0, targetX)));
      } else {
        // Posisi awal tertutup (0px)
        if (diffX < 0) {
          // Resistensi halus jika ditarik sangat jauh
          const dragDistance = diffX < -120 ? -120 + (diffX + 120) * 0.4 : diffX;
          setOffsetX(Math.max(-200, dragDistance));
        } else {
          // Resistensi ketika ditarik ke kanan saat tertutup
          setOffsetX(Math.min(20, diffX * 0.2));
        }
      }
    }
  };

  const handlePointerUp = (e) => {
    if (!isDragging.current && !hasMoved.current) {
      setIsDraggingState(false);
      return;
    }
    isDragging.current = false;
    setIsDraggingState(false);
    directionLocked.current = null;

    try {
      if (pointerIdRef.current !== null && e.currentTarget) {
        e.currentTarget.releasePointerCapture(pointerIdRef.current);
      }
    } catch (_) {}

    if (isDismissing) return;

    // Full-swipe auto archive threshold (-130px): Geser jauh otomatis langsung arsipkan
    if (offsetX < -130) {
      triggerArchive();
      return;
    }

    // Partial swipe threshold (-35px): Buka tombol "Arsipkan"
    if (offsetX < -35) {
      setOffsetX(-76);
      setIsOpen(true);
    } else {
      setOffsetX(0);
      setIsOpen(false);
    }
  };

  const handleClick = (e) => {
    if (hasMoved.current) {
      hasMoved.current = false;
      return;
    }
    if (isOpen) {
      setOffsetX(0);
      setIsOpen(false);
      return;
    }
    if (onOpen) {
      onOpen(item);
    }
  };

  const handleArchiveButtonClick = (e) => {
    e.stopPropagation();
    triggerArchive();
  };

  const hasFile = Boolean(item.file_path);
  const dateStr = item.published_date || item.created_at
    ? formatIndoDate(item.published_date || item.created_at, { shortMonth: true })
    : (item.date || '-');
  const refNo = item.circular_number || item.reference_number || item.refNo || 'ARFF-EDARAN';
  const snippet = item.description || item.content || item.snippet || 'Surat edaran resmi dinas operasional ARFF YIA.';

  return (
    <div
      style={{
        maxHeight: isDismissing ? '0px' : '200px',
        opacity: isDismissing ? 0 : 1,
        marginBottom: isDismissing ? '0px' : undefined,
        paddingTop: isDismissing ? '0px' : undefined,
        paddingBottom: isDismissing ? '0px' : undefined,
        transition: 'max-height 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.18s ease-out, margin 0.22s ease-out',
        touchAction: 'pan-y'
      }}
      className="relative overflow-hidden rounded-lg select-none bg-red-600 border border-slate-200/80 shadow-2xs"
    >
      {/* Background Action: Tombol Arsipkan */}
      <div className="absolute inset-y-0 right-0 w-[76px] flex items-center justify-center bg-red-600">
        <button
          type="button"
          onClick={handleArchiveButtonClick}
          className="w-full h-full flex flex-col items-center justify-center text-white text-[9.5px] font-bold gap-0.5 active:bg-red-700 hover:bg-red-700 transition-colors duration-100 cursor-pointer"
          aria-label="Arsipkan pengumuman ini"
        >
          <Archive className="w-4 h-4 shrink-0" />
          <span>Arsipkan</span>
        </button>
      </div>

      {/* Foreground Card */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isDraggingState
            ? 'none'
            : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          touchAction: 'pan-y'
        }}
        className={`relative z-10 p-2.5 bg-white hover:bg-slate-50 space-y-1 cursor-pointer ${
          hasFile ? 'hover:border-red-300' : ''
        }`}
      >
        <div className="flex items-center justify-between text-[9px] text-slate-400">
          <span className="font-mono text-slate-600 font-bold truncate max-w-[170px]">
            {refNo}
          </span>
          <span className="shrink-0">{dateStr}</span>
        </div>

        <div className="flex items-start justify-between gap-1.5">
          <h5 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1 flex-1">
            {item.title ? String(item.title).replace(/^\[MENDESAK\]\s*/i, '').trim() : ''}
          </h5>
          {hasFile && (
            <span className="shrink-0 px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-bold text-[9px] flex items-center gap-0.5">
              <FileText className="w-3 h-3" />
              <span>PDF</span>
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-600 leading-snug line-clamp-2">
          {snippet}
        </p>

        <div className="flex items-center justify-between text-[8.5px] text-slate-400 pt-0.5">
          <span>{item.creator_name ? `Oleh: ${item.creator_name}` : ''}</span>
          <span className="text-slate-400 font-medium flex items-center gap-0.5">
            <span>←</span>
            <span>Geser untuk arsipkan</span>
          </span>
        </div>
      </div>
    </div>
  );
}
