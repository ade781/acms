import pool from './db.js';

async function migrate() {
  console.log('1. Memperbarui enum category tabel vehicles...');
  await pool.query(`ALTER TABLE vehicles MODIFY COLUMN category ENUM('utama', 'pendukung', 'posko') NOT NULL DEFAULT 'utama'`);
  console.log('✓ Enum category berhasil diperbarui ke: utama, pendukung, posko');

  console.log('2. Memeriksa entri master Watch Room...');
  const [existing] = await pool.query(`SELECT id FROM vehicles WHERE code_name = 'WATCHROOM'`);
  if (existing.length === 0) {
    const [insertRes] = await pool.query(
      `INSERT INTO vehicles (code_name, vehicle_name, category, license_plate, description, is_active)
       VALUES ('WATCHROOM', 'Watch Room', 'posko', '-', 'Posko Komunikasi & Pengamatan Darurat ARFF YIA', 1)`
    );
    console.log(`✓ Master Watch Room berhasil didaftarkan dengan ID: ${insertRes.insertId}`);
  } else {
    console.log(`✓ Master Watch Room sudah terdaftar dengan ID: ${existing[0].id}`);
  }

  const [all] = await pool.query('SELECT id, code_name, vehicle_name, category FROM vehicles');
  console.log('Daftar Unit Operasional Saat Ini:', all);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
