import React, { useState } from 'react';
import { Clock, Trash2, Camera, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';

export const ACTIVITY_CATEGORIES = {
  serah_terima: {
    label: 'Serah Terima Dinas',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  apel_briefing: {
    label: 'Apel & Briefing',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  periksa_armada: {
    label: 'Pemeriksaan Kendaraan & Fasilitas',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  periksa_peralatan: {
    label: 'Pemeriksaan Peralatan',
    badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  latihan_drill: {
    label: 'Kegiatan Latihan / Drill',
    badge: 'bg-red-50 text-red-700 border-red-200',
  },
  pemeliharaan: {
    label: 'Kegiatan Pemeliharaan',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  sosialisasi_keselamatan: {
    label: 'Sosialisasi Keselamatan',
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  catatan_kendala: {
    label: 'Catatan Khusus & Kendala',
    badge: 'bg-orange-50 text-orange-800 border-orange-200',
  },
};

export default function MobileActivityTimelineItem({
  activity,
  canDelete = false,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const categoryMeta = ACTIVITY_CATEGORIES[activity.activity_type] || {
    label: activity.activity_type || 'Kegiatan Rutin',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  // Parsing actor names or actor ids if formatted
  let actors = [];
  if (activity.actor_ids) {
    try {
      actors = typeof activity.actor_ids === 'string'
        ? JSON.parse(activity.actor_ids)
        : activity.actor_ids;
      if (!Array.isArray(actors)) actors = [];
    } catch {
      actors = [];
    }
  }

  // Format time display
  const timeFormatted = activity.activity_time
    ? (activity.activity_time.length > 5 ? activity.activity_time.slice(0, 5) : activity.activity_time)
    : '--:--';

  const photoUrl = activity.attachment_url;

  return (
    <>
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs space-y-1.5 transition-colors duration-100">
        {/* Header: Time, Category Badge, Delete Button */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-red-600 text-[11px] font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-red-500" />
              {timeFormatted} WIB
            </span>
            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-semibold border ${categoryMeta.badge}`}>
              {categoryMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(activity.id)}
                className="p-1 text-slate-400 hover:text-red-600 transition-colors duration-100 rounded"
                title="Hapus kegiatan"
                aria-label="Hapus kegiatan"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <h4 className="font-bold text-slate-900 text-xs leading-snug">
          {activity.title}
        </h4>

        {/* Description */}
        <p className={`text-[10.5px] text-slate-600 leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
          {activity.description}
        </p>

        {activity.description && activity.description.length > 90 && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[9px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
          >
            {expanded ? (
              <>
                <span>Ringkas</span>
                <ChevronUp className="w-2.5 h-2.5" />
              </>
            ) : (
              <>
                <span>Selengkapnya</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </>
            )}
          </button>
        )}

        {/* Result Notes if available */}
        {activity.result_notes && (
          <div className="p-1.5 rounded bg-slate-50 border border-slate-200/80 text-[10px] text-slate-700 space-y-0.5">
            <span className="font-bold text-slate-800 block text-[9px] uppercase tracking-wide">
              Hasil / Catatan Khusus:
            </span>
            <p className="leading-snug">{activity.result_notes}</p>
          </div>
        )}

        {/* Personel Pelaksana if any */}
        {actors.length > 0 && (
          <div className="flex items-center gap-1 text-[9px] text-slate-500 pt-0.5">
            <User className="w-3 h-3 text-slate-400 shrink-0" />
            <span className="truncate">
              Pelaksana: <strong className="text-slate-700">{actors.join(', ')}</strong>
            </span>
          </div>
        )}

        {/* Attached Photo Thumbnail */}
        {photoUrl && (
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPhotoModal(true)}
              className="flex items-center gap-1.5 p-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[9.5px] text-slate-700 transition-colors duration-100"
            >
              <img
                src={photoUrl}
                alt="Dokumentasi Kegiatan"
                className="w-7 h-7 rounded object-cover border border-slate-300 shrink-0"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <Camera className="w-3 h-3 text-red-500" />
                Lihat Foto Dokumentasi
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Instant Light Photo Preview Modal */}
      {showPhotoModal && photoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-3"
          onClick={() => setShowPhotoModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl overflow-hidden shadow-2xl p-2.5 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h5 className="text-xs font-bold text-slate-900 truncate">
                Foto: {activity.title}
              </h5>
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[65vh] overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
              <img
                src={photoUrl}
                alt="Foto Dokumentasi Kegiatan"
                className="w-full h-auto max-h-[65vh] object-contain"
              />
            </div>
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowPhotoModal(false)}
                className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors duration-100"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
