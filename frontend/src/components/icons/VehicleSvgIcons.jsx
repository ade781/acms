import React from 'react';

/**
 * Custom SVG Icon untuk Foam Tender (Crash Fire Tender Bandara - Oshkosh Striker)
 * Ciri: Sasis 6x6 kokoh, kabin aerodinamis depan melandai, dan roof turret / water monitor di atap.
 */
export function FoamTenderSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Water Cannon / Roof Monitor Turret */}
      <path d="M12 5h3l3-2h2" />
      <path d="M20 3l1.5-1" />
      <circle cx="12" cy="5" r="1" fill="currentColor" />

      {/* Main Crash Tender Body */}
      <path d="M2 16V9a1 1 0 0 1 1-1h11l4.5 4.5L22 14v2h-2" />
      <path d="M2 16h2" />
      <path d="M8 16h3" />
      <path d="M15 16h1" />
      <path d="M20 16h2" />

      {/* Sloped Windshield */}
      <path d="M14 9l3.5 3.5H20" />

      {/* Equipment Bay Compartment Dividers */}
      <path d="M7 9v7" />
      <path d="M12 9v7" />

      {/* 6x6 Heavy Triple All-Terrain Wheels */}
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.5" fill="currentColor" />
      <circle cx="13" cy="17" r="2" />
      <circle cx="13" cy="17" r="0.5" fill="currentColor" />
      <circle cx="18" cy="17" r="2" />
      <circle cx="18" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom SVG Icon untuk Ambulance ARFF
 * Ciri: Bodi boxy ambulans darurat, lampu sirine atas, dan simbol palang medis (Cross).
 */
export function AmbulanceSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Lightbar Siren */}
      <path d="M8 4h3v2H8z" />

      {/* Patient Cabin & Front Cab */}
      <path d="M3 16V7a1 1 0 0 1 1-1h10v5h3.5L21 13.5V16h-2" />
      <path d="M3 16h1" />
      <path d="M8 16h7" />
      <path d="M19 16h2" />

      {/* Cab Windshield & Door */}
      <path d="M14 11h4l2 3h-6v-3z" />

      {/* Medical Cross Symbol */}
      <path d="M8.5 9v4" strokeWidth="2" />
      <path d="M6.5 11h4" strokeWidth="2" />

      {/* Wheels */}
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.5" fill="currentColor" />
      <circle cx="17" cy="17" r="2" />
      <circle cx="17" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom SVG Icon untuk Nurse Tender (Water & Foam Supply Tanker)
 * Ciri: Tangki silinder besar penampung air/busa di belakang, tetesan air simbolis.
 */
export function NurseTenderSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Tanker Reservoir Body */}
      <path d="M3 8h10a2.5 2.5 0 0 1 2.5 2.5V16H2V9a1 1 0 0 1 1-1z" />
      <path d="M15.5 11h2.5l3 3V16h-2" />
      <path d="M2 16h2" />
      <path d="M8 16h3" />
      <path d="M15 16h1" />
      <path d="M20 16h2" />

      {/* Tank Top Valve & Hose Reel */}
      <path d="M6 6h4v2H6z" />

      {/* Water Droplet Symbol on Tank */}
      <path d="M8 10.5c0-1 1-2 1-2s1 1 1 2a1 1 0 0 1-2 0z" fill="currentColor" />

      {/* Wheels (Heavy Tandem Axle) */}
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.5" fill="currentColor" />
      <circle cx="13" cy="17" r="2" />
      <circle cx="13" cy="17" r="0.5" fill="currentColor" />
      <circle cx="18" cy="17" r="2" />
      <circle cx="18" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom SVG Icon untuk Rapid Intervention Vehicle (RIV)
 * Ciri: Bodi 4x4 tanggap kilat lincah, lightbar cepat, nozzle kimia kering/busa cepat.
 */
export function RIVSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Lightbar Emergency */}
      <path d="M10 5h4v1.5h-4z" />

      {/* Sleek Rapid Rescue Chassis */}
      <path d="M2 16v-5a1 1 0 0 1 1-1h7l3-3.5h4.5l3.5 4.5V16h-2" />
      <path d="M2 16h2" />
      <path d="M8 16h7" />
      <path d="M19 16h2" />

      {/* Front Fast Windshield */}
      <path d="M13 7.5L16 11h4" />

      {/* Quick Roll-up Equipment Door */}
      <path d="M4 11h5v5H4z" />
      <path d="M4 13h5" />

      {/* Wheels */}
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.5" fill="currentColor" />
      <circle cx="17" cy="17" r="2" />
      <circle cx="17" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom SVG Icon untuk Commando Car (Mobil Komando Lapangan ARFF)
 * Ciri: Mobil taktis SUV pimpinan operasional, antena komunikasi, lightbar.
 */
export function CommandoCarSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Tactical Antenna */}
      <path d="M5 8V3" />
      <path d="M4 3h2" />

      {/* Emergency Lightbar */}
      <path d="M10 6h4v1.5h-4z" />

      {/* SUV Command Body */}
      <path d="M3 16V10a1 1 0 0 1 1-1h9l3.5 3.5h3.5l1 3.5H19" />
      <path d="M3 16h1" />
      <path d="M8 16h7" />
      <path d="M19 16h2" />

      {/* Windows Outline */}
      <path d="M6 10h4v2.5H6z" />
      <path d="M11.5 10h2l2.5 2.5h-4.5z" />

      {/* Wheels */}
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.5" fill="currentColor" />
      <circle cx="17" cy="17" r="2" />
      <circle cx="17" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Custom SVG Icon untuk Watch Room / Pusat Komunikasi ARFF
 * Ciri: Menara konsol komunikasi bandara, antena pemancar, dan gelombang sinyal radio.
 */
export function WatchroomSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Tower Observation Cab / Watch Glass */}
      <path d="M4 8h16l-2 5H6L4 8z" />

      {/* Tower Support Structure */}
      <path d="M8 13v8" />
      <path d="M16 13v8" />
      <path d="M8 17h8" />
      <path d="M6 21h12" />

      {/* Central Radio Mast & Beacon */}
      <path d="M12 8V2" />
      <circle cx="12" cy="2" r="1" fill="currentColor" />

      {/* Radio Communication Waves */}
      <path d="M8.5 4a5 5 0 0 1 7 0" />
      <path d="M6.5 2a8 8 0 0 1 11 0" />
    </svg>
  );
}

/**
 * Custom SVG Icon untuk Armada Pendukung Umum / Logistik
 */
export function DefaultTruckSvg({ className = 'w-6 h-6', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M3 16V7a1 1 0 0 1 1-1h10v6h4l3 3v1h-2" />
      <path d="M3 16h1" />
      <path d="M8 16h7" />
      <path d="M19 16h2" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="6" cy="17" r="0.5" fill="currentColor" />
      <circle cx="17" cy="17" r="2" />
      <circle cx="17" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}
