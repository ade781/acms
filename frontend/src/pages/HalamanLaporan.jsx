import React, { useState } from 'react';
import { FileText, Download, Printer, CheckCircle, Shield, Info, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SHIFT_DEFINITIONS, formatIndoDate, cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

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

  const currentDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(activeShiftNumber)) || SHIFT_DEFINITIONS[0];

  const handleExportPDF = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      const res = await api.get(
        `/reports/pdf?date=${activeDate}&shift=${activeShiftNumber}&team_group=${activeTeam}`,
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
        team_group: activeTeam,
      });
      setApprovedStatus(true);
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
              <div className="text-center">
                <p className="text-slate-500 mb-12">Mengetahui, Dept. Head / Chief ARFF</p>
                <p className="font-bold text-slate-900 underline">TAMSUL SADIKIN</p>
                <p className="text-[10px] text-slate-500 font-mono">NIP. 20240657</p>
                <p className="text-[10px] text-slate-500">Airport Rescue & Fire Fighting Dept. Head</p>
              </div>

              <div className="text-center">
                <p className="text-slate-500 mb-12">Ketua Regu Dinas ({cleanTeam(activeTeam)})</p>
                <p className="font-bold text-slate-900 underline">{user?.name || `Chief ${formatTeam(activeTeam)}`}</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  {user?.nip ? `NIP. ${user.nip}` : 'ARFF Operation Chief'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {approvedStatus ? 'Telah Disahkan Secara Digital' : '(Menunggu Pengesahan)'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
