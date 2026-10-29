import React from 'react';
import {
  Clock,
  Edit2,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { formatTeam } from '../../utils/shiftHelper';
import StateView from '../common/StateView';
import Button from '../common/Button';
import { getActivityCategoryMeta } from '../../utils/activityCategories';

export default function ActivityTimelineList({
  activities = [],
  paginatedActivities = [],
  canManageActivity = false,
  activeTeam = 'Alpha',
  loading = false,
  error = null,
  onRetry,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onPreviewPhoto,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  onPageChange,
}) {
  return (
    <>
      <StateView
        loading={loading}
        error={error}
        isEmpty={activities.length === 0}
        emptyTitle="Belum Ada Logbook Kegiatan"
        emptyDescription={
          canManageActivity
            ? "Catat aktivitas harian, apel regu, atau uji fungsi armada pada shift ini."
            : "Belum ada catatan aktivitas yang dilaporkan oleh Chief / Asisten Chief pada shift ini."
        }
        emptyAction={
          canManageActivity ? (
            <Button variant="primary" size="sm" onClick={onOpenCreateModal}>
              Catat Kegiatan Pertama
            </Button>
          ) : null
        }
        onRetry={onRetry}
      >
        {/* Vertical Step Timeline Kronologis Logbook Resmi */}
        <div className="relative pl-6 sm:pl-8 before:absolute before:top-4 before:bottom-4 before:left-3 sm:before:left-4 before:w-0.5 before:bg-slate-200 space-y-6">
          {paginatedActivities.map((act) => {
            const meta = getActivityCategoryMeta(act.activity_type);
            const NodeIcon = meta.icon;
            const photoSource = act.attachment_url || act.photo_url;
            return (
              <div key={act.id} className="relative group">
                {/* Simpul Timeline / Timeline Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1 w-6 h-6 sm:w-8 sm:h-8 rounded-full ${meta.nodeBg} ring-4 ${meta.nodeRing} flex items-center justify-center shadow-xs z-10 transition-transform duration-100 group-hover:scale-110`}
                  title={meta.label}
                >
                  <NodeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                </div>

                {/* Card Logbook */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-slate-300 transition-colors duration-100 ml-1">
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {act.activity_time ? act.activity_time.slice(0, 5) : '-'} WIB
                      </span>
                      <span className={`text-xs font-bold border px-2.5 py-0.5 rounded ${meta.badgeBg}`}>
                        {meta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                        Regu {formatTeam(act.team_group || activeTeam)}
                      </span>
                      {canManageActivity && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenEditModal(act)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-100"
                            title="Edit Kegiatan"
                            aria-label="Edit Kegiatan"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenDeleteModal(act)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-100"
                            title="Hapus Kegiatan"
                            aria-label="Hapus Kegiatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3">
                    <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                      {act.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line mb-3">
                      {act.description}
                    </p>

                    {act.result_notes && (
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 mb-3 text-xs">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Hasil & Catatan Pelaksanaan:
                        </div>
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                          {act.result_notes}
                        </p>
                      </div>
                    )}

                    {/* Foto Lampiran Kegiatan */}
                    {photoSource && (
                      <div className="pt-2">
                        <div className="relative inline-block group/img rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <img
                            src={photoSource}
                            alt={act.title}
                            className="w-48 h-32 object-cover transition-transform duration-200 group-hover/img:scale-105 cursor-pointer"
                            onClick={() => onPreviewPhoto(photoSource)}
                          />
                          <div
                            onClick={() => onPreviewPhoto(photoSource)}
                            className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white text-xs font-semibold gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Perbesar</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Footer Identitas Pelapor */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Dicatat oleh:{' '}
                        <strong className="text-slate-600 font-medium">
                          {act.reporter_name || 'Chief Regu'}
                        </strong>
                      </span>
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <Check className="w-3 h-3" />
                        Tercatat Resmi
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Paginasi Kegiatan */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border border-slate-200 bg-white rounded-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 mt-4">
            <span>
              Menampilkan <strong className="text-slate-700">{(currentPage - 1) * pageSize + 1}</strong> -{' '}
              <strong className="text-slate-700">
                {Math.min(currentPage * pageSize, activities.length)}
              </strong>{' '}
              dari <strong className="text-slate-700">{activities.length}</strong> kegiatan
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                icon={ChevronLeft}
                disabled={currentPage <= 1}
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              >
                Sebelumnya
              </Button>
              <span className="text-xs font-semibold px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                icon={ChevronRight}
                disabled={currentPage >= totalPages}
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              >
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </StateView>
    </>
  );
}
