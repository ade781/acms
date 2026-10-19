import React, { useState, useEffect, useCallback } from 'react';
import {
  UserX,
  PlusCircle,
  Save,
  CheckCircle,
  AlertCircle,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function HalamanCuti() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [teamPersonnel, setTeamPersonnel] = useState([]);
  const [existingDeployments, setExistingDeployments] = useState([]);
  const [absentList, setAbsentList] = useState([]);
  const [isApproved, setIsApproved] = useState(false);
  const [supervisorName, setSupervisorName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLeaveData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const currentTeam = cleanTeam(activeTeam);

      const [pRes, depRes] = await Promise.all([
        api.get(`/personnel?team_group=${currentTeam}&is_active=1`),
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`),
      ]);

      const personnel = Array.isArray(pRes.data?.data)
        ? pRes.data.data
        : (Array.isArray(pRes.data?.personnel)
        ? pRes.data.personnel
        : (Array.isArray(pRes.data) ? pRes.data : []));
      setTeamPersonnel(personnel);

      const depData = depRes.data;
      setIsApproved(Boolean(depData?.status === 'approved'));
      setSupervisorName(depData?.supervisor_name || '');
      setExistingDeployments(depData?.deployments || []);

      const existingAbsent = (depData?.deployments || []).filter(
        (d) => d.deployment_type === 'absent'
      );

      if (existingAbsent.length > 0) {
        setAbsentList(
          existingAbsent.map((d) => ({
            personnel_id: d.personnel_id,
            reason: d.absent_reason || 'cuti',
            notes: d.notes || '',
          }))
        );
      } else {
        setAbsentList([]);
      }
    } catch (err) {
      console.error('Error fetching leave data:', err);
      setError('Gagal memuat data pencatatan cuti personel.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchLeaveData();
  }, [fetchLeaveData]);

  const handleAddAbsent = () => {
    setAbsentList((prev) => [
      ...prev,
      { personnel_id: '', reason: 'cuti', notes: '' },
    ]);
  };

  const handleRemoveAbsent = (index) => {
    setAbsentList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveLeave = async () => {
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      // Pertahankan ploting operasional yang sudah ada (selain absent)
      const nonAbsentDeployments = existingDeployments
        .filter((d) => d.deployment_type !== 'absent')
        .map((d) => ({
          personnel_id: Number(d.personnel_id),
          deployment_type: d.deployment_type,
          vehicle_id: d.vehicle_id ? Number(d.vehicle_id) : null,
          is_pic: Boolean(d.is_pic),
          notes: d.notes || '',
        }));

      // Tambahkan absent yang baru diinput
      const newAbsentDeployments = absentList
        .filter((abs) => abs.personnel_id)
        .map((abs) => ({
          personnel_id: Number(abs.personnel_id),
          deployment_type: 'absent',
          vehicle_id: null,
          is_pic: false,
          absent_reason: abs.reason,
          notes: abs.notes || '',
        }));

      const payloadDeployments = [...nonAbsentDeployments, ...newAbsentDeployments];

      await api.post('/deployments/batch', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
        deployments: payloadDeployments,
      });

      setSuccessMsg('Pencatatan cuti dan izin personel berhasil disimpan.');
      fetchLeaveData();
    } catch (err) {
      console.error('Error saving leave data:', err);
      setError(`Gagal menyimpan data cuti: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header Info Shift */}
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        supervisorName={supervisorName}
        isApproved={isApproved}
        personnelStats={{
          total: teamPersonnel.length,
          duty: Math.max(0, teamPersonnel.length - absentList.length),
          absent: absentList.length,
          isPlotted: true,
        }}
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      <StateView loading={loading} onRetry={fetchLeaveData}>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-red-50 text-arff-primary flex items-center justify-center">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Pencatatan Cuti & Izin
                </h4>
                <p className="text-xs text-slate-500">
                  Personel yang tidak berdinas pada shift aktif
                </p>
              </div>
            </div>

            {(!isApproved || isAdmin) && (
              <Button
                variant="outline"
                size="sm"
                icon={PlusCircle}
                onClick={handleAddAbsent}
              >
                Tambah Cuti / Izin
              </Button>
            )}
          </div>

          {absentList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">Seluruh Personel Hadir</p>
              <p className="text-slate-400 mt-0.5">
                Tidak ada personel regu yang tercatat cuti atau berhalangan pada shift ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {absentList.map((abs, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  {/* Pilihan Personel: HANYA NAMA SAJA */}
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Personel:
                    </label>
                    <select
                      value={abs.personnel_id || ''}
                      disabled={isApproved && !isAdmin}
                      onChange={(e) => {
                        const updated = [...absentList];
                        updated[idx].personnel_id = e.target.value ? Number(e.target.value) : '';
                        setAbsentList(updated);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="">(Pilih Personel)</option>
                      {teamPersonnel.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Kategori Izin/Cuti */}
                  <div className="w-full sm:w-44">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Kategori Keterangan:
                    </label>
                    <select
                      value={abs.reason}
                      disabled={isApproved && !isAdmin}
                      onChange={(e) => {
                        const updated = [...absentList];
                        updated[idx].reason = e.target.value;
                        setAbsentList(updated);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="cuti">Cuti Tahunan</option>
                      <option value="sakit">Sakit</option>
                      <option value="dinas">Dinas Luar</option>
                      <option value="tukar_dinas">Tukar Dinas</option>
                    </select>
                  </div>

                  {/* Catatan / Alasan */}
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Keterangan / Alasan Tambahan:
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Izin keperluan keluarga, surat dokter..."
                      value={abs.notes || ''}
                      disabled={isApproved && !isAdmin}
                      onChange={(e) => {
                        const updated = [...absentList];
                        updated[idx].notes = e.target.value;
                        setAbsentList(updated);
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 min-h-[38px] transition-colors duration-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {/* Tombol Hapus */}
                  {(!isApproved || isAdmin) && (
                    <div className="sm:pt-5">
                      <button
                        type="button"
                        onClick={() => handleRemoveAbsent(idx)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center transition-colors duration-100"
                        title="Hapus baris cuti ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action Footer */}
          {(!isApproved || isAdmin) && absentList.length > 0 && (
            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <Button
                variant="primary"
                icon={Save}
                loading={saving}
                onClick={handleSaveLeave}
              >
                Simpan Pencatatan Cuti
              </Button>
            </div>
          )}
        </div>
      </StateView>
    </div>
  );
}
