import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Truck,
  Radio,
  Users,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchShiftReportData } from '../../services/reportService';
import MobilePdfViewerModal from '../../components/mobile/reports/MobilePdfViewerModal';
import MobileSignaturesSection from '../../components/mobile/reports/MobileSignaturesSection';

/**
 * Halaman Rekapitulasi Laporan Harian ARFF YIA (3 Shift) untuk Mobile
 * Dapat diakses oleh Kru dan Chief untuk pemantauan harian terpadu.
 * Menggunakan activeDate dari Navbar secara otomatis.
 */
export default function MobileReports() {
  const { activeDate } = useAuth();
  const abortControllerRef = useRef(null);

  const [errorMessage, setErrorMessage] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data State Laporan Harian
  const [roster, setRoster] = useState({
    shift_1: 'Delta',
    shift_2: 'Charlie',
    shift_3: 'Alpha',
    off_team: 'Bravo',
  });
  const [matrixVehicles, setMatrixVehicles] = useState([]);
  const [personnelSummary, setPersonnelSummary] = useState({});
  const [chiefs, setChiefs] = useState({});
  const [deptHeadData, setDeptHeadData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Fetch seluruh data laporan harian menggunakan activeDate
  const fetchReportData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setErrorMessage(null);

      const data = await fetchShiftReportData({
        date: activeDate,
        signal: controller.signal,
      });

      setRoster(data.roster || { shift_1: 'Delta', shift_2: 'Charlie', shift_3: 'Alpha', off_team: 'Bravo' });
      setMatrixVehicles(data.matrixVehicles || data.vehicles || []);
      setPersonnelSummary(data.personnelSummary || {});
      setChiefs(data.chiefs || {});
      setDeptHeadData(data.deptHeadData);
      setActivities(data.activities || []);
      setIncidents(data.incidents || []);
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ERR_CANCELED') return;
      console.error('Error fetching daily mobile report data:', err);
      setErrorMessage('Gagal memuat rekapitulasi data harian.');
    } finally {
      setLoading(false);
    }
  }, [activeDate]);

  useEffect(() => {
    fetchReportData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchReportData]);

  const team1 = roster?.shift_1 || 'Shift 1';
  const team2 = roster?.shift_2 || 'Shift 2';
  const team3 = roster?.shift_3 || 'Shift 3';

  return (
    <div className="space-y-3 pb-6 font-sans">
      {/* 1. Header Ringkas Mobile */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900 leading-tight">
            Laporan Harian ARFF
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            3 Shift: {team1} • {team2} • {team3}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPdfModalOpen(true)}
          disabled={loading}
          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-colors duration-100 disabled:opacity-50"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Surat A4</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span className="truncate text-xs">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={fetchReportData}
            className="text-xs font-bold text-red-600 hover:text-red-800 underline shrink-0"
          >
            Muat Ulang
          </button>
        </div>
      )}

      {/* 2. Matriks Kesiapan Armada Harian (Mobile Cards - Tanpa Catatan / Kendala) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-slate-500" />
            <span>Kesiapan Armada (Matriks 3 Shift)</span>
          </h3>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            {matrixVehicles.length} Unit
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {matrixVehicles.map((v, idx) => {
            const s1Stat = (v.shift_1?.status || 'belum_dilaporkan').toLowerCase();
            const s2Stat = (v.shift_2?.status || 'belum_dilaporkan').toLowerCase();
            const s3Stat = (v.shift_3?.status || 'belum_dilaporkan').toLowerCase();
            const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';

            const renderBadge = (label, stat) => {
              const isServ = stat === 'serviceable';
              const isUnserv = stat === 'unserviceable';
              return (
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-bold border shrink-0 ${
                    isServ
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : isUnserv
                      ? 'bg-red-50 text-red-800 border-red-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                >
                  {label}: {isServ ? 'Serv' : isUnserv ? 'Unserv' : 'Belum'}
                </span>
              );
            };

            return (
              <div
                key={v.id ?? `v-${idx}`}
                className="py-2.5 first:pt-0 last:pb-0 space-y-1.5"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isPosko && <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  <span className="font-bold text-slate-900 text-xs truncate">
                    {v.vehicle_name || v.code_name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {renderBadge(team1, s1Stat)}
                  {renderBadge(team2, s2Stat)}
                  {renderBadge(team3, s3Stat)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Kekuatan Personel (3 Regu Operasional) */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Personel Dinas (3 Regu Operasional)</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          {[
            { sNum: 1, team: team1, label: 'Shift 1 (Pagi 07:00 – 13:00)', data: personnelSummary?.shift_1 },
            { sNum: 2, team: team2, label: 'Shift 2 (Siang 13:00 – 20:00)', data: personnelSummary?.shift_2 },
            { sNum: 3, team: team3, label: 'Shift 3 (Malam 20:00 – 07:00)', data: personnelSummary?.shift_3 },
          ].map((s) => {
            const pData = s.data || {};
            const presentCount = pData.present_count || 0;
            const absentList = Array.isArray(pData.absents) ? pData.absents : [];
            const absentCount = absentList.length;

            return (
              <div key={`mob-p-${s.sNum}`} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-slate-900">Regu {s.team}</span>
                  <span className="text-xs text-slate-500">{s.label}</span>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <span className="text-emerald-700 font-semibold text-xs">
                    ✓ <span className="font-mono tabular-nums">{presentCount}</span> Hadir
                  </span>
                  {absentCount > 0 ? (
                    <span className="text-red-700 text-xs">
                      • <span className="font-mono tabular-nums">{absentCount}</span> Cuti/Izin
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">• Lengkap</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Pengesahan Pejabat Resmi */}
      <MobileSignaturesSection
        deptHead={deptHeadData}
        chiefs={chiefs}
        shiftDate={activeDate}
        roster={roster}
        isSheet={false}
      />

      {/* Modal Pratinjau Dokumen A4 */}
      <MobilePdfViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        shiftDate={activeDate}
        roster={roster}
        matrixVehicles={matrixVehicles}
        vehicles={matrixVehicles}
        personnelSummary={personnelSummary}
        activities={activities}
        incidents={incidents}
        chiefs={chiefs}
        deptHeadData={deptHeadData}
      />
    </div>
  );
}
