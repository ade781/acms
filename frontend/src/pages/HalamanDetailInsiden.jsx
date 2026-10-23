import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Calendar, Clock, MapPin, Plane, CheckCircle2, Shield, Check, X, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function HalamanDetailInsiden() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incident, setIncident] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/incidents/${id}`);
      setIncident(res.data?.incident || res.data);
    } catch (err) {
      console.error('Error fetching incident detail:', err);
      setError('Gagal memuat detail laporan insiden.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleUpdateStatus = async (newStatus) => {
    setUpdating(true);
    setToastMsg(null);
    try {
      await api.put(`/incidents/${id}/status`, { status: newStatus });
      setIncident((prev) => ({ ...prev, status: newStatus }));
      setToastMsg({ type: 'success', text: `Status insiden berhasil diperbarui menjadi "${newStatus === 'selesai' ? 'Selesai' : newStatus}".` });
    } catch (err) {
      setToastMsg({ type: 'error', text: `Gagal memperbarui status: ${err.response?.data?.message || err.message}` });
    } finally {
      setUpdating(false);
    }
  };

  const getPriorityBadge = (lvl) => {
    const l = (lvl || '').toLowerCase();
    if (l === 'kritis' || l === 'critical') return <Badge variant="unserviceable" size="md">Prioritas Kritis (Siaga I)</Badge>;
    if (l === 'tinggi' || l === 'high') return <Badge variant="pending" size="md">Prioritas Tinggi (Siaga II)</Badge>;
    if (l === 'sedang' || l === 'medium') return <Badge variant="info" size="md">Prioritas Sedang</Badge>;
    return <Badge variant="default" size="md">Prioritas Rendah</Badge>;
  };

  return (
    <div>
      {/* Toast Feedback */}
      {toastMsg && (
        <div className={`mb-4 p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
          toastMsg.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center gap-2">
            {toastMsg.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-semibold">{toastMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="p-0.5 opacity-70 hover:opacity-100"
            aria-label="Tutup Notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/incidents')}
        >
          Kembali ke Daftar Insiden
        </Button>

        {incident && incident.status !== 'selesai' && (
          <Button
            variant="success"
            size="sm"
            icon={CheckCircle2}
            loading={updating}
            onClick={() => handleUpdateStatus('selesai')}
          >
            Tandai Selesai Ditangani
          </Button>
        )}
      </div>

      <StateView loading={loading} error={error} onRetry={fetchDetail}>
        {incident && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="font-mono text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
                      {incident.report_number || `INC-${String(incident.id).padStart(4, '0')}`}
                    </span>
                    <Badge variant={`team${cleanTeam(incident.team_group) || 'Alpha'}`} size="md">
                      {formatTeam(incident.team_group || 'Alpha')}
                    </Badge>
                    {getPriorityBadge(incident.priority_level)}
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{incident.title}</h2>
                </div>

                <div className="text-right">
                  <span className={`inline-flex px-3 py-1 rounded-md text-xs font-bold capitalize ${
                    incident.status === 'selesai'
                      ? 'bg-emerald-100 text-emerald-900'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    Status: {incident.status || 'dalam_proses'}
                  </span>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">Tanggal & Jam</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{incident.incident_date} {incident.incident_time}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">Lokasi Peristiwa</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{incident.location || '-'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">Shift Operasional</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Shift #{incident.shift_number || 1}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">Info Pesawat / Armada</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1">
                    <Plane className="w-3.5 h-3.5 text-slate-400" />
                    <span>{incident.aircraft_info || 'Tidak Melibatkan Pesawat'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Narrative & Chronology Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Kronologi Kejadian
                </h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {incident.chronology || '-'}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Tindakan Penanganan Operasional (Firefighting & Rescue)
                </h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {incident.action_taken || 'Belum ada catatan tindakan khusus.'}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Kondisi Terakhir Lokasi
                </h3>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {incident.last_condition || 'Area telah dinyatakan aman terkendali.'}
                </div>
              </div>

              {/* Photo Attachment if available */}
              {incident.attachments && incident.attachments.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Dokumentasi Foto TKP (Format WebP)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {incident.attachments.map((att) => (
                      <div key={att.id} className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                        <img
                          src={att.file_path || att.file_url}
                          alt="Lampiran foto insiden"
                          className="w-full h-48 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </StateView>
    </div>
  );
}
