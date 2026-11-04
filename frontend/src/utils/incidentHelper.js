/**
 * Centralized Single Source of Truth for Incident Classifications, Priorities, and Statuses
 * Sesuai standar operasional ARFF & ICAO (Airport Crash Monitoring & Management System - ACMS)
 */

export const OFFICIAL_INCIDENT_CLASSIFICATIONS = [
  'Aircraft Accident',
  'Aircraft Incident',
  'Kebakaran Gedung atau Terminal',
  'Kebakaran Fasilitas atau Objek Lain di Bandara',
  'Aircraft Go-Around',
  'Hewan Liar atau Wildlife Hazard',
  'Emergency atau Standby Operasional',
  'Temuan Gangguan Fasilitas',
  'Latihan atau Kegiatan Operasional',
  'Kejadian Lainnya',
];

export const PRIORITY_OPTIONS = [
  { value: 'rendah', label: 'Rendah (Penyimpangan Operasional Minor)' },
  { value: 'sedang', label: 'Sedang (Potensi Eskalasi / Respon Terkendali)' },
  { value: 'tinggi', label: 'Tinggi (Siaga II / Insiden Aktif)' },
  { value: 'kritis', label: 'Kritis (Siaga I / Kecelakaan Penerbangan)' },
];

export const INCIDENT_PRIORITIES = {
  kritis: {
    label: 'Kritis (Siaga I)',
    shortLabel: 'Siaga I (Kritis)',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
    badgeVariant: 'unserviceable',
  },
  critical: {
    label: 'Kritis (Siaga I)',
    shortLabel: 'Siaga I (Kritis)',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-600',
    badgeVariant: 'unserviceable',
  },
  tinggi: {
    label: 'Tinggi (Siaga II)',
    shortLabel: 'Siaga II (Tinggi)',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-600',
    badgeVariant: 'pending',
  },
  high: {
    label: 'Tinggi (Siaga II)',
    shortLabel: 'Siaga II (Tinggi)',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    dot: 'bg-orange-600',
    badgeVariant: 'pending',
  },
  sedang: {
    label: 'Sedang (Siaga III)',
    shortLabel: 'Sedang',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-600',
    badgeVariant: 'info',
  },
  medium: {
    label: 'Sedang (Siaga III)',
    shortLabel: 'Sedang',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-600',
    badgeVariant: 'info',
  },
  rendah: {
    label: 'Rendah (Info)',
    shortLabel: 'Rendah',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-600',
    badgeVariant: 'default',
  },
  low: {
    label: 'Rendah (Info)',
    shortLabel: 'Rendah',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-600',
    badgeVariant: 'default',
  },
};

export const INCIDENT_STATUSES = {
  selesai: {
    label: 'Selesai',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  dalam_proses: {
    label: 'Dalam Proses',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  menunggu_tindak_lanjut: {
    label: 'Menunggu Tindak Lanjut',
    badge: 'bg-rose-50 text-rose-800 border-rose-200',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
  },
};

/**
 * Normalisasi dan ekstraksi prioritas insiden dari objek atau string
 */
export function getIncidentPriority(incidentOrPriority) {
  if (!incidentOrPriority) return 'rendah';
  if (typeof incidentOrPriority === 'string') return incidentOrPriority.toLowerCase();
  return (
    incidentOrPriority.priority_level ||
    incidentOrPriority.priority ||
    incidentOrPriority.severity ||
    'rendah'
  ).toLowerCase();
}

/**
 * Normalisasi dan ekstraksi status insiden dari objek atau string
 */
export function getIncidentStatus(incidentOrStatus) {
  if (!incidentOrStatus) return 'dalam_proses';
  if (typeof incidentOrStatus === 'string') return incidentOrStatus.toLowerCase();
  return (incidentOrStatus.status || 'dalam_proses').toLowerCase();
}

export function getPriorityMeta(priority) {
  const key = getIncidentPriority(priority);
  return INCIDENT_PRIORITIES[key] || INCIDENT_PRIORITIES.rendah;
}

export function getStatusMeta(status) {
  const key = getIncidentStatus(status);
  return INCIDENT_STATUSES[key] || INCIDENT_STATUSES.dalam_proses;
}

/**
 * Mengecek apakah prioritas masuk kategori Kritis (Siaga I)
 */
export function isCriticalPriority(incidentOrPriority) {
  const p = getIncidentPriority(incidentOrPriority);
  return p === 'kritis' || p === 'critical';
}

/**
 * Mengecek apakah prioritas masuk kategori Darurat / Siaga (Siaga I Kritis atau Siaga II Tinggi)
 */
export function isEmergencyPriority(incidentOrPriority) {
  const p = getIncidentPriority(incidentOrPriority);
  return p === 'kritis' || p === 'critical' || p === 'tinggi' || p === 'high';
}

/**
 * Mengecek apakah prioritas masuk kategori Tinggi (Siaga II)
 */
export function isHighPriority(incidentOrPriority) {
  const p = getIncidentPriority(incidentOrPriority);
  return p === 'tinggi' || p === 'high';
}

/**
 * Mengecek apakah prioritas masuk kategori Sedang (Siaga III)
 */
export function isMediumPriority(incidentOrPriority) {
  const p = getIncidentPriority(incidentOrPriority);
  return p === 'sedang' || p === 'medium';
}

/**
 * Mengecek apakah prioritas masuk kategori Rendah (Info)
 */
export function isLowPriority(incidentOrPriority) {
  const p = getIncidentPriority(incidentOrPriority);
  return p === 'rendah' || p === 'low';
}

/**
 * Mengecek apakah status insiden masih aktif berjalan
 */
export function isIncidentActive(incidentOrStatus) {
  const s = getIncidentStatus(incidentOrStatus);
  return s === 'dalam_proses' || s === 'menunggu_tindak_lanjut';
}

/**
 * Mengecek apakah status insiden sudah terselesaikan
 */
export function isIncidentResolved(incidentOrStatus) {
  const s = getIncidentStatus(incidentOrStatus);
  return s === 'selesai';
}

/**
 * Menghitung metrik ringkasan insiden secara terpadu dan konsisten
 * antara tampilan Desktop dan Mobile.
 */
export function calculateIncidentStats(incidents = []) {
  const list = Array.isArray(incidents) ? incidents : [];
  const total = list.length;
  const critical = list.filter((i) => isCriticalPriority(i)).length;
  const emergency = list.filter((i) => isEmergencyPriority(i)).length;
  const inProgress = list.filter((i) => isIncidentActive(i)).length;
  const resolved = list.filter((i) => isIncidentResolved(i)).length;
  const activeEmergency = list.filter((i) => isEmergencyPriority(i) && isIncidentActive(i)).length;

  return {
    total,
    critical,
    emergency,
    inProgress,
    resolved,
    activeEmergency,
  };
}
