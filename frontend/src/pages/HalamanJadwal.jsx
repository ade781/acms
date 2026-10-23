import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Copy,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, TEAMS } from '../utils/shiftHelper';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_SHORT_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function HalamanJadwal() {
  const { isAdmin, isSupervisor } = useAuth();
  const canEdit = Boolean(isAdmin || isSupervisor);

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowMode, setRowMode] = useState('shift'); // 'shift' atau 'team'

  // Cycle Modal State (Pergantian Jadwal Keseluruhan)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cycleStartDate, setCycleStartDate] = useState('');
  const [cycleDays, setCycleDays] = useState([]);
  const [cycleNotes, setCycleNotes] = useState('');
  const [loadingCycle, setLoadingCycle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fetchMonthlySchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/schedules/monthly?year=${selectedYear}&month=${selectedMonth}`);
      const data = res.data?.data || res.data;
      setScheduleData(data);
    } catch (err) {
      console.error('Error fetching monthly schedule:', err);
      setError('Gagal memuat jadwal dinas.');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchMonthlySchedule();
  }, [fetchMonthlySchedule]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth() + 1);
  };

  /**
   * Mengambil preview 8 hari siklus mulai dari tanggal tertentu
   */
  const loadCyclePreview = async (startDate) => {
    setLoadingCycle(true);
    setFormError(null);
    try {
      const res = await api.get(`/schedules/cycle?start_date=${startDate}`);
      const preview = res.data?.data?.days || [];
      setCycleDays(preview);
    } catch (err) {
      console.error('Error loading cycle preview:', err);
      setFormError('Gagal memuat pola 8 hari untuk tanggal ini.');
    } finally {
      setLoadingCycle(false);
    }
  };

  const handleOpenEditModal = (dayItemOrDate) => {
    if (!isAdmin && !isSupervisor) return;
    let targetDate = '';

    if (typeof dayItemOrDate === 'string') {
      targetDate = dayItemOrDate;
    } else if (dayItemOrDate && dayItemOrDate.date) {
      targetDate = dayItemOrDate.date;
    } else {
      targetDate = getLocalDateStr();
    }

    setCycleStartDate(targetDate);
    setCycleNotes('');
    setFormError(null);
    setEditModalOpen(true);
    loadCyclePreview(targetDate);
  };

  const handleStartDateChange = (newDateStr) => {
    setCycleStartDate(newDateStr);
    loadCyclePreview(newDateStr);
  };

  /**
   * Mengubah regu untuk shift tertentu pada hari ke-i
   */
  const handleShiftChange = (dayIdx, shiftNum, newTeam) => {
    setCycleDays((prev) => {
      const updated = [...prev];
      const cur = { ...updated[dayIdx] };

      if (shiftNum === 1) cur.shift_1 = newTeam;
      if (shiftNum === 2) cur.shift_2 = newTeam;
      if (shiftNum === 3) cur.shift_3 = newTeam;

      // Hitung regu libur otomatis dari sisa
      const remaining = TEAMS.find(
        (t) => t !== cur.shift_1 && t !== cur.shift_2 && t !== cur.shift_3
      );
      if (remaining) {
        cur.off_team = remaining;
      }

      updated[dayIdx] = cur;
      return updated;
    });
  };

  /**
   * Menyalin pola hari ganjil ke hari genap berikutnya (Siklus 2 Hari ARFF: 1->2, 3->4, 5->6, 7->8)
   */
  const handleCopyOddToEven = () => {
    setCycleDays((prev) => {
      const updated = [...prev];
      for (let i = 0; i < 8; i += 2) {
        if (updated[i] && updated[i + 1]) {
          updated[i + 1] = {
            ...updated[i + 1],
            shift_1: updated[i].shift_1,
            shift_2: updated[i].shift_2,
            shift_3: updated[i].shift_3,
            off_team: updated[i].off_team,
          };
        }
      }
      return updated;
    });
  };

  /**
   * Menyimpan pergantian jadwal 8 hari keseluruhan
   */
  const handleSaveCycle = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError(null);

    // Validasi setiap hari tidak boleh ada regu sama di shift 1, 2, 3
    for (let i = 0; i < cycleDays.length; i++) {
      const d = cycleDays[i];
      const list = [d.shift_1, d.shift_2, d.shift_3];
      const unique = new Set(list);
      if (unique.size !== 3) {
        setFormError(`Hari ke-${i + 1} (${d.date}): Shift 1, 2, dan 3 harus diisi regu yang berbeda.`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.post('/schedules/cycle', {
        start_date: cycleStartDate,
        pattern: cycleDays,
        notes: cycleNotes.trim() || null,
      });

      setSuccessMessage(`Pergantian jadwal berhasil diterapkan secara keseluruhan mulai ${cycleStartDate}.`);
      setEditModalOpen(false);
      fetchMonthlySchedule();
    } catch (err) {
      console.error('Error saving cycle:', err);
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan pergantian jadwal.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset seluruh jadwal ke pola rotasi standar otomatis (In-App Confirm)
   */
  const executeResetToDefault = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await api.delete('/schedules/cycle');
      setSuccessMessage('Seluruh jadwal telah dikembalikan ke pola rotasi standar otomatis.');
      setConfirmResetOpen(false);
      setEditModalOpen(false);
      fetchMonthlySchedule();
    } catch (err) {
      setFormError(`Gagal mereset: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getTeamPillClass = (teamName) => {
    switch (cleanTeam(teamName).toLowerCase()) {
      case 'alpha':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'bravo':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'charlie':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'delta':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  };

  const getDutyBadgeClass = (duty) => {
    switch (duty) {
      case 'Pagi':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'Siang':
        return 'bg-amber-50 text-amber-900 border border-amber-200';
      case 'Malam':
        return 'bg-indigo-50 text-indigo-900 border border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-500 border border-slate-200';
    }
  };

  const isToday = (dateStr) => {
    return getLocalDateStr() === dateStr;
  };

  const daysList = scheduleData?.schedule || [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-arff-primary" />
            Jadwal Dinas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rotasi dinas 4 regu berulang dalam siklus 8 hari
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(isAdmin || isSupervisor) && (
            <Button
              variant="primary"
              size="sm"
              icon={Edit3}
              onClick={() => {
                const todayStr = getLocalDateStr();
                handleOpenEditModal(todayStr);
              }}
            >
              Ubah Siklus Jadwal
            </Button>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Filter Bulan & Tampilan */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm mb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-white text-slate-700 transition-colors"
              title="Bulan Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-900 min-w-[130px] text-center">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-white text-slate-700 transition-colors"
              title="Bulan Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button variant="ghost" size="sm" onClick={handleCurrentMonth}>
            Hari Ini
          </Button>
        </div>

        {/* Toggle Mode Baris */}
        <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-slate-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setRowMode('shift')}
            className={`px-3 py-1 rounded-md transition-colors ${
              rowMode === 'shift' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per Shift
          </button>
          <button
            type="button"
            onClick={() => setRowMode('team')}
            className={`px-3 py-1 rounded-md transition-colors ${
              rowMode === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Per Regu
          </button>
        </div>
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={!loading && !error && daysList.length === 0}
        emptyTitle="Jadwal Belum Tersedia"
        emptyDescription="Data rotasi dinas untuk periode ini belum terbentuk di sistem."
        onRetry={fetchMonthlySchedule}
      >
        {scheduleData && daysList.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Tabel Matriks Horizontal (Tanggal Ke Samping) */}
            <div className="overflow-x-auto max-w-full">
              <table className="text-center border-collapse text-xs whitespace-nowrap min-w-max">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                    {/* Sticky Header Kiri */}
                    <th className="py-2.5 px-3 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 text-left min-w-[90px] shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                      {rowMode === 'shift' ? 'Shift' : 'Regu'}
                    </th>

                    {/* Kolom Angka Tanggal ke Samping (1 s.d. 31) */}
                    {daysList.map((item) => {
                      const todayCheck = isToday(item.date);
                      const [itemY, itemM, itemD] = item.date.split('-').map(Number);
                      const jsDate = new Date(itemY, itemM - 1, itemD);
                      const dayShort = DAY_SHORT_NAMES[jsDate.getDay()];
                      const isSunday = jsDate.getDay() === 0;

                      return (
                        <th
                          key={item.date}
                          onClick={canEdit ? () => handleOpenEditModal(item) : undefined}
                          className={`py-1.5 px-2.5 border-r border-slate-200 min-w-[54px] transition-colors ${
                            todayCheck
                              ? 'bg-amber-100 text-amber-950 font-extrabold'
                              : isSunday
                              ? 'text-red-600'
                              : 'text-slate-700'
                          } ${canEdit ? 'cursor-pointer hover:bg-slate-200' : 'cursor-default'}`}
                          title={`Tanggal ${item.day} (${item.day_name})${canEdit ? ' - Klik untuk ubah siklus mulai tanggal ini' : ''}`}
                        >
                          <div className="text-[10px] uppercase font-normal opacity-75">{dayShort}</div>
                          <div className="text-sm font-bold leading-tight">{item.day}</div>
                          {item.is_override && (
                            <span className="block mx-auto w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" title="Siklus disesuaikan" />
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rowMode === 'shift' ? (
                    // MODE 1: BARIS SHIFT (Shift 1, Shift 2, Shift 3, Libur)
                    <>
                      {/* Baris Shift 1 */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 text-left font-bold text-slate-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          Shift 1
                        </td>
                        {daysList.map((item) => (
                          <td
                            key={`s1-${item.date}`}
                            onClick={canEdit ? () => handleOpenEditModal(item) : undefined}
                            className={`py-2 px-1.5 border-r border-slate-100 ${canEdit ? 'cursor-pointer hover:bg-slate-100/70' : 'cursor-default'}`}
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTeamPillClass(item.shift_1)}`}>
                              {item.shift_1 || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Baris Shift 2 */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 text-left font-bold text-slate-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          Shift 2
                        </td>
                        {daysList.map((item) => (
                          <td
                            key={`s2-${item.date}`}
                            onClick={canEdit ? () => handleOpenEditModal(item) : undefined}
                            className={`py-2 px-1.5 border-r border-slate-100 ${canEdit ? 'cursor-pointer hover:bg-slate-100/70' : 'cursor-default'}`}
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTeamPillClass(item.shift_2)}`}>
                              {item.shift_2 || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Baris Shift 3 */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 text-left font-bold text-slate-900 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          Shift 3
                        </td>
                        {daysList.map((item) => (
                          <td
                            key={`s3-${item.date}`}
                            onClick={canEdit ? () => handleOpenEditModal(item) : undefined}
                            className={`py-2 px-1.5 border-r border-slate-100 ${canEdit ? 'cursor-pointer hover:bg-slate-100/70' : 'cursor-default'}`}
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTeamPillClass(item.shift_3)}`}>
                              {item.shift_3 || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>

                      {/* Baris Libur */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 text-left font-medium text-slate-500 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          Libur
                        </td>
                        {daysList.map((item) => (
                          <td
                            key={`off-${item.date}`}
                            onClick={canEdit ? () => handleOpenEditModal(item) : undefined}
                            className={`py-2 px-1.5 border-r border-slate-100 ${canEdit ? 'cursor-pointer hover:bg-slate-100/70' : 'cursor-default'}`}
                          >
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium text-slate-500 bg-slate-100">
                              {item.off_team || '-'}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </>
                  ) : (
                    // MODE 2: BARIS REGU (Alpha, Bravo, Charlie, Delta)
                    TEAMS.map((teamName) => (
                      <tr key={teamName} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 text-left shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${getTeamPillClass(teamName)}`}>
                            Regu {teamName}
                          </span>
                        </td>
                        {daysList.map((item) => {
                          const duty = item.team_duties?.[teamName] || 'Libur';
                          return (
                            <td
                              key={`team-${teamName}-${item.date}`}
                              onClick={canEdit ? () => handleOpenEditModal(item) : undefined}
                              className={`py-2 px-1.5 border-r border-slate-100 ${canEdit ? 'cursor-pointer hover:bg-slate-100/70' : 'cursor-default'}`}
                            >
                              <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getDutyBadgeClass(duty)}`}>
                                {duty}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Petunjuk Interaksi */}
            {(isAdmin || isSupervisor) && (
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 text-center">
                Klik pada kolom tanggal atau tombol &quot;Ubah Siklus Jadwal&quot; untuk mengganti pola rotasi 8 hari secara keseluruhan.
              </div>
            )}
          </div>
        )}
      </StateView>

      {/* Modal Pergantian Jadwal Siklus 8 Hari (Secara Keseluruhan) */}
      {editModalOpen && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setConfirmResetOpen(false);
          }}
          title="Ubah Siklus Jadwal Operasional"
          subtitle="Input 8 hari pertama mulai tanggal pergantian untuk diterapkan berulang ke depan secara keseluruhan"
          maxWidth="max-w-4xl"
          footer={
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-3">
              <div>
                {confirmResetOpen ? (
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-red-50 border border-red-200 animate-in fade-in">
                    <span className="text-[11px] text-red-700 font-semibold">Kembalikan ke rotasi standar?</span>
                    <Button variant="danger" size="sm" onClick={executeResetToDefault} loading={saving}>
                      Ya, Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmResetOpen(false)}
                      disabled={saving}
                    >
                      Batal
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setConfirmResetOpen(true)}
                    disabled={saving}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Reset ke Pola Standar
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditModalOpen(false);
                    setConfirmResetOpen(false);
                  }}
                  disabled={saving}
                >
                  Batal
                </Button>
                <Button variant="primary" onClick={handleSaveCycle} loading={saving}>
                  Terapkan Jadwal Keseluruhan
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Kontrol Tanggal Mulai & Aksi Bantuan */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="w-full sm:max-w-xs">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Mulai Berlaku dari Tanggal:
                </label>
                <input
                  type="date"
                  value={cycleStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-arff-primary"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyOddToEven}
                  title="Duplikasi hari ganjil ke genap (Hari 1->2, 3->4, 5->6, 7->8)"
                >
                  <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  Salin Pola 2 Hari Berulang
                </Button>
              </div>
            </div>

            {/* Keterangan */}
            <div className="flex items-center gap-2 p-2.5 bg-sky-50 border border-sky-200 rounded-lg text-sky-800 text-[11px]">
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0" />
              <span>
                Atur susunan regu untuk <strong>8 hari pertama</strong>. Pola ini akan menjadi siklus dinas yang berputar terus-menerus ke hari-hari berikutnya secara keseluruhan.
              </span>
            </div>

            {/* Form Tabel 8 Hari Pertama Siklus */}
            {loadingCycle ? (
              <div className="py-12 text-center text-slate-500">Memuat susunan 8 hari...</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-700 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Hari ke- / Tanggal</th>
                      <th className="py-2.5 px-3">Shift 1 (Pagi)</th>
                      <th className="py-2.5 px-3">Shift 2 (Siang)</th>
                      <th className="py-2.5 px-3">Shift 3 (Malam)</th>
                      <th className="py-2.5 px-3">Libur (Off)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {cycleDays.map((dayItem, idx) => {
                      const isPairFirst = idx % 2 === 0;
                      return (
                        <tr
                          key={dayItem.day_index || idx}
                          className={isPairFirst ? 'bg-white' : 'bg-slate-50/40'}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            <span className="font-bold text-arff-primary mr-1.5">
                              Hari {idx + 1}
                            </span>
                            <span className="text-slate-500 text-[11px]">
                              ({dayItem.day_name ? `${dayItem.day_name.slice(0, 3)}, ` : ''}
                              {dayItem.date})
                            </span>
                          </td>

                          {/* Shift 1 Select */}
                          <td className="py-2 px-2">
                            <select
                              value={dayItem.shift_1}
                              onChange={(e) => handleShiftChange(idx, 1, e.target.value)}
                              className="w-full py-1.5 px-2 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-arff-primary bg-white cursor-pointer"
                            >
                              {TEAMS.map((t) => (
                                <option key={t} value={t}>
                                  Regu {t}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Shift 2 Select */}
                          <td className="py-2 px-2">
                            <select
                              value={dayItem.shift_2}
                              onChange={(e) => handleShiftChange(idx, 2, e.target.value)}
                              className="w-full py-1.5 px-2 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-arff-primary bg-white cursor-pointer"
                            >
                              {TEAMS.map((t) => (
                                <option key={t} value={t}>
                                  Regu {t}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Shift 3 Select */}
                          <td className="py-2 px-2">
                            <select
                              value={dayItem.shift_3}
                              onChange={(e) => handleShiftChange(idx, 3, e.target.value)}
                              className="w-full py-1.5 px-2 rounded-lg border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-arff-primary bg-white cursor-pointer"
                            >
                              {TEAMS.map((t) => (
                                <option key={t} value={t}>
                                  Regu {t}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Off Team (Otomatis dari sisa regu) */}
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200">
                              Regu {dayItem.off_team || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Catatan Perubahan */}
            <InputField
              label="Catatan Pergantian Siklus (Opsional)"
              placeholder="Contoh: Rotasi baru mulai tanggal 1 November"
              value={cycleNotes}
              onChange={(e) => setCycleNotes(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
