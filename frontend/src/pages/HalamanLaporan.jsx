import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Truck,
  Radio,
  Users,
  Calendar,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  SHIFT_DEFINITIONS,
  formatIndoDate,
  cleanTeam,
  formatTeam,
} from '../utils/shiftHelper';
import api from '../services/api';
import { fetchShiftReportData } from '../services/reportService';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import Button from '../components/common/Button';
import MobileUnitAuditModal from '../components/mobile/reports/MobileUnitAuditModal';

export default function HalamanLaporan() {
  const { activeDate, activeShiftNumber, activeTeam } = useAuth();

  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [downloadSuccess, setDownloadSuccess] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Data State Sesuai Standar Operasional Resmi ARFF YIA
  const [shiftData, setShiftData] = useState(null);
  const [deptHeadData, setDeptHeadData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [watchroomData, setWatchroomData] = useState({});
  const [deployments, setDeployments] = useState([]);
  const [absents, setAbsents] = useState([]);
  const [vehicleIssues, setVehicleIssues] = useState({
    current_issues: [],
    backlog_issues: [],
    resolved_this_shift: [],
  });
  const [activities, setActivities] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // State Modal Audit Trail Kendala Unit Armada
  const [selectedAuditUnit, setSelectedAuditUnit] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);

  const currentDef =
    SHIFT_DEFINITIONS.find((s) => s.number === Number(activeShiftNumber)) ||
    SHIFT_DEFINITIONS[0];

  // Fetch data laporan operasional terpadu (Single Source of Truth)
  const fetchShiftData = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const data = await fetchShiftReportData({
        date: activeDate,
        shift: activeShiftNumber,
        team: activeTeam,
      });

      setShiftData(data.shiftData);
      setDeptHeadData(data.deptHeadData);
      setDeployments(data.deployments);
      setAbsents(data.absents);
      setVehicles(data.vehicles);
      setWatchroomData(data.watchroomData);
      setVehicleIssues(data.vehicleIssues);
      setActivities(data.activities);
      setIncidents(data.incidents);
    } catch (err) {
      console.error('Fetch shift report preview error:', err);
      setFetchError(
        'Gagal memuat pratinjau data operasional shift. Silakan periksa koneksi server atau coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  const handleExportPDF = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      setDownloadSuccess(null);

      const res = await api.get(
        `/reports/pdf?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(
          activeTeam
        )}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute(
        'download',
        `Laporan-Shift-${activeShiftNumber}-${cleanTeam(activeTeam)}-${activeDate}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setDownloadSuccess('Berkas PDF dokumen dinas resmi berhasil diunduh.');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (err) {
      console.error('Download PDF error:', err);
      setDownloadError(
        'Gagal mengunduh berkas PDF laporan dinas. Pastikan data shift valid.'
      );
    } finally {
      setDownloading(false);
    }
  };

  const presentDeployments = deployments.filter((d) => d.deployment_type !== 'absent');

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
            Laporan Operasional Dinas
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Rekapitulasi dinas shift resmi, kelaikan armada, logbook kegiatan, dan arsip dokumen cetak A4.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={RefreshCw}
            onClick={fetchShiftData}
            disabled={loading || downloading}
          >
            {loading ? 'Menyinkron...' : 'Segarkan Data'}
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExportPDF}
            disabled={downloading}
          >
            {downloading ? 'Membuat PDF...' : 'Unduh PDF Resmi'}
          </Button>
        </div>
      </div>

      {/* Banner Error Pemuatan Data */}
      {fetchError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchShiftData}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 text-xs transition-colors"
          >
            Muat Ulang Data
          </button>
        </div>
      )}

      {/* Banner Error Unduh PDF */}
      {downloadError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>{downloadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadError(null)}
            className="text-red-500 hover:text-red-700 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Banner Sukses Unduh PDF */}
      {downloadSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-4 shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setDownloadSuccess(null)}
            className="text-emerald-600 hover:text-emerald-800 font-bold px-2 py-1"
          >
            Tutup
          </button>
        </div>
      )}

      {/* KPI Eksekutif Rekapitulasi Operasional Shift */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto mb-6">
        {/* Kesiapan Armada */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Kesiapan Armada</span>
            <Truck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">
              {vehicles.filter((v) => v.status === 'serviceable').length}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              / {Math.max(vehicles.length, 8)} Siap
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-600">
            {vehicles.filter((v) => v.status === 'unserviceable').length > 0 ? (
              <span className="text-red-600 font-bold">
                {vehicles.filter((v) => v.status === 'unserviceable').length} Unit Kendala
              </span>
            ) : (
              <span className="text-emerald-700 font-bold">100% Siap Operasi</span>
            )}
          </p>
        </div>

        {/* Presensi Personel */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Personel Dinas</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{deployments.length}</span>
            <span className="text-xs text-slate-500 font-medium">Hadir Terploting</span>
          </div>
          <p className="text-[10px] font-medium text-slate-600">
            {absents.length > 0 ? (
              <span className="text-amber-700 font-bold">{absents.length} Izin / Cuti</span>
            ) : (
              <span className="text-emerald-700 font-bold">Nihil Izin / Lengkap</span>
            )}
          </p>
        </div>

        {/* Posko Watchroom */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Watch Room</span>
            <Radio className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold text-slate-900 uppercase">
              {watchroomData?.status === 'serviceable' ? 'Normal Siap' : (watchroomData?.status || 'Siap')}
            </span>
          </div>
          <p className="text-[10px] font-medium text-slate-600 truncate">
            {watchroomData?.notes || 'Fasilitas komunikasi aktif'}
          </p>
        </div>

        {/* Logbook & Insiden */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] font-bold uppercase tracking-wider">Aktivitas & Insiden</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-black text-slate-900">{activities.length}</span>
            <span className="text-xs text-slate-500 font-medium">Giat</span>
            <span className="text-slate-300">|</span>
            <span className="text-xl font-black text-slate-900">{incidents.length}</span>
            <span className="text-xs text-slate-500 font-medium">Insiden</span>
          </div>
          <p className="text-[10px] font-medium text-slate-600">
            {incidents.length > 0 ? (
              <span className="text-red-600 font-bold">{incidents.length} Kejadian Ditangani</span>
            ) : (
              <span className="text-emerald-700 font-bold">Operasional Nihil Insiden</span>
            )}
          </p>
        </div>
      </div>

      {/* Lembar Pratinjau Dokumen Cetak Standar A4 Resmi */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto">
        {/* Kop Dokumen Resmi PT Angkasa Pura Indonesia YIA */}
        <div className="text-center pb-6 border-b-2 border-slate-900 mb-6">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 leading-tight">
            PT ANGKASA PURA INDONESIA
          </h3>
          <p className="text-xs font-bold text-slate-800 leading-tight mt-0.5">
            KANTOR CABANG BANDARA INTERNASIONAL YOGYAKARTA (YIA)
          </p>
          <p className="text-[11px] text-slate-600 font-medium leading-tight mt-0.5">
            AIRPORT RESCUE & FIRE FIGHTING (ARFF) SECTION • KODE WAHI • KATEGORI 8
          </p>

          <div className="mt-4 pt-2 border-t border-slate-200">
            <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide underline">
              LAPORAN OPERASIONAL DINAS SHIFT
            </h4>
            <p className="text-[10px] font-mono text-slate-500 mt-0.5">
              NOMOR: DSR/ARFF-YIA/{activeDate.replace(/-/g, '')}/S{activeShiftNumber}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-700 font-medium bg-slate-50 py-2 px-4 rounded-lg border border-slate-200">
            <span>
              Tanggal: <strong>{formatIndoDate(activeDate)}</strong>
            </span>
            <span>|</span>
            <span>
              Shift:{' '}
              <strong>
                {currentDef.name} ({currentDef.startTime} s.d. {currentDef.endTime} WIB)
              </strong>
            </span>
            <span>|</span>
            <span>
              Regu Dinas: <strong>{formatTeam(activeTeam)}</strong>
            </span>
            <span>|</span>
            <span>
              Ketua Regu:{' '}
              <strong>
                {shiftData?.supervisor_name || `Chief ${formatTeam(activeTeam)}`}
              </strong>
            </span>
          </div>
        </div>

        {/* Isi Bagian Dokumen Resmi */}
        <div className="space-y-6 text-xs text-slate-700">
          {/* BAGIAN 1: Kesiapan Fasilitas Posko & 8 Unit Armada Operasional */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2.5 flex items-center justify-between">
              <span>1. Kesiapan Fasilitas Posko & 8 Unit Armada Operasional</span>
              <span className="text-[10px] font-normal text-slate-500 normal-case">
                Audit Kelaikan Unit
              </span>
            </h4>

            {/* Status Watchroom */}
            <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-slate-600 flex-shrink-0" />
                <span className="font-bold text-slate-900">Watch Room Posko ARFF:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    watchroomData?.status === 'serviceable'
                      ? 'bg-emerald-100 text-emerald-800'
                      : watchroomData?.status === 'unserviceable'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {watchroomData?.status ? watchroomData.status.toUpperCase() : 'BELUM CEK'}
                </span>
              </div>
              <div className="text-slate-600 text-[10.5px]">
                Catatan: {watchroomData?.notes || 'Nihil / Operasional normal'}
              </div>
            </div>

            {/* Tabel 8 Armada */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="p-2 w-10 text-center">No</th>
                    <th className="p-2">Kode & Nama Unit Armada</th>
                    <th className="p-2">Kategori</th>
                    <th className="p-2">Penanggung Jawab (PIC)</th>
                    <th className="p-2 text-center">Kondisi Fisik</th>
                    <th className="p-2">Justifikasi / Catatan Kelaikan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {vehicles.length > 0 ? (
                    vehicles.map((v, idx) => (
                      <tr key={v.id || v.code_name} className="hover:bg-slate-50/60">
                        <td className="p-2 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 font-bold text-slate-900">
                          {v.code_name} - {v.vehicle_name}
                        </td>
                        <td className="p-2 text-slate-600 capitalize">
                          {v.category || 'Utama'}
                        </td>
                        <td className="p-2 font-medium text-slate-800">
                          {v.pic_name || <span className="text-slate-400 italic">Belum Ditunjuk</span>}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAuditUnit(v);
                              setIsAuditModalOpen(true);
                            }}
                            className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] transition-colors duration-100 cursor-pointer shadow-xs ${
                              v.status === 'serviceable'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : v.status === 'unserviceable'
                                ? 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Klik untuk memeriksa audit trail kendala & riwayat pemulihan unit"
                          >
                            {v.status === 'serviceable'
                              ? 'Serviceable'
                              : v.status === 'unserviceable'
                              ? 'Unserviceable (Audit)'
                              : 'Belum Cek'}
                          </button>
                        </td>
                        <td className="p-2 text-slate-600">
                          {v.justification || v.notes || '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-3 text-center text-slate-400 italic">
                        Data kelaikan 8 armada terangkum otomatis setelah inspeksi shift aktif.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BAGIAN 2: Pelacakan Kendala & Pemulihan Armada Lintas Shift */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
              <span>2. Pelacakan Kendala & Pemulihan Armada Lintas Shift</span>
              <span className="text-[10px] font-normal text-slate-500 normal-case">
                Audit Trail Handover Status Unit
              </span>
            </h4>

            {!vehicleIssues.current_issues?.length &&
            !vehicleIssues.backlog_issues?.length &&
            !vehicleIssues.resolved_this_shift?.length ? (
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs">
                ✓ Seluruh armada operasional dalam kondisi prima (Serviceable). Tidak ada kendala unit aktif maupun backlog kerusakan.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-800">
                    <tr>
                      <th className="p-2">Armada</th>
                      <th className="p-2">Awal Kerusakan (Shift / Regu / PIC)</th>
                      <th className="p-2">Justifikasi Kerusakan</th>
                      <th className="p-2">Pemulihan (Resolved)</th>
                      <th className="p-2">Status Terkini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {/* Kendala Shift Ini */}
                    {vehicleIssues.current_issues?.map((iss) => (
                      <tr key={`cur-${iss.id}`} className="bg-red-50/40">
                        <td className="p-2 font-bold text-slate-900">
                          {iss.code_name} - {iss.vehicle_name}
                        </td>
                        <td className="p-2 text-slate-700">
                          {formatIndoDate(iss.shift_date)} (Shift {iss.shift_number} {iss.team_group})
                          <br />
                          <span className="text-slate-500">PIC: {iss.reported_by_name || '-'}</span>
                        </td>
                        <td className="p-2 text-red-700 font-medium">
                          {iss.justification || '-'}
                        </td>
                        <td className="p-2 text-slate-400 italic">Belum dipulihkan</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200 font-bold text-[10px]">
                            Unserviceable (Shift Ini)
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Backlog Shift Sebelumnya */}
                    {vehicleIssues.backlog_issues?.map((iss) => (
                      <tr key={`back-${iss.id}`} className="bg-amber-50/40">
                        <td className="p-2 font-bold text-slate-900">
                          {iss.code_name} - {iss.vehicle_name}
                        </td>
                        <td className="p-2 text-slate-700">
                          {formatIndoDate(iss.shift_date)} (Shift {iss.shift_number} {iss.team_group})
                          <br />
                          <span className="text-slate-500">PIC: {iss.reported_by_name || '-'}</span>
                        </td>
                        <td className="p-2 text-amber-800 font-medium">
                          {iss.justification || '-'}
                        </td>
                        <td className="p-2 text-slate-400 italic">Dalam penanganan teknisi</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px]">
                            Unserviceable (Bawaan Shift Lalu)
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Selesai / Resolved Shift Ini */}
                    {vehicleIssues.resolved_this_shift?.map((iss) => (
                      <tr key={`res-${iss.id}`} className="bg-emerald-50/40">
                        <td className="p-2 font-bold text-slate-900">
                          {iss.code_name} - {iss.vehicle_name}
                        </td>
                        <td className="p-2 text-slate-500">
                          Sebelumnya dilaporkan unserviceable
                        </td>
                        <td className="p-2 text-slate-600">
                          {iss.justification || 'Perbaikan selesai'}
                        </td>
                        <td className="p-2 text-emerald-800 font-medium">
                          {iss.resolved_at
                            ? new Date(iss.resolved_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '-'}
                          <br />
                          <span className="text-slate-500">
                            Oleh: {iss.resolved_by_name || '-'}
                          </span>
                        </td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                            ✓ Serviceable (Telah Pulih)
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* BAGIAN 3: Kekuatan & Distribusi Personel Dinas (Ploting & Presensi) */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              3. Kekuatan & Distribusi Personel Dinas (Ploting Kru & Presensi)
            </h4>
            <div className="space-y-2">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-slate-900">
                  Total Personel Hadir Bertugas: <strong>{presentDeployments.length} Orang</strong>
                  {' | '}
                  Personel Berhalangan / Cuti: <strong>{absents.length} Orang</strong>
                </p>
                {absents.length > 0 ? (
                  <p className="text-red-700 font-medium">
                    Keterangan Berhalangan:{' '}
                    {absents
                      .map(
                        (a) =>
                          `${a.full_name || a.name || 'Personel'} (${(
                            a.absent_reason || a.notes || 'Cuti/Izin'
                          ).toUpperCase()})`
                      )
                      .join(', ')}
                  </p>
                ) : (
                  <p className="text-emerald-700 font-medium">
                    ✓ Seluruh personel terdata hadir dinas lengkap tanpa keterangan izin/cuti.
                  </p>
                )}
              </div>

              {/* Rincian Ploting Kru */}
              {presentDeployments.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                    <thead className="bg-slate-100 font-bold text-slate-800">
                      <tr>
                        <th className="p-2">Nama Personel</th>
                        <th className="p-2">NIP</th>
                        <th className="p-2">Penugasan Operasional</th>
                        <th className="p-2 text-center">Peran Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {presentDeployments.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/60">
                          <td className="p-2 font-bold text-slate-900">
                            {d.full_name || d.name}
                          </td>
                          <td className="p-2 font-mono text-slate-500">
                            {d.nip && d.nip !== '-' ? d.nip : '-'}
                          </td>
                          <td className="p-2 text-slate-700">
                            {d.vehicle_name || d.vehicle_code ? (
                              <span>
                                {d.vehicle_code} - {d.vehicle_name}
                              </span>
                            ) : d.deployment_type === 'watchroom' ? (
                              'Watch Room Posko ARFF'
                            ) : (
                              'Petugas Pendukung'
                            )}
                          </td>
                          <td className="p-2 text-center">
                            {d.is_pic === 1 ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-bold text-[10px]">
                                PIC Unit
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px]">
                                Anggota Kru
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* BAGIAN 4: Rangkaian Kegiatan Dinas Shift (Logbook) */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              4. Rangkaian Kegiatan Dinas Shift (Logbook)
            </h4>
            {activities.length > 0 ? (
              <div className="space-y-1.5 border border-slate-200 rounded-lg p-2.5 bg-slate-50/50">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 text-xs border-b border-slate-100 pb-1 last:border-0 last:pb-0"
                  >
                    <span className="font-mono font-bold text-arff-primary min-w-[70px]">
                      [{act.activity_time ? act.activity_time.substring(0, 5) : '-'} WIB]
                    </span>
                    <span className="font-bold text-slate-900">{act.title}:</span>
                    <span className="text-slate-600">{act.description || '-'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 italic text-xs">
                Belum ada kegiatan dinas rutin yang tercatat pada sesi shift ini.
              </div>
            )}
          </div>

          {/* BAGIAN 5: Rekapitulasi Kejadian & Insiden Operasional */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              5. Rekapitulasi Kejadian & Insiden Operasional (Airside)
            </h4>
            {incidents.length > 0 ? (
              <div className="space-y-2">
                {incidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3 rounded-lg bg-red-50/60 border border-red-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-900">
                        [{inc.report_number || 'INC'}] {inc.title}
                      </span>
                      <span className="text-[10px] font-mono text-red-700">
                        Waktu: {inc.incident_time || '-'} WIB
                      </span>
                    </div>
                    <p className="text-slate-700">
                      <strong>Lokasi:</strong> {inc.location || 'Airside'} |{' '}
                      <strong>Tindakan:</strong> {inc.action_taken || '-'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs font-medium">
                NIHIL — Seluruh operasional penerbangan dan pergerakan sisi udara berlangsung aman, tertib, dan lancar.
              </div>
            )}
          </div>

          {/* BAGIAN 6: Pengesahan & Validasi Serah Terima Dinas */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              6. Pengesahan & Validasi Serah Terima Dinas
            </h4>
            <div className="pt-6 flex justify-between items-end">
              {/* Dept Head / Section Head */}
              <div className="text-center min-w-[200px]">
                <p className="text-slate-500 mb-2">Mengetahui, Section Head ARFF</p>
                {deptHeadData?.signature_url ? (
                  <div className="h-14 flex items-center justify-center my-1">
                    <img
                      src={deptHeadData.signature_url}
                      alt="Tanda Tangan Section Head"
                      className="max-h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-slate-400 italic">
                      [ Tanda Tangan Digital ]
                    </span>
                  </div>
                )}
                <p className="font-bold text-slate-900 underline">
                  {deptHeadData?.name || 'Section Head ARFF'}
                </p>
                {deptHeadData?.nip && deptHeadData.nip !== '-' && (
                  <p className="text-[10px] text-slate-500 font-mono">NIP. {deptHeadData.nip}</p>
                )}
                <p className="text-[10px] text-slate-500">
                  Airport Rescue & Fire Fighting Section Head
                </p>
              </div>

              {/* Ketua Regu Dinas */}
              <div className="text-center min-w-[200px]">
                <p className="text-slate-500 mb-2">Ketua Regu Dinas ({cleanTeam(activeTeam)})</p>
                {shiftData?.supervisor_signature_url ? (
                  <div className="h-14 flex items-center justify-center my-1">
                    <img
                      src={shiftData.supervisor_signature_url}
                      alt="Tanda Tangan Ketua Regu"
                      className="max-h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14 flex items-center justify-center">
                    <span className="text-[10px] font-mono text-slate-400 italic">
                      [ Tanda Tangan Digital ]
                    </span>
                  </div>
                )}
                <p className="font-bold text-slate-900 underline">
                  {shiftData?.supervisor_name || `Chief ${formatTeam(activeTeam)}`}
                </p>
                {shiftData?.supervisor_nip && shiftData.supervisor_nip !== '-' && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIP. {shiftData.supervisor_nip}
                  </p>
                )}
                <p className="text-[10px] text-slate-500">
                  Airport Rescue & Fire Fighting Shift Supervisor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Audit Trail Pelacakan Status Kendala Unit Armada */}
      <MobileUnitAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        unit={selectedAuditUnit}
        vehicleIssues={vehicleIssues}
      />
    </div>
  );
}
