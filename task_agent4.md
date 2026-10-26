# PENUGASAN AGENT 4: INTEGRITAS TRANSAKSI DATABASE, CONCURRENCY LOCK, SKALABILITAS & INDEKS QUERY

**Domain Berkas Eksklusif**:
- `backend/src/controllers/incidentController.js`
- `backend/src/controllers/leaveController.js`
- `backend/src/controllers/readinessController.js`
- `backend/src/controllers/rosterController.js`
- `backend/src/controllers/officialsController.js`
- `backend/src/config/schema.sql`
*(DILARANG memodifikasi berkas di luar domain ini untuk mencegah tabrakan berkas / zero file collision)*

---

### BUTIR TUGAS 1: Proteksi Concurrency Penomoran Laporan Insiden (Temuan #31)
* **Lokasi Berkas**: `backend/src/controllers/incidentController.js` (fungsi `generateNextReportNumber`)
* **Deskripsi Masalah**: Fungsi penomoran otomatis membaca nomor terakhir dengan `SELECT report_number ... ORDER BY id DESC LIMIT 1`, lalu melakukan penambahan increment di memori aplikasi sebelum `INSERT`.
* **Dampak / Risiko**: Jika 2 petugas mencatat insiden bersamaan pada detik yang sama, keduanya mendapat nomor laporan yang sama, memicu ledakan error fatal MySQL `ER_DUP_ENTRY` dan salah satu laporan gagal tersimpan.
* **Instruksi Solusi Konkret**:
  1. Jalankan pembentukan nomor di dalam transaksi database dengan baris penguncian atomik:
     `SELECT report_number FROM incidents WHERE ... FOR UPDATE`.
  2. Tambahkan penanganan graceful retry jika terjadi benturan nomor atau gunakan sequence counter tabel atomik.

---

### BUTIR TUGAS 2: Proteksi Concurrency Double-Submission Pengajuan Cuti (Temuan #32)
* **Lokasi Berkas**: `backend/src/controllers/leaveController.js` (fungsi `requestLeaveRange`)
* **Deskripsi Masalah**: Pemeriksaan kuota (maks 2 cuti aktif) dan validasi anti-overlap dijalankan dengan `SELECT` biasa tanpa penguncian transaksi.
* **Dampak / Risiko**: Klik cepat ganda (*double click*) pada tombol ajukan cuti dapat menembus validasi kuota, menghasilkan 2 baris cuti identik yang bertabrakan.
* **Instruksi Solusi Konkret**:
  1. Bungkus alur pengajuan cuti di dalam transaksi database: `const conn = await pool.getConnection(); await conn.beginTransaction();`.
  2. Kunci baris personel terkait dengan `SELECT id FROM personnel WHERE id = ? FOR UPDATE;` sebelum menghitung kuota aktif dan rentang tanggal.
  3. Lakukan `await conn.commit()` dan pastikan `conn.rollback()` pada blok `catch`.

---

### BUTIR TUGAS 3: Transaksi Atomik pada Kesiapan Armada (Temuan #33)
* **Lokasi Berkas**: `backend/src/controllers/readinessController.js` (fungsi `submitVehicleReadiness`)
* **Deskripsi Masalah**: Pemeriksaan status armada, penyimpanan log inspeksi harian, dan pembaharuan status master kendaraan dijalankan sebagai query terpisah tanpa transaksi `connection.beginTransaction()`.
* **Dampak / Risiko**: Jika query kedua gagal di tengah jalan (misal disk penuh atau timeout), status master armada berubah tetapi log detailnya tidak tersimpan (*inconsistent state*).
* **Instruksi Solusi Konkret**: Satukan seluruh operasi tulis kelaikan armada ke dalam satu blok transaksi atomik menggunakan koneksi pool tunggal dengan `beginTransaction`, `commit`, dan `rollback`.

---

### BUTIR TUGAS 4: Transaksi Database Atomik pada Siklus Rotasi Roster (Temuan #34)
* **Lokasi Berkas**: `backend/src/controllers/rosterController.js` (fungsi `saveScheduleCycle` & `resetScheduleCycles`)
* **Deskripsi Masalah**: Operasi reset jadwal menghapus entri lama (`DELETE`) lalu menyisipkan matriks shift baru dengan *looping* banyak query tanpa `beginTransaction()`.
* **Dampak / Risiko**: Jika server mengalami restart atau gangguan saat loop berjalan, jadwal dinas lama terhapus namun jadwal baru baru tersimpan sebagian.
* **Instruksi Solusi Konkret**: Wajibkan pembungkusan seluruh loop mutasi jadwal di dalam transaksi database atomik tunggal.

---

### BUTIR TUGAS 5: Konsistensi Transaksi dan Rollback pada Pembatalan Cuti (Temuan #35)
* **Lokasi Berkas**: `backend/src/controllers/leaveController.js` (fungsi `cancelLeave`)
* **Deskripsi Masalah**: Pembatalan cuti mengubah status cuti menjadi 'dibatalkan' dan mengembalikan ketersediaan personel, namun dieksekusi tanpa transaksi terpadu.
* **Dampak / Risiko**: Jika update kedua gagal, data cuti dibatalkan tetapi personel masih berstatus tidak tersedia untuk penugasan.
* **Instruksi Solusi Konkret**: Bungkus mutasi status cuti dan ketersediaan personel dalam transaksi atomik dengan penguncian baris `FOR UPDATE`.

---

### BUTIR TUGAS 6: Penambahan Indeks pada Tabel `incidents` (Temuan #36)
* **Lokasi Berkas**: `backend/src/config/schema.sql`
* **Deskripsi Masalah**: Tabel `incidents` sering difilter berdasarkan `date`, `shift`, dan `team_group`, namun kolom-kolom ini belum memiliki indeks komposit.
* **Dampak / Risiko**: Database melakukan *Full Table Scan* pada setiap pemuatan rekapitulasi shift atau audit investigasi, memperlambat performa seiring bertambahnya data.
* **Instruksi Solusi Konkret**: Tambahkan indeks komposit pada skema database:
  `CREATE INDEX idx_incidents_date_shift_team ON incidents(date, shift, team_group);`.

---

### BUTIR TUGAS 7: Penambahan Indeks Komposit pada `personnel_deployments` (Temuan #37)
* **Lokasi Berkas**: `backend/src/config/schema.sql`
* **Deskripsi Masalah**: Tabel penugasan personel `personnel_deployments` adalah tabel tersibuk di sistem, namun pencarian riwayat ploting per personel dan per tanggal belum diindeks secara komposit.
* **Dampak / Risiko**: Query validasi cuti bentrok dan pengecekan kehadiran mengalami degradasi performa (*slow query*).
* **Instruksi Solusi Konkret**: Tambahkan indeks komposit pada skema database:
  `CREATE INDEX idx_deployments_personnel_date ON personnel_deployments(personnel_id, date, shift);`.

---

### BUTIR TUGAS 8: Penambahan Indeks pada `personnel_documents` (Temuan #38)
* **Lokasi Berkas**: `backend/src/config/schema.sql`
* **Deskripsi Masalah**: Pemeriksaan hak akses unduhan berkas dokumen memeriksa kolom `file_path` secara berkala tanpa adanya indeks.
* **Dampak / Risiko**: Waktu verifikasi middleware file meningkat seiring ribuan berkas dokumen yang terunggah.
* **Instruksi Solusi Konkret**: Tambahkan indeks pencarian berkas:
  `CREATE INDEX idx_personnel_documents_path ON personnel_documents(file_path);`.

---

### BUTIR TUGAS 9: Penyelarasan Penamaan & Relasi Pejabat Struktural (Temuan #25)
* **Lokasi Berkas**: `backend/src/controllers/officialsController.js` & `backend/src/config/schema.sql`
* **Deskripsi Masalah**: Terjadi fragmentasi relasi antara data pejabat di tabel `users` (misal akun kepala unit) dan data pejabat di tabel struktural/personnel.
* **Dampak / Risiko**: Perubahan nama pejabat struktural di master pejabat tidak otomatis tersinkronisasi dengan profil akun login pejabat yang bersangkutan.
* **Instruksi Solusi Konkret**: Hubungkan akun user pejabat dengan entitas struktural resmi melalui kolom `user_id` atau NIP resmi yang konsisten, dan pastikan update data pejabat di `officialsController.js` memperbarui nama di kedua entitas secara serempak.

---

### KANAL TERBUKA TEMUAN, BUG, IDE & SARAN TAMBAHAN
Apabila selama proses eksekusi Agent 4 menemukan kelemahan sistem lain, bug tersembunyi, celah logika, ide pengembangan, atau saran optimasi UI/UX di luar tugas utamanya, **Agent 4 DILARANG mengubah kode di luar domainnya secara sepihak**. Agent 4 WAJIB mencatat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporannya (`masak/temp/hasil_agent4.md`) agar dapat dievaluasi oleh Pengawas.

### INSTRUKSI AKHIR & VALIDASI
* Validasi sintaks backend melalui CLI terminal:
  `node -c backend/src/controllers/incidentController.js backend/src/controllers/leaveController.js backend/src/controllers/readinessController.js backend/src/controllers/rosterController.js backend/src/controllers/officialsController.js`.
* Tuliskan hasil pekerjaan dan bukti verifikasi CLI di `masak/temp/hasil_agent4.md`.
* DILARANG melakukan `git commit` atau `git push` otomatis.
* DILARANG menggunakan tool `browser_subagent`.
