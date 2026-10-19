import bcrypt from 'bcryptjs';
import pool from './db.js';
import { seedPersonnel } from './seedPersonnel.js';

async function seed() {
  console.log('Menjalankan seeder akun admin...');

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

  // Seed 68 data personel resmi 4 regu (Alpha, Bravo, Charlie, Delta)
  await seedPersonnel();

  await pool.end();
}

seed().catch(err => {
  console.error('Seeder gagal:', err);
  process.exit(1);
});
