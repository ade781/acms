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

