# MASTER ORKESTRASI PENUGASAN 5 AGENT (SUPERVISOR TASK SHEET)
**Sistem Pemantauan Operasional ARFF YIA (ACMS)**
**Status**: Fase 3 - Eksekusi Menyeluruh 44 Temuan QA (Zero File Collision)

---

## 1. REKAPITULASI PEMBAGIAN MENYELURUH 44 TEMUAN QA.MD

### AGENT 1: UI/UX DESKTOP, AKSESIBILITAS WCAG, ERROR BOUNDARY & STANDARISASI ANTI-SLOP (12 TEMUAN)
* **Berkas Domain**: `frontend/index.html`, `frontend/public/shield-alert.svg`, `frontend/src/components/layout/Navbar.jsx`, `frontend/src/components/dashboard/ShiftHeaderCard.jsx`, `frontend/src/pages/OfficialsManagementPage.jsx`, `frontend/src/pages/ShiftReportsPage.jsx`, `frontend/src/pages/LeaveManagementPage.jsx`, `frontend/src/components/common/ErrorBoundary.jsx`, `frontend/src/main.jsx`, dan halaman desktop untuk AbortController.
* **Lembar Tugas**: `task_agent1.md`
* **Laporan Kerja**: `masak/temp/hasil_agent1.md`
* **Daftar Butir Tugas**:
  1. Pembuatan Aset Vektor Resmi Favicon `shield-alert.svg` (Temuan #1).
  2. Pemasangan Meta Description Resmi pada Dokumen HTML (Temuan #5).
  3. Koreksi Accessible Name Mismatch pada Tombol Profil Desktop (Temuan #4).
  4. Pembersihan Hardcoded Nama Pejabat Pimpinan di Placeholder Form (Temuan #2).
  5. Peningkatan Rasio Kontras Teks Keterangan Laporan Dinas (Temuan #3).
  6. Eliminasi Dead Control Insiden pada `ShiftHeaderCard` (Temuan #18).
  7. Eliminasi Redundansi Informasi Shift Bertumpuk antara Navigasi & Konten (Temuan #19).
  8. Penghapusan Animasi Berkedip Tanpa Henti (*Endless Pulse Loops*) (Temuan #23).
  9. Pembersihan Teks Jargon Filler "Rekapitulasi Berjalan (Real-Time)" (Temuan #24).
  10. Eliminasi Concurrent Burst Requests pada Halaman Cuti (Temuan #11).
  11. Penerapan `AbortController` pada Fetch Hook Halaman Desktop (Temuan #9).
  12. Pemasangan React Error Boundary untuk Mencegah White Screen Crash (Temuan #40).

---

### AGENT 2: ANTARMUKA MOBILE, KOMPRESI KAMERA, EFISIENSI PAYLOAD & KETAHANAN OFFLINE (8 TEMUAN)
* **Berkas Domain**: `frontend/src/pages/mobile/MobileDashboard.jsx`, `MobileDeployment.jsx`, `MobileActivities.jsx`, `MobileIncidents.jsx`, `MobileReports.jsx`, `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`, `frontend/src/components/mobile/activities/MobileActivityModal.jsx`, `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`, `frontend/src/components/mobile/ploting/MobilePlotCard.jsx`, `frontend/src/components/common/OfflineBanner.jsx`.
* **Lembar Tugas**: `task_agent2.md`
* **Laporan Kerja**: `masak/temp/hasil_agent2.md`
* **Daftar Butir Tugas**:
  1. Peningkatan Kontras Warna Teks Tanda Tangan Mobile (Temuan #3).
  2. Integrasi Kompresi Kanvas WebP Foto Kamera Kru Mobile (Temuan #6).
  3. Penerapan `AbortController` pada Fetch Hook Seluruh Halaman Mobile (Temuan #9).
  4. Pemangkasan Payload Mobile Dashboard untuk Hitungan Personel (Temuan #15).
  5. Optimasi Dropdown Modal Ganti Chief dengan Lazy-Fetch (Temuan #16).
  6. Eliminasi Duplikasi Pemasangan Komponen `MobileLeaveModal` (Temuan #20).
  7. Eliminasi Permintaan Jaringan Pengumuman Ganda pada Mobile Dashboard (Temuan #21).
  8. Pemasangan Banner Deteksi Jaringan Offline Kru Lapangan (Temuan #41).

---

### AGENT 3: KEAMANAN, OTORISASI RBAC, PENCEGAHAN IDOR & RATE LIMITING (6 TEMUAN)
* **Berkas Domain**: `backend/src/routes/activityRoutes.js`, `backend/src/controllers/activityController.js`, `backend/src/routes/authRoutes.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/authMiddleware.js`, `backend/src/middleware/errorHandler.js`.
* **Lembar Tugas**: `task_agent3.md`
* **Laporan Kerja**: `masak/temp/hasil_agent3.md`
* **Daftar Butir Tugas**:
  1. Proteksi Autentikasi Berkas Sensitif `/uploads/*` (Temuan #26).
  2. Penutupan Celah IDOR & Horizontal Privilege Escalation pada Logbook Kegiatan (Temuan #27).
  3. Penyelarasan Otorisasi RBAC Middleware vs Controller (Temuan #28).
  4. Pemasangan Rate Limiting pada Endpoint Login `/api/auth/login` (Temuan #29).
  5. Mekanisme Revokasi Token JWT saat Ganti Password & Logout (Temuan #30).
  6. Sanitasi Respons Error HTTP 500 Global dari Kebocoran Stack Trace (Temuan #39).

---

### AGENT 4: INTEGRITAS TRANSAKSI DATABASE, CONCURRENCY LOCK, SKALABILITAS & INDEKS QUERY (9 TEMUAN)
* **Berkas Domain**: `backend/src/controllers/incidentController.js`, `backend/src/controllers/leaveController.js`, `backend/src/controllers/readinessController.js`, `backend/src/controllers/rosterController.js`, `backend/src/controllers/officialsController.js`, `backend/src/config/schema.sql`.
* **Lembar Tugas**: `task_agent4.md`
* **Laporan Kerja**: `masak/temp/hasil_agent4.md`
* **Daftar Butir Tugas**:
  1. Proteksi Concurrency Penomoran Laporan Insiden `FOR UPDATE` (Temuan #31).
  2. Proteksi Concurrency Double-Submission Pengajuan Cuti (Temuan #32).
  3. Transaksi Atomik pada Pelaporan Kesiapan Armada `submitVehicleReadiness` (Temuan #33).
  4. Transaksi Database Atomik pada Siklus Rotasi Roster (Temuan #34).
  5. Konsistensi Transaksi dan Rollback pada Pembatalan Cuti (Temuan #35).
  6. Penambahan Indeks pada Tabel `incidents` (`date`, `shift`, `team_group`) (Temuan #36).
  7. Penambahan Indeks Komposit pada `personnel_deployments` (`personnel_id`, `date`, `shift`) (Temuan #37).
  8. Penambahan Indeks pada `personnel_documents` (`file_path`) (Temuan #38).
  9. Penyelarasan Penamaan & Relasi Pejabat Struktural antara `users` dan `personnel` (Temuan #25).

---

### AGENT 5: PERFORMA JARINGAN (GZIP), CODE SPLITTING, CACHING & ENGINE EKSPOR PDF (9 TEMUAN)
* **Berkas Domain**: `backend/src/app.js`, `backend/src/controllers/personnelController.js`, `backend/src/controllers/announcementController.js`, `backend/src/routes/announcementRoutes.js`, `backend/src/controllers/reportController.js`, `backend/src/services/pdf/pdfHelpers.js`, `backend/src/services/pdf/shiftReportPdf.js`, `backend/src/services/pdfService.js`, `frontend/src/App.jsx`, `frontend/vite.config.js`.
* **Lembar Tugas**: `task_agent5.md`
* **Laporan Kerja**: `masak/temp/hasil_agent5.md`
* **Daftar Butir Tugas**:
  1. Eliminasi Duplikasi Payload API Personel & Proyeksi Ringkas (Temuan #7).
  2. Pemasangan Header HTTP Cache-Control pada Folder Unggahan `/uploads` (Temuan #8).
  3. Penerapan Route Code Splitting `React.lazy()` & Vendor Chunking (Temuan #10).
  4. Pemasangan Kompresi HTTP Gzip/Brotli pada Backend Express (Temuan #12).
  5. Pembuatan Endpoint Ringkas Polling Badge Pengumuman `/unread-count` (Temuan #13).
  6. Konsolidasi Endpoint Rekapitulasi Laporan Shift Tunggal (Temuan #14).
  7. Header Caching pada Berkas Lampiran Surat Edaran (Temuan #17).
  8. Perbaikan Rendering Tanda Tangan WebP pada Generator PDF (Temuan #42).
  9. Batas Memori (LRU Size Limit) pada Cache PDF Server (Temuan #43).
  10. Proteksi Overflow Halaman & Truncation Teks pada Ekspor PDF (Temuan #44).

---

## 2. ATURAN BAKU PENGAWASAN & INTEGRITAS
1. **Zero File Collision**: Setiap agen dilarang keras menyentuh berkas di luar domain eksklusifnya.
2. **Kanal Terbuka**: Seluruh temuan, ide, dan saran baru wajib dicatat pada seksi khusus di `masak/temp/hasil_agent*.md`.
3. **Validasi CLI Murni**: Seluruh validasi wajib dijalankan melalui terminal CLI (`npm run build`, `node -c`). DILARANG menggunakan `browser_subagent`.
4. **Git Freeze**: DILARANG melakukan `git commit` dan `git push` otomatis tanpa persetujuan pengguna.
