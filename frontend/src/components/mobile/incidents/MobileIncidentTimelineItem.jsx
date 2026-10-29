import React from 'react';
import { Clock, MapPin, Paperclip, ChevronRight } from 'lucide-react';

export const INCIDENT_PRIORITIES = {
  kritis: {
    label: 'Kritis (Siaga I)',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
  },
  critical: {
    label: 'Kritis (Siaga I)',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
  },
  tinggi: {
    label: 'Tinggi (Siaga II)',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-600',
  },
  high: {
    label: 'Tinggi (Siaga II)',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-600',
  },
  sedang: {
    label: 'Sedang (Siaga III)',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-600',
  },
  medium: {
    label: 'Sedang (Siaga III)',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-600',
  },
  rendah: {
    label: 'Rendah (Info)',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-600',
  },
  low: {
    label: 'Rendah (Info)',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-600',
  },
};

export const INCIDENT_STATUSES = {
  selesai: {
    label: 'Selesai',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  dalam_proses: {
    label: 'Dalam Proses',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  menunggu_tindak_lanjut: {
    label: 'Menunggu Tindak Lanjut',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
  },
};

export default function MobileIncidentTimelineItem({ incident, onClick }) {
  const priorityKey = (incident.priority_level || 'rendah').toLowerCase();
  const priorityMeta = INCIDENT_PRIORITIES[priorityKey] || INCIDENT_PRIORITIES.rendah;

  const statusKey = (incident.status || 'dalam_proses').toLowerCase();
  const statusMeta = INCIDENT_STATUSES[statusKey] || INCIDENT_STATUSES.dalam_proses;

  const timeFormatted = incident.incident_time
    ? (incident.incident_time.length > 5 ? incident.incident_time.slice(0, 5) : incident.incident_time)
    : '--:--';

  const attachmentCount = incident.attachment_count || (incident.attachments?.length || 0);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-2.5 shadow-xs space-y-1.5 cursor-pointer transition-colors duration-100"
    >
      {/* Top line: Report number, time, and priority badge */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-slate-800 text-[10.5px] font-bold">
            {incident.report_number || `INC-${incident.id}`}
          </span>
          <span className="text-[10px] text-slate-400">•</span>
          <span className="font-mono text-red-600 text-[10px] font-bold flex items-center gap-0.5">
            <Clock className="w-3 h-3 text-red-500" />
            {timeFormatted} WIB
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold border flex items-center gap-1 ${priorityMeta.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priorityMeta.dot}`}></span>
            {priorityMeta.label}
          </span>
        </div>
      </div>

      {/* Incident Title */}
      <div className="flex items-start justify-between gap-1">
        <h4 className="font-bold text-slate-900 text-xs leading-snug">
          {incident.title}
        </h4>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
      </div>

      {/* Chronology snippet */}
      <p className="text-[10.5px] text-slate-600 line-clamp-2 leading-snug">
        {incident.chronology}
      </p>

      {/* Footer: Location, aircraft info, status, photo count */}
      <div className="flex items-center justify-between text-[9px] text-slate-500 pt-0.5 border-t border-slate-100">
        <div className="flex items-center gap-2 truncate">
          <span className="flex items-center gap-0.5 font-medium text-slate-700 truncate">
            <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
            <span className="truncate">{incident.location || 'Airside'}</span>
          </span>

          {incident.aircraft_info && (
            <span className="px-1 rounded bg-slate-100 text-slate-700 font-mono text-[8.5px] truncate">
              {incident.aircraft_info}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {attachmentCount > 0 && (
            <span className="flex items-center gap-0.5 text-slate-500 font-semibold text-[8.5px]">
              <Paperclip className="w-2.5 h-2.5" />
              {attachmentCount}
            </span>
          )}

          <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${statusMeta.badge}`}>
            {statusMeta.label}
          </span>
        </div>
      </div>
    </div>
  );
}
