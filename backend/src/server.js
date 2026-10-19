import dotenv from 'dotenv';
import app from './app.js';
import pool from './config/db.js';

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    // Verifikasi koneksi database MySQL
    const conn = await pool.getConnection();
    console.log(`[Database] Terhubung ke MySQL '${process.env.DB_NAME || 'logbuk'}' dengan sukses.`);
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
