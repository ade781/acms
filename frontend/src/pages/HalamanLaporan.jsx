import React, { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SHIFT_DEFINITIONS, formatIndoDate, cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import Button from '../components/common/Button';

export default function HalamanLaporan() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approvedStatus, setApprovedStatus] = useState(false);
  const [shiftData, setShiftData] = useState(null);
  const [deptHeadData, setDeptHeadData] = useState(null);

  const currentDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(activeShiftNumber)) || SHIFT_DEFINITIONS[0];

  const fetchShiftData = useCallback(async () => {
    try {
      const res = await api.get(
        `/deployments/current?date=${activeDate}&shift=${activeShiftNumber}&team_group=${cleanTeam(activeTeam)}`
      );
      if (res.data?.data) {
        const s = res.data.data.shift;
        setShiftData(s);
        setApprovedStatus(Boolean(s && s.status === 'approved'));
        if (res.data.data.dept_head) {
          setDeptHeadData(res.data.data.dept_head);
        }
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

  const handleApproveShift = async () => {
    if (!window.confirm('Sahkan laporan dinas shift ini secara resmi?')) return;
    setApproving(true);
    try {
      await api.post('/deployments/approve', {
        shift_date: activeDate,
        shift_number: activeShiftNumber,
        team_group: cleanTeam(activeTeam),
      });
      setApprovedStatus(true);
      fetchShiftData();
    } catch (err) {
      alert(`Gagal mengesahkan shift: ${err.response?.data?.message || err.message}`);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div>
      <ShiftHeaderCard
        shiftNumber={activeShiftNumber}
        shiftDate={activeDate}
        teamGroup={activeTeam}
        isApproved={approvedStatus}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Laporan Dinas
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!approvedStatus && (isSupervisor || isAdmin) && (
            <Button
              variant="outline"
              icon={CheckCircle}
              onClick={handleApproveShift}
              loading={approving}
              className="text-emerald-700 border-emerald-600 hover:bg-emerald-50"
            >
              Sahkan Laporan Shift
            </Button>
          )}
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

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              2. Matriks Penempatan Personel (Ploting Kru)
            </h4>
            <p className="text-slate-600">
              Formulir penugasan kru armada dimulai dari kondisi kosong dan diisi oleh Ketua Regu dengan batas alokasi 3 s.d. 4 personel per kendaraan, termasuk penetapan 1 PIC resmi.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-1 mb-2">
              3. Pengesahan & Validasi Serah Terima Dinas
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
                {approvedStatus && (shiftData?.supervisor_signature_url || user?.signature_url) ? (
                  <div className="h-14 flex items-center justify-center my-1">
                    <img
                      src={shiftData?.supervisor_signature_url || user?.signature_url}
                      alt="Tanda Tangan Ketua Regu"
                      className="max-h-12 object-contain"
                    />
                  </div>
                ) : (
                  <div className="h-14" />
                )}
                <p className="font-bold text-slate-900 underline">
                  {shiftData?.supervisor_name || user?.name || `Chief ${formatTeam(activeTeam)}`}
                </p>
                {(shiftData?.supervisor_nip || user?.nip) && (
                  <p className="text-[10px] text-slate-500 font-mono">
                    NIP. {shiftData?.supervisor_nip || user.nip}
                  </p>
                )}
                <p className={`text-[10px] font-semibold mt-0.5 ${approvedStatus ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {approvedStatus ? '✓ Telah Disahkan Secara Digital' : '(Menunggu Pengesahan)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
