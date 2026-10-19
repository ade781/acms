import React, { useState } from 'react';
import { FileText, Download, Printer, CheckCircle, Shield, Info, Clock, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SHIFT_DEFINITIONS, formatIndoDate } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function ReportsPage() {
  const {
    activeDate,
    activeShiftNumber,
    activeTeam,
    isSupervisor,
    isAdmin,
  } = useAuth();

  const [comingSoonAlert, setComingSoonAlert] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvedStatus, setApprovedStatus] = useState(false);

  const currentDef = SHIFT_DEFINITIONS.find((s) => s.number === Number(activeShiftNumber)) || SHIFT_DEFINITIONS[0];

  const handleExportPDF = async () => {
    try {
      const res = await api.get(`/reports/pdf?date=${activeDate}&shift=${activeShiftNumber}&team_group=${activeTeam}`);
      if (res.data?.status === 'coming_soon' || res.data?.message) {
        setComingSoonAlert(true);
      }
    } catch {
      // Show elegant coming soon notice
      setComingSoonAlert(true);
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
        canApprove={isSupervisor || isAdmin}
        onApproveShift={handleApproveShift}
        approving={approving}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Pusat Penerbitan Laporan Dinas Harian A4
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kompilasi berita acara kesiapan armada, ploting personel, dan logbook kegiatan per shift dinas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={Printer}
            onClick={handleExportPDF}
          >
            Cetak Dokumen A4
          </Button>
          <Button
            variant="primary"
            icon={Download}
            onClick={handleExportPDF}
          >
            Unduh Laporan PDF
          </Button>
        </div>
      </div>

      {/* Elegant Coming Soon Notice Banner (Section 3 Item 7) */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="pic" size="sm">
                Status: Coming Soon
              </Badge>
              <h3 className="text-sm font-bold text-amber-950">
                Laporan Resmi PDF Format A4 Standar Otoritas Bandara
              </h3>
            </div>
            <p className="text-xs text-amber-900/80 leading-relaxed max-w-3xl">
              Modul generator berkas PDF resmi per shift (lengkap dengan kop dinas bandara, matriks ploting kru, berita acara kesiapan fisik armada, dan tanda tangan digital Ketua Regu) sedang dalam tahap finalisasi layout resmi. Ketua Regu tetap dapat melakukan pengesahan laporan secara digital melalui tombol <strong>"Sahkan Laporan Shift"</strong>.
            </p>
          </div>
        </div>
      </div>

      {comingSoonAlert && (
        <div className="mb-6 p-4 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Info className="w-5 h-5 text-amber-400" />
            <span>
              Fitur Cetak Laporan PDF resmi berstatus <strong>Coming Soon</strong>. Layout dan kop resmi akan disesuaikan pada rilis berikutnya.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setComingSoonAlert(false)}
            className="text-slate-400 hover:text-white font-bold px-2 py-1"
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
            <span>Regu Dinas: <strong>Regu {activeTeam}</strong></span>
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
                <p className="text-slate-500 mb-12">Mengetahui, Chief ARFF</p>
                <p className="font-bold text-slate-900 underline">Ade7 Asli</p>
                <p className="text-[10px] text-slate-500">Operation Chief</p>
              </div>

              <div className="text-center">
                <p className="text-slate-500 mb-12">Ketua Regu Dinas ({activeTeam})</p>
                <p className="font-bold text-slate-900 underline">Supervisor Regu {activeTeam}</p>
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
