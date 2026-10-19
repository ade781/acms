import pool from '../config/db.js';
import { successResponse, errorResponse, createdResponse } from '../utils/responseHelper.js';

// Pola rotasi 8 hari ARFF:
// Day 0 & 1: Alpha Malam, Bravo Libur, Charlie Siang, Delta Pagi
// Day 2 & 3: Alpha Libur, Bravo Siang, Charlie Pagi, Delta Malam
// Day 4 & 5: Alpha Siang, Bravo Pagi, Charlie Malam, Delta Libur
// Day 6 & 7: Alpha Pagi, Bravo Malam, Charlie Libur, Delta Siang
export const ROTATION_8_DAYS = [
  { 1: 'Delta', 2: 'Charlie', 3: 'Alpha', off: 'Bravo' },
  { 1: 'Delta', 2: 'Charlie', 3: 'Alpha', off: 'Bravo' },
  { 1: 'Charlie', 2: 'Bravo', 3: 'Delta', off: 'Alpha' },
  { 1: 'Charlie', 2: 'Bravo', 3: 'Delta', off: 'Alpha' },
  { 1: 'Bravo', 2: 'Alpha', 3: 'Charlie', off: 'Delta' },
  { 1: 'Bravo', 2: 'Alpha', 3: 'Charlie', off: 'Delta' },
  { 1: 'Alpha', 2: 'Delta', 3: 'Bravo', off: 'Charlie' },
  { 1: 'Alpha', 2: 'Delta', 3: 'Bravo', off: 'Charlie' },
];

export function calculateDefaultRoster(targetDateStr, anchorDateStr = '2026-10-19') {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [ay, am, ad] = anchorDateStr.split('-').map(Number);

  const targetUtc = Date.UTC(ty, tm - 1, td);
  const anchorUtc = Date.UTC(ay, am - 1, ad);

  const diffDays = Math.round((targetUtc - anchorUtc) / (1000 * 60 * 60 * 24));
  const normIndex = ((diffDays % 8) + 8) % 8;

  const dayPlan = ROTATION_8_DAYS[normIndex];

  const teamDuties = {
    Alpha: 'Libur',
    Bravo: 'Libur',
    Charlie: 'Libur',
    Delta: 'Libur'
  };

  teamDuties[dayPlan[1]] = 'Pagi';
  teamDuties[dayPlan[2]] = 'Siang';
  teamDuties[dayPlan[3]] = 'Malam';

  return {
    shift_1: dayPlan[1],
    shift_2: dayPlan[2],
    shift_3: dayPlan[3],
    off_team: dayPlan.off,
    team_duties: teamDuties
  };
}

export const getMonthlySchedule = async (req, res) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year, 10) || today.getFullYear();
    const month = parseInt(req.query.month, 10) || (today.getMonth() + 1); // 1-12

    // 1. Ambil anchor_date dari system_settings
    let anchorDate = '2026-10-19';
    const [settings] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'schedule_anchor_date'"
    );
    if (settings.length > 0 && settings[0].setting_value) {
      anchorDate = settings[0].setting_value;
    }

    // 2. Ambil semua override manual untuk bulan ini
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const daysInMonth = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [overrides] = await pool.query(
      `SELECT DATE_FORMAT(roster_date, '%Y-%m-%d') as roster_date, shift_1_team, shift_2_team, shift_3_team, off_team, notes
       FROM schedule_rosters
       WHERE roster_date BETWEEN ? AND ?`,
      [startDate, endDate]
    );

    const overrideMap = new Map();
    overrides.forEach(row => {
      const dStr = String(row.roster_date).split('T')[0];
      overrideMap.set(dStr, row);
    });

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // 3. Bangun daftar hari untuk satu bulan
    const schedule = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const jsDate = new Date(year, month - 1, day);
      const dayName = dayNames[jsDate.getDay()];

      if (overrideMap.has(dateStr)) {
        const o = overrideMap.get(dateStr);
        const duties = {
          Alpha: 'Libur',
          Bravo: 'Libur',
          Charlie: 'Libur',
          Delta: 'Libur'
        };
        duties[o.shift_1_team] = 'Pagi';
        duties[o.shift_2_team] = 'Siang';
        duties[o.shift_3_team] = 'Malam';

        schedule.push({
          date: dateStr,
          day,
          day_name: dayName,
          shift_1: o.shift_1_team,
          shift_2: o.shift_2_team,
          shift_3: o.shift_3_team,
          off_team: o.off_team,
          is_override: true,
          notes: o.notes || '',
          team_duties: duties
        });
      } else {
        const auto = calculateDefaultRoster(dateStr, anchorDate);
        schedule.push({
          date: dateStr,
          day,
          day_name: dayName,
          shift_1: auto.shift_1,
          shift_2: auto.shift_2,
          shift_3: auto.shift_3,
          off_team: auto.off_team,
          is_override: false,
          notes: '',
          team_duties: auto.team_duties
        });
      }
    }

    return successResponse(res, 'Jadwal dinas bulanan berhasil diambil', {
      year,
      month,
      anchor_date: anchorDate,
      days_in_month: daysInMonth,
      schedule
    });
  } catch (error) {
    console.error('Error getMonthlySchedule:', error);
    return errorResponse(res, 'Gagal memuat jadwal dinas: ' + error.message, 500);
  }
};

export const saveScheduleOverride = async (req, res) => {
  try {
    const {
      roster_date,
      shift_1_team,
      shift_2_team,
      shift_3_team,
      off_team,
      notes
    } = req.body;

    if (!roster_date || !shift_1_team || !shift_2_team || !shift_3_team) {
      return errorResponse(res, 'Tanggal dan regu untuk Shift 1, 2, dan 3 wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    if (
      !validTeams.includes(shift_1_team) ||
      !validTeams.includes(shift_2_team) ||
      !validTeams.includes(shift_3_team)
    ) {
      return errorResponse(res, 'Nama regu tidak valid', 400);
    }

    // Hitung off_team secara otomatis jika tidak diberikan
    let calculatedOff = off_team;
    if (!calculatedOff) {
      calculatedOff = validTeams.find(t => t !== shift_1_team && t !== shift_2_team && t !== shift_3_team) || 'Bravo';
    }

    await pool.query(
      `INSERT INTO schedule_rosters (
        roster_date, shift_1_team, shift_2_team, shift_3_team, off_team, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        shift_1_team = VALUES(shift_1_team),
        shift_2_team = VALUES(shift_2_team),
        shift_3_team = VALUES(shift_3_team),
        off_team = VALUES(off_team),
        notes = VALUES(notes),
        created_by = VALUES(created_by)`,
      [
        roster_date,
        shift_1_team,
        shift_2_team,
        shift_3_team,
        calculatedOff,
        notes || null,
        req.user.id
      ]
    );

    return successResponse(res, `Jadwal khusus tanggal ${roster_date} berhasil disimpan.`);
  } catch (error) {
    console.error('Error saveScheduleOverride:', error);
    return errorResponse(res, 'Gagal menyimpan penyesuaian jadwal: ' + error.message, 500);
  }
};

export const deleteScheduleOverride = async (req, res) => {
  try {
    const { date } = req.params;
    if (!date) {
      return errorResponse(res, 'Parameter tanggal wajib disertakan', 400);
    }

    await pool.query('DELETE FROM schedule_rosters WHERE roster_date = ?', [date]);
    return successResponse(res, `Jadwal tanggal ${date} berhasil direset ke pola otomatis.`);
  } catch (error) {
    console.error('Error deleteScheduleOverride:', error);
    return errorResponse(res, 'Gagal mereset jadwal: ' + error.message, 500);
  }
};

export const updateAnchorDate = async (req, res) => {
  try {
    const { anchor_date } = req.body;
    if (!anchor_date) {
      return errorResponse(res, 'Tanggal patokan acuan (anchor_date) wajib diisi', 400);
    }

    await pool.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ('schedule_anchor_date', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [anchor_date, anchor_date]
    );

    return successResponse(res, `Tanggal patokan rotasi otomatis berhasil diperbarui ke ${anchor_date}.`);
  } catch (error) {
    console.error('Error updateAnchorDate:', error);
    return errorResponse(res, 'Gagal memperbarui patokan jadwal: ' + error.message, 500);
  }
};
