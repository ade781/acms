import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Clock,
  MapPin,
  Plane,
  CheckCircle2,
  Shield,
  Check,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
} from 'lucide-react';
import api from '../services/api';
import { cleanTeam, formatTeam } from '../utils/shiftHelper';
import { useAuth } from '../context/AuthContext';
import StateView from '../components/common/StateView';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import TextareaField from '../components/common/TextareaField';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isChief, isAdmin, isSupervisor } = useAuth();
  const canManage = isChief || isAdmin || isSupervisor || ['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'].includes(user?.role);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incident, setIncident] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  // Modal Penutupan / Selesai Insiden
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [finalActionTaken, setFinalActionTaken] = useState('');
  const [finalLastCondition, setFinalLastCondition] = useState('');

  // Modal Lightbox Foto TKP
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Auto-dismiss toast feedback 3.5 detik
  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => {
        setToastMsg(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // Keyboard navigation untuk Lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      else if (e.key === 'ArrowLeft') {
        setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'ArrowRight') {
        setActivePhotoIndex((prev) => {
          const list = incident?.attachments || [];
          return prev < list.length - 1 ? prev + 1 : prev;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, incident]);

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

  const handleOpenResolveModal = () => {
    setFinalActionTaken(incident?.action_taken || '');
    setFinalLastCondition(incident?.last_condition || 'Area telah dinyatakan aman terkendali.');
    setResolveModalOpen(true);
  };

  const handleConfirmResolve = async () => {
    setUpdating(true);
    setToastMsg(null);
    try {
      await api.put(`/incidents/${id}/status`, {
        status: 'selesai',
        action_taken: finalActionTaken.trim() || undefined,
        last_condition: finalLastCondition.trim() || undefined,
      });
      setIncident((prev) => ({
        ...prev,
        status: 'selesai',
        action_taken: finalActionTaken.trim() || prev?.action_taken,
        last_condition: finalLastCondition.trim() || prev?.last_condition,
      }));
      setResolveModalOpen(false);
      setToastMsg({ type: 'success', text: '✓ Status insiden berhasil diperbarui menjadi Selesai.' });
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

        {canManage && incident && incident.status !== 'selesai' && (
          <Button
            variant="success"
            size="sm"
            icon={CheckCircle2}
            loading={updating}
            onClick={handleOpenResolveModal}
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

              {/* Info Asal Informasi & Koordinasi Terkait (Jika Ada) */}
              {(incident.source_info || incident.coordinated_parties) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Asal Informasi (ATC / Sisi Udara)</span>
                    <div className="font-semibold text-slate-800">
                      {incident.source_info || '-'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Pihak yang Dikoordinasikan</span>
                    <div className="font-semibold text-slate-800">
                      {incident.coordinated_parties || '-'}
                    </div>
                  </div>
                </div>
              )}
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
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Dokumentasi Foto TKP ({incident.attachments.length} Foto)
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Klik foto untuk membuka Lightbox resolusi penuh
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {incident.attachments.map((att, idx) => (
                      <div
                        key={att.id || idx}
                        onClick={() => {
                          setActivePhotoIndex(idx);
                          setLightboxOpen(true);
                        }}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-video cursor-pointer hover:border-slate-400 transition-colors duration-100 shadow-xs"
                      >
                        <img
                          src={att.file_path || att.file_url}
                          alt={`Dokumentasi foto TKP ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-100 flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                          <Eye className="w-4 h-4" />
                          <span>Perbesar Foto</span>
                        </div>
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white font-mono">
                          Foto #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </StateView>

      {/* Modal Konfirmasi Selesai Insiden */}
      {resolveModalOpen && (
        <Modal
          isOpen={resolveModalOpen}
          onClose={() => setResolveModalOpen(false)}
          title="Konfirmasi Penutupan Laporan Insiden"
          subtitle={`Nomor Laporan: ${incident?.report_number || `INC-${incident?.id}`}`}
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setResolveModalOpen(false)}
                disabled={updating}
              >
                Batal
              </Button>
              <Button
                variant="success"
                onClick={handleConfirmResolve}
                loading={updating}
              >
                Konfirmasi Selesai Ditangani
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Pastikan seluruh aksi penanggulangan darurat telah tuntas dan area kejadian telah dinyatakan aman (All Clear). Lengkapi catatan penanganan akhir berikut:
            </p>

            <TextareaField
              label="Tindakan Akhir Penanganan Operasional (Firefighting & Rescue)"
              value={finalActionTaken}
              onChange={(e) => setFinalActionTaken(e.target.value)}
              placeholder="Jelaskan tindakan pemadaman akhir, evakuasi korban, proteksi bahan bakar..."
              rows={3}
              required
            />

            <TextareaField
              label="Kondisi Terakhir TKP / Runway / Apron"
              value={finalLastCondition}
              onChange={(e) => setFinalLastCondition(e.target.value)}
              placeholder="Contoh: Area telah dibersihkan dari FOD/ceceran bahan bakar, operasi penerbangan normal kembali."
              rows={2}
              required
            />
          </div>
        </Modal>
      )}

      {/* Modal Lightbox Foto TKP Resolusi Penuh */}
      {lightboxOpen && incident?.attachments && incident.attachments.length > 0 && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 flex flex-col justify-between p-4 sm:p-6">
          {/* Top Bar Lightbox */}
          <div className="flex items-center justify-between text-white z-10 w-full max-w-6xl mx-auto pb-2 border-b border-slate-700/60">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold bg-slate-800 px-2.5 py-1 rounded text-red-400 border border-slate-700">
                Foto {activePhotoIndex + 1} / {incident.attachments.length}
              </span>
              <span className="text-xs text-slate-300 hidden sm:inline truncate max-w-md">
                {incident.title} • {incident.incident_date}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <a
                href={incident.attachments[activePhotoIndex]?.file_path || incident.attachments[activePhotoIndex]?.file_url}
                download={`foto_tkp_${incident.report_number || incident.id}_${activePhotoIndex + 1}.webp`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white font-medium border border-slate-700 transition-colors duration-100"
                title="Unduh Berkas Asli"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Unduh Asli</span>
              </a>

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white border border-slate-700 transition-colors duration-100"
                title="Tutup (Esc)"
                aria-label="Tutup Lightbox"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Photo Display with Navigation Arrows */}
          <div className="relative flex-1 flex items-center justify-center py-4 w-full max-w-6xl mx-auto overflow-hidden">
            {/* Prev Button */}
            {incident.attachments.length > 1 && (
              <button
                type="button"
                disabled={activePhotoIndex === 0}
                onClick={() => setActivePhotoIndex((p) => Math.max(0, p - 1))}
                className="absolute left-2 sm:left-4 z-20 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors duration-100 border border-slate-700 shadow-lg"
                title="Foto Sebelumnya (Panah Kiri)"
                aria-label="Foto Sebelumnya"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Photo Image */}
            <div className="max-h-[75vh] max-w-full flex items-center justify-center p-2">
              <img
                src={
                  incident.attachments[activePhotoIndex]?.file_path ||
                  incident.attachments[activePhotoIndex]?.file_url
                }
                alt={`Dokumentasi foto TKP resolusi penuh ${activePhotoIndex + 1}`}
                className="max-h-[72vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
              />
            </div>

            {/* Next Button */}
            {incident.attachments.length > 1 && (
              <button
                type="button"
                disabled={activePhotoIndex >= incident.attachments.length - 1}
                onClick={() =>
                  setActivePhotoIndex((p) =>
                    Math.min(incident.attachments.length - 1, p + 1)
                  )
                }
                className="absolute right-2 sm:right-4 z-20 p-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700 text-white disabled:opacity-30 disabled:pointer-events-none transition-colors duration-100 border border-slate-700 shadow-lg"
                title="Foto Selanjutnya (Panah Kanan)"
                aria-label="Foto Selanjutnya"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          {incident.attachments.length > 1 && (
            <div className="flex items-center justify-center gap-2 overflow-x-auto py-2 z-10 max-w-4xl mx-auto">
              {incident.attachments.map((att, idx) => (
                <button
                  key={att.id || idx}
                  type="button"
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative rounded-md overflow-hidden h-12 w-16 shrink-0 border-2 transition-colors duration-100 ${
                    idx === activePhotoIndex
                      ? 'border-red-500 shadow-md'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={att.file_path || att.file_url}
                    alt={`Thumbnail ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
