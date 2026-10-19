import bcrypt from 'bcryptjs';
import pool from './db.js';

async function seed() {
  console.log('Menjalankan seeder akun admin tunggal (tanpa dummy data)...');

  const username = 'aaa';
  const plainPassword = 'aaaaaa';
  const name = 'Ade7 Asli';
  const email = 'admin.ade7@arff.bandara.local';
  const role = 'admin';

  const [existing] = await pool.query('SELECT id, username FROM users WHERE username = ?', [username]);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(plainPassword, salt);

  if (existing.length > 0) {
    await pool.query(
      'UPDATE users SET name = ?, email = ?, password_hash = ?, role = ? WHERE username = ?',
      [name, email, passwordHash, role, username]
    );
    console.log(`Akun admin '${username}' (${name}) berhasil diperbarui.`);
  } else {
    await pool.query(
      'INSERT INTO users (username, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [username, name, email, passwordHash, role]
    );
    console.log(`Akun admin '${username}' (${name}) berhasil dibuat.`);
  }

  // Verifikasi tidak ada data dummy
  const [vehicles] = await pool.query('SELECT COUNT(*) as count FROM vehicles');
  const [personnel] = await pool.query('SELECT COUNT(*) as count FROM personnel');
  console.log(`Pemeriksaan integritas: ${vehicles[0].count} armada, ${personnel[0].count} personel (Sesuai aturan: KOSONG).`);

  await pool.end();
}

seed().catch(err => {
  console.error('Seeder gagal:', err);
  process.exit(1);
});
