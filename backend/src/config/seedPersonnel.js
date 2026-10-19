import pool from './db.js';

export const OFFICIAL_PERSONNEL = [
  { name: 'M. OSCAR AVIANTO', nip: '20241338', role: 'ARFF Operation Chief', team: 'Alpha', cert: 'Senior', status: 'organik' },
  { name: 'RUDY SETYAWAN P', nip: '20241970', role: 'ARFF Operation Chief Assistant', team: 'Alpha', cert: 'Senior', status: 'organik' },
  { name: 'DIMAS INDRA K', nip: '20246214', role: 'ARFF Operation Chief Assistant', team: 'Alpha', cert: 'Senior', status: 'organik' },
  { name: 'DONY SETIAWAN', nip: '20241992', role: 'ARFF Operation Chief Assistant', team: 'Alpha', cert: 'Senior', status: 'organik' },
  { name: 'AHMAD NIZAR CATUR P', nip: '20241375', role: 'ARFF Operation Chief Assistant', team: 'Alpha', cert: 'Senior', status: 'organik' },
  { name: 'DANAR PUTRA D.', nip: '20244078', role: 'ARFF Operation Senior Fire Fighter', team: 'Alpha', cert: 'Senior', status: 'organik' },
  { name: 'DIANA HERY SETIAWAN', nip: '20245386', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'organik' },
  { name: 'JOHAN ASEP S.', nip: '20246061', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'organik' },
  { name: 'ERWIN NUR H.', nip: '2403641', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'FAIZ RAFIQI', nip: '2403642', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'FITRIANA GHANIY M.', nip: '2403644', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'WISNU PAMUNGKAS', nip: '2202331', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'ADIKA PRASETIYA', nip: '2403633', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'M. IKHSANUDIN', nip: '2208698', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'TITOK YULIANTO', nip: '2304059', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'DANANG ARFIANSYAH', nip: '2002525', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'YUNA PRIYANA', nip: '2403654', role: 'ARFF Operation Junior Fire Fighter', team: 'Alpha', cert: 'Junior', status: 'outsourcing' },
  { name: 'HASAR FITRAKUSUMA', nip: '20241887', role: 'ARFF Operation Chief', team: 'Bravo', cert: 'Senior', status: 'organik' },
  { name: 'ARDIAN', nip: '20242162', role: 'ARFF Operation Chief Assistant', team: 'Bravo', cert: 'Senior', status: 'organik' },
  { name: 'RULIAWAN HALIM', nip: '20241927', role: 'ARFF Operation Chief Assistant', team: 'Bravo', cert: 'Senior', status: 'organik' },
  { name: 'THOMAS DONNY S.', nip: '20241884', role: 'ARFF Operation Chief Assistant', team: 'Bravo', cert: 'Senior', status: 'organik' },
  { name: 'KUKUH TRI PUTRANTO', nip: '20245563', role: 'ARFF Operation Senior Fire Fighter', team: 'Bravo', cert: 'Senior', status: 'organik' },
  { name: 'BAGOES SUKARNO', nip: '20246663', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'organik' },
  { name: 'TITUS DWI P.', nip: '20246631', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'organik' },
  { name: 'SHOLIKIN TRI NUR CAHYO', nip: '20246596', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'organik' },
  { name: 'DEDI MAHARDIKA', nip: '2300022', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'BONGGA ZUNIANTA', nip: '2403637', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'M. BAGAS SAYUTI', nip: '2002530', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'DANANG B.', nip: '2403638', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'WISENO AJI', nip: '2403653', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'BANGKIT ALVIANTO', nip: '2208693', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'RETAMA AGUNG R.', nip: '2403649', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'FARIS WISNU C.', nip: '2403643', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'BAYU CHAIRUL N.B.', nip: '2403636', role: 'ARFF Operation Junior Fire Fighter', team: 'Bravo', cert: 'Junior', status: 'outsourcing' },
  { name: 'ENDAR PRASETYO', nip: '20241358', role: 'ARFF Operation Chief', team: 'Charlie', cert: 'Senior', status: 'organik' },
  { name: 'HARI MUKTI C.P', nip: '20241895', role: 'ARFF Operation Chief Assistant', team: 'Charlie', cert: 'Senior', status: 'organik' },
  { name: 'KUKUH PRABOWO I.', nip: '20241907', role: 'ARFF Operation Chief Assistant', team: 'Charlie', cert: 'Senior', status: 'organik' },
  { name: 'WAHYU ADHY D.', nip: '20242159', role: 'ARFF Operation Chief Assistant', team: 'Charlie', cert: 'Senior', status: 'organik' },
  { name: 'APRILIANTO ADI S.', nip: '20244550', role: 'ARFF Operation Senior Fire Fighter', team: 'Charlie', cert: 'Senior', status: 'organik' },
  { name: 'JOKO PURWANTO', nip: '20245281', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'organik' },
  { name: 'ALIF DAMARIO', nip: '20246710', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'organik' },
  { name: 'DUWI ATMAJI', nip: '2403640', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'RIYONO SULISTIO', nip: '1741316', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'SYAIFUL BAYU LAKSITO A.', nip: '2002531', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'MUHAMMAD GURUH B.', nip: '2403646', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'ADITYA GILANG P.', nip: '2002524', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'TEGAR DIMAS ADI P.', nip: '2403586', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'NANA MULYANA', nip: '2208700', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'WAHYU CRISNANTO E.P', nip: '2403652', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'OKTIANO RACHMAN S.', nip: '2403647', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'DEDI SAPUTRA', nip: '2002526', role: 'ARFF Operation Junior Fire Fighter', team: 'Charlie', cert: 'Junior', status: 'outsourcing' },
  { name: 'ARIS HERVINSA Y.', nip: '20242169', role: 'ARFF Operation Chief', team: 'Delta', cert: 'Senior', status: 'organik' },
  { name: 'DWI RISKI W.', nip: '20241961', role: 'ARFF Operation Chief Assistant', team: 'Delta', cert: 'Senior', status: 'organik' },
  { name: 'MAULANA MALIK I.', nip: '20241916', role: 'ARFF Operation Chief Assistant', team: 'Delta', cert: 'Senior', status: 'organik' },
  { name: 'FAJAR DANYMAR R.', nip: '20242176', role: 'ARFF Operation Chief Assistant', team: 'Delta', cert: 'Senior', status: 'organik' },
  { name: 'IBNU JULIADI', nip: '20242421', role: 'ARFF Operation Senior Fire Fighter', team: 'Delta', cert: 'Senior', status: 'organik' },
  { name: 'NUR KHOLIS', nip: '20245064', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'organik' },
  { name: 'PAXIANJAS W.', nip: '20246647', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'organik' },
  { name: 'ANGGI HANINDRAJAT', nip: '1741380', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'DIKI PRIHATIN', nip: '2403639', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'SATRIA BAGAS P.', nip: '2403650', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'DWI PRIANGGONO', nip: '2300023', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'ANGGA SATRIA W.', nip: '2403634', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'MUHAMMAD RIZKI R.', nip: '2403645', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'OKA AMPRANG G.', nip: '2208701', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'FAJAR HERMAWAN', nip: '2002527', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'PURWOTO SRI AJI P.', nip: '2403648', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
  { name: 'SHODIQ ARIFUDIN', nip: '2403651', role: 'ARFF Operation Junior Fire Fighter', team: 'Delta', cert: 'Junior', status: 'outsourcing' },
];

export async function seedPersonnel() {
  console.log(`Memulai sinkronisasi 68 personel resmi lengkap dengan NIP dari 4 regu...`);

  let inserted = 0;
  let updated = 0;

  for (const p of OFFICIAL_PERSONNEL) {
    const [existing] = await pool.query(
      'SELECT id FROM personnel WHERE full_name = ? AND team_group = ?',
      [p.name, p.team]
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE personnel SET 
          nip = ?, 
          rank_position = ?, 
          cert_level = ?, 
          employment_status = ?, 
          is_active = 1 
         WHERE id = ?`,
        [p.nip, p.role, p.cert, p.status, existing[0].id]
      );
      updated++;
    } else {
      await pool.query(
        `INSERT INTO personnel (nip, full_name, rank_position, team_group, cert_level, employment_status, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [p.nip, p.name, p.role, p.team, p.cert, p.status]
      );
      inserted++;
    }
  }

  const [countAlpha] = await pool.query("SELECT COUNT(*) as c, COUNT(nip) as cn FROM personnel WHERE team_group = 'Alpha'");
  const [countBravo] = await pool.query("SELECT COUNT(*) as c, COUNT(nip) as cn FROM personnel WHERE team_group = 'Bravo'");
  const [countCharlie] = await pool.query("SELECT COUNT(*) as c, COUNT(nip) as cn FROM personnel WHERE team_group = 'Charlie'");
  const [countDelta] = await pool.query("SELECT COUNT(*) as c, COUNT(nip) as cn FROM personnel WHERE team_group = 'Delta'");

  console.log(`Selesai! Ditambahkan: ${inserted}, Diperbarui: ${updated}.`);
  console.log(`Jumlah personel aktif & ber-NIP per regu:`);
  console.log(`- Alpha: ${countAlpha[0].c} (NIP: ${countAlpha[0].cn})`);
  console.log(`- Bravo: ${countBravo[0].c} (NIP: ${countBravo[0].cn})`);
  console.log(`- Charlie: ${countCharlie[0].c} (NIP: ${countCharlie[0].cn})`);
  console.log(`- Delta: ${countDelta[0].c} (NIP: ${countDelta[0].cn})`);
}

// Jika dijalankan langsung dari CLI
if (process.argv[1] && process.argv[1].endsWith('seedPersonnel.js')) {
  seedPersonnel()
    .then(() => {
      console.log('Seeding personel ber-NIP 4 regu berhasil tuntas.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Gagal seeding personel:', err);
      process.exit(1);
    });
}
