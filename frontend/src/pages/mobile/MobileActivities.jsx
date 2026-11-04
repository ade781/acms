import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Plus, ClipboardList, RefreshCw, AlertCircle, Check, X, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam } from '../../utils/shiftHelper';
import MobileActivityTimelineItem from '../../components/mobile/activities/MobileActivityTimelineItem';
import MobileActivityModal from '../../components/mobile/activities/MobileActivityModal';

export default function MobileActivities() {
  const { user, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const isLeader = ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);
  const canManage = isLeader;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  // Filter kategori dihapus untuk kesederhanaan mobile
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
      setToastMsg({ type: 'success', text: 'Kegiatan berhasil dihapus dari logbook.' });
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

  return (
    <div className="space-y-2 pb-6">
      {/* Toast Feedback */}
      {toastMsg && (
        <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between shadow-xs ${toastMsg.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
          <div className="flex items-center gap-1.5">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold text-xs">
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
        </div>

        <div className="flex items-center gap-1.5">
          {canManage && (
            <button
              type="button"
              onClick={() => {
                setEditingActivity(null);
                setIsModalOpen(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Kegiatan</span>
            </button>
          )}
        </div>
      </div>




      {/* Error state */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span className="text-xs leading-tight">
              {typeof error === 'string' ? error : (error?.message || 'Gagal memuat logbook kegiatan shift.')}
            </span>
          </div>
          <button
            type="button"
            onClick={fetchActivities}
            className="text-xs font-bold text-red-700 underline shrink-0 ml-2"
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
          <p className="text-xs font-semibold text-slate-600">
            Belum ada kegiatan operasional yang dicatat pada shift ini.
          </p>
        </div>
      )}

      {/* Timeline Stream */}
      {!loading && activities.length > 0 && (
        <div className="space-y-1.5">
          {activities.map((act, actIdx) => (
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
          setToastMsg({ type: 'success', text: msg || 'Kegiatan operasional berhasil dicatat.' });
        }}
        shiftDate={activeDate}
        shiftNumber={activeShiftNumber}
        teamGroup={activeTeam}
      />

      {/* In-App Delete Confirmation Modal */}
      {targetDeleteId && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 font-sans"
          onClick={() => setTargetDeleteId(null)}
        >
          <div
            className="w-full max-w-[360px] bg-white rounded-t-2xl sm:rounded-2xl border-t sm:border border-slate-200 p-4 pb-8 safe-pb sm:pb-4 space-y-3 shadow-2xl"
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
        </div>,
        document.body
      )}
    </div>
  );
}
