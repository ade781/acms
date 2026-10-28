import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Plane,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  User,
  X,
  Camera,
  ExternalLink,
} from 'lucide-react';
import api from '../../../services/api';
import { INCIDENT_PRIORITIES, INCIDENT_STATUSES } from './MobileIncidentTimelineItem';

export default function MobileIncidentDetailModal({
  isOpen,
  onClose,
  incidentId,
  initialIncident = null,
  canManage = false,
  onStatusUpdated,
}) {
  const [incident, setIncident] = useState(initialIncident);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [activePhoto, setActivePhoto] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    if (!isOpen || !incidentId) return;

    let isMounted = true;
    async function fetchDetail() {
      setLoading(true);
      try {
        const res = await api.get(`/incidents/${incidentId}`);
        const data = res.data?.incident || res.data?.data || res.data;
        if (isMounted && data) {
          setIncident(data);
        }
      } catch (err) {
        console.error('Error fetching incident detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [isOpen, incidentId]);

  if (!isOpen) return null;

  const currentInc = incident || initialIncident;
  if (!currentInc) return null;

  const priorityKey = (currentInc.priority_level || 'rendah').toLowerCase();
  const priorityMeta = INCIDENT_PRIORITIES[priorityKey] || INCIDENT_PRIORITIES.rendah;

  const statusKey = (currentInc.status || 'dalam_proses').toLowerCase();
  const statusMeta = INCIDENT_STATUSES[statusKey] || INCIDENT_STATUSES.dalam_proses;

  const timeFormatted = currentInc.incident_time
    ? (currentInc.incident_time.length > 5 ? currentInc.incident_time.slice(0, 5) : currentInc.incident_time)
    : '--:--';

  const attachments = currentInc.attachments || [];

  const handleUpdateStatus = async (newStatus) => {
    setUpdatingStatus(true);
    setToastMsg(null);
    try {
      await api.put(`/incidents/${currentInc.id}/status`, {
        status: newStatus,
      });
      setIncident((prev) => ({ ...prev, status: newStatus }));
      setToastMsg({
        type: 'success',
        text: `✓ Status berhasil diubah ke ${newStatus === 'selesai' ? 'Selesai' : newStatus}.`,
      });
      onStatusUpdated?.();
    } catch (err) {
      const msg = typeof err.response?.data?.message === 'string'
        ? err.response.data.message
        : (typeof err.response?.data === 'string' ? err.response.data : (err?.message || 'Gagal memperbarui status insiden.'));
      setToastMsg({
        type: 'error',
        text: msg,
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3"
        onClick={onClose}
      >
        <div
          className="w-full max-w-[390px] bg-white rounded-2xl border border-slate-200 p-3.5 space-y-2.5 shadow-xl max-h-[90vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${priorityMeta.dot}`}></span>
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide truncate">
                  Rincian Laporan Insiden
                </h4>
                <p className="text-[9px] text-slate-500 font-mono">
                  {currentInc.report_number || `INC-${currentInc.id}`}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 rounded"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 text-xs">
            {/* Toast Feedback */}
            {toastMsg && (
              <div
                className={`p-2 rounded-lg border text-[11px] flex items-center justify-between shadow-xs ${
                  toastMsg.type === 'error'
                    ? 'bg-red-50 border-red-200 text-red-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}
              >
                <span className="font-semibold">
                  {typeof toastMsg.text === 'string' ? toastMsg.text : (toastMsg.text?.message || 'Pemberitahuan')}
                </span>
                <button
                  type="button"
                  onClick={() => setToastMsg(null)}
                  className="p-0.5 text-slate-400 hover:text-slate-700"
                  aria-label="Tutup"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Priority & Status Banner */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80">
              <div className="space-y-0.5">
                <span className="text-[9px] text-slate-500 block">Tingkat Prioritas:</span>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border inline-block ${priorityMeta.badge}`}>
                  {priorityMeta.label}
                </span>
              </div>

              <div className="text-right space-y-0.5">
                <span className="text-[9px] text-slate-500 block">Status Tindak Lanjut:</span>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold border inline-block ${statusMeta.badge}`}>
                  {statusMeta.label}
                </span>
              </div>
            </div>

            {/* Title / Classification */}
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                Klasifikasi Kejadian
              </span>
              <h3 className="font-bold text-slate-900 text-xs leading-snug">
                {currentInc.title}
              </h3>
            </div>

            {/* Time, Date, Location Grid */}
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                <span className="text-[9px] text-slate-500 block">Waktu & Tanggal</span>
                <span className="font-bold text-slate-900 font-mono text-[10.5px] block">
                  {timeFormatted} WIB
                </span>
                <span className="text-[9px] text-slate-500 font-mono block">
                  {currentInc.incident_date}
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-0.5">
                <span className="text-[9px] text-slate-500 block">Lokasi Sisi Udara</span>
                <div className="flex items-center gap-1 font-bold text-slate-900 text-[10.5px]">
                  <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                  <span className="truncate">{currentInc.location || 'Airside'}</span>
                </div>
                {currentInc.aircraft_info && (
                  <span className="text-[9px] text-slate-600 font-mono block truncate">
                    Penerbangan: {currentInc.aircraft_info}
                  </span>
                )}
              </div>
            </div>

            {/* Chronology */}
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wide block">
                Uraian Kronologis Kejadian
              </span>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-[10.5px] text-slate-800 leading-relaxed whitespace-pre-line">
                {currentInc.chronology}
              </div>
            </div>

            {/* Action Taken */}
            {currentInc.action_taken && (
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-700 uppercase tracking-wide block">
                  Tindakan Penanganan Operasional
                </span>
                <div className="p-2 rounded-lg bg-emerald-50/50 border border-emerald-200/80 text-[10.5px] text-emerald-900 leading-relaxed whitespace-pre-line">
                  {currentInc.action_taken}
                </div>
              </div>
            )}

            {/* Last Condition & Coordinated Parties */}
            {(currentInc.last_condition || currentInc.coordinated_parties) && (
              <div className="space-y-1 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[10px] text-slate-700">
                {currentInc.last_condition && (
                  <div>
                    <strong className="text-slate-800">Kondisi Terakhir:</strong>{' '}
                    <span>{currentInc.last_condition}</span>
                  </div>
                )}
                {currentInc.coordinated_parties && (
                  <div>
                    <strong className="text-slate-800">Koordinasi Terkait:</strong>{' '}
                    <span>{currentInc.coordinated_parties}</span>
                  </div>
                )}
              </div>
            )}

            {/* Photo Attachments Gallery */}
            {attachments.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <span className="text-[9.5px] font-bold text-slate-700 block flex items-center gap-1">
                  <Camera className="w-3 h-3 text-red-500" />
                  Foto Bukti Lapangan ({attachments.length})
                </span>

                <div className="grid grid-cols-3 gap-1.5">
                  {attachments.map((att, idx) => (
                    <button
                      key={att.id ?? `att-${idx}`}
                      type="button"
                      onClick={() => setActivePhoto(att.file_path)}
                      className="group relative aspect-square rounded-lg border border-slate-200 bg-slate-100 overflow-hidden hover:opacity-90 transition-opacity duration-100"
                    >
                      <img
                        src={att.file_path}
                        alt={att.file_name || 'Lampiran insiden'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '';
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-100">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Status Control for Chief / Supervisor */}
            {canManage && (
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <span className="text-[9.5px] font-bold text-slate-700 block">
                  Ubah Status Tindak Lanjut:
                </span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    disabled={updatingStatus || currentInc.status === 'dalam_proses'}
                    onClick={() => handleUpdateStatus('dalam_proses')}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-colors duration-100 ${
                      currentInc.status === 'dalam_proses'
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Dalam Proses
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus || currentInc.status === 'selesai'}
                    onClick={() => handleUpdateStatus('selesai')}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-colors duration-100 ${
                      currentInc.status === 'selesai'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Selesai
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus || currentInc.status === 'menunggu_tindak_lanjut'}
                    onClick={() => handleUpdateStatus('menunggu_tindak_lanjut')}
                    className={`py-1.5 px-1 rounded-lg text-[9px] font-bold border transition-colors duration-100 ${
                      currentInc.status === 'menunggu_tindak_lanjut'
                        ? 'bg-rose-100 text-rose-900 border-rose-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tindak Lanjut
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Close Button */}
          <div className="pt-1 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors duration-100"
            >
              Tutup Rincian
            </button>
          </div>
        </div>
      </div>

      {/* Large Image Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-xl overflow-hidden p-2 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="text-xs font-bold text-slate-800">
                Foto Bukti Kejadian
              </span>
              <button
                type="button"
                onClick={() => setActivePhoto(null)}
                className="text-slate-400 hover:text-slate-700 font-bold text-sm px-1"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-hidden rounded bg-slate-100 flex items-center justify-center">
              <img
                src={activePhoto}
                alt="Foto bukti lapangan"
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
            <button
              type="button"
              onClick={() => setActivePhoto(null)}
              className="w-full py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
