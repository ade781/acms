import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Eye,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { getDailyRoster, cleanTeam, SHIFT_DEFINITIONS } from '../../utils/shiftHelper';
import { buildAuthenticatedFileUrl } from '../../utils/fileHelper';
import { getActivityCategoryMeta } from '../../utils/activityCategories';
import Button from '../common/Button';
import StateView from '../common/StateView';

// Format helper nama hari dan tanggal dalam Bahasa Indonesia
function formatDateIndo(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// Skema warna regu selaras dengan panji personel (Alpha Merah, Bravo Biru, Charlie Hijau, Delta Ungu)
function getTeamTheme(team, isActive = false, count = 0) {
  const t = cleanTeam(team).toLowerCase();
  if (t === 'alpha') {
    return {
      dot: 'bg-red-500',
      badge: 'bg-red-100 text-red-800 border-red-200 font-bold',
      card: isActive
        ? 'bg-red-50/80 border-red-500 ring-1 ring-red-400 text-red-950 shadow-xs'
        : 'bg-white border-red-200/90 hover:bg-red-50/30 hover:border-red-300 text-slate-800',
      countBadge: count > 0
        ? isActive
          ? 'bg-red-600 text-white font-bold'
          : 'bg-red-100 text-red-800 border border-red-200 font-bold'
        : 'bg-slate-100 text-slate-400',
      title: isActive ? 'text-red-900' : 'text-slate-800',
      borderLeft: 'border-l-4 border-l-red-500',
    };
  }
  if (t === 'bravo') {
    return {
      dot: 'bg-blue-500',
      badge: 'bg-blue-100 text-blue-800 border-blue-200 font-bold',
      card: isActive
        ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-400 text-blue-950 shadow-xs'
        : 'bg-white border-blue-200/90 hover:bg-blue-50/30 hover:border-blue-300 text-slate-800',
      countBadge: count > 0
        ? isActive
          ? 'bg-blue-600 text-white font-bold'
          : 'bg-blue-100 text-blue-800 border border-blue-200 font-bold'
        : 'bg-slate-100 text-slate-400',
      title: isActive ? 'text-blue-900' : 'text-slate-800',
      borderLeft: 'border-l-4 border-l-blue-500',
    };
  }
  if (t === 'charlie') {
    return {
      dot: 'bg-emerald-500',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
      card: isActive
        ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-400 text-emerald-950 shadow-xs'
        : 'bg-white border-emerald-200/90 hover:bg-emerald-50/30 hover:border-emerald-300 text-slate-800',
      countBadge: count > 0
        ? isActive
          ? 'bg-emerald-600 text-white font-bold'
          : 'bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold'
        : 'bg-slate-100 text-slate-400',
      title: isActive ? 'text-emerald-900' : 'text-slate-800',
      borderLeft: 'border-l-4 border-l-emerald-500',
    };
  }
  if (t === 'delta') {
    return {
      dot: 'bg-purple-500',
      badge: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
      card: isActive
        ? 'bg-purple-50/80 border-purple-500 ring-1 ring-purple-400 text-purple-950 shadow-xs'
        : 'bg-white border-purple-200/90 hover:bg-purple-50/30 hover:border-purple-300 text-slate-800',
      countBadge: count > 0
        ? isActive
          ? 'bg-purple-600 text-white font-bold'
          : 'bg-purple-100 text-purple-800 border border-purple-200 font-bold'
        : 'bg-slate-100 text-slate-400',
      title: isActive ? 'text-purple-900' : 'text-slate-800',
      borderLeft: 'border-l-4 border-l-purple-500',
    };
  }
  return {
    dot: 'bg-slate-500',
    badge: 'bg-slate-100 text-slate-700 border-slate-300 font-semibold',
    card: isActive
      ? 'bg-slate-100 border-slate-400 text-slate-900'
      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800',
    countBadge: count > 0 ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-400',
    title: 'text-slate-800',
    borderLeft: 'border-l-4 border-l-slate-400',
  };
}

export default function DailyShiftActivityView({
  activities = [],
  selectedDate,
  onDateChange,
  selectedShift,
  onShiftChange,
  canManageActivity = false,
  onOpenCreateModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onPreviewPhoto,
  viewMode = 'shift',
  onViewModeChange,
  rangePeriod = '1week',
  loading = false,
  error = null,
  onRetry,
}) {
  // Jadwal dinas 3 regu untuk tanggal yang dipilih
  const dailyRoster = useMemo(() => {
    return getDailyRoster(selectedDate);
  }, [selectedDate]);

  // Regu dinas per shift (Alpha / Bravo / Charlie / Delta)
  const shiftTeams = useMemo(() => {
    return {
      1: cleanTeam(dailyRoster.shift1 || 'Alpha'),
      2: cleanTeam(dailyRoster.shift2 || 'Bravo'),
      3: cleanTeam(dailyRoster.shift3 || 'Charlie'),
    };
  }, [dailyRoster]);

  // Filter kegiatan khusus untuk tanggal yang dipilih (Mode Shift Berjalan / Harian)
  const activitiesOnDate = useMemo(() => {
    return activities.filter((act) => {
      if (!act.shift_date) return true;
      return act.shift_date === selectedDate;
    });
  }, [activities, selectedDate]);

  // Pengelompokan kegiatan per shift untuk tanggal terpilih
  const shiftGroups = useMemo(() => {
    const groups = { 1: [], 2: [], 3: [] };
    activitiesOnDate.forEach((act) => {
      const sNum = Number(act.shift_number) || 1;
      if (groups[sNum]) {
        groups[sNum].push(act);
      } else {
        groups[1].push(act);
      }
    });
    // Urutkan kronologis jam pelaksanaan di dalam shift
    for (const key of [1, 2, 3]) {
      groups[key].sort((a, b) => (a.activity_time || '').localeCompare(b.activity_time || ''));
    }
    return groups;
  }, [activitiesOnDate]);

  // Kegiatan pada shift yang sedang aktif dipilih
  const activeShiftActivities = shiftGroups[selectedShift] || [];

  // Pengelompokan kegiatan per tanggal untuk mode Riwayat
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const rangeDateGroups = useMemo(() => {
    if (viewMode !== 'range') return [];
    const map = new Map();
    activities.forEach((act) => {
      const d = act.shift_date || 'Tanpa Tanggal';
      if (!map.has(d)) {
        map.set(d, []);
      }
      map.get(d).push(act);
    });

    // Urutkan tanggal secara menurun (terbaru di atas)
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((dateStr) => {
      const items = map.get(dateStr) || [];
      const shiftCounts = {
        1: items.filter((i) => (Number(i.shift_number) || 1) === 1).length,
        2: items.filter((i) => Number(i.shift_number) === 2).length,
        3: items.filter((i) => Number(i.shift_number) === 3).length,
      };
      return {
        date: dateStr,
        items,
        shiftCounts,
        roster: getDailyRoster(dateStr),
      };
    });
  }, [activities, viewMode]);

  return (
    <StateView
      loading={loading}
      error={error}
      onRetry={onRetry}
      isEmpty={false}
    >
      <div className="space-y-3 font-sans">
        {/* =========================================================================
            KONDISI A: TAB SHIFT BERJALAN (FOKUS OPERASIONAL SINKRON DENGAN SHIFT AKTIF)
        ========================================================================= */}
        {viewMode === 'shift' && (
          <div className="space-y-3">
            {/* Banner Tanggal Lampau jika sedang meninjau tanggal lain */}
            {selectedDate !== todayStr && (
              <div className="bg-amber-50/90 border border-amber-200/90 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs text-amber-900 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Menampilkan logbook untuk tanggal <strong>{formatDateIndo(selectedDate)}</strong>.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDateChange(todayStr)}
                  className="font-bold text-amber-900 hover:text-amber-950 underline cursor-pointer text-xs shrink-0 ml-2"
                >
                  Kembali ke Hari Ini
                </button>
              </div>
            )}

            {/* Selektor Shift Operasional (Background Card & Border Berwarna Regu) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {SHIFT_DEFINITIONS.map((s) => {
                const sNum = s.number;
                const count = shiftGroups[sNum]?.length || 0;
                const isActive = Number(selectedShift) === sNum;
                const teamName = shiftTeams[sNum] || 'Alpha';
                const theme = getTeamTheme(teamName, isActive, count);

                return (
                  <button
                    key={sNum}
                    type="button"
                    onClick={() => onShiftChange(sNum)}
                    className={`p-3 rounded-xl border text-left transition-colors duration-100 cursor-pointer flex items-center justify-between shadow-2xs ${theme.card}`}
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-xs font-bold ${theme.title}`}>
                        {s.name}
                      </span>
                      <span className={`text-xs px-1.5 py-0.5 rounded border shadow-2xs ${theme.badge}`}>
                        Regu {teamName}
                      </span>
                    </div>

                    <div className={`px-2 py-0.5 rounded-full text-xs font-mono tabular-nums shrink-0 ml-2 ${theme.countBadge}`}>
                      {count} Kegiatan
                    </div>
                  </button>
                );
              })}
            </div>

            {activeShiftActivities.length === 0 ? (
              /* Empty State Shift Terpilih */
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Belum Ada Catatan Kegiatan
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Tidak ada entri logbook pada{' '}
                    <strong>
                      {selectedShift === 1
                        ? 'Shift Pagi'
                        : selectedShift === 2
                          ? 'Shift Siang'
                          : 'Shift Malam'}{' '}
                      (Regu {shiftTeams[selectedShift]})
                    </strong>{' '}
                    untuk tanggal {formatDateIndo(selectedDate)}.
                  </p>
                </div>
                {canManageActivity && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Plus}
                    onClick={onOpenCreateModal}
                    className="mt-2"
                  >
                    Tambah Kegiatan Shift Ini
                  </Button>
                )}
              </div>
            ) : (
              /* Daftar Entri Kegiatan Kronologis Rapi */
              <div className="space-y-3">
                {activeShiftActivities.map((act) => {
                  const meta = getActivityCategoryMeta(act.activity_type);
                  const photoSource = act.attachment_url || act.photo_url;
                  const currentTeamName = shiftTeams[selectedShift] || 'Alpha';
                  const currentTheme = getTeamTheme(currentTeamName);

                  return (
                    <div
                      key={act.id}
                      className={`bg-white rounded-xl border border-slate-200 ${currentTheme.borderLeft} p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition-colors duration-100 space-y-3`}
                    >
                      {/* Header Baris Kegiatan: Jam, Kategori, & Tombol Aksi */}
                      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono tabular-nums text-xs font-bold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {act.activity_time ? act.activity_time.slice(0, 5) : '-'} WIB
                          </span>
                          <span
                            className={`text-xs font-bold border px-2.5 py-0.5 rounded-md ${meta.badgeBg}`}
                          >
                            {meta.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                            Oleh: {act.reporter_name || 'Petugas Operasional'}
                          </span>
                          {canManageActivity && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenEditModal(act)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-100 cursor-pointer"
                                title="Edit Kegiatan"
                                aria-label="Edit Kegiatan"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onOpenDeleteModal(act)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-100 cursor-pointer"
                                title="Hapus Kegiatan"
                                aria-label="Hapus Kegiatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Konten Kegiatan & Foto Dokumentasi Kompak di Kanan */}
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 mb-1">
                              {act.title}
                            </h4>
                            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                              {act.description}
                            </p>
                          </div>

                          {/* Catatan / Hasil Uji Fungsi (Jika Ada) */}
                          {act.result_notes && (
                            <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/70 text-xs text-slate-800 space-y-0.5">
                              <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                                Hasil & Catatan Pelaksanaan:
                              </span>
                              <p className="whitespace-pre-line leading-relaxed text-slate-700">
                                {act.result_notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Foto Dokumentasi di Sisi Kanan (Kompak & Dapat Diklik Langsung) */}
                        {photoSource && (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 self-start overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xs">
                            <img
                              src={buildAuthenticatedFileUrl(photoSource)}
                              alt={act.title}
                              onError={(e) => { e.currentTarget.style.display = 'none'; }}
                              className="w-full h-full object-cover hover:opacity-90 hover:scale-105 transition-transform duration-150 cursor-pointer"
                              onClick={() => onPreviewPhoto(buildAuthenticatedFileUrl(photoSource))}
                              title="Klik untuk melihat foto dokumentasi"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            KONDISI B: TAB RIWAYAT (HARI, TANGGAL, JUMLAH KEGIATAN, BUKA TANGGAL INI)
            Tanpa filler teks panjang! Bersih, padat, dan langsung terlempar ke depan
        ========================================================================= */}
        {viewMode === 'range' && (
          <div className="space-y-3">
            {rangeDateGroups.length === 0 ? (
              /* Empty State Riwayat */
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-2xs space-y-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Tidak Ada Catatan Kegiatan
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Tidak ditemukan catatan logbook kegiatan pada periode ini.
                  </p>
                </div>
              </div>
            ) : (
              /* Kartu Ringkas per Tanggal */
              <div className="space-y-2.5">
                {rangeDateGroups.map((group) => {
                  return (
                    <div
                      key={group.date}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-2xs hover:border-slate-300 transition-colors duration-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {/* Hari, Tanggal, & Badge Jumlah Kegiatan */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                          <h4 className="text-sm font-bold text-slate-900">
                            {formatDateIndo(group.date)}
                          </h4>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                            {group.items.length} Kegiatan
                          </span>
                        </div>

                        {/* Regu yang bertugas di hari itu beserta jumlah kegiatan (Warna dot selaras panji Personel) */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap pl-6 sm:pl-6">
                          <span className="inline-flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${getTeamTheme(group.roster?.shift1).dot}`} />
                            <span className="font-semibold text-slate-700">Regu {cleanTeam(group.roster?.shift1 || 'Alpha')}:</span> <strong className="text-slate-800 font-mono tabular-nums">{group.shiftCounts[1]}</strong>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${getTeamTheme(group.roster?.shift2).dot}`} />
                            <span className="font-semibold text-slate-700">Regu {cleanTeam(group.roster?.shift2 || 'Bravo')}:</span> <strong className="text-slate-800 font-mono tabular-nums">{group.shiftCounts[2]}</strong>
                          </span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${getTeamTheme(group.roster?.shift3).dot}`} />
                            <span className="font-semibold text-slate-700">Regu {cleanTeam(group.roster?.shift3 || 'Charlie')}:</span> <strong className="text-slate-800 font-mono tabular-nums">{group.shiftCounts[3]}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Tombol Aksi Buka Tanggal Ini -> Terlempar Kembali ke Depan */}
                      <div className="shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={ArrowRight}
                          onClick={() => {
                            onDateChange(group.date);
                            if (onViewModeChange) onViewModeChange('shift');
                          }}
                          className="w-full sm:w-auto"
                        >
                          Buka Tanggal Ini
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </StateView>
  );
}
