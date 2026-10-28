import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ClipboardList, Filter, RefreshCw, AlertCircle, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam } from '../../utils/shiftHelper';
import MobileActivityTimelineItem, { ACTIVITY_CATEGORIES } from '../../components/mobile/activities/MobileActivityTimelineItem';
import MobileActivityModal from '../../components/mobile/activities/MobileActivityModal';

export default function MobileActivities() {
  const { user, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const isLeader = ['admin', 'chief', 'chief_assistant'].includes(user?.role);
  const canManage = isLeader;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState(null);

  // In-app Delete Modal state
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRequestEdit = (act) => {
    setEditingActivity(act);
    setIsModalOpen(true);
  };

  const fetchActivities = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/activities', {
        params: {
          date: activeDate,
          shift: activeShiftNumber,
          team_group: cleanTeam(activeTeam),
        },
        signal,
      });
      const raw = res.data?.data ?? res.data?.activities ?? res.data;
      const list = Array.isArray(raw) ? raw : [];
      setActivities(list);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching activities:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memuat logbook kegiatan shift.'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivities(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchActivities]);

  const handleRequestDelete = (id) => {
    setTargetDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!targetDeleteId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/activities/${targetDeleteId}`);
      setActivities((prev) => prev.filter((a) => a.id !== targetDeleteId));
      setToastMsg({ type: 'success', text: '✓ Kegiatan berhasil dihapus dari logbook.' });
      setTargetDeleteId(null);
    } catch (err) {
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal menghapus kegiatan.'));
      setToastMsg({ type: 'error', text: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return act.activity_type === selectedCategoryFilter;
  });

  return (
    <div className="space-y-2 pb-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between shadow-xs ${
          toastMsg.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-1.5">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold text-[11px]">
              {typeof toastMsg.text === 'string' ? toastMsg.text : (toastMsg.text?.message || 'Notifikasi')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-0.5 opacity-70 hover:opacity-100"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-xs flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-900 leading-tight">
            Logbook Kegiatan Rutin
          </h3>
          <p className="text-[10px] text-slate-500 font-medium">
            Shift {activeShiftNumber} • Regu {activeTeam}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingActivity(null);
                setIsModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Kegiatan</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner Ringkas Informatif Mode Pratinjau (Read-Only) */}
      {!isLeader && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-[11px] font-medium leading-tight">
            Mode Pratinjau (Read-Only) - Log kegiatan operasional dikelola oleh Chief / Asisten Regu.
          </span>
        </div>
      )}

      {/* Filter Kategori Chips */}
      {activities.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[9px]">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter('ALL')}
            className={`px-2 py-0.5 rounded-full border whitespace-nowrap font-semibold transition-colors duration-100 ${
              selectedCategoryFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Semua ({activities.length})
          </button>
          {Object.entries(ACTIVITY_CATEGORIES).map(([key, cat]) => {
            const count = activities.filter((a) => a.activity_type === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedCategoryFilter(key)}
                className={`px-2 py-0.5 rounded-full border whitespace-nowrap font-semibold transition-colors duration-100 ${
                  selectedCategoryFilter === key
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-[10.5px] leading-tight">
              {typeof error === 'string' ? error : (error?.message || 'Gagal memuat logbook kegiatan shift.')}
            </span>
          </div>
          <button
            type="button"
            onClick={fetchActivities}
            className="text-[10px] font-bold text-red-700 underline shrink-0 ml-2"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && activities.length === 0 && (
        <div className="p-6 text-center text-slate-400 bg-white rounded-lg border border-slate-200 shadow-xs space-y-1">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto text-red-500 mb-1" />
          <p className="text-xs font-semibold text-slate-600">Memuat linimasa kegiatan...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && activities.length === 0 && (
        <div className="p-5 text-center bg-white rounded-lg border border-dashed border-slate-300 shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Belum ada kegiatan rutin
            </h4>
            <p className="text-[10px] text-slate-500 max-w-[260px] mx-auto mt-0.5 leading-snug">
              Belum ada kegiatan operasional yang dicatat pada shift ini.
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingActivity(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10.5px] shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Kegiatan Pertama</span>
            </button>
          )}
        </div>
      )}

      {/* Timeline Stream */}
      {!loading && filteredActivities.length > 0 && (
        <div className="space-y-1.5">
          {filteredActivities.map((act, actIdx) => (
            <MobileActivityTimelineItem
              key={act.id ?? `act-${act.activity_time || actIdx}`}
              activity={act}
              canEdit={canManage}
              onEdit={handleRequestEdit}
              canDelete={canManage}
              onDelete={handleRequestDelete}
            />
          ))}
        </div>
      )}

      {/* Modal Tambah / Edit Kegiatan */}
      <MobileActivityModal
        isOpen={isModalOpen}
        editingActivity={editingActivity}
        onClose={() => {
          setIsModalOpen(false);
          setEditingActivity(null);
        }}
        onSuccess={(msg) => {
          fetchActivities();
          setToastMsg({ type: 'success', text: msg || '✓ Kegiatan operasional berhasil dicatat.' });
        }}
        shiftDate={activeDate}
        shiftNumber={activeShiftNumber}
        teamGroup={activeTeam}
      />

      {/* In-App Delete Confirmation Modal */}
      {targetDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onClick={() => setTargetDeleteId(null)}
        >
          <div
            className="w-full max-w-[340px] bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Hapus Catatan Kegiatan?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Catatan kegiatan ini beserta lampiran foto fisik pada server akan dihapus secara permanen dari logbook shift.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetDeleteId(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors duration-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors duration-100 disabled:opacity-50"
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
