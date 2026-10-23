import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat variabel lingkungan
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

// Verifikasi integritas konfigurasi keamanan sebelum booting aplikasi (Fail-Fast)
function validateSecurityConfig() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === '') {
    console.error('\x1b[31m[FATAL CONFIG ERROR] JWT_SECRET tidak terdefinisi pada environment variables!\x1b[0m');
    console.error('Server dihentikan demi integritas keamanan. Harap tentukan JWT_SECRET di file .env.');
    process.exit(1);
  }

  const insecureDefaults = [
    'secret',
    'jwt_secret',
    'your_jwt_secret',
    'changeme',
    'default_secret',
    '123456',
    'admin',
    'password'
  ];

  const isProduction = process.env.NODE_ENV === 'production';
  const isWeakSecret = insecureDefaults.includes(jwtSecret.trim().toLowerCase()) || jwtSecret.trim().length < 32;

  if (isProduction && isWeakSecret) {
    console.error('\x1b[31m[FATAL SECURITY ERROR] Pada mode PRODUKSI, JWT_SECRET dilarang menggunakan default/kata sandi lemah dan wajib minimal 32 karakter!\x1b[0m');
    console.error('Server dihentikan demi integritas keamanan. Perbarui JWT_SECRET dengan string acak berkekuatan tinggi (e.g. openssl rand -base64 32).');
    process.exit(1);
  } else if (isWeakSecret) {
    console.warn('\x1b[33m[PERINGATAN KEAMANAN] JWT_SECRET menggunakan kata sandi default atau kurang dari 32 karakter!\x1b[0m');
    console.warn('Untuk lingkungan produksi, wajib menggunakan secret string acak minimal 32 karakter.');
  }
}

validateSecurityConfig();

import app from './app.js';
import pool from './config/db.js';

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Verifikasi koneksi database MySQL
    const conn = await pool.getConnection();
    console.log(`[Database] Terhubung ke MySQL '${process.env.DB_NAME}' dengan sukses.`);
    conn.release();

    app.listen(PORT, () => {
      console.log(`[Server] ARFF Backend API aktif dan berjalan di http://localhost:${PORT}`);
      console.log(`[Server] Endpoint dasar: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('[Server Error] Gagal memulai server:', error.message);
    process.exit(1);
  }
}

startServer();

