/**
 * Operational Shift Helper for ARFF
 * Cycle:
 * - Shift 1 (Pagi):  07:00 - 13:00 (6 hours)
 * - Shift 2 (Siang): 13:00 - 20:00 (7 hours)
 * - Shift 3 (Malam): 20:00 - 07:00 (11 hours)
 */

export const TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

/**
 * Remove any redundant 'Regu ' prefix from team string to prevent duplicate 'Regu Regu ...'
 * @param {string} team
 * @returns {string} Clean team name, e.g. 'Alpha'
 */
export function cleanTeam(team) {
  if (!team) return '';
  return String(team).replace(/^regu\s+/i, '').trim();
}

/**
 * Consistently format team display name as 'Regu {Team}'
 * @param {string} team
 * @returns {string} Formatted string, e.g. 'Regu Alpha'
 */
export function formatTeam(team) {
  const c = cleanTeam(team);
  return c ? `Regu ${c}` : '';
}

export const SHIFT_DEFINITIONS = [
  {
    number: 1,
    name: 'Shift 1 (Pagi)',
    startTime: '07:00',
    endTime: '13:00',
    durationHours: 6,
    color: 'emerald',
  },
  {
    number: 2,
    name: 'Shift 2 (Siang)',
    startTime: '13:00',
    endTime: '20:00',
    durationHours: 7,
    color: 'amber',
  },
  {
    number: 3,
    name: 'Shift 3 (Malam)',
    startTime: '20:00',
    endTime: '07:00',
    durationHours: 11,
    color: 'indigo',
  },
];

/**
 * Pola Rotasi 4 Regu Berurutan Sesuai Jadwal Dinas:
 * Anchor: 2026-10-19:
 * - Shift 1 (Pagi 07:00 - 13:00) : Alpha
 * - Shift 2 (Siang 13:00 - 20:00): Bravo
 * - Shift 3 (Malam 20:00 - 07:00): Charlie
 * Esok hari (2026-10-20):
 * - Shift 1 (Pagi 07:00 - 13:00) : Delta
 * - Shift 2 (Siang 13:00 - 20:00): Alpha
 * - Shift 3 (Malam 20:00 - 07:00): Bravo
 * dan berputar secara otomatis.
 *
 * @param {string} dateStr Format YYYY-MM-DD
 * @param {number} [shiftNumber=1] 1, 2, atau 3
 * @returns {'Alpha'|'Bravo'|'Charlie'|'Delta'}
 */
export function getScheduledTeam(dateStr, shiftNumber = 1) {
  if (!dateStr) return TEAMS[0];
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);

  // Gunakan UTC date agar konsisten tanpa terpengaruh pergeseran jam lokal
  const targetUtc = Date.UTC(y, m - 1, d);
  const anchorUtc = Date.UTC(2026, 9, 19); // 19 Oktober 2026 = Alpha pada Shift 1

  const diffDays = Math.round((targetUtc - anchorUtc) / (1000 * 60 * 60 * 24));
  const shiftIdx = (Number(shiftNumber) || 1) - 1; // 0, 1, atau 2

  const totalShifts = diffDays * 3 + shiftIdx;
  const teamIdx = ((totalShifts % 4) + 4) % 4;

  return TEAMS[teamIdx];
}

/**
 * Get the current operational shift based on client local time
 * @param {Date} [now=new Date()]
 * @returns {{ shiftNumber: number, shiftDate: string, shiftName: string, scheduledTeam: string }}
 */
export function getCurrentOperationalShift(now = new Date()) {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeVal = hours * 60 + minutes;

  // 07:00 is 420 mins, 13:00 is 780 mins, 20:00 is 1200 mins
  let shiftNumber = 1;
  const shiftDate = new Date(now);

  if (timeVal >= 420 && timeVal < 780) {
    shiftNumber = 1;
  } else if (timeVal >= 780 && timeVal < 1200) {
    shiftNumber = 2;
  } else {
    shiftNumber = 3;
    // If between midnight and 07:00, it belongs to the previous calendar day's night shift
    if (timeVal < 420) {
      shiftDate.setDate(shiftDate.getDate() - 1);
    }
  }

  const year = shiftDate.getFullYear();
  const month = String(shiftDate.getMonth() + 1).padStart(2, '0');
  const day = String(shiftDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const def = SHIFT_DEFINITIONS.find((s) => s.number === shiftNumber);
  const scheduledTeam = getScheduledTeam(dateStr, shiftNumber);

  return {
    shiftNumber,
    shiftDate: dateStr,
    shiftName: def ? def.name : `Shift ${shiftNumber}`,
    scheduledTeam,
  };
}

/**
 * Format date to Indonesian localized string
 * @param {string|Date} dateStr
 */
export function formatIndoDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Alias fungsi dalam Bahasa Indonesia
export const bersihkanNamaRegu = cleanTeam;
export const formatNamaRegu = formatTeam;
export const ambilReguTerjadwal = getScheduledTeam;
export const ambilShiftOperasionalSaatIni = getCurrentOperationalShift;
export const formatTanggalIndonesia = formatIndoDate;
