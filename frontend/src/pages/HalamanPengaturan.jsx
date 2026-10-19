import React, { useState, useEffect, useCallback } from 'react';
import { Sliders, Plus, Truck, Radio, Trash2, Edit2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import InputField from '../components/common/InputField';
import SelectField from '../components/common/SelectField';
import TextareaField from '../components/common/TextareaField';

export default function HalamanPengaturan() {
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState('vehicles'); // 'vehicles' | 'watchroom'
  const [vehicles, setVehicles] = useState([]);
  const [watchroomItems, setWatchroomItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Vehicle Modal
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState(null);
  const [codeName, setCodeName] = useState('');
  const [vehicleName, setVehicleName] = useState('');
  const [category, setCategory] = useState('utama');
  const [licensePlate, setLicensePlate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchMasterData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Get vehicles
      try {
        const vRes = await api.get('/vehicles');
        setVehicles(Array.isArray(vRes.data?.vehicles) ? vRes.data.vehicles : (Array.isArray(vRes.data) ? vRes.data : []));
      } catch {
        // Fallback to readiness if /vehicles is not separate
        const fallbackRes = await api.get('/readiness/vehicles');
        setVehicles(fallbackRes.data?.vehicles || fallbackRes.data || []);
      }

      // 2. Get watchroom items if supported
      try {
        const wRes = await api.get('/watchroom-items');
        setWatchroomItems(wRes.data?.items || wRes.data || []);
      } catch {
        setWatchroomItems([]);
      }
    } catch (err) {
      console.error('Error fetching master data:', err);
      setError('Gagal memuat master data sistem.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

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
    setEditingVehicleId(v.id);
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
      setFormError('Kode panggil dan nama kendaraan wajib diisi.');
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
      fetchMasterData();
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Gagal menyimpan kendaraan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
        <h3 className="text-base font-bold text-slate-900">Akses Dibatasi</h3>
        <p className="text-xs text-slate-500 mt-1">
          Halaman Pengaturan Master hanya dapat diakses oleh Administrator Sistem.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pengaturan Master Data Sistem
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Konfigurasi master kendaraan operasional dan checklist fasilitas bandara
          </p>
        </div>

        {activeTab === 'vehicles' && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleOpenAddVehicle}
          >
            Tambah Unit Kendaraan
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('vehicles')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors duration-100 flex items-center gap-2 ${
            activeTab === 'vehicles'
              ? 'border-arff-primary text-arff-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Master Armada Kendaraan ({vehicles.length})</span>
        </button>
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={vehicles.length === 0}
        emptyTitle="Belum Ada Master Armada Kendaraan"
        emptyDescription="Belum ada data unit kendaraan terdaftar. Silakan daftarkan unit kendaraan operasional."
        emptyAction={
          <Button variant="primary" size="sm" onClick={handleOpenAddVehicle}>
            Tambah Kendaraan
          </Button>
        }
        onRetry={fetchMasterData}
      >
        {activeTab === 'vehicles' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-5 py-3.5">Kode Panggil</th>
                    <th className="px-5 py-3.5">Nama Kendaraan</th>
                    <th className="px-5 py-3.5">Kategori</th>
                    <th className="px-5 py-3.5">Nomor Polisi / Plat</th>
                    <th className="px-5 py-3.5">Deskripsi / Tipe</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3.5 font-bold text-slate-900 font-mono">
                        {v.code_name}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        {v.vehicle_name}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={v.category === 'utama' ? 'primary' : 'default'} size="sm">
                          {v.category === 'utama' ? 'Armada Utama' : 'Pendukung'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {v.license_plate || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {v.description || '-'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(v)}
                          className="text-arff-primary hover:underline font-semibold text-xs"
                        >
                          Ubah
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </StateView>

      {/* Vehicle Add/Edit Modal */}
      {vehicleModalOpen && (
        <Modal
          isOpen={vehicleModalOpen}
          onClose={() => setVehicleModalOpen(false)}
          title={editingVehicleId ? 'Ubah Master Kendaraan' : 'Tambah Unit Kendaraan Baru'}
          subtitle="Masukkan data spesifikasi kendaraan operasional ARFF"
          footer={
            <>
              <Button variant="outline" onClick={() => setVehicleModalOpen(false)} disabled={submitting}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleSaveVehicle} loading={submitting}>
                Simpan Kendaraan
              </Button>
            </>
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
                label="Kode Panggil (Callsign)"
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                placeholder="Contoh: Foam Tender 01"
                required
              />

              <InputField
                label="Nama Kendaraan / Model"
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                placeholder="Contoh: Oshkosh Striker 3000"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SelectField
                label="Kategori Armada"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={[
                  { value: 'utama', label: 'Armada Utama (Major Fire Vehicle)' },
                  { value: 'pendukung', label: 'Armada Pendukung (Ambulance / Comm)' },
                ]}
                required
              />

              <InputField
                label="Nomor Polisi (Plat Nomor)"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="Contoh: B 9012 PKP"
              />
            </div>

            <TextareaField
              label="Kapasitas & Deskripsi Teknis"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kapasitas tangki air 12.500L, foam 1.500L, dry chemical powder 500kg..."
              rows={3}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
