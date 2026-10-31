# PANDUAN KERJA & PROSEDUR PENUGASAN SUBAGENT (AGENTS.md)
**Sistem Pemantauan Operasional ARFF YIA (Airport Crash Monitoring & Management System - ACMS)**  
Bandara Internasional Yogyakarta (YIA) - PT Angkasa Pura Indonesia

---

## 1. PROSEDUR PENUGASAN & ORKESTRASI SUBAGENT OTOMATIS

### A. Prinsip Eksekusi Otomatis (Zero-Friction Orchestration)
1. **Langsung Eksekusi Tanpa Birokrasi:**
   - Ketika pengguna memberikan instruksi (misal: *"Audit halaman X"*, *"Perbaiki fitur Y"*, *"Bersihkan redundansi Z"*), agen utama **WAJIB langsung memecah tugas dan mempekerjakan subagent secara otomatis** tanpa meminta persetujuan langkah manual bertahap.
   - Prosedur penugasan manual lama ditiadakan; subagent bekerja secara otonom di latar belakang melalui mekanisme subagent Antigravity.

### B. Pembagian Peran Kondisional & Dinamis
1. **Fleksibel & Berorientasi Instruksi Pengguna:**
   - Pembagian peran subagent **TIDAK DIKUNCI SECARA STATIS**.
   - Peran subagent dibentuk secara **KONDISIONAL** menyesuaikan arahan spesifik dari pengguna pada setiap sesi, contohnya:
     - Audit halaman tertentu (Subagent Frontend Per-Halaman, Subagent Mobile/Cross-Platform, Subagent Backend/API).
     - Pengujian fungsional dan integritas (Subagent Security Auditor, Subagent PDF Engine, Subagent Data Contract).
     - Refaktorisasi dan perampingan kode (Subagent Ponytail Cleaner, Subagent Architecture Modularizer).
   - Jumlah subagent yang aktif menyesuaikan skala dan kebutuhan tugas (bisa 1, 2, 3, atau lebih).

### C. Mandat Verifikasi Mandiri & Kebersihan Resource
1. **Verifikasi Terminal Wajib (Strict Verification):**
   - Setiap subagent yang melakukan perubahan kode wajib memvalidasi hasilnya secara mandiri sebelum melapor:
     - Frontend: `npm run build --prefix frontend` (wajib exit code 0 tanpa error).
     - Backend: syntax check `node -c <file>` atau verifikasi test runner terminal.
2. **Kebersihan Resource (Zero Zombie Processes):**
   - Setelah seluruh subagent menyelesaikan pekerjaannya dan laporan terkonsolidasi, agen utama wajib segera mematikan seluruh subagent (`manage_subagents kill_all`).
   - Dilarang keras meninggalkan subagent atau proses latar belakang yang menggantung (*no zombie processes*).

---

## 2. ATURAN KETAT PERFORMA & FRONTEND (STRICT INP & LCP)

1. **Anti-Lag Form Input (< 16ms Respons):**
   - Dilarang keras memasang CSS `transition-all` pada elemen input form (`<input>`, `<textarea>`, `<select>`). Gunakan `transition-colors duration-100`.
   - Dilarang menggunakan `backdrop-filter: blur(...)` pada overlay modal aktif saat terdapat input form (mencegah rasterisasi ulang GPU per ketukan keyboard).
   - Dilarang melakukan network request / re-fetch data otomatis saat user sedang mengetik di dalam form.
2. **Standar LCP (Largest Contentful Paint < 250ms):**
   - Dilarang memuat background image berat (> 100 kB) pada kontainer utama di atas fold. Wajib gunakan CSS gradient murni untuk performa LCP instan.
3. **SVG & Unique ID:**
   - Semua SVG yang mengandung `<linearGradient>` wajib menggunakan `useId()` untuk mencegah tabrakan ID DOM yang membuat ikon hilang/transparan.

---

## 3. PRINSIP PONYTAIL & ANTI-REDUNDANSI (SIMPLICITY FIRST)

1. **Solusi Paling Sederhana (YAGNI):**
   - Prioritaskan standar library dan fitur bawaan platform sebelum menambahkan ketergantungan/library baru.
   - Hapus kode mati (*dead code*), import yang tidak terpakai, variabel yatim, dan handler tanpa fungsi.
2. **Satu Aksi, Satu Tempat:**
   - Dilarang membuat tombol aksi ganda untuk fungsi yang sama dalam satu halaman.
   - Dilarang mengulang teks statistik atau label metrik yang sama secara berlebihan dalam satu viewport.
3. **Penyatuan Komponen (DRY):**
   - Komponen modal, audit unit, dan pratinjau dokumen wajib menggunakan *Single Source of Truth* dari service terpusat (`reportService.js`, `api.js`, dsb.).

---

## 4. KEAMANAN & INTEGRITAS DATA OPERASIONAL

1. **Proteksi Tanda Tangan & Status Pengesahan:**
   - Tanda tangan digital pimpinan (Section Head) hanya boleh dibubuhkan pada dokumen resmi yang status dinasnya telah sah/selesai (`closed`). Dokumen draf wajib memuat penanda/watermark **`DRAFT • BELUM DISAHKAN`**.
   - Path file unggahan tanda tangan dan dokumen wajib disanitasi (`path.basename`) untuk mencegah *path traversal*.
2. **Proteksi Penugasan vs Cuti:**
   - Personel yang tercatat cuti/izin pada shift aktif dilarang ditugaskan pada armada operasional. Jika personel berhalangan, slot penugasan wajib dilepas secara otomatis.
3. **Larangan Browser Testing Otomatis:**
   - Dilarang keras membuka sesi browser otomatis untuk visual verification. Pengujian visual diserahkan sepenuhnya kepada pengguna secara manual di browser mereka sendiri.

---

## 5. LARANGAN METRIK MEDIA PEMADAM ICAO FIKTIF / TIDAK DIMINTA

1. **Dilarang Keras Menyertakan Metrik ICAO (Air Siap Semprot / Foam / DCP / Cat 8):**
   - Dilarang keras menambahkan atau mengarang metrik media pemadam seperti:
     - *Air Siap Semprot (Target 18.200 L)*
     - *Foam Konsentrat (AFFF / Fluoroprotein Siap Pancar)*
     - *Tender Pemadam Utama*
     - *Pelengkap & Respon (450 kg DCP)*
   - Larangan ini berlaku mutlak: **DILARANG di kode aplikasi (frontend/backend) dan DILARANG di laporan audit / dokumentasi tertulis**.
   - Pada panel kanan atas Dashboard, tampilkan panel awal: **"Komposisi Personel Regu Operasional"** (menampilkan 4 baris kompak untuk 4 regu dinas: Regu Alpha, Regu Bravo, Regu Charlie, Regu Delta).

---

## 6. ATURAN BAKU KONSISTENSI UI/UX, ANTI-SLOP, & KESERAGAMAN MODUL

1. **Konsistensi Tipografi & Skala Font:**
   - Dilarang menggunakan ukuran mikro pecahan arbitrer (`text-[9.5px]`, `text-[10.5px]`, `text-[13px]`). Gunakan skala baku Tailwind (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`).
   - Skala font baku Dashboard Operasional:
     - Judul modul / container: `text-sm font-bold`.
     - Judul baris (armada, regu, insiden, pengumuman): `text-sm font-semibold`.
     - Nama Chief pada Card 1: `text-sm font-bold`.
     - Angka metrik Scorecard (Card 3 & 4): `text-xl font-bold font-mono tabular-nums`.
     - Keterangan & sub-teks: `text-xs`.
   - Gunakan `font-sans` untuk teks/label/judul, dan `font-mono tabular-nums` khusus untuk angka metrik, jam, NIP, plat nomor, atau kode laporan.
2. **Penyeragaman Card & Penghapusan Searching (Ploting Dinas, Kesiapan Armada, Personel):**
   - Halaman Ploting Dinas (`DeploymentPage.jsx`) dan Halaman Kesiapan Armada (`VehicleReadinessPage.jsx`) wajib menggunakan desain card unit yang seragam.
   - Filter pencarian teks (search bar) **DIHAPUS PERMANEN** dari Ploting Dinas (`DeploymentPage.jsx`), Kesiapan Armada (`VehicleReadinessPage.jsx`), dan Personel Operasional (`PersonnelPage.jsx`). Dilarang memunculkan input searching kembali.
3. **Penghapusan Container Redundan:**
   - Hapus container *"Presensi & Distribusi Kru Bertugas"* di halaman Report (`ShiftReportsPage.jsx` / `MobileReports.jsx`).
   - Hapus container *"Daftar Personel Izin / Cuti Shift Ini"* di halaman Ploting Dinas (`DeploymentPage.jsx` / `MobileDeployment.jsx`).
4. **Pembersihan Keterangan Filler / Tidak Penting:**
   - Hapus keterangan filler di Dashboard (`DashboardScorecards.jsx`, `DashboardPage.jsx`) seperti *"Ketua Regu (Chief) Operasional"* pada card Pimpinan.
   - **Dilarang keras memunculkan kalimat filler pengumuman *"Harus segera dibaca dan dilaksanakan"*** di Scorecard 2 maupun modal rincian pengumuman.
5. **Aturan Ploting Dinas: Default 3 Kru per Card & Default "Belum Dicek":**
   - Default slot kru per card armada / posko pada halaman Ploting Dinas (`DeploymentPage.jsx` dan `MobileDeployment.jsx`) adalah **3 slot** (1 PIC + 2 Kru Lapangan). Petugas tetap dapat menambah atau mengurangi slot secara dinamis sesuai kebutuhan riil.
   - Dilarang menampilkan indikator kuota kaku *"Lengkap"*, *"Kurang Kru"*, atau rasio `x/3`.
   - Default status kesiapan adalah **"Belum Dicek"** (`belum_dilaporkan`), dan dilarang mencantumkan unsur *"Siap Operasi"* pada status ploting kru.
6. **Anti-Slop Filter UI: Larangan Tombol Filter Hitam Pekat (`bg-slate-900 text-white`):**
   - Dilarang keras menggunakan tombol filter aktif berwarna hitam pekat (`bg-slate-900 text-white`) di seluruh aplikasi pada mode terang.
   - Gunakan pola segmented bar yang bersih (`bg-slate-100` track dengan active `bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/80`) dan filter chips berborder tegas (`bg-white text-slate-900 border border-slate-300 font-bold shadow-2xs`).
7. **Paginasi 10 Personel & Border Animasi Berputar Regu Aktif (Dual Animated Beam):**
   - Pada halaman Personel (`PersonnelPage.jsx`), setiap kartu regu dibatasi menampilkan maksimal **10 personel per halaman** dengan kontrol paginasi (`<` dan `>`) di bagian bawah kartu.
   - Filter regu disajikan dalam bentuk dropdown ringkas tepat di samping badge jumlah personel di heading bar untuk menghemat ruang vertikal.
   - Regu yang sedang aktif dinas (`isActiveShift`) memiliki efek animasi border yang berputar mengelilingi kartu kontainer dengan **2 berkas cahaya simetris** (*dual rotating border beam*) menggunakan warna identitas regu (tanpa teks/badge filler "Shift Aktif").
8. **Filter Kategori Halaman Activities Berbentuk Dropdown di Samping Shift Berjalan:**
   - Pada halaman Activities (`ActivitiesPage.jsx`), filter kategori diubah menjadi elemen dropdown `<select>` ringkas di samping switcher *Shift Berjalan*. Deretan chip kategori horizontal di bawah header dihapus permanen.
9. **Ploting Dinas Tanpa Fitur Input Kelaikan & Warna Slot Kru/PIC:**
   - Halaman Ploting Dinas (`DeploymentPage.jsx` & `DeploymentSlotCard.jsx`) tidak memuat tombol/modal input pemeriksaan kesiapan fisik armada.
   - Slot PIC (#1) tetap berwarna kuning/amber (`border-amber-300 bg-amber-50/40`) baik saat kosong maupun terisi (tidak berubah menjadi abu-abu).
   - Slot kru yang ditugaskan diberi warna penanda biru yang jelas (`border-blue-200 bg-blue-50/40`) saat terisi personel.
10. **Filter Status Halaman Incidents Berbentuk Dropdown:**
   - Pada halaman Incidents (`IncidentsPage.jsx`), filter triage/status diubah menjadi dropdown `<select>` ringkas di samping switcher *Shift Ini / Semua Riwayat*, seragam dengan halaman Activities dan Personel.
11. **Larangan Penggunaan Istilah 'Laik Operasi' (Wajib 'Serviceable'):**
   - Istilah *"Laik Operasi"* dihapus permanen dari seluruh antarmuka aplikasi, teks status, modal, badge, maupun dokumentasi sistem.
   - Status armada yang siap beroperasi wajib secara baku menggunakan istilah resmi **"Serviceable"**.
   - Tiga status kesiapan armada operasional yang diakui: **"Belum Dicek"** (`belum_dilaporkan`), **"Serviceable"** (`serviceable`), dan **"Unserviceable"** (`unserviceable`).






