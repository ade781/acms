import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  HelpCircle,
  Plus,
  Trash2,
  X,
  AlertCircle,
  FileBarChart2,
  AlertTriangle,
  Edit2,
  Edit3,
  ShieldAlert,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam } from '../utils/shiftHelper';
import { getVehicleIcon } from '../utils/vehicleHelper';
import api from '../services/api';
import VehicleReadinessModal from '../components/forms/VehicleReadinessModal';
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

  const getVehicleStatusKey = useCallback((v) => {
    const raw = v.status || v.current_log?.status || 'belum_dilaporkan';
    if (raw === 'serviceable' || raw === 'unserviceable') return raw;
    return 'belum_dilaporkan';
  }, []);

  const getVehicleCategoryKey = useCallback((v) => {
    if (v.category === 'posko' || v.code_name === 'WATCHROOM') return 'posko';
    if (v.category === 'pendukung') return 'pendukung';
    return 'utama';
  }, []);

  const statusSummary = useMemo(() => {
    let serviceableCount = 0;
    let unserviceableCount = 0;
    let belumDicekCount = 0;

    vehicles.forEach((v) => {
      const st = getVehicleStatusKey(v);
      if (st === 'serviceable') serviceableCount++;
      else if (st === 'unserviceable') unserviceableCount++;
      else belumDicekCount++;
    });

    return { serviceableCount, unserviceableCount, belumDicekCount, total: vehicles.length };
  }, [vehicles, getVehicleStatusKey]);

  return (
    <div className="space-y-4 font-sans">
      {/* Toast Feedback */}
      {/* Floating Viewport Toast Notifikasi (Identik dengan DeploymentPage) */}
      {toastMsg && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-white shadow-xl text-xs font-semibold font-sans animate-in fade-in slide-in-from-top-2 duration-150 ${
            toastMsg.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
          }`}
        >
          {toastMsg.type === 'error' ? (
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-white" />
          ) : (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-white" />
          )}
          <span>{typeof toastMsg?.text === 'string' ? toastMsg.text : (toastMsg?.text?.message || 'Pemberitahuan')}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="ml-2 hover:bg-black/20 p-0.5 rounded text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Status Summary (Identik dengan DeploymentPage) */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Kesiapan Armada & Posko
              </h2>
            </div>
          </div>

          <div className="flex items-center justify-between xl:justify-end gap-3 flex-wrap">
            {/* Ringkasan Kelaikan Unit (Murni 3 Kondisi: Belum Dicek, Serviceable, Unserviceable) */}
            <div className="inline-flex items-center divide-x divide-slate-200 rounded-lg bg-slate-50 border border-slate-200 text-xs overflow-hidden">
              <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Unit belum diperiksa PIC pada shift ini">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-slate-500 font-medium">Belum Dicek:</span>
                <span className="font-bold text-slate-900 font-mono tabular-nums">{statusSummary.belumDicekCount}</span>
              </div>
              <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Unit berstatus serviceable (laik)">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-500 font-medium">Serviceable:</span>
                <span className="font-bold text-slate-900 font-mono tabular-nums">{statusSummary.serviceableCount}</span>
              </div>
              <div className="px-2.5 py-1.5 flex items-center gap-1.5" title="Unit berstatus unserviceable (kendala/rusak)">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-slate-500 font-medium">Unserviceable:</span>
                <span className="font-bold text-slate-900 font-mono tabular-nums">{statusSummary.unserviceableCount}</span>
              </div>
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
      </div>

      <StateView
        loading={loading}
        error={error}
        isEmpty={vehicles.length === 0}
        emptyTitle="Belum Ada Unit Operasional"
        emptyDescription="Daftarkan armada operasional terlebih dahulu menggunakan tombol Tambah Armada di atas."
        onRetry={fetchVehicles}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((v) => {
            const isPic = Boolean(user?.personnel_id && Number(v.pic_personnel_id) === Number(user.personnel_id));
            const canInspect = Boolean(isPic || isSupervisor || isAdmin);
            const CardIcon = getVehicleIcon(v);
            const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';
            const log = v.current_log || v;
            const status = getVehicleStatusKey(v);
            const justification = v.justification || log?.justification;
            const notes = v.notes || log?.notes;
            const isCarriedOver = Boolean(v.is_carried_over);
            const lastInspected = v.logged_at || log?.logged_at || v.updated_at || log?.updated_at;

            let formattedTimestamp = null;
            if (lastInspected) {
              try {
                const d = new Date(lastInspected);
                if (!isNaN(d.getTime())) {
                  formattedTimestamp = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
                }
              } catch {
                formattedTimestamp = null;
              }
            }

            const statusConfig = {
              serviceable: {
                label: 'Serviceable',
                icon: CheckCircle2,
                badgeCls: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                cardBorder: 'border-emerald-200',
                iconBg: 'bg-emerald-100 text-emerald-800',
              },
              unserviceable: {
                label: 'Tidak Laik',
                icon: AlertTriangle,
                badgeCls: 'bg-red-50 text-red-800 border-red-200',
                cardBorder: 'border-red-300',
                iconBg: 'bg-red-100 text-red-800',
              },
              belum_dilaporkan: {
                label: 'Belum Dicek',
                icon: HelpCircle,
                badgeCls: 'bg-slate-100 text-slate-700 border-slate-200',
                cardBorder: 'border-slate-200',
                iconBg: 'bg-slate-100 text-slate-700',
              },
            };

            const cfg = statusConfig[status] || statusConfig.belum_dilaporkan;
            const StatusIcon = cfg.icon;

            return (
              <div
                key={v.id || v.vehicle_id}
                className={`bg-white rounded-xl border ${
                  isPic ? 'border-emerald-500' : cfg.cardBorder
                } shadow-sm p-4 sm:p-5 flex flex-col justify-between transition-colors duration-100 hover:border-slate-300`}
              >
                <div>
                  {/* Top Header (Identik dengan DeploymentSlotCard) */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-lg ${
                          isPic ? 'bg-emerald-100 text-emerald-800' : cfg.iconBg
                        } flex items-center justify-center flex-shrink-0`}
                      >
                        <CardIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-base font-bold text-slate-900 leading-tight font-sans truncate">
                            {v.code_name || v.vehicle_name}
                          </h4>
                          {isPic && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans">
                              PIC Anda
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono tabular-nums mt-0.5 truncate">
                          {isPosko ? 'Posko Komunikasi' : (v.license_plate || v.category || 'Armada Utama')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end flex-shrink-0">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditVehicle(v)}
                          title="Ubah Spesifikasi Armada"
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors duration-100 cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {isCarriedOver && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 font-sans">
                          Carry-Over
                        </span>
                      )}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 font-sans ${cfg.badgeCls}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{cfg.label}</span>
                      </span>
                    </div>
                  </div>

                  {/* Assigned PIC indicator */}
                  <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-sans">
                    <span className="text-slate-500 font-medium">Penanggung Jawab (PIC):</span>
                    {v.pic_name ? (
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        <span>{v.pic_name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">Belum Ditentukan</span>
                    )}
                  </div>

                  {/* Justification snippet if unserviceable */}
                  {status === 'unserviceable' && justification && (
                    <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 font-sans">
                      <div className="flex items-center gap-1 font-bold mb-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        <span>Kendala / Kerusakan:</span>
                      </div>
                      <p className="line-clamp-2">{justification}</p>
                    </div>
                  )}

                  {/* Notes if serviceable */}
                  {status === 'serviceable' && notes && (
                    <div className="mt-3 text-xs text-slate-500 line-clamp-1 italic font-sans">
                      Catatan: {notes}
                    </div>
                  )}
                </div>

                {/* Action Area */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 font-sans">
                  {canInspect ? (
                    <Button
                      variant={status === 'unserviceable' ? 'danger' : 'outline'}
                      size="sm"
                      icon={Edit3}
                      onClick={() => setSelectedVehicle(v)}
                      className="w-full"
                    >
                      Input Pemeriksaan / Ubah Kondisi
                    </Button>
                  ) : (
                    <div className="w-full flex items-center justify-between text-xs text-slate-500 py-1">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="font-mono tabular-nums">
                          {formattedTimestamp
                            ? `Inspeksi: ${formattedTimestamp}`
                            : status === 'belum_dilaporkan'
                            ? 'Menunggu inspeksi PIC'
                            : 'Terverifikasi shift aktif'}
                        </span>
                      </span>
                      <span className="text-xs text-slate-400 font-medium font-sans">Mode Pantau</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </StateView>

      {/* Modal Pemeriksaan Fisik Armada & Posko Watchroom */}
      {selectedVehicle && (
        <VehicleReadinessModal
          isOpen={Boolean(selectedVehicle)}
          onClose={() => setSelectedVehicle(null)}
          vehicle={selectedVehicle}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={handleReadinessSuccess}
        />
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
                  { value: 'utama', label: 'Armada Utama' },
                  { value: 'pendukung', label: 'Pendukung' },
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
              placeholder="Catatan spesifikasi atau perlengkapan unit operasional..."
              rows={3}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}
