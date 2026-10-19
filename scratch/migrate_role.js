import pool from '../backend/src/config/db.js';

async function migrate() {
  try {
    await pool.query("ALTER TABLE users MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'junior_firefighter'");
    console.log('Successfully altered users.role to VARCHAR(50)');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
