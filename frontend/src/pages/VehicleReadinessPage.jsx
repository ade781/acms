import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, Plus, Trash2, X, AlertCircle, FileBarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam, formatIndoDate } from '../utils/shiftHelper';
import api from '../services/api';
import VehicleMetricCard from '../components/dashboard/VehicleMetricCard';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import TextareaField from '../components/common/TextareaField';

export default function VehicleReadinessPage() {
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
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const fetchVehicles = useCallback(async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const currentTeam = cleanTeam(activeTeam);
      const res = await api.get(`/readiness/vehicles?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`, {
        signal: opts.signal
      });
      const list = Array.isArray(res.data?.vehicles) ? res.data.vehicles : (Array.isArray(res.data) ? res.data : []);
      setVehicles(list);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        return;
      }
      console.error('Error fetching vehicles:', err);
      setError('Gagal memuat status kesiapan armada & posko.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    const controller = new AbortController();
    fetchVehicles({ signal: controller.signal });
    return () => controller.abort();
  }, [fetchVehicles]);

  const handleReadinessSuccess = (customMsg) => {
    fetchVehicles();
    const msgText = typeof customMsg === 'string' ? customMsg : (customMsg?.message || 'Data kesiapan fisik armada berhasil diperbarui.');
    setToastMsg({
      type: 'success',
      text: msgText
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
      const errMsg = typeof err.response?.data?.message === 'string' ? err.response.data.message : typeof err.response?.data === 'string' ? err.response.data : err.message || 'Gagal menyimpan data armada.';
      setFormError(errMsg);
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
      const errMsg = typeof err.response?.data?.message === 'string' ? err.response.data.message : typeof err.response?.data === 'string' ? err.response.data : err.message || 'Gagal menghapus armada.';
      setFormError(errMsg);
      setToastMsg({
        type: 'error',
        text: `Gagal menghapus armada: ${errMsg}`
      });
      setTimeout(() => setToastMsg(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const getVehicleStatusKey = (v) => {
    const raw = v.status || v.current_log?.status || 'belum_dilaporkan';
    if (raw === 'serviceable' || raw === 'unserviceable') return raw;
    return 'belum_dilaporkan';
  };

  const unserviceableCount = vehicles.filter((v) => getVehicleStatusKey(v) === 'unserviceable').length;
  const serviceableCount = vehicles.filter((v) => getVehicleStatusKey(v) === 'serviceable').length;
  const belumDicekCount = vehicles.filter((v) => getVehicleStatusKey(v) === 'belum_dilaporkan').length;

  const filteredVehicles =
    statusFilter === 'ALL'
      ? vehicles
      : vehicles.filter((v) => getVehicleStatusKey(v) === statusFilter);

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMsg && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-sm transition-colors duration-100 ${
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
            <span>{typeof toastMsg?.text === 'string' ? toastMsg.text : (toastMsg?.text?.message || 'Pemberitahuan')}</span>
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

      {/* Single-Row Interactive Fleet Header & Quick Status Filter Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Kesiapan Armada & Posko
          </h2>
        </div>

        {/* Interactive Status Filter Pills + Actions */}
        <div className="flex items-center justify-between xl:justify-end gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-bold transition-colors duration-100 cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('serviceable')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-colors duration-100 cursor-pointer ${
                statusFilter === 'serviceable'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'serviceable' ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>{serviceableCount} Serviceable</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('unserviceable')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-bold transition-colors duration-100 cursor-pointer ${
                statusFilter === 'unserviceable'
                  ? 'bg-red-600 text-white shadow-2xs'
                  : 'text-red-800 hover:bg-red-50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusFilter === 'unserviceable' ? 'bg-white' : 'bg-red-500'}`} />
              <span>{unserviceableCount} Unserviceable</span>
            </button>
            {belumDicekCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter('belum_dilaporkan')}
                title="Status kesiapan armada belum diperiksa/dilaporkan oleh PIC armada pada shift ini."
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-colors duration-100 cursor-pointer ${
                  statusFilter === 'belum_dilaporkan'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span>{belumDicekCount} Belum Dicek</span>
                <HelpCircle className="w-3.5 h-3.5 opacity-70" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={FileBarChart2}
              onClick={() => navigate('/vehicles/reports')}
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
          </div>
        </div>
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={filteredVehicles.length === 0}
        emptyTitle={vehicles.length === 0 ? 'Belum Ada Unit Operasional' : 'Tidak Ada Unit pada Filter Ini'}
        emptyDescription={
          vehicles.length === 0
            ? 'Daftarkan armada operasional terlebih dahulu menggunakan tombol Tambah Armada di atas.'
            : 'Tidak ada kendaraan atau posko yang memiliki status terpilih pada shift ini.'
        }
        onRetry={fetchVehicles}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVehicles.map((v) => {
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
                {typeof formError === 'string' ? formError : (formError?.message || 'Terjadi kesalahan input armada.')}
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
