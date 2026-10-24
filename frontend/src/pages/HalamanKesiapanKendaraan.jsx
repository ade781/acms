import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Plus, Trash2, X, AlertCircle, FileBarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import VehicleMetricCard from '../components/dashboard/VehicleMetricCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import TextareaField from '../components/common/TextareaField';

export default function HalamanKesiapanKendaraan() {
  const navigate = useNavigate();
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
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // Vehicle Management Modal State (Admin only)
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [codeName, setCodeName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [category, setCategory] = useState('utama');
  const [licensePlate, setLicensePlate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentTeam = cleanTeam(activeTeam);
      const res = await api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
      const list = Array.isArray(res.data?.vehicles) ? res.data.vehicles : (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
      setError('Gagal memuat status kesiapan armada & posko.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleReadinessSuccess = (customMsg) => {
    fetchVehicles();
    setToastMsg({
      type: 'success',
      text: customMsg || 'Data kesiapan fisik armada berhasil diperbarui.'
    });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleOpenAddVehicle = () => {
    setEditingVehicleId(null);
    setCodeName('');
    setVehicleName('');
    setCategory('utama');
    setLicensePlate('');
    setDescription('');
    setFormError(null);
    setVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (v) => {
    setEditingVehicleId(v.id || v.vehicle_id);
    setCodeName(v.code_name || '');
    setVehicleName(v.vehicle_name || '');
    setCategory(v.category || 'utama');
    setLicensePlate(v.license_plate || '');
    setDescription(v.description || '');
    setFormError(null);
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (!codeName.trim() || !vehicleName.trim()) {
      setFormError('Kode panggil dan nama unit armada wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingVehicleId) {
        await api.put(`/vehicles/${editingVehicleId}`, {
          code_name: codeName,
          vehicle_name: vehicleName,
          category,
          license_plate: licensePlate,
          description,
        });
      } else {
        await api.post('/vehicles', {
          code_name: codeName,
          vehicle_name: vehicleName,
          category,
          license_plate: licensePlate,
          description,
          is_active: 1,
        });
      }
      setVehicleModalOpen(false);
      fetchVehicles();
      setToastMsg({
        type: 'success',
        text: editingVehicleId ? 'Spesifikasi unit armada berhasil diperbarui.' : 'Unit armada baru berhasil didaftarkan.'
      });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan data armada.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!editingVehicleId) return;
    if (!window.confirm('Yakin ingin menonaktifkan/menghapus armada ini dari daftar aktif?')) return;

    setSubmitting(true);
    try {
      await api.delete(`/vehicles/${editingVehicleId}`);
      setVehicleModalOpen(false);
      fetchVehicles();
      setToastMsg({
        type: 'success',
        text: 'Unit armada berhasil dihapus dari daftar operasional.'
      });
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menghapus armada.');
      setToastMsg({
        type: 'error',
        text: `Gagal menghapus armada: ${err.response?.data?.message || err.message}`
      });
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const serviceableCount = vehicles.filter(
    (v) => (v.status === 'serviceable' || v.current_log?.status === 'serviceable')
  ).length;
  const unserviceableCount = vehicles.filter(
    (v) => (v.status === 'unserviceable' || v.current_log?.status === 'unserviceable')
  ).length;
  const pendingCount = vehicles.filter(
    (v) => (!v.status || v.status === 'belum_dilaporkan') && v.current_log?.status !== 'serviceable' && v.current_log?.status !== 'unserviceable'
  ).length;

  return (
    <div>
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
      />

      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`mb-4 p-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm transition-all duration-150 ${
            toastMsg.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-1 rounded hover:bg-black/5 text-current cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Kesiapan Armada
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring fisik kendaraan operasional & posko komunikasi
          </p>
        </div>

        {/* Action & Counter Summary */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            icon={FileBarChart2}
            onClick={() => navigate('/armada/laporan')}
          >
            Laporan Kesiapan
          </Button>
          {isAdmin && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={handleOpenAddVehicle}
            >
              Tambah Armada
            </Button>
          )}
          <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            {serviceableCount} Serviceable
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs font-bold">
            {unserviceableCount} Unserviceable
          </span>
          {pendingCount > 0 && (
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold">
              {pendingCount} Belum Diperiksa
            </span>
          )}
        </div>
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={vehicles.length === 0}
        emptyTitle="Belum Ada Unit Operasional"
        emptyDescription="Daftarkan armada operasional terlebih dahulu menggunakan tombol Tambah Armada di atas."
        onRetry={fetchVehicles}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vehicles.map((v) => {
            const isPic = user?.personnel_id && v.pic_personnel_id === user.personnel_id;
            const canInspect = isPic || isSupervisor || isAdmin;

            return (
              <VehicleMetricCard
                key={v.id || v.vehicle_id}
                vehicle={v}
                isPicForVehicle={isPic}
                canInspect={canInspect}
                onInspect={(veh) => setSelectedVehicle(veh)}
                isAdmin={isAdmin}
                onEdit={(veh) => handleOpenEditVehicle(veh)}
              />
            );
          })}
        </div>
      </StateView>

      {/* Modal Pemeriksaan Fisik Armada */}
      {selectedVehicle && (
        (selectedVehicle.category === 'posko' || selectedVehicle.code_name === 'WATCHROOM') ? (
          <WatchroomReadinessModal
            isOpen={Boolean(selectedVehicle)}
            onClose={() => setSelectedVehicle(null)}
            logItem={selectedVehicle}
            activeDate={activeDate}
            activeShiftNumber={activeShiftNumber}
            activeTeam={activeTeam}
            onSuccess={handleReadinessSuccess}
          />
        ) : (
          <VehicleReadinessModal
            isOpen={Boolean(selectedVehicle)}
            onClose={() => setSelectedVehicle(null)}
            vehicle={selectedVehicle}
            activeDate={activeDate}
            activeShiftNumber={activeShiftNumber}
            activeTeam={activeTeam}
            onSuccess={handleReadinessSuccess}
          />
        )
      )}

      {/* Modal Tambah / Edit Armada (Admin Only) */}
      {vehicleModalOpen && (
        <Modal
          isOpen={vehicleModalOpen}
          onClose={() => setVehicleModalOpen(false)}
          title={editingVehicleId ? 'Ubah Spesifikasi Armada' : 'Tambah Armada Operasional Baru'}
          subtitle="Kelola data unit armada dan posko komunikasi ARFF YIA"
          footer={
            <div className="flex items-center justify-between w-full">
              {editingVehicleId && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={Trash2}
                  type="button"
                  onClick={handleDeleteVehicle}
                  disabled={submitting}
                >
                  Hapus
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" type="button" onClick={() => setVehicleModalOpen(false)} disabled={submitting}>
                  Batal
                </Button>
                <Button variant="primary" type="button" onClick={handleSaveVehicle} loading={submitting}>
                  Simpan Armada
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSaveVehicle} className="space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InputField
                label="Kode Unit (Call Sign)"
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="Contoh: FOAM 01, NURSE 01"
                required
              />

              <InputField
                label="Nama Kendaraan"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="Contoh: Foam Tender Major Oshkosh"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Kategori Unit"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'utama', label: 'Kendaraan Utama (Foam/Rapid)' },
                  { value: 'pendukung', label: 'Kendaraan Pendukung (Nurse/Commob)' },
                  { value: 'posko', label: 'Posko Watchroom' },
                ]}
                required
              />

              <InputField
                label="Nomor Plat Dinas"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="Contoh: AB 9012 XY"
              />
            </div>

            <TextareaField
              label="Keterangan / Spesifikasi Mesin"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kapasitas air, busa, dry chemical, atau catatan operasional lainnya..."
              rows={3}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
