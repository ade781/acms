import pool from '../backend/src/config/db.js';

async function initScheduleTables() {
  try {
    console.log('Creating schedule tables...');

    // 1. Tabel schedule_rosters (untuk override manual per tanggal)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_rosters (
        id INT AUTO_INCREMENT PRIMARY KEY,
        roster_date DATE NOT NULL,
        shift_1_team ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
        shift_2_team ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
        shift_3_team ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
        off_team ENUM('Alpha', 'Bravo', 'Charlie', 'Delta') NOT NULL,
        notes VARCHAR(255) NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_roster_date (roster_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // 2. Tabel system_settings (untuk tanggal anchor patokan)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        setting_key VARCHAR(50) PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Set default anchor_date jika belum ada
    await pool.query(`
      INSERT INTO system_settings (setting_key, setting_value)
      VALUES ('schedule_anchor_date', '2026-10-19')
      ON DUPLICATE KEY UPDATE setting_key = setting_key;
    `);

    console.log('Schedule tables ready!');
    process.exit(0);
  } catch (err) {
    console.error('Error initScheduleTables:', err);
    process.exit(1);
  }
}

initScheduleTables();
