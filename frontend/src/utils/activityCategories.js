import {
  Users,
  Megaphone,
  Truck,
  Wrench,
  Activity,
  Settings,
  Compass,
  AlertTriangle,
} from 'lucide-react';

export const OFFICIAL_ACTIVITY_CATEGORIES = [
  { value: 'serah_terima', label: 'Serah Terima Shift (Handover)' },
  { value: 'apel_briefing', label: 'Apel & Briefing Dinas' },
  { value: 'periksa_armada', label: 'Pemeriksaan Kendaraan & Uji Pancar' },
  { value: 'periksa_peralatan', label: 'Pemeriksaan Alat Operasional & Rescue' },
  { value: 'latihan_drill', label: 'Latihan Fisik & Drill Basah/Kering' },
  { value: 'pemeliharaan', label: 'Pemeliharaan Fasilitas & Kendaraan' },
  { value: 'sosialisasi_keselamatan', label: 'Edukasi & Inspeksi Runway/Apron' },
  { value: 'catatan_kendala', label: 'Catatan Khusus & Hambatan Dinas' },
];

export const getActivityCategoryMeta = (type) => {
  switch (type) {
    case 'serah_terima':
      return {
        icon: Users,
        badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
        nodeBg: 'bg-slate-800 text-white',
        nodeRing: 'ring-slate-100',
        label: 'Serah Terima Shift',
      };
    case 'apel_briefing':
      return {
        icon: Megaphone,
        badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
        nodeBg: 'bg-slate-800 text-white',
        nodeRing: 'ring-slate-100',
        label: 'Apel & Briefing Dinas',
      };
    case 'periksa_armada':
      return {
        icon: Truck,
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
        nodeBg: 'bg-blue-600 text-white',
        nodeRing: 'ring-blue-100',
        label: 'Uji Pancar & Armada',
      };
    case 'periksa_peralatan':
      return {
        icon: Wrench,
        badgeBg: 'bg-blue-50 border-blue-200 text-blue-700',
        nodeBg: 'bg-blue-600 text-white',
        nodeRing: 'ring-blue-100',
        label: 'Pemeriksaan Alat Rescue',
      };
    case 'latihan_drill':
      return {
        icon: Activity,
        badgeBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        nodeBg: 'bg-indigo-600 text-white',
        nodeRing: 'ring-indigo-100',
        label: 'Latihan / Fire Drill',
      };
    case 'pemeliharaan':
      return {
        icon: Settings,
        badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
        nodeBg: 'bg-slate-700 text-white',
        nodeRing: 'ring-slate-100',
        label: 'Pemeliharaan Fasilitas',
      };
    case 'sosialisasi_keselamatan':
      return {
        icon: Compass,
        badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
        nodeBg: 'bg-slate-700 text-white',
        nodeRing: 'ring-slate-100',
        label: 'Inspeksi & Keselamatan',
      };
    case 'catatan_kendala':
      return {
        icon: AlertTriangle,
        badgeBg: 'bg-red-50 border-red-200 text-red-700',
        nodeBg: 'bg-red-600 text-white',
        nodeRing: 'ring-red-100',
        label: 'Catatan & Kendala',
      };
    default:
      return {
        icon: Activity,
        badgeBg: 'bg-slate-100 border-slate-200 text-slate-700',
        nodeBg: 'bg-slate-700 text-white',
        nodeRing: 'ring-slate-100',
        label: 'Kegiatan Operasional',
      };
  }
};
