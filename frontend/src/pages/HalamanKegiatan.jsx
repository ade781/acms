import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, Clock, FileCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import TextareaField from '../components/common/TextareaField';

export default function HalamanKegiatan() {
  const { user, isAdmin, isSupervisor, activeDate, activeShiftNumber, activeTeam } = useAuth();
  const canManageActivity = isAdmin || isSupervisor || ['admin', 'chief', 'chief_assistant', 'supervisor', 'dept_head'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activities, setActivities] = useState([]);

  // New Activity Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState('rutin');
  const [activityTime, setActivityTime] = useState(new Date().toTimeString().slice(0, 5));
  const [description, setDescription] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/activities?date=${activeDate}&shift=${activeShiftNumber}&team_group=${activeTeam}`);
      const list = Array.isArray(res.data?.activities) ? res.data.activities : (Array.isArray(res.data) ? res.data : []);
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

  const handleAddActivity = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !description.trim()) {
      setFormError('Judul aktivitas dan uraian kegiatan wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/activities', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        activity_type: activityType,
        activity_time: activityTime,
        title,
        description,
        result_notes: resultNotes,
      });

      setModalOpen(false);
      setTitle('');
      setDescription('');
      setResultNotes('');
      fetchActivities();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan catatan kegiatan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Logbook Kegiatan
          </h2>
        </div>

        {canManageActivity && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={() => setModalOpen(true)}
          >
            Tambah Kegiatan
          </Button>
        )}
      </div>

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
            <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
              Catat Kegiatan Pertama
            </Button>
          ) : null
        }
        onRetry={fetchActivities}
      >
        <div className="space-y-4">
          {activities.map((act) => (
            <div
              key={act.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-colors duration-100"
            >
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded">
                    {act.activity_time || '-'} WIB
                  </span>
                  <span className="text-xs font-semibold uppercase text-slate-500">
                    [{act.activity_type || 'rutin'}]
                  </span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {formatTeam(act.team_group || activeTeam)}
                </span>
              </div>

              <div className="mt-3">
                <h4 className="text-sm font-bold text-slate-900 mb-1">{act.title}</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {act.description}
                </p>

                {act.result_notes && (
                  <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <strong className="text-slate-800 block mb-0.5">Hasil / Catatan Khusus:</strong>
                    <span>{act.result_notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </StateView>

      {/* New Activity Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Catat Kegiatan Shift Operasional"
          subtitle={`Shift ${activeShiftNumber} | ${formatTeam(activeTeam)} | ${activeDate}`}
          footer={
            <>
              <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleAddActivity} loading={submitting}>
                Simpan Logbook
              </Button>
            </>
          }
        >
          <form onSubmit={handleAddActivity} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Waktu Pelaksanaan (WIB)"
                type="time"
                value={activityTime}
                onChange={(e) => setActivityTime(e.target.value)}
                required
              />

              <SelectField
                label="Kategori Aktivitas"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                options={[
                  { value: 'rutin', label: 'Kegiatan Rutin (Apel / Senam)' },
                  { value: 'latihan', label: 'Latihan Kesiapsiagaan / Dry Drill' },
                  { value: 'running_test', label: 'Running Test & Pompa Armada' },
                  { value: 'pemeliharaan', label: 'Pemeliharaan Fasilitas / Gedung' },
                  { value: 'serah_terima', label: 'Serah Terima Jaga Dinas' },
                ]}
                required
              />
            </div>

            <InputField
              label="Judul Kegiatan"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Apel Serah Terima Dinas Shift Pagi ke Siang"
              required
            />

            <TextareaField
              label="Uraian Pelaksanaan Kegiatan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan jalannya kegiatan, pengecekan personel, penyerahan kunci armada, dsb..."
              rows={3}
              required
            />

            <TextareaField
              label="Hasil & Catatan Khusus (Opsional)"
              value={resultNotes}
              onChange={(e) => setResultNotes(e.target.value)}
              placeholder="Hasil running test pompa, kondisi tekanan air/foam, dsb..."
              rows={2}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
