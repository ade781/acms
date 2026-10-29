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
 * @param {string|object} team
 * @returns {string} Clean team name, e.g. 'Alpha'
 */
export function cleanTeam(team) {
  if (!team) return '';
  if (typeof team === 'object') {
    const extracted =
      team?.team_group ||
      team?.team ||
      team?.name ||
      team?.label ||
      team?.value ||
      '';
    if (extracted) {
      try {
        return String(extracted).replace(/^regu\s+/i, '').trim();
      } catch {
        return '';
      }
    }
    return '';
  }
  try {
    return String(team).replace(/^regu\s+/i, '').trim();
  } catch {
    return '';
  }
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
 * Pola Rotasi 8 Hari ARFF (Siklus 2 Hari per Tugas):
 * Anchor Patokan: 2026-10-19:
 * - Regu Alpha:   Malam, Malam, Libur, Libur, Siang, Siang, Pagi, Pagi
 * - Regu Bravo:   Libur, Libur, Siang, Siang, Pagi, Pagi, Malam, Malam
 * - Regu Charlie: Siang, Siang, Pagi, Pagi, Malam, Malam, Libur, Libur
 * - Regu Delta:   Pagi,  Pagi,  Malam, Malam, Libur, Libur, Siang, Siang
 */
export const ROTATION_8_DAYS = [
  // Day 0 & 1
  { 1: 'Delta', 2: 'Charlie', 3: 'Alpha', off: 'Bravo' },
  { 1: 'Delta', 2: 'Charlie', 3: 'Alpha', off: 'Bravo' },
  // Day 2 & 3
  { 1: 'Charlie', 2: 'Bravo', 3: 'Delta', off: 'Alpha' },
  { 1: 'Charlie', 2: 'Bravo', 3: 'Delta', off: 'Alpha' },
  // Day 4 & 5
  { 1: 'Bravo', 2: 'Alpha', 3: 'Charlie', off: 'Delta' },
  { 1: 'Bravo', 2: 'Alpha', 3: 'Charlie', off: 'Delta' },
  // Day 6 & 7
  { 1: 'Alpha', 2: 'Delta', 3: 'Bravo', off: 'Charlie' },
  { 1: 'Alpha', 2: 'Delta', 3: 'Bravo', off: 'Charlie' },
];

/**
 * Mengambil jadwal lengkap seluruh regu untuk satu tanggal tertentu
 * @param {string} dateStr Format YYYY-MM-DD
 * @param {string} [anchorDateStr='2026-10-19']
 * @returns {{ shift1: string, shift2: string, shift3: string, offTeam: string, duties: Record<string, string> }}
 */
export function getDailyRoster(dateStr, anchorDateStr = '2026-10-19') {
  if (!dateStr) return { shift1: 'Delta', shift2: 'Charlie', shift3: 'Alpha', offTeam: 'Bravo', duties: {} };

  const [ty, tm, td] = dateStr.split('-').map(Number);
  const [ay, am, ad] = anchorDateStr.split('-').map(Number);

  const targetUtc = Date.UTC(ty, tm - 1, td);
  const anchorUtc = Date.UTC(ay, am - 1, ad);

  const diffDays = Math.round((targetUtc - anchorUtc) / (1000 * 60 * 60 * 24));
  const normIndex = ((diffDays % 8) + 8) % 8;

  const plan = ROTATION_8_DAYS[normIndex];

  const duties = {
    Alpha: 'Libur',
    Bravo: 'Libur',
    Charlie: 'Libur',
    Delta: 'Libur',
  };
  duties[plan[1]] = 'Pagi';
  duties[plan[2]] = 'Siang';
  duties[plan[3]] = 'Malam';

  return {
    shift1: plan[1],
    shift2: plan[2],
    shift3: plan[3],
    offTeam: plan.off,
    duties,
  };
}

/**
 * Mengambil regu yang bertugas pada tanggal dan shift tertentu
 * @param {string} dateStr Format YYYY-MM-DD
 * @param {number} [shiftNumber=1] 1, 2, atau 3
 * @param {string} [anchorDateStr='2026-10-19']
 * @returns {'Alpha'|'Bravo'|'Charlie'|'Delta'}
 */
export function getScheduledTeam(dateStr, shiftNumber = 1, anchorDateStr = '2026-10-19') {
  const roster = getDailyRoster(dateStr, anchorDateStr);
  const sNum = Number(shiftNumber) || 1;
  if (sNum === 1) return roster.shift1;
  if (sNum === 2) return roster.shift2;
  return roster.shift3;
}

/**
 * Get the current operational shift based on client local time normalized to WIB (UTC+7)
 * @param {Date} [now=new Date()]
 * @returns {{ shiftNumber: number, shiftDate: string, shiftName: string, scheduledTeam: string }}
 */
export function getCurrentOperationalShift(now = new Date()) {
  const baseTime = (now instanceof Date && !isNaN(now.getTime())) ? now.getTime() : Date.now();
  // Normalisasi waktu ke WIB (UTC+7)
  const wibDate = new Date(baseTime + 7 * 3600000);

  const hours = wibDate.getUTCHours();
  const minutes = wibDate.getUTCMinutes();
  const timeVal = hours * 60 + minutes;

  // 07:00 is 420 mins, 13:00 is 780 mins, 20:00 is 1200 mins
  let shiftNumber = 1;
  const shiftDate = new Date(wibDate);

  if (timeVal >= 420 && timeVal < 780) {
    shiftNumber = 1;
  } else if (timeVal >= 780 && timeVal < 1200) {
    shiftNumber = 2;
  } else {
    shiftNumber = 3;
    // If between midnight and 07:00, it belongs to the previous calendar day's night shift
    if (timeVal < 420) {
      shiftDate.setUTCDate(shiftDate.getUTCDate() - 1);
    }
  }

  const year = shiftDate.getUTCFullYear();
  const month = String(shiftDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(shiftDate.getUTCDate()).padStart(2, '0');
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
export function formatIndoDate(dateStr, options = null) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const formatOptions = options?.shortMonth
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : options || {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        };
    return d.toLocaleDateString('id-ID', formatOptions);
  } catch {
    return String(dateStr);
  }
}



/**
 * Daftar Jabatan Operasional ARFF YIA riil beserta pemetaan rolenya
 */
export const OPERATIONAL_ROLES = [
  {
    role: 'dept_head',
    rank_position: 'Airport Technology & ARFF Dept. Head',
    label: 'Airport Technology & ARFF Dept. Head',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  {
    role: 'chief',
    rank_position: 'ARFF Operation Chief',
    label: 'ARFF Operation Chief',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  {
    role: 'chief_assistant',
    rank_position: 'ARFF Operation Chief Assistant',
    label: 'ARFF Operation Chief Assistant',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  {
    role: 'senior_firefighter',
    rank_position: 'ARFF Operation Senior Fire Fighter',
    label: 'ARFF Operation Senior Fire Fighter',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  {
    role: 'junior_firefighter',
    rank_position: 'ARFF Operation Junior Fire Fighter',
    label: 'ARFF Operation Junior Fire Fighter',
    badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  },
  {
    role: 'admin',
    rank_position: 'Administrator',
    label: 'Administrasi',
    badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
  },
];

/**
 * Memformat atau menerjemahkan role/jabatan ke nama tampilan yang rapi
 * @param {string|object} roleOrRank
 * @returns {string}
 */
export function formatRoleName(roleOrRank) {
  if (!roleOrRank) return '-';
  if (typeof roleOrRank === 'object') {
    const extracted =
      roleOrRank?.label ||
      roleOrRank?.name ||
      roleOrRank?.rank_position ||
      roleOrRank?.role ||
      '';
    if (!extracted) return '-';
    roleOrRank = extracted;
  }
  let roleStr = '';
  try {
    roleStr = String(roleOrRank);
  } catch {
    return '-';
  }
  const found = OPERATIONAL_ROLES.find(
    (item) => item.role === roleOrRank || item.rank_position.toLowerCase() === roleStr.toLowerCase()
  );
  if (found) return found.label;

  // Backward-compatibility mapping
  if (roleOrRank === 'supervisor') return 'ARFF Operation Chief';
  if (roleOrRank === 'operator') return 'ARFF Operation Junior Fire Fighter';

  return roleStr;
}

/**
 * Memetakan teks jabatan operasional ke kode role
 * @param {string} rank
 * @returns {string}
 */
export function mapRankPositionToRole(rank) {
  if (!rank) return 'junior_firefighter';
  const r = String(rank).trim().toLowerCase();
  if (r.includes('dept. head') || r.includes('dept head') || r.includes('department head') || r.includes('section head')) {
    return 'dept_head';
  }
  if (r.includes('chief assistant') || r.includes('asisten chief') || r.includes('wakil')) {
    return 'chief_assistant';
  }
  if (r.includes('chief') || r.includes('ketua regu')) {
    return 'chief';
  }
  if (r.includes('senior')) {
    return 'senior_firefighter';
  }
  if (r.includes('admin')) {
    return 'admin';
  }
  return 'junior_firefighter';
}
