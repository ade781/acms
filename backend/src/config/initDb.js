import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function initDb() {
  const host = process.env.DB_HOST || 'localhost';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'logbuk';
  const port = Number(process.env.DB_PORT) || 3306;

  console.log(`Menghubungkan ke MySQL di ${host}:${port}...`);
  const rootConn = await mysql.createConnection({
    host,
    user,
    password,
    port,
    multipleStatements: true
  });

  await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log(`Database '${database}' terverifikasi.`);
  await rootConn.end();

  const dbConn = await mysql.createConnection({
    host,
    user,
    password,
    database,
    port,
    multipleStatements: true
  });

  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  console.log('Mengeksekusi schema.sql...');
  await dbConn.query(schemaSql);

  const [tables] = await dbConn.query('SHOW TABLES');
  const tableNames = tables.map(row => Object.values(row)[0]);
  console.log(`Inisialisasi tabel sukses! Ditemukan ${tableNames.length} tabel di '${database}':`);
  tableNames.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

  await dbConn.end();
}

initDb().catch(err => {
  console.error('Inisialisasi database gagal:', err);
  process.exit(1);
});
