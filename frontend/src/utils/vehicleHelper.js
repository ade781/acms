import {
  FoamTenderSvg,
  AmbulanceSvg,
  NurseTenderSvg,
  RIVSvg,
  CommandoCarSvg,
  WatchroomSvg,
  DefaultTruckSvg
} from '../components/icons/VehicleSvgIcons';

/**
 * Mengembalikan komponen SVG khusus untuk tipe armada kendaraan ARFF
 * @param {Object} vehicle - Objek kendaraan operasional
 * @returns {React.ComponentType} Komponen SVG Kendaraan
 */
export function getVehicleIcon(vehicle) {
  if (!vehicle) return DefaultTruckSvg;

  const code = (vehicle.code_name || '').toUpperCase().trim();
  const name = (vehicle.vehicle_name || '').toLowerCase().trim();
  const category = (vehicle.category || '').toLowerCase().trim();

  // 1. Posko Komunikasi / Watchroom
  if (
    category === 'posko' ||
    code === 'WATCHROOM' ||
    name.includes('watch') ||
    name.includes('posko') ||
    name.includes('komunikasi')
  ) {
    return WatchroomSvg;
  }

  // 2. Ambulans ARFF / Medis Darurat
  if (
    code.startsWith('AMB') ||
    name.includes('ambulance') ||
    name.includes('ambulan') ||
    name.includes('medis')
  ) {
    return AmbulanceSvg;
  }

  // 3. Nurse Tender / Tangki Pasokan Air & Foam Massal
  if (
    code.startsWith('NT') ||
    name.includes('nurse') ||
    name.includes('water') ||
    name.includes('tangki')
  ) {
    return NurseTenderSvg;
  }

  // 4. Rapid Intervention Vehicle (RIV) / Tanggap Kilat
  if (
    code.startsWith('RIV') ||
    name.includes('rapid') ||
    name.includes('intervention') ||
    name.includes('rescue')
  ) {
    return RIVSvg;
  }

  // 5. Commando Car / Kendaraan Komando Operasi Lapangan
  if (
    code.startsWith('CC') ||
    name.includes('commando') ||
    name.includes('komando') ||
    name.includes('chief') ||
    (name.includes('car') && !name.includes('striker'))
  ) {
    return CommandoCarSvg;
  }

  // 6. Foam Tender / Kendaraan Pemadam Utama Bandara (Crash Fire Tender)
  if (
    code.startsWith('FT') ||
    name.includes('foam') ||
    name.includes('striker') ||
    name.includes('pemadam') ||
    category === 'utama'
  ) {
    return FoamTenderSvg;
  }

  return DefaultTruckSvg;
}

