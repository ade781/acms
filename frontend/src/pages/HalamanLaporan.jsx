import React, { useState, useEffect, useCallback } from 'react';
import { Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SHIFT_DEFINITIONS, formatIndoDate, cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import Button from '../components/common/Button';

export default function HalamanLaporan() {
  const {
    activeDate,
    activeShiftNumber,
    activeTeam,
  } = useAuth();

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [shiftData, setShiftData] = useState(null);
  const [deptHeadData, setDeptHeadData] = useState(null);
  const [vehicleIssues, setVehicleIssues] = useState({ current_issues: [], backlog_issues: [], resolved_this_shift: [] });

  const currentDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(activeShiftNumber)) || SHIFT_DEFINITIONS[0];

  const fetchShiftData = useCallback(async () => {
    try {
      const [deployRes, issueRes] = await Promise.all([
        api.get(`/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`),
        api.get(`/reports/vehicle-issues?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`)
      ]);

      if (deployRes.data?.data) {
        const s = deployRes.data.data.shift;
        setShiftData(s);
        if (deployRes.data.data.dept_head) {
          setDeptHeadData(deployRes.data.data.dept_head);
        }
      }

      if (issueRes.data?.data) {
        setVehicleIssues(issueRes.data.data);
      }
    } catch (err) {
      console.error('Fetch shift report preview error:', err);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchShiftData();
  }, [fetchShiftData]);

  const handleExportPDF = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      const res = await api.get(
        `/reports/pdf?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`,
        { responseType: 'blob' }
      );

      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Laporan-Shift-${activeShiftNumber}-${cleanTeam(activeTeam)}-${activeDate}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download PDF error:', err);
      setDownloadError('Gagal mengunduh berkas PDF laporan dinas. Pastikan data shift valid.');
    } finally {
      setDownloading(false);
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
            Laporan Dinas
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExportPDF}
            disabled={downloading}
          >
            {downloading ? 'Membuat PDF...' : 'Unduh PDF'}
          </Button>
        </div>
      </div>

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

      {/* Document Preview Mockup */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto">
        {/* Document Header */}
        <div className="text-center pb-6 border-b-2 border-slate-900 mb-6">
          <h3 className="text-base font-bold uppercase tracking-wider text-slate-900">
            Laporan Kesiapsiagaan Operasional ARFF (Airport Rescue & Fire Fighting)
          </h3>
          <p className="text-xs text-slate-600 mt-1">
            BANDARA INTERNASIONAL | KEMENTERIAN PERHUBUNGAN REPUBLIK INDONESIA
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-700 font-medium">
            <span>Tanggal: <strong>{formatIndoDate(activeDate)}</strong></span>
            <span>|</span>
            <span>Shift: <strong>{currentDef.name} ({currentDef.startTime} s.d. {currentDef.endTime})</strong></span>
            <span>|</span>
            <span>Regu Dinas: <strong>{formatTeam(activeTeam)}</strong></span>
          </div>
        </div>

        {/* Sections Overview */}
        <div className="space-y-6 text-xs text-slate-700">
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              1. Ringkasan Status Kesiapan Armada
            </h4>
            <p className="text-slate-600">
              Pemeriksaan armada dilaksanakan oleh masing-masing Penanggung Jawab (PIC) kendaraan yang ditugaskan pada shift aktif. Data justifikasi kerusakan dan dokumentasi WebP tercatat di sistem monitoring.
            </p>
          </div>

          {/* Tabel Pelacakan Kendala Kendaraan Lintas Shift */}
          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2 flex items-center justify-between">
              <span>2. Pelacakan Kendala & Pemulihan Armada Lintas Shift</span>
              <span className="text-[10px] font-normal text-slate-500 normal-case">
                Audit Trail Handover Status Unit
              </span>
            </h4>

            {(!vehicleIssues.current_issues?.length && !vehicleIssues.backlog_issues?.length && !vehicleIssues.resolved_this_shift?.length) ? (
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
                          {formatIndoDate(iss.shift_date)} (Shift {iss.shift_number} {iss.team_group})<br />
                          <span className="text-slate-500">PIC: {iss.reported_by_name || '-'}</span>
                        </td>
                        <td className="p-2 text-red-700 font-medium">{iss.justification || '-'}</td>
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
                          {formatIndoDate(iss.shift_date)} (Shift {iss.shift_number} {iss.team_group})<br />
                          <span className="text-slate-500">PIC: {iss.reported_by_name || '-'}</span>
                        </td>
                        <td className="p-2 text-amber-800 font-medium">{iss.justification || '-'}</td>
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
                        <td className="p-2 text-slate-600">{iss.justification || 'Perbaikan selesai'}</td>
                        <td className="p-2 text-emerald-800 font-medium">
                          {iss.resolved_at ? new Date(iss.resolved_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}<br />
                          <span className="text-slate-500">Oleh: {iss.resolved_by_name || '-'}</span>
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

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              3. Matriks Penempatan Personel (Ploting Kru)
            </h4>
            <p className="text-slate-600">
              Formulir penugasan kru armada dimulai dari kondisi kosong dan diisi oleh Ketua Regu dengan batas alokasi 3 s.d. 4 personel per kendaraan, termasuk penetapan 1 PIC resmi.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              4. Pengesahan & Validasi Serah Terima Dinas
            </h4>
            <div className="pt-8 flex justify-between items-end">
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
                  <div className="h-14" />
                )}
                <p className="font-bold text-slate-900 underline">
                  {deptHeadData?.name || 'Section Head ARFF'}
                </p>
                {deptHeadData?.nip && deptHeadData.nip !== '-' && (
                  <p className="text-[10px] text-slate-500 font-mono">NIP. {deptHeadData.nip}</p>
                )}
                <p className="text-[10px] text-slate-500">Airport Rescue & Fire Fighting Section Head</p>
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
                  <div className="h-14" />
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
    </div>
  );
}
