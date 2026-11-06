import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  AlertCircle,
  Truck,
  Radio,
  Users,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchShiftReportData } from '../services/reportService';
import Button from '../components/common/Button';
import MobilePdfViewerModal from '../components/mobile/reports/MobilePdfViewerModal';

export default function ShiftReportsPage() {
  const { activeDate, activeShiftNumber } = useAuth();
  const abortControllerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

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

  // Fetch data laporan operasional harian terpadu menggunakan activeDate dari Navbar/Auth
  const fetchReportData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setLoading(true);
      setFetchError(null);

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
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      console.error('Fetch daily report error:', err);
      setFetchError('Gagal memuat rekapitulasi laporan harian operasional.');
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

  // Ringkasan metrik harian
  const totalUnits = matrixVehicles.length || 8;
  const s1Present = personnelSummary?.shift_1?.present_count || 0;
  const s2Present = personnelSummary?.shift_2?.present_count || 0;
  const s3Present = personnelSummary?.shift_3?.present_count || 0;
  const totalPresent = s1Present + s2Present + s3Present;
  const totalAbsent =
    (personnelSummary?.shift_1?.absent_count || 0) +
    (personnelSummary?.shift_2?.absent_count || 0) +
    (personnelSummary?.shift_3?.absent_count || 0);

  const currentChiefKey = `shift_${activeShiftNumber || 1}`;
  const activeChief = chiefs[currentChiefKey] || chiefs.shift_1 || chiefs.shift_2 || chiefs.shift_3 || {};
  const activeSupervisorName = activeChief.name || 'Ketua Regu Dinas';
  const activeSupervisorNip = activeChief.nip || null;
  const activeTeamName = roster?.[currentChiefKey] || activeChief.team || `Shift ${activeShiftNumber || 1}`;

  return (
    <div className="space-y-4 font-sans">
      {/* Header Kontrol Dokumen Ringkas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Row: Judul & Tombol Cetak / Pratinjau Surat */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              Laporan Harian Operasional ARFF
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              icon={Eye}
              onClick={() => setIsPdfModalOpen(true)}
              disabled={loading}
            >
              Pratinjau Surat (A4)
            </Button>
          </div>
        </div>

        {/* Bottom Row: Tabular Ledger Strip 2 Kolom Simetris */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 bg-slate-50/60 text-xs">
          {/* 1. Kesiapan Armada & Posko */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Truck className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Armada & Posko</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 font-mono tabular-nums">{totalUnits}</span>{' '}
              <span className="text-slate-600">Unit Operasional</span>
            </div>
          </div>

          {/* 2. Total Personel 3 Shift */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold">Personel (3 Shift)</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-slate-900 font-mono tabular-nums">{totalPresent}</span>{' '}
              <span className="text-slate-600">Hadir</span>
              <span className="ml-1.5 text-xs font-bold">
                {totalAbsent > 0 ? (
                  <span className="text-amber-700">(<span className="font-mono tabular-nums">{totalAbsent}</span> Cuti)</span>
                ) : (
                  <span className="text-emerald-700">(Lengkap)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Error Pemuatan Data */}
      {fetchError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{fetchError}</span>
          </div>
          <button
            type="button"
            onClick={fetchReportData}
            className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 text-xs transition-colors duration-100"
          >
            Muat Ulang Data
          </button>
        </div>
      )}

      {/* =========================================================================
          MATRIKS KESIAPAN ARMADA HARIAN (DAILY READINESS MATRIX)
          Format 5 Kolom: No | Armada | [Regu 1] | [Regu 2] | [Regu 3]
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
            <Truck className="w-4 h-4 text-slate-500" />
            <span>Matriks Kesiapan Armada Operasional & Posko</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Total <strong className="text-slate-800 font-mono tabular-nums">{totalUnits}</strong> Unit Armada & Posko
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f1f5f9] border-b border-[#cbd5e1] text-[#0f172a] font-bold">
                <th className="py-2.5 px-3 text-center w-12">No</th>
                <th className="py-2.5 px-3">Armada</th>
                <th className="py-2.5 px-3 text-center min-w-[120px]">{team1}</th>
                <th className="py-2.5 px-3 text-center min-w-[120px]">{team2}</th>
                <th className="py-2.5 px-3 text-center min-w-[120px]">{team3}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrixVehicles.map((v, idx) => {
                const s1Stat = (v.shift_1?.status || 'belum_dilaporkan').toLowerCase();
                const s2Stat = (v.shift_2?.status || 'belum_dilaporkan').toLowerCase();
                const s3Stat = (v.shift_3?.status || 'belum_dilaporkan').toLowerCase();
                const isPosko = v.category === 'posko' || v.code_name === 'WATCHROOM';

                const renderBadge = (stat) => {
                  if (stat === 'serviceable') {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Serviceable
                      </span>
                    );
                  }
                  if (stat === 'unserviceable') {
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                        Unserviceable
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      Belum Dicek
                    </span>
                  );
                };

                return (
                  <tr
                    key={v.id ?? `v-row-${idx}`}
                    className={`hover:bg-slate-50/70 transition-colors duration-100 ${
                      idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center font-mono tabular-nums text-slate-500 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        {isPosko && <Radio className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        <span className="font-bold text-slate-900">{v.vehicle_name || v.code_name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">{renderBadge(s1Stat)}</td>
                    <td className="py-2.5 px-3 text-center">{renderBadge(s2Stat)}</td>
                    <td className="py-2.5 px-3 text-center">{renderBadge(s3Stat)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          GRID 2 KOLOM SIMETRIS:
          Kiri: Kekuatan Personel Dinas (3 Regu Operasional)
          Kanan: Pejabat Penanggung Jawab & Pengesahan
          Ukuran & padding kedua container disamakan (items-stretch h-full)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* KOLOM KIRI: Kekuatan Personel 3 Regu */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>Kekuatan Personel Dinas (3 Regu Operasional)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
              {[
                { sNum: 1, team: team1, time: '07:00 – 13:00 WIB', data: personnelSummary?.shift_1 },
                { sNum: 2, team: team2, time: '13:00 – 20:00 WIB', data: personnelSummary?.shift_2 },
                { sNum: 3, team: team3, time: '20:00 – 07:00 WIB', data: personnelSummary?.shift_3 },
              ].map((s) => {
                const pData = s.data || {};
                const presentCount = pData.present_count || 0;
                const absentList = Array.isArray(pData.absents) ? pData.absents : [];
                const absentCount = absentList.length;

                return (
                  <div key={`p-box-${s.sNum}`} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs">
                    <span className="font-bold text-slate-900 block text-xs">
                      Shift {s.sNum} — Regu {s.team}
                    </span>
                    <span className="text-slate-500 block text-[11px]">{s.time}</span>
                    <p className="text-emerald-700 font-semibold pt-1">
                      ✓ <span className="font-mono tabular-nums">{presentCount}</span> Hadir
                    </p>
                    {absentCount > 0 ? (
                      <p className="text-red-700 text-[11px] truncate" title={absentList.map((a) => a.full_name).join(', ')}>
                        • <span className="font-mono tabular-nums">{absentCount}</span> Cuti/Izin
                      </p>
                    ) : (
                      <p className="text-slate-500 text-[11px]">Nihil cuti.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* KOLOM KANAN: Pejabat Penanggung Jawab & Pengesahan (Ukuran Identik) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-500" />
                <span>Pejabat Penanggung Jawab & Pengesahan</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
              {/* Supervisor / Ketua Regu */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs">
                <span className="text-slate-500 block text-[11px] font-medium">
                  Supervisor / Ketua Regu (Shift {activeShiftNumber || 1} — Regu {activeTeamName})
                </span>
                <span className="font-bold text-slate-900 block text-xs truncate">
                  {activeSupervisorName}
                </span>
                {activeSupervisorNip && (
                  <span className="text-slate-500 font-mono tabular-nums block text-[11px]">
                    NIP. {activeSupervisorNip}
                  </span>
                )}
                <span className="text-slate-500 block text-[11px] pt-1">
                  Penanggung Jawab Operasional Lapangan
                </span>
              </div>

              {/* Section Head ARFF YIA */}
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-1 text-xs">
                <span className="text-slate-500 block text-[11px] font-medium">Section Head ARFF YIA</span>
                <span className="font-bold text-slate-900 block text-xs truncate">
                  {deptHeadData?.name || 'Section Head ARFF'}
                </span>
                {deptHeadData?.nip && (
                  <span className="text-slate-500 font-mono tabular-nums block text-[11px]">
                    NIP. {deptHeadData.nip}
                  </span>
                )}
                <span className="text-slate-500 block text-[11px] pt-1">
                  Airport Rescue & Fire Fighting Section Head
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL PRATINJAU DOKUMEN RESMI A4 (Native in-app viewer) */}
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
