import React, { useState, useEffect, useCallback } from 'react';
import { Plus, ClipboardList, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { cleanTeam } from '../../utils/shiftHelper';
import MobileActivityTimelineItem, { ACTIVITY_CATEGORIES } from '../../components/mobile/activities/MobileActivityTimelineItem';
import MobileActivityModal from '../../components/mobile/activities/MobileActivityModal';

export default function MobileKegiatan() {
  const { user, isChief, isAdmin, isSupervisor, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const canManage = isChief || isAdmin || isSupervisor;

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/activities', {
        params: {
          date: activeDate,
          shift: activeShiftNumber,
          team_group: cleanTeam(activeTeam),
        },
      });
      const list = Array.isArray(res.data?.activities)
        ? res.data.activities
        : Array.isArray(res.data)
        ? res.data
        : [];
      setActivities(list);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Gagal memuat logbook kegiatan shift.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Hapus kegiatan ini dari logbook shift?')) return;
    try {
      await api.delete(`/activities/${id}`);
      setActivities((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus kegiatan.');
    }
  };

  const filteredActivities = activities.filter((act) => {
    if (selectedCategoryFilter === 'ALL') return true;
    return act.activity_type === selectedCategoryFilter;
  });

  return (
    <div className="space-y-2 pb-6">
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
          <button
            type="button"
            onClick={fetchActivities}
            disabled={loading}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors duration-100"
            title="Muat Ulang"
            aria-label="Muat Ulang Kegiatan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-red-600' : ''}`} />
          </button>

          {canManage && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs transition-colors duration-100"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Catat Kegiatan</span>
            </button>
          )}
        </div>
      </div>

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
            <span className="text-[10.5px] leading-tight">{error}</span>
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
              onClick={() => setIsModalOpen(true)}
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
          {filteredActivities.map((act) => (
            <MobileActivityTimelineItem
              key={act.id}
              activity={act}
              canDelete={canManage}
              onDelete={handleDeleteActivity}
            />
          ))}
        </div>
      )}

      {/* Modal Tambah Kegiatan */}
      <MobileActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchActivities}
        shiftDate={activeDate}
        shiftNumber={activeShiftNumber}
        teamGroup={activeTeam}
      />
    </div>
  );
}
