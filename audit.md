# AUDIT SISTEM & RENCANA KERJA PENYELARASAN ACMS ARFF YIA

Dokumen ini mendokumentasikan analisis mendalam dan rencana eksekusi atas feedback operasional:

---

## 1. Analisis & Tanggapan terhadap 3 Prioritas Feedback

### Prioritas 1: Konsistensi Aturan Bisnis & Keamanan Hak Akses
1. **Penyelarasan `plan.md` dengan `GEMINI.md`**:
   - **Status**: ✅ **Telah Diselaraskan Langsung**.
   - **Tindakan**: Menghapus baris "Sahkan Shift" (nomor 23 lama) dan "Kelola master kategori insiden" (nomor 26 lama) dari matriks hak akses di `plan.md`. Tidak ada lagi potensi ambiguitas bagi agent berikutnya.
2. **Pengamanan Berkas Privat (`/uploads`)**:
   - **Tindakan Lanjutan**: Pengujian IDOR (*Insecure Direct Object Reference*) dan bypass URL token. Seluruh dokumen personel (`document-*`) dan tanda tangan digital (`signature-*`) diisolasi dengan middleware autentikasi dan otorisasi kepemilikan (`isOwner` atau `isLeadership`).
3. **Pemeriksaan Fail-Fast `JWT_SECRET`**:
   - **Status**: ✅ **Telah Diterapkan di `backend/src/server.js`**.
   - **Tindakan**: Pada lingkungan produksi (`NODE_ENV === 'production'`), jika secret lemah, default, atau < 32 karakter, server langsung berhenti (`process.exit(1)`) demi mencegah eksploitasi token.

### Prioritas 2: Integritas Data Operasional & Validasi Backend
1. **Integritas Penugasan vs Cuti**:
   - **Tindakan**: Seluruh mutasi cuti dan ploting wajib dibungkus transaksi database (`connection.beginTransaction()`, `commit()`, `rollback()`). Saat personel mengajukan cuti, penugasan di unit operasional shift tersebut otomatis dilepas secara atomik.
2. **Anti-Race Condition Ploting Slot**:
   - **Tindakan**: Backend `saveDeploymentBatch` memvalidasi bahwa tidak ada 2 personel yang mengisi slot yang sama, serta menolak kru yang sedang berstatus cuti aktif tanpa pembatalan resmi.
3. **Siklus Armada Unserviceable -> Serviceable**:
   - **Tindakan**: Pencatatan histori estafet di `vehicle_readiness_logs` diverifikasi dengan foto fisik kelaikan dan alasan pemulihan.
4. **Validasi Pejabat Penandatangan Dokumen PDF**:
   - **Tindakan**: Menjamin 100% nama Dept. Head dan Ketua Regu ditarik dinamis dari basis data sesuai shift operasional, bukan pengguna yang kebetulan login.

### Prioritas 3: Pengujian Alur Lengkap, Ketahanan & Kesiapan Penerapan
1. **Automated Integration Testing Backend**:
   - **Tindakan**: Menyiapkan skrip pengujian integrasi otomatis di backend (`npm test` atau skrip verifikasi headless) untuk menguji alur Login -> Ploting -> Cuti -> Kesiapan PIC -> Laporan PDF.
2. **Validasi File Upload & Limits**:
   - **Status**: ✅ Menggunakan middleware multer dengan validasi ganda MIME type, canonical extension, UUID naming, dan batasan ukuran berkas (5MB foto, 10MB dokumen).
3. **Prosedur Pemulihan & Backup Database**:
   - **Tindakan**: Menyiapkan panduan backup/restore dump database SQL dan konfigurasi aman `.env.example`.

---

## 2. Matriks Pembagian Tugas 5 Agent Berdasarkan Prioritas

| Agent | Fokus Modul | Penugasan Penguatan & Integritas |
| :---: | :--- | :--- |
| **Agent 1** | Shell, Profil, Auth & Dokumen | • Menjamin isolasi akses URL langsung berkas privat (`/uploads`)<br>• Enforce fail-fast secret pada boot server<br>• Sinkronisasi RBAC dokumen kepegawaian |
| **Agent 2** | Dashboard, Tugas Saya & PIC | • Validasi atomik pelepasan penugasan saat cuti diajukan<br>• Validasi transaksi pergantian PIC armada<br>• Integritas foto bukti fisik kelaikan armada |
| **Agent 3** | Ploting 8 Unit & Anti-Race Condition | • Validasi backend anti-tabrakan dua orang pada slot yang sama<br>• Validasi penolakan penugasan bagi kru yang sedang cuti<br>• Memastikan simpan hanya dipicu tombol eksplisit |
| **Agent 4** | Kegiatan & Pelaporan Insiden | • Validasi upload multi-foto insiden dengan proteksi MIME type<br>• Pagination query kegiatan dan insiden untuk performa jangka panjang<br>• Integritas skema 13 tabel (ENUM kategori insiden) |
| **Agent 5** | Rekap Laporan Dinas, PDF & Test Suite | • Skrip pengujian otomatis alur integrasi endpoint backend (`npm test`)<br>• Verifikasi pejabat dinamis PDF A4 tanpa titik-titik kosong<br>• Prosedur pencadangan (backup) dan pemulihan database |
