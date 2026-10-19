import pool from '../backend/src/config/db.js';

async function migrate() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedule_cycles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        start_date DATE NOT NULL,
        pattern_json LONGTEXT NOT NULL,
        notes VARCHAR(255) NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_start_date (start_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('Successfully created or verified table schedule_cycles');
    process.exit(0);
  } catch (err) {
    console.error('Error migrating schedule_cycles:', err);
    process.exit(1);
  }
}

migrate();
