import React, { useState } from 'react';
import { Clock, Trash2, Edit2, Camera, User, ChevronDown, ChevronUp, X } from 'lucide-react';
import { getActivityCategoryMeta, OFFICIAL_ACTIVITY_CATEGORIES } from '../../../utils/activityCategories';

export const ACTIVITY_CATEGORIES = OFFICIAL_ACTIVITY_CATEGORIES.reduce((acc, cat) => {
  acc[cat.value] = { label: cat.label };
  return acc;
}, {});

export default function MobileActivityTimelineItem({
  activity,
  canEdit = false,
  onEdit,
  canDelete = false,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const categoryMeta = getActivityCategoryMeta(activity.activity_type);

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
            <span className="font-mono tabular-nums text-red-600 text-xs font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-red-500" />
              {timeFormatted} WIB
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${categoryMeta.badgeBg}`}>
              {categoryMeta.label}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(activity)}
                className="p-1 text-slate-400 hover:text-blue-600 transition-colors duration-100 rounded"
                title="Edit kegiatan"
                aria-label="Edit kegiatan"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            )}
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

        {/* Title, Description & Right-Side Photo */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="font-bold text-slate-900 text-xs leading-snug">
              {activity.title}
            </h4>

            <p className={`text-xs text-slate-600 leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
              {activity.description}
            </p>

            {activity.description && activity.description.length > 90 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-0.5"
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
              <div className="p-1.5 rounded bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-0.5">
                <span className="font-bold text-slate-800 block text-[10px] uppercase tracking-wide">
                  Hasil / Catatan Khusus:
                </span>
                <p className="leading-snug">{activity.result_notes}</p>
              </div>
            )}

            {/* Personel Pelaksana if any */}
            {actors.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-slate-500 pt-0.5">
                <User className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">
                  Pelaksana: <strong className="text-slate-700">{actors.join(', ')}</strong>
                </span>
              </div>
            )}
          </div>

          {/* Foto di Sisi Kanan (Kompak 64x64px & Dapat Diklik Langsung) */}
          {photoUrl && (
            <div className="w-16 h-16 shrink-0 self-start overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-2xs">
              <img
                src={photoUrl}
                alt={activity.title}
                onClick={() => setShowPhotoModal(true)}
                className="w-full h-full object-cover cursor-pointer active:scale-95 transition-transform duration-100"
                title="Ketuk untuk melihat foto"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
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
                className="text-slate-400 hover:text-slate-700 p-1 rounded"
                aria-label="Tutup foto"
              >
                <X className="w-4 h-4" />
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
