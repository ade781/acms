import pool from '../config/db.js';
import { successResponse, errorResponse } from '../utils/responseHelper.js';

// Pola rotasi 8 hari standar bawaan ARFF:
// Day 0 & 1: Alpha Malam, Bravo Libur, Charlie Siang, Delta Pagi
// Day 2 & 3: Alpha Libur, Bravo Siang, Charlie Pagi, Delta Malam
// Day 4 & 5: Alpha Siang, Bravo Pagi, Charlie Malam, Delta Libur
// Day 6 & 7: Alpha Pagi, Bravo Malam, Charlie Libur, Delta Siang
const DEFAULT_ROTATION_8_DAYS = [
  { 1: 'Delta', 2: 'Charlie', 3: 'Alpha', off: 'Bravo' },
  { 1: 'Delta', 2: 'Charlie', 3: 'Alpha', off: 'Bravo' },
  { 1: 'Charlie', 2: 'Bravo', 3: 'Delta', off: 'Alpha' },
  { 1: 'Charlie', 2: 'Bravo', 3: 'Delta', off: 'Alpha' },
  { 1: 'Bravo', 2: 'Alpha', 3: 'Charlie', off: 'Delta' },
  { 1: 'Bravo', 2: 'Alpha', 3: 'Charlie', off: 'Delta' },
  { 1: 'Alpha', 2: 'Delta', 3: 'Bravo', off: 'Charlie' },
  { 1: 'Alpha', 2: 'Delta', 3: 'Bravo', off: 'Charlie' },
];

export function calculateDefaultRoster(targetDateStr, anchorDateStr = '2026-10-19', pattern = DEFAULT_ROTATION_8_DAYS) {
  const [ty, tm, td] = targetDateStr.split('-').map(Number);
  const [ay, am, ad] = anchorDateStr.split('-').map(Number);

  const targetUtc = Date.UTC(ty, tm - 1, td);
  const anchorUtc = Date.UTC(ay, am - 1, ad);

  const diffDays = Math.round((targetUtc - anchorUtc) / (1000 * 60 * 60 * 24));
  const normIndex = ((diffDays % 8) + 8) % 8;

  const dayPlan = pattern[normIndex] || DEFAULT_ROTATION_8_DAYS[normIndex];

  const teamDuties = {
    Alpha: 'Libur',
    Bravo: 'Libur',
    Charlie: 'Libur',
    Delta: 'Libur',
  };

  teamDuties[dayPlan[1] || dayPlan.shift_1] = 'Pagi';
  teamDuties[dayPlan[2] || dayPlan.shift_2] = 'Siang';
  teamDuties[dayPlan[3] || dayPlan.shift_3] = 'Malam';

  return {
    shift_1: dayPlan[1] || dayPlan.shift_1,
    shift_2: dayPlan[2] || dayPlan.shift_2,
    shift_3: dayPlan[3] || dayPlan.shift_3,
    off_team: dayPlan.off || dayPlan.off_team,
    team_duties: teamDuties,
  };
}

/**
 * Mengambil daftar siklus pergantian jadwal dari database
 */
async function getStoredCycles() {
  try {
    const [rows] = await pool.query(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'schedule_custom_cycle'`
    );
    if (rows.length > 0 && rows[0].setting_value) {
      const parsed = JSON.parse(rows[0].setting_value);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && parsed.start_date && parsed.pattern) return [parsed];
    }
    return [];
  } catch (err) {
    console.warn('Gagal membaca schedule_custom_cycle dari system_settings:', err.message);
    return [];
  }
}

/**
 * Menghitung roster untuk suatu tanggal dengan memperhatikan siklus yang berlaku
 */
function resolveRosterForDate(targetDateStr, storedCycles, defaultAnchor = '2026-10-19') {
  // Cari siklus yang berlaku (start_date <= targetDateStr) paling dekat
  const activeCycle = storedCycles.find((c) => c.start_date <= targetDateStr);
  if (activeCycle && Array.isArray(activeCycle.pattern) && activeCycle.pattern.length === 8) {
    return calculateDefaultRoster(targetDateStr, activeCycle.start_date, activeCycle.pattern);
  }
  return calculateDefaultRoster(targetDateStr, defaultAnchor, DEFAULT_ROTATION_8_DAYS);
}

export const getMonthlySchedule = async (req, res) => {
  try {
    const today = new Date();
    const year = parseInt(req.query.year, 10) || today.getFullYear();
    const month = parseInt(req.query.month, 10) || (today.getMonth() + 1); // 1-12

    // 1. Ambil anchor_date default dari system_settings
    let anchorDate = '2026-10-19';
    const [settings] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'schedule_anchor_date'"
    );
    if (settings.length > 0 && settings[0].setting_value) {
      anchorDate = settings[0].setting_value;
    }

    // 2. Ambil riwayat siklus 8 hari yang tersimpan
    const storedCycles = await getStoredCycles();

    // 3. Ambil semua override manual untuk bulan ini
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
    overrides.forEach((row) => {
      const dStr = String(row.roster_date).split('T')[0];
      overrideMap.set(dStr, row);
    });

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    // 4. Bangun daftar hari untuk satu bulan
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
          Delta: 'Libur',
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
          team_duties: duties,
        });
      } else {
        const auto = resolveRosterForDate(dateStr, storedCycles, anchorDate);
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
          team_duties: auto.team_duties,
        });
      }
    }

    return successResponse(res, 'Jadwal dinas bulanan berhasil diambil', {
      year,
      month,
      anchor_date: anchorDate,
      active_cycles_count: storedCycles.length,
      days_in_month: daysInMonth,
      schedule,
    });
  } catch (error) {
    console.error('Error getMonthlySchedule:', error);
    return errorResponse(res, 'Gagal memuat jadwal dinas: ' + error.message, 500);
  }
};

/**
 * Mengambil preview 8 hari mulai dari start_date tertentu agar form modal terisi otomatis
 */
export const getScheduleCyclePreview = async (req, res) => {
  try {
    const today = new Date();
    const startDateStr =
      req.query.start_date ||
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    let anchorDate = '2026-10-19';
    const [settings] = await pool.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'schedule_anchor_date'"
    );
    if (settings.length > 0 && settings[0].setting_value) {
      anchorDate = settings[0].setting_value;
    }

    const storedCycles = await getStoredCycles();
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const [sy, sm, sd] = startDateStr.split('-').map(Number);
    const daysPreview = [];

    for (let i = 0; i < 8; i++) {
      const curDate = new Date(sy, sm - 1, sd + i);
      const curY = curDate.getFullYear();
      const curM = String(curDate.getMonth() + 1).padStart(2, '0');
      const curD = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${curY}-${curM}-${curD}`;
      const dayName = dayNames[curDate.getDay()];

      const roster = resolveRosterForDate(dateStr, storedCycles, anchorDate);
      daysPreview.push({
        day_index: i + 1,
        date: dateStr,
        day_name: dayName,
        shift_1: roster.shift_1,
        shift_2: roster.shift_2,
        shift_3: roster.shift_3,
        off_team: roster.off_team,
      });
    }

    return successResponse(res, 'Preview 8 hari siklus rotasi berhasil diambil', {
      start_date: startDateStr,
      days: daysPreview,
    });
  } catch (error) {
    console.error('Error getScheduleCyclePreview:', error);
    return errorResponse(res, 'Gagal mengambil preview siklus jadwal: ' + error.message, 500);
  }
};

/**
 * Menyimpan pergantian jadwal siklus 8 hari ke depan secara keseluruhan
 */
export const saveScheduleCycle = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { start_date, pattern, notes } = req.body;

    if (!start_date || !Array.isArray(pattern) || pattern.length !== 8) {
      connection.release();
      return errorResponse(res, 'Tanggal mulai dan pola 8 hari lengkap wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    const formattedPattern = [];

    for (let i = 0; i < 8; i++) {
      const dayItem = pattern[i];
      const s1 = dayItem.shift_1 || dayItem[1];
      const s2 = dayItem.shift_2 || dayItem[2];
      const s3 = dayItem.shift_3 || dayItem[3];

      if (!validTeams.includes(s1) || !validTeams.includes(s2) || !validTeams.includes(s3)) {
        connection.release();
        return errorResponse(res, `Hari ke-${i + 1}: Nama regu tidak valid`, 400);
      }

      const uniqueCheck = new Set([s1, s2, s3]);
      if (uniqueCheck.size !== 3) {
        connection.release();
        return errorResponse(res, `Hari ke-${i + 1}: Shift 1, 2, dan 3 harus regu yang berbeda`, 400);
      }

      const calculatedOff = validTeams.find((t) => t !== s1 && t !== s2 && t !== s3);
      formattedPattern.push({
        1: s1,
        2: s2,
        3: s3,
        shift_1: s1,
        shift_2: s2,
        shift_3: s3,
        off: calculatedOff,
        off_team: calculatedOff,
      });
    }

    const patternJson = JSON.stringify(formattedPattern);

    const cycleData = {
      start_date,
      pattern: formattedPattern,
      notes: notes || null
    };

    // MULAI TRANSAKSI ATOMIK (Temuan No. 34)
    await connection.beginTransaction();

    await connection.query(
      `INSERT INTO system_settings (setting_key, setting_value)
       VALUES ('schedule_custom_cycle', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(cycleData)]
    );

    // Bersihkan override manual dari start_date ke depan agar pola baru langsung efektif tanpa terhalang override usang
    await connection.query('DELETE FROM schedule_rosters WHERE roster_date >= ?', [start_date]);

    await connection.commit();
    return successResponse(
      res,
      `Pergantian siklus jadwal 8 hari berhasil disimpan dan diterapkan secara keseluruhan mulai ${start_date}.`
    );
  } catch (error) {
    await connection.rollback();
    console.error('Error saveScheduleCycle:', error);
    return errorResponse(res, 'Gagal menyimpan siklus rotasi: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

/**
 * Mereset semua siklus rotasi kustom ke pola bawaan awal (Transaksi Atomik)
 */
export const resetScheduleCycles = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM system_settings WHERE setting_key = 'schedule_custom_cycle'");
    await connection.query('DELETE FROM schedule_rosters');
    await connection.commit();
    return successResponse(res, 'Seluruh jadwal telah dikembalikan ke pola rotasi standar otomatis.');
  } catch (error) {
    await connection.rollback();
    console.error('Error resetScheduleCycles:', error);
    return errorResponse(res, 'Gagal mereset jadwal: ' + error.message, 500);
  } finally {
    connection.release();
  }
};

export const saveScheduleOverride = async (req, res) => {
  try {
    const { roster_date, shift_1_team, shift_2_team, shift_3_team, off_team, notes } = req.body;

    if (!roster_date || !shift_1_team || !shift_2_team || !shift_3_team) {
      return errorResponse(res, 'Tanggal dan regu untuk Shift 1, 2, dan 3 wajib diisi', 400);
    }

    const validTeams = ['Alpha', 'Bravo', 'Charlie', 'Delta'];
    if (!validTeams.includes(shift_1_team) || !validTeams.includes(shift_2_team) || !validTeams.includes(shift_3_team)) {
      return errorResponse(res, 'Nama regu tidak valid', 400);
    }

    let calculatedOff = off_team;
    if (!calculatedOff) {
      calculatedOff = validTeams.find((t) => t !== shift_1_team && t !== shift_2_team && t !== shift_3_team) || 'Bravo';
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
      [roster_date, shift_1_team, shift_2_team, shift_3_team, calculatedOff, notes || null, req.user.id]
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
    return successResponse(res, `Jadwal tanggal ${date} berhasil direset.`);
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
