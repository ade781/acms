import React from 'react';
import { ExternalLink } from 'lucide-react';
import Modal from '../../common/Modal';
import Button from '../../common/Button';
import { formatIndoDate, cleanTeam } from '../../../utils/shiftHelper';

export default function IncidentQuickDetailModal({
  isOpen,
  onClose,
  incident,
  loading = false,
  currentTeam = 'A',
  getAttachmentUrl = (u) => u,
  formatIncidentCategory = (c) => c,
  formatIncidentStatus = (s) => s
}) {
  if (!isOpen || !incident) return null;

  return (
    <Modal
      isOpen={isOpen && Boolean(incident)}
      onClose={onClose}
      title={
        incident
          ? `${incident.report_number} • ${incident.title}`
          : 'Rincian Laporan Insiden'
      }
      subtitle={
        incident
          ? `${formatIndoDate(incident.incident_date)} • Pukul ${String(incident.incident_time || '-').slice(0, 5)} WIB • Regu ${cleanTeam(incident.team_group || currentTeam)}`
          : ''
      }
      maxWidth="max-w-2xl"
      footer={
        <Button variant="outline" onClick={onClose}>
          Tutup
        </Button>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Strip Operasional Ringkas (Anti-Redundansi) */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded">
              {incident.report_number}
            </span>
            <span className="font-semibold text-slate-900">
              {formatIncidentCategory(incident.category)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Lokasi: <strong className="text-slate-800 font-medium">{incident.location || '-'}</strong>
            </span>
            <span
              className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${
                incident.status === 'selesai'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : incident.status === 'menunggu_tindak_lanjut'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {formatIncidentStatus(incident.status)}
            </span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-semibold text-slate-500 mb-1">Kronologi Kejadian</div>
          <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed whitespace-pre-line">
            {incident.chronology || 'Tidak ada catatan kronologi.'}
          </div>
        </div>

        {incident.action_taken && (
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">
              Tindakan Penanganan ARFF
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed whitespace-pre-line">
              {incident.action_taken}
            </div>
          </div>
        )}

        {incident.last_condition && (
          <div>
            <div className="text-[11px] font-semibold text-slate-500 mb-1">Kondisi Terakhir</div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 leading-relaxed">
              {incident.last_condition}
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-2">Memuat lampiran dokumentasi...</div>
        ) : (
          Array.isArray(incident.attachments) &&
          incident.attachments.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-slate-500 mb-1.5">
                Dokumentasi Lapangan ({incident.attachments.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incident.attachments.map((att, idx) => (
                  <img
                    key={att.id || `att-${idx}`}
                    src={getAttachmentUrl(att.file_path || att.file_url)}
                    alt={att.file_name || `Dokumentasi insiden ${idx + 1}`}
                    className="w-full max-h-56 object-contain rounded-lg border border-slate-200 bg-slate-50"
                  />
                ))}
              </div>
            </div>
          )
        )}
        {/* Tautan Navigasi Manajemen Insiden Penuh */}
        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <a
            href="/incidents"
            className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline inline-flex items-center gap-1"
          >
            <span>Buka Manajemen Insiden Lengkap</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </Modal>
  );
}
