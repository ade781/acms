import React, { useState, useEffect, useCallback } from 'react';
import { Radio, CheckCircle2, AlertTriangle, Edit3, ShieldAlert, Clock, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import api from '../services/api';
import ShiftHeaderCard from '../components/dashboard/ShiftHeaderCard';
import WatchroomReadinessModal from '../components/forms/WatchroomReadinessModal';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function HalamanKesiapanWatchroom() {
  const {
    user,
    activeDate,
    activeShiftNumber,
    activeTeam,
  } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [log, setLog] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchWatchroomStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentTeam = cleanTeam(activeTeam);
      const res = await api.get(`/readiness/watchroom?date=${activeDate}&shift=${activeShiftNumber}&team_group=${currentTeam}`);
      setLog(res.data?.log || res.data || null);
    } catch (err) {
      console.error('Error fetching watchroom status:', err);
      setError('Gagal memuat status fasilitas watchroom.');
    } finally {
      setLoading(false);
    }
  }, [activeDate, activeShiftNumber, activeTeam]);

  useEffect(() => {
    fetchWatchroomStatus();
  }, [fetchWatchroomStatus]);

  const isServiceable = log?.status === 'serviceable';
  const isUnserviceable = log?.status === 'unserviceable';

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
            Kesiapan Fasilitas & Komunikasi Watchroom
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Penilaian kesiapan operasional ruang pantau, saluran hotline ATC, direct phone, dan sirine darurat
          </p>
        </div>

        <Button
          variant="primary"
          icon={Edit3}
          onClick={() => setModalOpen(true)}
        >
          {log ? 'Ubah Status Watchroom' : 'Input Status Watchroom'}
        </Button>
      </div>

      <StateView loading={loading} error={error} onRetry={fetchWatchroomStatus}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Status Display Card */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isServiceable
                      ? 'bg-emerald-100 text-emerald-800'
                      : isUnserviceable
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Radio className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Kondisi Ruang Pantau (Watchroom)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Shift {activeShiftNumber} | {formatTeam(activeTeam)} | {activeDate}
                  </p>
                </div>
              </div>

              <Badge
                variant={
                  isServiceable
                    ? 'serviceable'
                    : isUnserviceable
                    ? 'unserviceable'
                    : 'pending'
                }
                size="lg"
              >
                {isServiceable ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Serviceable</span>
                  </>
                ) : isUnserviceable ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Unserviceable</span>
                  </>
                ) : (
                  <span>Belum Diperiksa</span>
                )}
              </Badge>
            </div>

            {/* Details & Notes */}
            <div className="mt-5 space-y-4">
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Catatan Fasilitas / Kendala Operasional:
                </h4>
                {log?.notes ? (
                  <div
                    className={`p-4 rounded-lg text-xs leading-relaxed border ${
                      isUnserviceable
                        ? 'bg-red-50 border-red-200 text-red-900'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {isUnserviceable && (
                      <div className="flex items-center gap-1.5 font-bold mb-1.5 text-red-700">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Rincian Gangguan:</span>
                      </div>
                    )}
                    <p>{log.notes}</p>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    Belum ada catatan khusus yang dilaporkan untuk fasilitas watchroom pada shift ini.
                  </p>
                )}
              </div>

              {log?.inspector_name && (
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span>Petugas Pemeriksa: <strong>{log.inspector_name}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* SOP Guidance Sidebar */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Standard Fasilitas Watchroom
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                <span>Saluran langsung (Direct line) Tower ATC & Rescue Coordination Center harus aktif tanpa gangguan kresek.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                <span>Pengujian tombol sirine tanda bahaya gedung (crash bell) wajib dilaksanakan sesuai SOP harian.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                <span>Radio komunikasi Base Station VHF frekuensi ground harus dapat memonitor pergerakan pesawat di maneuvering area.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                <span>Baterai cadangan power backup (UPS) watchroom beroperasi normal.</span>
              </li>
            </ul>
          </div>
        </div>
      </StateView>

      {modalOpen && (
        <WatchroomReadinessModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          logItem={log}
          activeDate={activeDate}
          activeShiftNumber={activeShiftNumber}
          activeTeam={activeTeam}
          onSuccess={fetchWatchroomStatus}
        />
      )}
    </div>
  );
}
