import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Edit3,
  CheckCircle2,
  AlertCircle,
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

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-12
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rowMode, setRowMode] = useState('shift'); // 'shift' atau 'team'

  // Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [shift1Team, setShift1Team] = useState('Delta');
  const [shift2Team, setShift2Team] = useState('Charlie');
  const [shift3Team, setShift3Team] = useState('Alpha');
  const [offTeam, setOffTeam] = useState('Bravo');
  const [notes, setNotes] = useState('');
  const [isCurrentlyOverridden, setIsCurrentlyOverridden] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

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

  const handleOpenEditModal = (dayItemOrDate) => {
    if (!isAdmin && !isSupervisor) return;
    let dayItem = null;
    let targetDate = '';

    if (typeof dayItemOrDate === 'string') {
      targetDate = dayItemOrDate;
      dayItem = (scheduleData?.schedule || []).find((d) => d.date === targetDate);
    } else if (dayItemOrDate && dayItemOrDate.date) {
      dayItem = dayItemOrDate;
      targetDate = dayItem.date;
    }

    setSelectedDate(targetDate);
    if (dayItem) {
      setShift1Team(dayItem.shift_1);
      setShift2Team(dayItem.shift_2);
      setShift3Team(dayItem.shift_3);
      setOffTeam(dayItem.off_team);
      setNotes(dayItem.notes || '');
      setIsCurrentlyOverridden(Boolean(dayItem.is_override));
    } else {
      setIsCurrentlyOverridden(false);
      setNotes('');
    }
    setFormError(null);
    setOverrideModalOpen(true);
  };

  const handleModalDateChange = (newDateStr) => {
    setSelectedDate(newDateStr);
    const matched = (scheduleData?.schedule || []).find((d) => d.date === newDateStr);
    if (matched) {
      setShift1Team(matched.shift_1);
      setShift2Team(matched.shift_2);
      setShift3Team(matched.shift_3);
      setOffTeam(matched.off_team);
      setNotes(matched.notes || '');
      setIsCurrentlyOverridden(Boolean(matched.is_override));
    } else {
      setIsCurrentlyOverridden(false);
    }
  };

  const handleShiftChange = (shiftNum, val) => {
    const s1 = shiftNum === 1 ? val : shift1Team;
    const s2 = shiftNum === 2 ? val : shift2Team;
    const s3 = shiftNum === 3 ? val : shift3Team;

    if (shiftNum === 1) setShift1Team(val);
    if (shiftNum === 2) setShift2Team(val);
    if (shiftNum === 3) setShift3Team(val);

    const all = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    const remaining = all.find((t) => t !== s1 && t !== s2 && t !== s3);
    if (remaining) {
      setOffTeam(remaining);
    }
  };

  const handleSaveOverride = async (e) => {
    e.preventDefault();
    setFormError(null);

    const selectedList = [shift1Team, shift2Team, shift3Team];
    const unique = new Set(selectedList);
    if (unique.size !== 3) {
      setFormError('Shift 1, 2, dan 3 tidak boleh diisi nama yang sama.');
      return;
    }

    setSaving(true);
    try {
      await api.post('/schedules/override', {
        roster_date: selectedDate,
        shift_1_team: shift1Team,
        shift_2_team: shift2Team,
        shift_3_team: shift3Team,
        off_team: offTeam,
        notes: notes.trim() || null,
      });

      setSuccessMessage(`Jadwal ${selectedDate} berhasil disimpan.`);
      setOverrideModalOpen(false);
      fetchMonthlySchedule();
    } catch (err) {
      console.error('Error saving override:', err);
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan jadwal.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetOverride = async () => {
    if (!window.confirm(`Reset jadwal ${selectedDate} ke otomatis?`)) {
      return;
    }
    setSaving(true);
    try {
      await api.delete(`/schedules/override/${selectedDate}`);
      setSuccessMessage(`Jadwal ${selectedDate} dikembalikan ke otomatis.`);
      setOverrideModalOpen(false);
      fetchMonthlySchedule();
    } catch (err) {
      alert(`Gagal mereset: ${err.response?.data?.message || err.message}`);
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

  const getLocalDateStr = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
              Ubah Jadwal
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

      <StateView loading={loading} error={error} onRetry={fetchMonthlySchedule}>
        {scheduleData && (
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
                          onClick={() => handleOpenEditModal(item)}
                          className={`py-1.5 px-2.5 border-r border-slate-200 min-w-[54px] cursor-pointer transition-colors ${
                            todayCheck
                              ? 'bg-amber-100 text-amber-950 font-extrabold'
                              : isSunday
                              ? 'text-red-600'
                              : 'text-slate-700'
                          } hover:bg-slate-200`}
                          title={`Tanggal ${item.day} (${item.day_name})${isAdmin || isSupervisor ? ' - Klik untuk ubah' : ''}`}
                        >
                          <div className="text-[10px] uppercase font-normal opacity-75">{dayShort}</div>
                          <div className="text-sm font-bold leading-tight">{item.day}</div>
                          {item.is_override && (
                            <span className="block mx-auto w-1.5 h-1.5 rounded-full bg-amber-500 mt-0.5" title="Disesuaikan manual" />
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
                            onClick={() => handleOpenEditModal(item)}
                            className="py-2 px-1.5 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70"
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTeamPillClass(item.shift_1)}`}>
                              {item.shift_1}
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
                            onClick={() => handleOpenEditModal(item)}
                            className="py-2 px-1.5 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70"
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTeamPillClass(item.shift_2)}`}>
                              {item.shift_2}
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
                            onClick={() => handleOpenEditModal(item)}
                            className="py-2 px-1.5 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70"
                          >
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${getTeamPillClass(item.shift_3)}`}>
                              {item.shift_3}
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
                            onClick={() => handleOpenEditModal(item)}
                            className="py-2 px-1.5 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70"
                          >
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium opacity-75 ${getTeamPillClass(item.off_team)}`}>
                              {item.off_team}
                            </span>
                          </td>
                        ))}
                      </tr>
                    </>
                  ) : (
                    // MODE 2: BARIS NAMA (Alpha, Bravo, Charlie, Delta)
                    ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((teamName) => (
                      <tr key={teamName} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 text-left font-bold shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${getTeamPillClass(teamName)}`}>
                            {teamName}
                          </span>
                        </td>
                        {daysList.map((item) => {
                          const duty = item.team_duties[teamName] || 'Libur';
                          return (
                            <td
                              key={`${teamName}-${item.date}`}
                              onClick={() => handleOpenEditModal(item)}
                              className="py-2 px-1.5 border-r border-slate-100 cursor-pointer hover:bg-slate-100/70"
                            >
                              <span className={`inline-block px-2 py-1 rounded text-[11px] font-bold ${getDutyBadgeClass(duty)}`}>
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
                Klik pada kolom tanggal untuk mengubah jadwal
              </div>
            )}
          </div>
        )}
      </StateView>

      {/* Modal Sesuaikan Jadwal */}
      {overrideModalOpen && (
        <Modal
          isOpen={overrideModalOpen}
          onClose={() => setOverrideModalOpen(false)}
          title="Ubah Jadwal"
          subtitle={`Tanggal ${selectedDate}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <div>
                {isCurrentlyOverridden && (
                  <Button variant="danger" size="sm" onClick={handleResetOverride} disabled={saving}>
                    Reset ke Otomatis
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setOverrideModalOpen(false)} disabled={saving}>
                  Batal
                </Button>
                <Button variant="primary" onClick={handleSaveOverride} loading={saving}>
                  Simpan
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveOverride} className="space-y-4 text-xs">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <InputField
              label="Tanggal"
              type="date"
              value={selectedDate}
              onChange={(e) => handleModalDateChange(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Shift 1"
                value={shift1Team}
                onChange={(e) => handleShiftChange(1, e.target.value)}
                options={TEAMS.map((t) => ({ value: t, label: t }))}
                required
              />

              <SelectField
                label="Shift 2"
                value={shift2Team}
                onChange={(e) => handleShiftChange(2, e.target.value)}
                options={TEAMS.map((t) => ({ value: t, label: t }))}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Shift 3"
                value={shift3Team}
                onChange={(e) => handleShiftChange(3, e.target.value)}
                options={TEAMS.map((t) => ({ value: t, label: t }))}
                required
              />

              <SelectField
                label="Libur (Sisa Otomatis)"
                value={offTeam}
                onChange={(e) => setOffTeam(e.target.value)}
                options={TEAMS.map((t) => ({ value: t, label: t }))}
                disabled
              />
            </div>

            <InputField
              label="Catatan (Opsional)"
              placeholder="Contoh: Tukar shift"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
