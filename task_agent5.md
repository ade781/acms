# PENUGASAN AGENT 5: PERFORMA JARINGAN (GZIP), CODE SPLITTING, CACHING & ENGINE EKSPOR PDF

**Domain Berkas Eksklusif**:
- `backend/src/app.js`
- `backend/src/controllers/personnelController.js`
- `backend/src/controllers/announcementController.js`
- `backend/src/routes/announcementRoutes.js`
- `backend/src/controllers/reportController.js`
- `backend/src/services/pdf/pdfHelpers.js`
- `backend/src/services/pdf/shiftReportPdf.js`
- `backend/src/services/pdfService.js`
- `frontend/src/App.jsx`
- `frontend/vite.config.js`
*(DILARANG memodifikasi berkas di luar domain ini untuk mencegah tabrakan berkas / zero file collision)*

---

### BUTIR TUGAS 1: Eliminasi Duplikasi Payload API Personel & Proyeksi Ringkas (Temuan #7)
* **Lokasi Berkas**: `backend/src/controllers/personnelController.js`
* **Deskripsi Masalah**: Respon `GET /api/personnel` mengembalikan array ganda `{ data: formattedRows, personnel: formattedRows }` berukuran 186 kB karena mengekstrak seluruh 36 kolom.
* **Dampak / Risiko**: Pemborosan bandwidth apron bandara dan memperpanjang Total Blocking Time (TBT) di smartphone kru.
* **Instruksi Solusi Konkret**:
  1. Hapus duplikasi key `personnel: formattedRows`, cukup kirimkan `{ success: true, data: formattedRows }`.
  2. Tambahkan dukungan query parameter `?compact=true` atau seleksi kolom ringkas (`id, nip, full_name, team_group, rank_position, cert_level, cert_expiry_date, is_active, photo_url`) sehingga payload menyusut dari 186 kB menjadi < 25 kB.

---

### BUTIR TUGAS 2: Pemasangan Header HTTP Cache-Control pada Folder Unggahan (Temuan #8)
* **Lokasi Berkas**: `backend/src/app.js`
* **Deskripsi Masalah**: Middleware express static `/uploads` menyajikan foto armada dan insiden tanpa header `Cache-Control`.
* **Dampak / Risiko**: Browser mengunduh ulang foto bukti yang sama setiap kali kru berpindah menu.
* **Instruksi Solusi Konkret**: Tambahkan konfigurasi cache pada middleware express static:
  ```javascript
  app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true, lastModified: true }));
  ```

---

### BUTIR TUGAS 3: Penerapan Route Code Splitting & Vendor Chunking (Temuan #10)
* **Lokasi Berkas**: `frontend/src/App.jsx` & `frontend/vite.config.js`
* **Deskripsi Masalah**: 20+ halaman diimpor secara statis di `App.jsx`, memicu peringatan build Vite `(!) Some chunks are larger than 500 kB`.
* **Dampak / Risiko**: Kru mobile dipaksa mengunduh seluruh skrip halaman desktop manajerial (> 830 kB).
* **Instruksi Solusi Konkret**:
  1. Terapkan `React.lazy()` pada seluruh halaman di `frontend/src/App.jsx` yang dibungkus `<React.Suspense>`.
  2. Konfigurasikan `manualChunks` di `frontend/vite.config.js` untuk memecah pustaka vendor besar (`vendor-react`, `vendor-icons`, `vendor-utils`).
  3. Pastikan `npm run build` sukses 100% tanpa peringatan chunk > 500 kB.

---

### BUTIR TUGAS 4: Pemasangan Kompresi HTTP Gzip/Brotli pada Backend Express (Temuan #12)
* **Lokasi Berkas**: `backend/src/app.js`
* **Deskripsi Masalah**: Respons API Express (JSON dan teks) dikirim tanpa kompresi HTTP Gzip/Brotli.
* **Dampak / Risiko**: Transfer data JSON operasional berukuran besar (jadwal roster, ploting) memakan kuota 4–5 kali lebih besar.
* **Instruksi Solusi Konkret**:
  1. Pasang package middleware `compression` di `backend/src/app.js`.
  2. Daftarkan di awal stack middleware: `app.use(compression());`.

---

### BUTIR TUGAS 5: Pembuatan Endpoint Ringkas Polling Badge Pengumuman (Temuan #13)
* **Lokasi Berkas**: `backend/src/controllers/announcementController.js` & `backend/src/routes/announcementRoutes.js`
* **Deskripsi Masalah**: Sidebar memicu `GET /api/announcements` lengkap hanya untuk menghitung jumlah pesan belum dibaca pada badge.
* **Dampak / Risiko**: Polling berulang memboroskan memori server dan kuota internet.
* **Instruksi Solusi Konkret**: Buat endpoint ringan baru: `GET /api/announcements/unread-count` yang hanya menjalankan query `SELECT COUNT(*) AS unread_count FROM announcements WHERE ...`.

---

### BUTIR TUGAS 6: Konsolidasi Endpoint Rekapitulasi Laporan Shift (Temuan #14)
* **Lokasi Berkas**: `backend/src/controllers/reportController.js`
* **Deskripsi Masalah**: Halaman laporan shift memicu 6 roundtrip HTTP terpisah secara simultan (data shift, armada, kegiatan, insiden, absensi, pejabat).
* **Dampak / Risiko**: Menimbulkan 6 kali koneksi TCP dan overhead latency jaringan.
* **Instruksi Solusi Konkret**: Buat endpoint agregasi terpadu `GET /api/reports/shift-summary?date=...&shift=...&team_group=...` yang mengeksekusi data secara paralel di backend dan mengembalikan satu payload komprehensif.

---

### BUTIR TUGAS 7: Header Caching pada Berkas Lampiran Surat Edaran (Temuan #17)
* **Lokasi Berkas**: `backend/src/controllers/announcementController.js` (fungsi `downloadAttachment`)
* **Deskripsi Masalah**: File PDF lampiran surat edaran disajikan tanpa header caching.
* **Dampak / Risiko**: Unduh ulang file PDF yang sama berkali-kali.
* **Instruksi Solusi Konkret**: Tambahkan header respon: `res.setHeader('Cache-Control', 'public, max-age=86400');`.

---

### BUTIR TUGAS 8: Perbaikan Rendering Tanda Tangan WebP pada Generator PDF (Temuan #42)
* **Lokasi Berkas**: `backend/src/services/pdf/pdfHelpers.js` & `backend/src/services/pdf/shiftReportPdf.js`
* **Deskripsi Masalah**: Spesimen tanda tangan yang diunggah berformat WebP gagal di-render oleh PDFKit bawaan yang hanya mendukung PNG/JPEG murni.
* **Dampak / Risiko**: Dokumen cetak resmi PDF gagal menampilkan tanda tangan digital atau melempar runtime exception saat export PDF.
* **Instruksi Solusi Konkret**: Tambahkan konversi/transcoding buffer gambar otomatis menggunakan pustaka `sharp` dari WebP ke PNG sebelum dioperkan ke `doc.image(buffer)`.

---

### BUTIR TUGAS 9: Batas Memori (LRU Size Limit) pada Cache PDF Server (Temuan #43)
* **Lokasi Berkas**: `backend/src/services/pdfService.js`
* **Deskripsi Masalah**: Cache PDF dalam memori server hanya dibatasi jumlah entri (> 50 entri) tanpa batas ukuran byte RAM.
* **Dampak / Risiko**: Konsumsi memori RAM server dapat melonjak hingga 1 GB, memicu crash Out Of Memory (OOM Killer).
* **Instruksi Solusi Konkret**: Batasi ukuran cache dokumen PDF maksimal 10 dokumen atau maksimal 50 MB total buffer memori, dan bersihkan entri tertua jika batas terlampaui.

---

### BUTIR TUGAS 10: Proteksi Overflow Halaman & Truncation Teks pada Ekspor PDF (Temuan #44)
* **Lokasi Berkas**: `backend/src/services/pdf/shiftReportPdf.js`
* **Deskripsi Masalah**: Seksi ringkasan insiden dan aktivitas di-render dengan koordinat vertikal manual statis (`currentY += ...`).
* **Dampak / Risiko**: Teks kronologi panjang bertabrakan dengan tabel di bawahnya atau terpotong di batas margin kertas PDF.
* **Instruksi Solusi Konkret**: Gunakan `doc.heightOfString(text, { width })` untuk mengukur sisa tinggi ruang halaman. Jika sisa ruang < tinggi teks yang dibutuhkan, picu `doc.addPage()` secara otomatis dan cetak ulang header halaman.

---

### KANAL TERBUKA TEMUAN, BUG, IDE & SARAN TAMBAHAN
Apabila selama proses eksekusi Agent 5 menemukan kelemahan sistem lain, bug tersembunyi, celah logika, ide pengembangan, atau saran optimasi UI/UX di luar tugas utamanya, **Agent 5 DILARANG mengubah kode di luar domainnya secara sepihak**. Agent 5 WAJIB mencatat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporannya (`masak/temp/hasil_agent5.md`) agar dapat dievaluasi oleh Pengawas.

### INSTRUKSI AKHIR & VALIDASI
* Validasi sintaks backend melalui CLI terminal:
  `node -c backend/src/app.js backend/src/controllers/personnelController.js backend/src/controllers/announcementController.js backend/src/controllers/reportController.js backend/src/services/pdf/pdfHelpers.js backend/src/services/pdf/shiftReportPdf.js backend/src/services/pdfService.js`.
* Validasi build frontend: jalankan `npm run build` di folder `frontend/`.
* Tuliskan hasil pekerjaan dan bukti verifikasi CLI di `masak/temp/hasil_agent5.md`.
* DILARANG melakukan `git commit` atau `git push` otomatis.
* DILARANG menggunakan tool `browser_subagent`.
