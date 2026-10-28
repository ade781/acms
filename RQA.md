# DOKUMEN RIWAYAT QUALITY ASSURANCE (RQA.MD)
**Sistem Pemantauan Operasional ARFF YIA (ACMS)**
Bandara Internasional Yogyakarta (YIA) • PT Angkasa Pura Indonesia

Dokumen ini memuat seluruh arsip riwayat pekerjaan Quality Assurance (QA), resolusi temuan audit, refaktorisasi arsitektur modular, unifikasi fungsi (*Single Source of Truth / Ponytail DRY*), serta verifikasi fitur operasional yang **telah selesai dikerjakan, diuji, dan stabil** pada codebase.

Item yang telah selesai dikerjakan dipindahkan dari `QA.md` ke dokumen `RQA.md` ini agar `QA.md` tetap ringkas dan fokus hanya pada temuan aktif yang belum dikerjakan.

---

## BAGIAN 1: REKAPITULASI REFAKTORISASI BERKAS PADAT (MODULAR ARSITEKTUR)
*Selesai Dikerjakan & Terverifikasi (Commit `589c033`, `70d12ca`, `2c71646`)*

### 1. Dekomposisi Layanan Dokumen PDF (`pdfService.js`)
* **Kondisi Sebelum**: Berkas `pdfService.js` monolitik berukuran 1.500 baris yang menggabungkan seluruh logika generator dokumen (Shift, Armada, Insiden, Kegiatan, Personel).
* **Solusi yang Dieksekusi**:
  * Dibuat subdirektori modul `backend/src/services/pdf/`:
    * `shiftReportPdf.js`: Generator PDF Laporan Dinas Shift terpadu.
    * `vehicleReportPdf.js`: Generator PDF Kelaikan Armada Fisik.
    * `incidentReportPdf.js`: Generator PDF Laporan Investigasi Insiden Bandara.
    * `activitiesReportPdf.js`: Generator PDF Rekapitulasi Kegiatan Shift.
    * `personnelReportPdf.js`: Generator PDF Biodata & Dossier Personel.
    * `pdfHelpers.js`: Helper fungsi umum (header resmi instansi, garis pembatas, formatting sel tabel, konversi mm/pt).
  * Berkas `pdfService.js` dipertahankan sebagai fasad (*facade / re-exporter*) yang ramping (~60 baris) sehingga kompatibilitas ke modul pemanggil tetap 100% utuh tanpa breaking changes.
* **Hasil & Penghematan**: Berkurang lebih dari 1.300 baris dari berkas monolitik utama, arsitektur PDF kini sepenuhnya terisolasi per jenis dokumen.

### 2. Dekomposisi Controller Personel (`personnelController.js`)
* **Kondisi Sebelum**: Berkas `personnelController.js` berukuran lebih dari 1.000 baris yang menampung CRUD personel, upload dokumen, manajemen cuti, dan manajemen pejabat struktural sekaligus.
* **Solusi yang Dieksekusi**:
  * Dibuat controller spesialis mandiri:
    * `backend/src/controllers/leaveController.js`: Menangani pengajuan cuti, riwayat cuti, pembatalan cuti, dan validasi kuota anti-overlap.
    * `backend/src/controllers/officialsController.js`: Menangani CRUD pejabat struktural Department Head dan Section Head.
    * `backend/src/controllers/personnelDocumentController.js`: Menangani pengunggahan dan penghapusan arsip ijazah/STKP/dokumen kepegawaian.
    * `backend/src/utils/competencyHelper.js`: Helper pemetaan validitas dan kedaluwarsa lisensi STKP.
  * Berkas `personnelController.js` menyusut menjadi murni pengelola data induk personel dan ekspor PDF.
* **Hasil & Penghematan**: Berkurang 783 baris kode dari controller personel, routing menjadi jelas dan terisolasi.

### 3. Modularisasi Halaman Kegiatan (`ActivitiesPage.jsx`)
* **Kondisi Sebelum**: Berkas halaman berukuran 800+ baris yang memuat seluruh modal formulir kegiatan, modal pratinjau foto, modal hapus, modal ekspor, dan linimasa kegiatan dalam satu berkas.
* **Solusi yang Dieksekusi**:
  * Dibuat subkomponen terisolasi di `frontend/src/components/activities/`:
    * `ActivityFormModal.jsx`: Modal tambah dan edit kegiatan harian.
    * `ActivityPhotoModal.jsx`: Modal pratinjau galeri foto dokumentasi beresolusi penuh.
    * `ActivityDeleteModal.jsx`: Modal konfirmasi penghapusan log kegiatan.
    * `ActivityExportModal.jsx`: Modal pemilihan rentang tanggal ekspor laporan PDF.
    * `ActivityTimelineList.jsx`: Komponen render linimasa visual kegiatan operasional.
    * `frontend/src/utils/activityCategories.js`: Konstanta kategori kegiatan terpusat.
  * Berkas `ActivitiesPage.jsx` menyusut dari 800+ baris menjadi ~200 baris controller page yang bersih.
* **Hasil & Penghematan**: Berkurang 677 baris dari halaman utama, performa re-rendering input form menjadi instan.

### 4. Modularisasi Halaman Manajemen Cuti (`LeaveManagementPage.jsx`)
* **Kondisi Sebelum**: Berkas halaman berukuran 850+ baris yang menumpuk logika personel izin shift aktif, cuti yang sedang berjalan, riwayat cuti bulanan, dan modal pembatalan.
* **Solusi yang Dieksekusi**:
  * Dibuat subkomponen di `frontend/src/components/leave/`:
    * `CurrentShiftAbsentsView.jsx`: Tampilan daftar personel yang tidak hadir pada shift berjalan.
    * `OngoingLeavesView.jsx`: Tampilan paket pengajuan cuti yang sedang/akan berjalan.
    * `MonthlyLeaveHistoryView.jsx`: Tampilan tab riwayat cuti bulanan beserta filter tahun/regu.
    * `CancelLeaveModal.jsx`: Modal konfirmasi pembatalan cuti dinas.
    * `frontend/src/utils/leaveHelpers.jsx`: Helper format durasi hari dan badge status cuti.
  * Berkas `LeaveManagementPage.jsx` menyusut dari 850+ baris menjadi ~350 baris controller page.
* **Hasil & Penghematan**: Berkurang 593 baris dari halaman utama.

---

## BAGIAN 2: HASIL UNIFIKASI FUNGSI REDUNDAN (PONYTAIL DRY LOG) & PEMBERSIHAN MASAK
*Selesai Dikerjakan & Terverifikasi (Commit `6e5da5c`, `9d8c9ca`)*

### 1. Pembersihan Menyeluruh Folder Kerja Khusus `masak/`
* **Tindakan**: Menghapus seluruh skrip sementara (`clean_split_pdf.cjs`, `refactor_personnel.cjs`, `split_pdf_service.cjs`, `complete_page_tester.mjs`, `comprehensive_page_audit.mjs`, `network_deep_audit.mjs`, `page_by_page_deep_audit.mjs`).
* **Hasil**: Folder `masak/` kini 100% steril dari berkas eksekusi sisa migrasi, hanya menyisakan subdirektori data kerja resmi (`login/`, `mobile/`, `temp/`).

### 2. Unifikasi Utilitas Unduh Berkas Blob di Frontend (`fileHelper.js`)
* **Tindakan**: Dibuat modul tunggal `frontend/src/utils/fileHelper.js` yang mengekspor fungsi `downloadBlob(blob, filename)`.
* **Dampak**: 
  * Menghilangkan duplikasi manipulasi DOM `document.createElement('a')` di 7 tempat berbeda.
  * Mencegah memory leak di browser melalui pembersihan otomatis `URL.revokeObjectURL(url)` setelah 100ms.
  * Dibuat fungsi terpusat `downloadShiftReportPdf` di `reportService.js` yang menyatukan alur unduh laporan dinas antara versi Desktop dan Mobile (*Single Source of Truth*).

### 3. Pembersihan Dead Code Alias Dwibahasa & Pengayaan `formatIndoDate`
* **Tindakan**:
  * Dihapus 6 fungsi alias mati di `shiftHelper.js` (`bersihkanNamaRegu`, `formatNamaRegu`, `ambilReguTerjadwal`, `ambilJadwalHarian`, `ambilShiftOperasionalSaatIni`, `formatTanggalIndonesia`).
  * Fungsi `formatIndoDate` diperkaya dengan opsi kustom serta proteksi parsing `NaN`.
  * Komponen profil Desktop (`DesktopProfileModal.jsx`) dan Mobile (`MobileProfileView.jsx`, `MobilePersonnelAccordion.jsx`) kini memanfaatkan fungsi standar dari `shiftHelper.js`.

### 4. Unifikasi Backend: `roleMapper.js` & `officialHelper.js`
* **Tindakan**:
  * Dibuat modul sentral `backend/src/utils/roleMapper.js` menampung `mapRankPositionToRole`, `isLeadershipRole`, `isPrivilegedRole`, dan `cleanTeam`. Menghubungkan kembali impor terputus pada `personnelDocumentController.js` yang berpotensi crash runtime.
  * Dibuat modul `backend/src/utils/officialHelper.js` untuk menyatukan query penandatangan resmi `getOfficialSignatory()`, mengeliminasi duplikasi query SQL manual di `reportController.js`, `deploymentController.js`, dan `personnelController.js`.
  * Diterapkan fungsi `cleanTeam` secara seragam di `dashboardController.js` untuk mencegah masalah case-sensitivity pada query SQL database.

---

## BAGIAN 3: RIWAYAT IMPLEMENTASI FITUR & ATURAN BISNIS COMMIT SEBELUMNYA
*Selesai Dikerjakan & Terverifikasi (Commit `1dec3f8` s.d. `dd32c99`)*

### 1. Proteksi Mutasi Personel Bertugas Aktif (*Safeguard Anti-Bentrok Dinas*)
* **Status**: Stabil & Teruji (Commit `92d7329`).
* **Implementasi**: Di `backend/src/controllers/personnelController.js`, sistem secara otomatis menolak dan memblokir mutasi regu (`team_group`), penonaktifan (`is_active = 0`), atau penghapusan personel jika yang bersangkutan sedang tercatat aktif bertugas di armada atau posko shift berjalan. Chief wajib memindahkan slot penugasan di Ploting terlebih dahulu sebelum mutasi dapat diproses admin.

### 2. Standarisasi Akses Profil Mandiri di Header Navigasi Atas (Top App Bar)
* **Status**: Stabil & Teruji (Commit `1dec3f8`).
* **Implementasi**: Akses Profil Pribadi, data kredensial STKP, dan arsip dokumen kepegawaian di seluruh role (Admin, Chief, Kru) diseragamkan ditempatkan di Header Atas melalui avatar pengguna (`Navbar.jsx` dan `MobileHeader.jsx`). Menu Profil dihapus dari Bottom Navigation Bar Mobile sesuai aturan Butir 9 `GEMINI.md`.

### 3. Pembersihan Data Non-Operasional Golongan Darah
* **Status**: Stabil & Teruji (Commit `1dec3f8` & `b8b8ab7`).
* **Implementasi**: Seluruh atribut input, kolom tabel, dan label `blood_type` (Golongan Darah) dihapus dari seluruh antarmuka dan skema laporan operasional karena bukan merupakan data kelaikan tugas ARFF.

### 4. Penataan Hierarki Sidebar Navigasi
* **Status**: Stabil & Teruji (Commit `73de10e`).
* **Implementasi**: Menu Manajemen Izin/Cuti diposisikan tepat di atas Roster/Jadwal Dinas di `Sidebar.jsx`, menciptakan alur navigasi kerja yang logis dan runtut bagi pengguna manajerial.

### 5. Default Status Kesiapan Armada "Belum Dicek"
* **Status**: Stabil & Teruji (Commit `dd32c99`).
* **Implementasi**: Default status kesiapan kendaraan pada shift berjalan yang belum diperiksa oleh PIC armada berstatus `belum_dilaporkan` (*Belum Dicek*). Jika ada kendala carry-over dari shift sebelumnya yang belum diselesaikan (`unserviceable`), status otomatis terbawa rusak. Kendaraan baru berstatus `serviceable` setelah dilakukan pemeriksaan fisik operasional.

### 6. Layanan Ekspor Dokumen Resmi PDF
* **Status**: Stabil & Dimodularisasi (Commit `dd32c99` & `589c033`).
* **Implementasi**: Tersedia generator dokumen PDF kedinasan lengkap dengan kop resmi PT Angkasa Pura Indonesia, tabel matriks dinas, dan tanda tangan digital terpasang nyata (Laporan Dinas Shift, Kelaikan Armada, Investigasi Insiden, Rekap Kegiatan, Dossier Personel).

### 7. Status Halaman Dashboard Dikosongkan (Coming Soon)
* **Status**: Stabil & Terkunci (Aturan Butir 13 `GEMINI.md`).
* **Implementasi**: Halaman `frontend/src/pages/HalamanDashboard.jsx` dikosongkan dan hanya menampilkan teks 'Coming Soon' sesuai instruksi eksplisit pengguna.

### 8. Proteksi Hak Akses Ploting Dinas ("Bukan Shift Dinas Anda")
* **Status**: Stabil & Teruji (Aturan Ploting `GEMINI.md`).
* **Implementasi**: Halaman Ploting hanya dapat diakses dan diubah oleh regu yang sedang bertugas aktif pada shift berjalan. Jika bukan shift user, antarmuka menolak rendering form armada dan menampilkan layar *"Bukan Shift Dinas Anda"*, serta membatalkan fetch data ploting berat ke server demi menghemat bandwidth.

### 9. Penghapusan Fitur "Sahkan Shift" (Sistem Tanpa Pengesahan Manual)
* **Status**: Stabil & Teruji (Aturan Butir 2 `GEMINI.md`).
* **Implementasi**: Tombol "Sahkan Shift" dihapus menyeluruh dari desktop dan mobile. Laporan dinas bersifat transparan dan otomatis terekapitulasi dari data operasional shift yang berjalan tanpa penguncian manual.

### 10. Batasan Kuota Cuti Mandiri (Maksimal 2 Cuti Berjalan) & Anti-Overlap
* **Status**: Stabil & Teruji (Aturan Butir 19 `GEMINI.md`).
* **Implementasi**: Setiap personel dibatasi maksimal memiliki 2 pengajuan cuti yang sedang/akan berjalan. Sistem memblokir pengajuan tanggal cuti yang beririsan (*anti-overlap*), dan menyajikan data dalam format Paket Pengajuan Terpadu.

### 11. Autentikasi Fleksibel Pengunduhan Dokumen Lampiran (`?token=...` Fallback)
* **Status**: Stabil & Teruji (Aturan Butir 16 `GEMINI.md`).
* **Implementasi**: Seluruh endpoint file/attachment di backend mendukung autentikasi via header `Authorization: Bearer <token>` maupun query parameter fallback `?token=...` sehingga pembukaan dokumen di tab baru browser tidak menghasilkan error HTTP 401 Unauthorized.

### 12. Katalog Personel Fokus pada 4 Regu Dinas Operasional
* **Status**: Stabil & Teruji (Aturan Butir 12 `GEMINI.md`).
* **Implementasi**: Seluruh antarmuka katalog personel difokuskan 100% pada 4 regu dinas operasional (Alpha, Bravo, Charlie, Delta), tanpa tab atau filter terpisah untuk Dept. Head di dalam katalog regu.

---

## BAGIAN 4: RESOLUSI TEMUAN DEEP AUDIT & OPTIMASI LINTAS DOMAIN (EKSEKUSI 5 AGENT)
*Selesai Dikerjakan & Terverifikasi*

### 1. Pembuatan Aset Vektor Resmi Favicon (`frontend/public/shield-alert.svg`) & Meta Description (`frontend/index.html`)
* **Konteks Masalah**: Permintaan `/shield-alert.svg` sebelumnya mengembalikan fallback HTML `index.html` berukuran 1.1 kB karena ketiadaan berkas fisik di folder `public/`, serta `index.html` belum memiliki `<meta name="description">`.
* **Solusi Konkret**:
  * Dibuat aset vektor SVG resmi `frontend/public/shield-alert.svg` menggunakan palet warna ARFF (`#ea580c` dan `#f97316`) tanpa efek glow berlebihan.
  * Ditambahkan `<meta name="description" content="Sistem Pemantauan Operasional ARFF YIA - Monitoring Personel, Armada, dan Laporan Dinas Shift" />` pada `frontend/index.html`.
* **Berkas Terpengaruh**: `frontend/public/shield-alert.svg`, `frontend/index.html`.

### 2. Perbaikan Aksesibilitas WCAG AA & Standarisasi Anti-Slop Desktop (`Navbar.jsx`, `ShiftHeaderCard.jsx`, `OfficialsManagementPage.jsx`, `ShiftReportsPage.jsx`)
* **Konteks Masalah**:
  * Placeholder nama Department Head menggunakan nama pejabat hardcoded.
  * Rasio kontras teks keterangan di laporan dinas (`text-slate-400`) di bawah standar WCAG AA (4.5:1).
  * Tombol profil di `Navbar.jsx` memiliki `aria-label` statis yang tidak sesuai dengan nama pengguna yang tampil (*Accessible Name Mismatch*).
  * Kartu metrik insiden pada `ShiftHeaderCard.jsx` memiliki styling tombol interaktif tanpa aksi klik (*Dead Control*), badge menggunakan jargon filler *"Rekapitulasi Berjalan (Real-Time)"* dengan animasi `animate-ping` terus-menerus, serta terjadi pengulangan informasi shift antara `Navbar.jsx` dan `ShiftHeaderCard.jsx`.
* **Solusi Konkret**:
  * Mengubah placeholder nama pejabat di `OfficialsManagementPage.jsx` menjadi generik (`"Masukkan nama lengkap beserta gelar resmi..."`).
  * Meningkatkan kontras warna teks di `ShiftReportsPage.jsx` dan `MobileSignaturesSection.jsx` menjadi `text-slate-600 font-medium` / `text-slate-500 font-medium`.
  * Menyelaraskan `aria-label` tombol profil di `Navbar.jsx` dengan nama pengguna aktif (`Profil ${user?.name || user?.username}`).
  * Mengarahkan klik kartu insiden pada `ShiftHeaderCard.jsx` ke rute `/incidents`, menghapus jargon *"Rekapitulasi Berjalan (Real-Time)"* beserta `animate-ping`, dan menyederhanakan tampilan informasi shift di `Navbar.jsx`.
* **Berkas Terpengaruh**: `frontend/src/components/layout/Navbar.jsx`, `frontend/src/components/dashboard/ShiftHeaderCard.jsx`, `frontend/src/pages/OfficialsManagementPage.jsx`, `frontend/src/pages/ShiftReportsPage.jsx`, `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`.

### 3. Pemasangan React Error Boundary Global (`ErrorBoundary.jsx` & `main.jsx`)
* **Konteks Masalah**: Ketiadaan penangkap kesalahan render React berisiko menyebabkan layar putih kosong (*white screen crash*) apabila terjadi runtime error pada salah satu komponen anak.
* **Solusi Konkret**: Dibuat komponen `frontend/src/components/common/ErrorBoundary.jsx` lengkap dengan tombol muat ulang dan kembali ke beranda, serta membungkus `<App />` di `frontend/src/main.jsx`.
* **Berkas Terpengaruh**: `frontend/src/components/common/ErrorBoundary.jsx`, `frontend/src/main.jsx`.

### 4. Penerapan `AbortController` pada 11 Halaman Utama Desktop & Mobile serta Koordinasi Fetch `LeaveManagementPage.jsx`
* **Konteks Masalah**: Pemanggilan `api.get()` di dalam `useEffect` tanpa sinyal pembatalan berisiko memicu *race condition* saat pengguna mengganti filter regu/tanggal dengan cepat. Selain itu, `LeaveManagementPage.jsx` memicu 4 request terpisah sekaligus saat mount.
* **Solusi Konkret**:
  * Menerapkan `AbortController` dan cleanup `controller.abort()` pada 6 halaman desktop (`PersonnelPage.jsx`, `DeploymentPage.jsx`, `ActivitiesPage.jsx`, `IncidentsPage.jsx`, `VehicleReadinessPage.jsx`, `LeaveManagementPage.jsx`) serta 5 halaman mobile (`MobileDashboard.jsx`, `MobileDeployment.jsx`, `MobileActivities.jsx`, `MobileIncidents.jsx`, `MobileReports.jsx`).
  * Mengoordinasikan pengambilan data awal di `LeaveManagementPage.jsx` dengan `Promise.allSettled` dan menunda pengambilan riwayat bulanan secara *lazy* hanya ketika tab riwayat bulanan dibuka.
* **Berkas Terpengaruh**: `PersonnelPage.jsx`, `DeploymentPage.jsx`, `ActivitiesPage.jsx`, `IncidentsPage.jsx`, `VehicleReadinessPage.jsx`, `LeaveManagementPage.jsx`, `MobileDashboard.jsx`, `MobileDeployment.jsx`, `MobileActivities.jsx`, `MobileIncidents.jsx`, `MobileReports.jsx`.

### 5. Integrasi Kompresi Foto Kamera WebP Klien Mobile & Deteksi Jaringan Offline Mobile
* **Konteks Masalah**: Foto kamera ponsel beresolusi tinggi (5–12 MB) pada modal kegiatan dan insiden mobile diunggah mentah tanpa kompresi kanvas, serta kru lapangan di area apron tidak mendapatkan indikator visual ketika perangkat kehilangan sinyal internet.
* **Solusi Konkret**:
  * Mengintegrasikan utilitas `compressImageToWebP` (resolusi maks 1280x1280px, kualitas 0.8) pada `MobileActivityModal.jsx` dan `MobileIncidentModal.jsx`.
  * Membuat komponen `frontend/src/components/common/OfflineBanner.jsx` berbasis event `online`/`offline` dan memasangnya pada `MobileLayout.jsx`.
* **Berkas Terpengaruh**: `frontend/src/components/mobile/activities/MobileActivityModal.jsx`, `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`, `frontend/src/components/common/OfflineBanner.jsx`, `frontend/src/components/mobile/MobileLayout.jsx`.

### 6. Penguatan Keamanan RBAC, Anti-IDOR Kegiatan, Rate Limiting Login, & Revokasi Token JWT
* **Konteks Masalah**:
  * Endpoint `PUT /api/activities/:id` dan `DELETE /api/activities/:id` belum memverifikasi kepemilikan regu/pencatat kegiatan (*IDOR*).
  * Terdapat ketidaksinkronan daftar role antara `activityRoutes.js` dan `activityController.js`.
  * Endpoint `POST /api/auth/login` belum dilindungi pembatas frekuensi percobaan (*rate limiter*).
  * Pergantian kata sandi belum membatalkan sesi token JWT lama yang sudah terbit.
* **Solusi Konkret**:
  * Menambahkan validasi kepemilikan regu dan pencatat (`created_by`) pada `updateActivity` serta `deleteActivity` di `activityController.js`, dan menyelaraskan middleware otorisasi di `activityRoutes.js`.
  * Memasang `express-rate-limit` (maksimal 10 percobaan gagal per 15 menit per IP) pada rute `/api/auth/login` di `authRoutes.js`.
  * Mengimplementasikan pengecekan `token_version` di `authController.js` dan `authMiddleware.js` saat login, ganti password, dan logout.
* **Berkas Terpengaruh**: `backend/src/routes/activityRoutes.js`, `backend/src/controllers/activityController.js`, `backend/src/routes/authRoutes.js`, `backend/src/controllers/authController.js`, `backend/src/middleware/authMiddleware.js`.

### 7. Proteksi Concurrency Database (`FOR UPDATE`), Transaksi Atomik, Indeks Komposit, & Sinkronisasi Pejabat Struktural
* **Konteks Masalah**:
  * Penomoran laporan insiden (`generateNextReportNumber`), pengajuan cuti (`requestLeaveRange`), kesiapan armada (`submitVehicleReadiness`), siklus jadwal (`saveScheduleCycle` & `resetScheduleCycles`), dan pembatalan cuti (`cancelLeave`) rentan terhadap kondisi balapan (*race condition*) atau ketiadaan transaksi atomik.
  * Tabel `incidents` dan `personnel_deployments` belum memiliki indeks komposit untuk filter laporan harian/shift.
  * Pergantian pejabat di `officialsController.js` berisiko meninggalkan ketidaksinkronan nama/role antara tabel `users` dan `personnel`.
* **Solusi Konkret**:
  * Menambahkan klausa penguncian baris `FOR UPDATE` dan mekanisme retry `ER_DUP_ENTRY` pada `incidentController.js`.
  * Membungkus operasi mutasi di `leaveController.js`, `readinessController.js`, dan `scheduleController.js` ke dalam transaksi atomik (`beginTransaction`, `commit`, `rollback`).
  * Menambahkan indeks komposit `idx_incidents_date_shift_team` pada `incidents` serta `idx_deployments_personnel_shift` dan `idx_deployments_personnel_type` pada `personnel_deployments` di `backend/src/config/schema.sql`.
  * Menyelaraskan pembaruan akun `users` dan `personnel` secara atomik di `officialsController.js`.
* **Berkas Terpengaruh**: `backend/src/controllers/incidentController.js`, `backend/src/controllers/leaveController.js`, `backend/src/controllers/readinessController.js`, `backend/src/controllers/scheduleController.js`, `backend/src/controllers/officialsController.js`, `backend/src/config/schema.sql`.

### 8. Optimasi Performa Jaringan (Gzip), Route Code Splitting, Header Caching, & Engine PDF Laporan Shift
* **Konteks Masalah**:
  * Bundel utama frontend mencapai > 830 kB karena impor halaman statis di `App.jsx`.
  * Respons JSON Express belum dikompresi Gzip dan berkas statis `/uploads` serta lampiran surat edaran belum memiliki header `Cache-Control`.
  * Endpoint `GET /api/personnel` mengirim payload ganda (`data` dan `personnel`).
  * Cache PDF di memori server tidak memiliki batas ukuran byte, tanda tangan WebP dilewati oleh PDFKit pada laporan shift, dan kotak teks kronologi insiden di PDF laporan shift memiliki tinggi statis.
* **Solusi Konkret**:
  * Menerapkan `React.lazy()` dan `<Suspense>` pada seluruh rute di `frontend/src/App.jsx` serta `manualChunks` di `frontend/vite.config.js` (ukuran chunk terbesar turun menjadi 163 kB).
  * Mengaktifkan middleware `compression` dan header `Cache-Control` pada `backend/src/app.js` serta `announcementController.js`.
  * Menghapus duplikasi key `personnel` pada `personnelController.js`.
  * Menambahkan transcoding otomatis tanda tangan WebP ke PNG Buffer via `resolveSignatureBuffer` (`sharp`), batas memori LRU Cache PDF (maks 10 dokumen / 50 MB RAM) di `pdfHelpers.js`, serta kalkulasi tinggi dinamis `doc.heightOfString` di `shiftReportPdf.js`.
* **Berkas Terpengaruh**: `frontend/src/App.jsx`, `frontend/vite.config.js`, `backend/src/app.js`, `backend/src/controllers/personnelController.js`, `backend/src/controllers/announcementController.js`, `backend/src/routes/announcementRoutes.js`, `backend/src/services/pdf/pdfHelpers.js`, `backend/src/services/pdf/shiftReportPdf.js`.


---

## 5. Penyelesaian Regresi & Penyempurnaan Audit Penuh oleh Supervisor (Semua 15 Item Tuntas)

### 1. Perbaikan Crash `ReferenceError: useState is not defined` & Penghapusan `animate-pulse`
* **Konteks Masalah**:
  * Impor `import React, { useState } from 'react';` pada `MobileIncidentModal.jsx` tidak sengaja terhapus saat penambahan `compressImageToWebP`, menyebabkan crash saat membuka halaman insiden mobile.
  * Dot indikator status pada `DeploymentSlotCard.jsx`, `MobilePicReadinessForm.jsx`, dan `MobileIncidentModal.jsx` masih menggunakan animasi berkedip tanpa henti (`animate-pulse`).
* **Solusi Konkret**:
  * Mengembalikan baris `import React, { useState } from 'react';` di baris pertama `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`.
  * Menghapus class `animate-pulse` dari `DeploymentSlotCard.jsx`, `MobilePicReadinessForm.jsx`, dan `MobileIncidentModal.jsx` sehingga indikator berstatus tenang dan statis.
* **Berkas Terpengaruh**: `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`, `frontend/src/components/forms/DeploymentSlotCard.jsx`, `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx`.

### 2. Perbaikan Error SQL 500 Kolom `p.photo_url` pada Mode `?compact=true` & Reset Kandidat Ploting Mobile Lintas Regu
* **Konteks Masalah**:
  * Mode proyeksi ringkas `?compact=true` pada `personnelController.js` menyertakan kolom `p.photo_url` yang tidak ada di `schema.sql`, memicu HTTP 500 saat memilih anggota di ploting mobile.
  * State `personnelList` di `MobileDeployment.jsx` tidak di-reset saat `activeTeam` berganti.
* **Solusi Konkret**:
  * Menghapus `p.photo_url` dari daftar kolom `compact` pada `backend/src/controllers/personnelController.js`.
  * Menambahkan `useEffect(() => { setPersonnelList([]); }, [activeTeam]);` pada `frontend/src/pages/mobile/MobileDeployment.jsx`.
* **Berkas Terpengaruh**: `backend/src/controllers/personnelController.js`, `frontend/src/pages/mobile/MobileDeployment.jsx`.

### 3. Perbaikan Endpoint Agregasi `GET /api/reports/shift-summary`, Integrasi `reportService.js`, & Transcoding Tanda Tangan WebP di Seluruh Generator PDF
* **Konteks Masalah**:
  * Fungsi `getShiftSummaryReport` di `reportController.js` memanggil kolom fiktif `severity` pada tabel `incidents`, belum menyertakan logika carry-over kelaikan armada dan `vehicle_issues`, serta belum digunakan oleh `frontend/src/services/reportService.js`.
  * Empat generator PDF lainnya (`vehicleReportPdf.js`, `incidentReportPdf.js`, `activitiesReportPdf.js`, `personnelReportPdf.js`) masih memakai `resolveSignatureFile` sinkron yang melewati berkas tanda tangan `.webp`, serta `personnelReportPdf.js` masih memiliki fallback nama pejabat statis.
* **Solusi Konkret**:
  * Memperbaiki `getShiftSummaryReport` di `backend/src/controllers/reportController.js` agar menarik seluruh kolom valid `incidents`, menghitung status kelaikan armada beserta carry-over kendala aktif, dan menyertakan `vehicle_issues` melalui helper terpadu `fetchVehicleIssuesAuditData`.
  * Mengubah `fetchShiftReportData` di `frontend/src/services/reportService.js` agar cukup memanggil 1 request tunggal `GET /api/reports/shift-summary` (menggantikan 6 request paralel).
  * Mengubah `generateVehicleReadinessReportPdf`, `generateIncidentSummaryReportPdf`, `generateActivitiesReportPdf`, dan `generatePersonnelAccountsPdf` menjadi fungsi `async` dengan `await resolveSignatureBuffer(...)`, menghapus fallback nama pejabat statis di `personnelReportPdf.js`, dan menambahkan `await` pada pemanggilannya di `reportController.js` serta `personnelController.js`.
* **Berkas Terpengaruh**: `backend/src/controllers/reportController.js`, `backend/src/controllers/personnelController.js`, `frontend/src/services/reportService.js`, `backend/src/services/pdf/vehicleReportPdf.js`, `backend/src/services/pdf/incidentReportPdf.js`, `backend/src/services/pdf/activitiesReportPdf.js`, `backend/src/services/pdf/personnelReportPdf.js`.

### 4. Sinkronisasi Skema Database (`schema.sql`), Urutan Lock Transaksi Cuti, Sanitasi Error 500, & Pembersihan Dead Code
* **Konteks Masalah**:
  * Kolom `token_version` pada `users` dan `created_by` pada `daily_shift_activities` belum tercatat di `backend/src/config/schema.sql`.
  * Berkas `backend/src/controllers/rosterController.js` tidak digunakan (*dead file*), `cancelLeave` di `leaveController.js` memiliki urutan penguncian tabel yang terbalik terhadap `requestLeaveRange` serta memutasi `personnel.is_active = 1`, dan pencarian dokumen personel di `app.js` masih memakai wildcard `LIKE '%filename'`.
  * Middleware `errorHandler.js` belum dipasang di `app.js` dan `errorResponse` masih meneruskan detail mentah error SQL pada status 500.
* **Solusi Konkret**:
  * Menambahkan `token_version INT NOT NULL DEFAULT 1` pada tabel `users`, `created_by INT NULL` (beserta `fk_dsa_creator` dan `idx_dsa_shift_type`) pada `daily_shift_activities`, serta mengganti kolom `file_path` dengan `INDEX idx_personnel_documents_filename (file_name)` pada `personnel_documents` di `backend/src/config/schema.sql`.
  * Mengubah query verifikasi kepemilikan dokumen di `backend/src/app.js` menjadi `WHERE pd.file_name = ? OR pd.file_url = ?` dan memasang middleware `errorHandler` di `backend/src/app.js`.
  * Menambahkan sanitasi pesan error internal untuk `statusCode >= 500` pada `backend/src/utils/responseHelper.js`.
  * Menyelaraskan urutan penguncian `FOR UPDATE` di `cancelLeave` (`backend/src/controllers/leaveController.js`) agar selalu mengunci `personnel` terlebih dahulu sebelum `personnel_deployments`, menghapus `UPDATE personnel SET is_active = 1`, dan menghapus berkas mati `backend/src/controllers/rosterController.js`.
* **Berkas Terpengaruh**: `backend/src/config/schema.sql`, `backend/src/app.js`, `backend/src/utils/responseHelper.js`, `backend/src/controllers/leaveController.js`, `backend/src/controllers/rosterController.js` (dihapus).

### 5. Akurasi Total Personel Regu di Dashboard Mobile, Optimasi Unread Count, Lazy Load Pejabat, `AbortController`, Unifikasi `formatIndoDate`, & `OfflineBanner` Desktop
* **Konteks Masalah**:
  * Perhitungan `totalStrength` di `MobileDashboard.jsx` hanya menjumlahkan personel yang sudah diploting, komponen `<MobileLeaveModal>` terpasang ganda antara `MobileLayout.jsx` dan `MobileDashboard.jsx`, serta terdapat pengulangan teks nama regu/shift di bawah header mobile.
  * `Sidebar.jsx` dan `MobileHeader.jsx` masih memanggil `/announcements` penuh alih-alih `/announcements/unread-count`.
  * `OfficialsManagementPage.jsx` masih memuat seluruh katalog personel di awal muat halaman, 7 halaman desktop belum dilengkapi `AbortController`, 6 komponen masih menduplikasi fungsi format tanggal lokal, dan `AppLayout.jsx` belum memasang `OfflineBanner`.
* **Solusi Konkret**:
  * Menambahkan perhitungan `total_team_members` pada `getCurrentDeployment` (`backend/src/controllers/deploymentController.js`) dan menggunakannya sebagai sumber utama `totalStrength` di `MobileDashboard.jsx`.
  * Menghapus instansiasi ganda `<MobileLeaveModal>` serta teks regu/shift redundan di `MobileDashboard.jsx` dan mengintegrasikannya dengan modal global di `MobileLayout.jsx` via custom event `arff:open-leave-modal` & `arff:leave-updated`.
  * Mengarahkan polling badge pengumuman di `Sidebar.jsx` dan `MobileHeader.jsx` ke endpoint ringan `/announcements/unread-count`.
  * Menerapkan *lazy fetch* `/personnel?is_active=1&compact=true` saat modal ganti Chief dibuka di `OfficialsManagementPage.jsx`, serta memasang `AbortController` pada `OfficialsManagementPage.jsx`, `AnnouncementsPage.jsx`, `IncidentDetailPage.jsx`, `IncidentReportsPage.jsx`, `PersonnelDetailPage.jsx`, `RosterSchedulePage.jsx`, dan `VehicleReportsPage.jsx`.
  * Menyatukan pemformatan tanggal di `VehicleReportsPage.jsx`, `AnnouncementsPage.jsx`, `PersonnelDossier.jsx`, `MobileAnnouncementsModal.jsx`, `WatchroomReadinessModal.jsx`, dan `VehicleReadinessModal.jsx` menggunakan `formatIndoDate` dari `frontend/src/utils/shiftHelper.js`.
  * Memasang komponen `<OfflineBanner />` pada `frontend/src/components/layout/AppLayout.jsx`.
* **Berkas Terpengaruh**: `backend/src/controllers/deploymentController.js`, `frontend/src/pages/mobile/MobileDashboard.jsx`, `frontend/src/components/mobile/MobileLayout.jsx`, `frontend/src/components/layout/Sidebar.jsx`, `frontend/src/components/mobile/MobileHeader.jsx`, `frontend/src/pages/OfficialsManagementPage.jsx`, `frontend/src/pages/AnnouncementsPage.jsx`, `frontend/src/pages/IncidentDetailPage.jsx`, `frontend/src/pages/IncidentReportsPage.jsx`, `frontend/src/pages/PersonnelDetailPage.jsx`, `frontend/src/pages/RosterSchedulePage.jsx`, `frontend/src/pages/VehicleReportsPage.jsx`, `frontend/src/components/personnel/PersonnelDossier.jsx`, `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`, `frontend/src/components/forms/WatchroomReadinessModal.jsx`, `frontend/src/components/forms/VehicleReadinessModal.jsx`, `frontend/src/components/layout/AppLayout.jsx`.
