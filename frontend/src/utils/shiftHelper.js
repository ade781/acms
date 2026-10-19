/**
 * Operational Shift Helper for ARFF
 * Cycle:
 * - Shift 1 (Pagi):  07:00 - 13:00 (6 hours)
 * - Shift 2 (Siang): 13:00 - 20:00 (7 hours)
 * - Shift 3 (Malam): 20:00 - 07:00 (11 hours)
 */

export const TEAMS = ['Alpha', 'Bravo', 'Charlie', 'Delta'];

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
 * Get the current operational shift based on client local time
 * @param {Date} [now=new Date()]
 * @returns {{ shiftNumber: number, shiftDate: string, shiftName: string }}
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

  return {
    shiftNumber,
    shiftDate: dateStr,
    shiftName: def ? def.name : `Shift ${shiftNumber}`,
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
