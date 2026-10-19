import bcrypt from 'bcryptjs';
import pool from './db.js';

export const USERNAME_MAP = {
  // Alpha
  'M. OSCAR AVIANTO': 'oscar',
  'RUDY SETYAWAN P': 'rudy',
  'DIMAS INDRA K': 'dimas',
  'DONY SETIAWAN': 'dony',
  'AHMAD NIZAR CATUR P': 'nizar',
  'DANAR PUTRA D.': 'danar',
  'DIANA HERY SETIAWAN': 'diana',
  'JOHAN ASEP S.': 'johan',
  'ERWIN NUR H.': 'erwin',
  'FAIZ RAFIQI': 'faiz',
  'FITRIANA GHANIY M.': 'fitriana',
  'WISNU PAMUNGKAS': 'wisnu',
  'ADIKA PRASETIYA': 'adika',
  'M. IKHSANUDIN': 'ikhsan',
  'TITOK YULIANTO': 'titok',
  'DANANG ARFIANSYAH': 'danang.alpha',
  'YUNA PRIYANA': 'yuna',

  // Bravo
  'HASAR FITRAKUSUMA': 'hasar',
  'ARDIAN': 'ardian',
  'RULIAWAN HALIM': 'ruliawan',
  'THOMAS DONNY S.': 'thomas',
  'KUKUH TRI PUTRANTO': 'kukuh.bravo',
  'BAGOES SUKARNO': 'bagoes',
  'TITUS DWI P.': 'titus',
  'SHOLIKIN TRI NUR CAHYO': 'sholikin',
  'DEDI MAHARDIKA': 'dedi.bravo',
  'BONGGA ZUNIANTA': 'bongga',
  'M. BAGAS SAYUTI': 'bagas',
  'DANANG B.': 'danang.bravo',
  'WISENO AJI': 'wiseno',
  'BANGKIT ALVIANTO': 'bangkit',
  'RETAMA AGUNG R.': 'retama',
  'FARIS WISNU C.': 'faris',
  'BAYU CHAIRUL N.B.': 'bayu',

  // Charlie
  'ENDAR PRASETYO': 'endar',
  'HARI MUKTI C.P': 'hari',
  'KUKUH PRABOWO I.': 'kukuh.charlie',
  'WAHYU ADHY D.': 'wahyu.charlie',
  'APRILIANTO ADI S.': 'aprilianto',
  'JOKO PURWANTO': 'joko',
  'ALIF DAMARIO': 'alif',
  'DUWI ATMAJI': 'duwi',
  'RIYONO SULISTIO': 'riyono',
  'SYAIFUL BAYU LAKSITO A.': 'syaiful',
  'MUHAMMAD GURUH B.': 'guruh',
  'ADITYA GILANG P.': 'aditya',
  'TEGAR DIMAS ADI P.': 'tegar',
  'NANA MULYANA': 'nana',
  'WAHYU CRISNANTO E.P': 'wahyu.crisnanto',
  'OKTIANO RACHMAN S.': 'oktiano',
  'DEDI SAPUTRA': 'dedi.charlie',

  // Delta
  'ARIS HERVINSA Y.': 'aris',
  'DWI RISKI W.': 'riski',
  'MAULANA MALIK I.': 'maulana',
  'FAJAR DANYMAR R.': 'fajar.danymar',
  'IBNU JULIADI': 'ibnu',
  'NUR KHOLIS': 'nurkholis',
  'PAXIANJAS W.': 'paxianjas',
  'ANGGI HANINDRAJAT': 'anggi',
  'DIKI PRIHATIN': 'diki',
  'SATRIA BAGAS P.': 'satria',
  'DWI PRIANGGONO': 'prianggono',
  'ANGGA SATRIA W.': 'angga',
  'MUHAMMAD RIZKI R.': 'mrizki',
  'OKA AMPRANG G.': 'oka',
  'FAJAR HERMAWAN': 'fajar.hermawan',
  'PURWOTO SRI AJI P.': 'purwoto',
  'SHODIQ ARIFUDIN': 'shodiq',
};

async function seed() {
  console.log('1. Memeriksa kolom must_change_password di tabel users...');
  const [cols] = await pool.query('DESCRIBE users');
  const hasCol = cols.some((c) => c.Field === 'must_change_password');
  if (!hasCol) {
    await pool.query('ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1');
    console.log('✓ Kolom must_change_password berhasil ditambahkan ke tabel users.');
  } else {
    console.log('✓ Kolom must_change_password sudah tersedia.');
  }

  // Set administrator aaa must_change_password = 0
  await pool.query("UPDATE users SET must_change_password = 0 WHERE username = 'aaa'");

  console.log('2. Mengambil 68 personel operasional dari database...');
  const [personnelList] = await pool.query(
    'SELECT id, full_name, team_group, rank_position, user_id FROM personnel ORDER BY team_group, id'
  );
  console.log(`Ditemukan ${personnelList.length} personel operasional.`);

  const defaultPasswordHash = await bcrypt.hash('123456', 10);
  let createdCount = 0;
  let linkedCount = 0;

  for (const p of personnelList) {
    const rawName = p.full_name.trim();
    const username = USERNAME_MAP[rawName] || rawName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const isChief = p.rank_position.toLowerCase().includes('chief') && !p.rank_position.toLowerCase().includes('assistant');
    const role = isChief ? 'supervisor' : 'operator';

    // Cek apakah user sudah ada
    const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    let userId;

    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      await pool.query(
        'UPDATE users SET name = ?, role = ? WHERE id = ?',
        [rawName, role, userId]
      );
    } else {
      const [insertRes] = await pool.query(
        `INSERT INTO users (username, name, email, password_hash, role, must_change_password)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [username, rawName, `${username}@arff-yia.id`, defaultPasswordHash, role]
      );
      userId = insertRes.insertId;
      createdCount++;
    }

    // Hubungkan personnel ke user_id
    await pool.query('UPDATE personnel SET user_id = ? WHERE id = ?', [userId, p.id]);
    linkedCount++;
  }

  console.log(`✓ Selesai: ${createdCount} akun baru dibuat, ${linkedCount} personel berhasil dihubungkan ke akun login.`);
  console.log(`✓ Kredensial default: Password awal '123456' dengan status must_change_password = 1.`);

  const [verify] = await pool.query(
    `SELECT u.username, u.name, u.role, u.must_change_password, p.team_group, p.rank_position
     FROM users u
     JOIN personnel p ON p.user_id = u.id
     LIMIT 8`
  );
  console.log('Sampel Akun Berhasil Dibuat:');
  console.table(verify);

  process.exit(0);
}

seed().catch((err) => {
  console.error('Gagal men-generate akun personel:', err);
  process.exit(1);
});
