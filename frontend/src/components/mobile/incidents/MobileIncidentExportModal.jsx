import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  FileText,
  Download,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import api from '../../../services/api';

export default function MobileIncidentExportModal({ isOpen, onClose }) {
  const [period, setPeriod] = useState('1month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    startDate: '',
    endDate: '',
    stats: { total: 0, selesai: 0, dalam_proses: 0, menunggu_tindak_lanjut: 0, kritis: 0 },
    incidents: [],
  });

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/incidents/summary-report', {
        params: { period },
      });
      const resData = res.data?.data || res.data;
      if (resData) {
        setData(resData);
      }
    } catch (err) {
      console.error('Error fetching mobile incident summary:', err);
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memuat ringkasan rekapitulasi.'));
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, fetchSummary]);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    const token = localStorage.getItem('arff_token') || localStorage.getItem('token') || '';
    const pdfUrl = `/api/incidents/summary-report/pdf?period=${period}&token=${encodeURIComponent(token)}`;
    window.open(pdfUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-red-100 text-red-600">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900 leading-tight">
                Rekapitulasi Insiden ARFF YIA
              </h4>
              <p className="text-[10px] text-slate-500 font-medium">
                Periode: {data.startDate || '-'} s.d. {data.endDate || '-'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors duration-100"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body Scrollable */}
        <div className="p-3.5 space-y-3 overflow-y-auto text-xs">
          {/* Preset Buttons */}
          <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-[10.5px] font-semibold">
            {[
              { id: '1month', label: '1 Bulan' },
              { id: '3months', label: '3 Bulan' },
              { id: '1year', label: '1 Tahun' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`flex-1 py-1 rounded-md text-center transition-colors duration-100 ${
                  period === p.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                <span>Total Insiden</span>
                <FileText className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="text-xl font-black text-slate-900 mt-0.5">
                {data.stats?.total || 0}
              </div>
            </div>

            <div className="bg-red-50/60 p-2.5 rounded-xl border border-red-200 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-red-600 font-bold uppercase">
                <span>Siaga I / Kritis</span>
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              </div>
              <div className="text-xl font-black text-red-700 mt-0.5">
                {data.stats?.kritis || 0}
              </div>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-amber-700 font-bold uppercase">
                <span>Dalam Proses</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-800 mt-0.5">
                {(data.stats?.dalam_proses || 0) + (data.stats?.menunggu_tindak_lanjut || 0)}
              </div>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
              <div className="flex items-center justify-between text-[10px] text-emerald-700 font-bold uppercase">
                <span>Selesai</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-800 mt-0.5">
                {data.stats?.selesai || 0}
              </div>
            </div>
          </div>

          {/* List Ringkas Kejadian */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
              Daftar Kejadian ({data.incidents?.length || 0})
            </span>

            {loading ? (
              <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-red-600" />
                <span>Memuat data rekapitulasi...</span>
              </div>
            ) : error ? (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-center">
                {typeof error === 'string' ? error : (error?.message || 'Gagal memuat ringkasan rekapitulasi.')}
              </div>
            ) : data.incidents?.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                Nihil. Tidak ada catatan insiden pada periode ini.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[36vh] overflow-y-auto pr-0.5">
                {data.incidents.map((inc, incIdx) => (
                  <div
                    key={inc.id ?? `inc-${incIdx}`}
                    className="p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors duration-100 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-red-600">
                          {inc.report_number || `INC-${inc.id}`}
                        </span>
                        <span className="text-[9.5px] text-slate-400">
                          • {inc.incident_date}
                        </span>
                      </div>
                      <h5 className="font-semibold text-slate-800 text-[11px] truncate mt-0.5">
                        {inc.title}
                      </h5>
                      <p className="text-[10px] text-slate-500 truncate">
                        {inc.location || 'Area Bandara'} • {inc.aircraft_info || 'Non-Pesawat'}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        inc.status === 'selesai'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inc.status === 'dalam_proses'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {inc.status === 'selesai' ? 'SELESAI' : 'PROSES'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={handleDownloadPdf}
            className="w-full py-2 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors duration-100"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Unduh PDF Resmi</span>
          </button>
        </div>
      </div>
    </div>
  );
}
