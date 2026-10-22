# FEEDBACK HASIL PEKERJAAN: AGENT 2 (LOGIKA OPERASIONAL, PLOTING, PERSONEL, CUTI & KESIAPAN ARMADA)

**Status:** SELESAI & DIVERIFIKASI (PASSED)

---

### Evaluasi Pencapaian Tugas:
1. **Otorisasi & Transaksi Data Personel (Audit 1.2, 1.4, 2.2)**:
   - **Hasil:** Sangat Baik. Di `updatePersonnel`, kru biasa dibatasi hanya boleh mengubah data profil biodata dirinya sendiri. Field struktural kedinasan (`team_group`, `rank_position`, `is_active`, `employment_status`, `cert_level`, `full_name`, `nip`) diproteksi dan hanya bisa diubah oleh pimpinan (`admin`, `dept_head`, `chief`, `supervisor`).
   - Endpoint `GET /api/personnel/:id/documents` kini memiliki pengecekan wewenang: hanya pemilik dokumen atau pimpinan yang dapat melihat daftar dokumen.
   - Di `createPersonnel`, insert ke `users` dan `personnel` telah dibungkus transaksi `connection.beginTransaction()` dan rollback. Pengembalian teks `default_password` pada respons API telah dihapus.
2. **Koreksi Bug SQL Cuti & Integritas Ploting (Audit 2.2, 2.3, 3.1, 3.3)**:
   - **Hasil:** Sangat Baik. **Bug fatal SQL di `requestLeaveRange` telah diperbaiki**: nama kolom disesuaikan menjadi `document_type` dan `file_url`, sehingga upload lampiran cuti tidak lagi crash 500.
   - Trik penunjukan PIC otomatis diam-diam (`crew[0].is_pic = true`) berhasil dihapus. Jika unit belum memiliki PIC, sistem mengembalikan error validasi HTTP 400 dengan pesan yang jelas bagi pengguna.
   - Sesuai aturan `GEMINI.md`, **endpoint sisa pengesahan manual `approveShift` (`POST /api/deployments/approve`) berhasil dihapus tuntas**. Laporan dinas shift kini murni terekapitulasi otomatis secara transparan.
3. **Kesiapan Armada & Watchroom (Audit 4.1, 4.2, 4.3, 8.1)**:
   - **Hasil:** Sangat Baik. Loop query N+1 pada `getVehicleReadiness` berhasil dieliminasi dan digantikan oleh 1 query agregat efisien dengan subquery `MAX(shift_date, shift_number)`.
   - Di `submitVehicleReadiness`, `follow_up_status` divalidasi terhadap enum (`pending`, `in_progress`, `resolved`), dan kondisi `unserviceable` dilarang diset `resolved` secara tidak sah.
   - Kategori `'posko'` pada unit Watchroom ditangani secara konsisten bersama armada utama dan pendukung.

---

# TUGAS TAMBAHAN: UNIT TESTING (AGENT 2)

## Workspace & Lokasi File
- **Direktori Uji:** `masak/unit_testing/`
- **Nama File Skrip Uji:** `masak/unit_testing/test_operational_deployment_readiness.js`
- **Format:** Node.js ESM script mandiri (`node masak/unit_testing/test_operational_deployment_readiness.js`), memanfaatkan modul backend dan koneksi pool database.

---

## Cakupan Fitur yang Wajib Diuji Secara Menyeluruh

### 1. Manajemen Personel & Otorisasi Profil (`personnelController.js`)
- [x] **Transaksi `createPersonnel`:** Pendaftaran personel baru berhasil membuat entri di tabel `users` dan `personnel`. Pastikan tidak ada kebocoran field `default_password` pada respons API. Uji rollback jika salah satu query sengaja digagalkan.
- [x] **Proteksi Field Struktural di `updatePersonnel`:** Kru biasa hanya boleh mengubah data biodata pribadi (tanggal lahir, pendidikan, dll). Percobaan mengubah `team_group`, `rank_position`, `is_active`, `employment_status`, atau `role` oleh kru biasa wajib diabaikan/ditolak oleh server.
- [x] **Pengecekan Akses Dokumen Personel:** Endpoint `GET /api/personnel/:id/documents` menolak akses pengguna yang bukan pemilik dan bukan pimpinan (HTTP 403).

### 2. Ploting Shift & Aturan Penugasan (`deploymentController.js`)
- [x] **Penugasan Normal:** Ploting unit armada dengan tepat 1 PIC dan kru (maksimal 4 orang) berhasil disimpan.
- [x] **Penolakan Duplikasi Personel:** Sistem menolak jika 1 personel diplot pada 2 unit armada berbeda atau bertugas sekaligus cuti pada shift yang sama (HTTP 400).
- [x] **Pembatasan Maksimal Kru:** Sistem menolak jika 1 unit diisi lebih dari 4 orang kru (HTTP 400).
- [x] **KEWAJIBAN 1 PIC (Anti-Silent Assignment):** Sistem menolak dengan HTTP 400 jika unit tidak memiliki PIC (`picCount === 0`). Tidak boleh ada lagi penunjukan PIC otomatis diam-diam.
- [x] **Pelepasan Ploting Saat Absent:** Jika personel ditandai `absent` (cuti/izin), penugasannya pada armada kendaraan operasional otomatis dibatalkan/dilepaskan.
- [x] **Verifikasi Penghapusan Sisa Pengesahan Shift:** Memastikan endpoint `/api/deployments/approve` sudah tidak ada (mengembalikan HTTP 404).

### 3. Modul Cuti & Integritas SQL (`requestLeaveRange`)
- [x] **Rentang Cuti:** Pengajuan cuti multi-hari berhasil mencatat status `absent` untuk setiap hari dinas dalam rentang tersebut.
- [x] **Integritas Kolom Unggah Bukti Cuti:** Pengunggahan berkas bukti cuti berhasil menyimpan ke kolom `document_type` dan `file_url` pada tabel `personnel_documents` tanpa error SQL.

### 4. Kesiapan Armada & Watchroom (`readinessController.js`)
- [x] **Pelaporan Kesiapan oleh PIC:** Personel yang bertindak sebagai PIC armada pada shift aktif berhak mengirimkan laporan serviceable (sukses 200).
- [x] **Penolakan Non-PIC:** Personel yang bukan PIC dan bukan pimpinan ditolak saat mencoba melaporkan kesiapan unit (HTTP 403).
- [x] **Wajib Justifikasi Unserviceable:** Status armada `unserviceable` tanpa teks justifikasi wajib ditolak (HTTP 400).
- [x] **Validasi Follow-up Status:** Status kendala armada hanya boleh `pending`, `in_progress`, atau `resolved`.
- [x] **Pencegahan Status Ilegal:** Kondisi armada `unserviceable` tidak dapat ditandai sebagai `resolved` (HTTP 400).
- [x] **Efisiensi Query Carry-Over:** Memastikan fungsi `getVehicleReadiness` mengambil kendala shift sebelumnya menggunakan 1 query agregat tanpa query berulang di dalam perulangan loop.
- [x] **Kesiapan Posko Watchroom:** Pelaporan kondisi Posko Watchroom (kategori posko) berhasil disimpan dan terekam dengan benar.

---

## Format Eksekusi & Output Pengujian
Skrip harus mencetak ringkasan hasil pengujian yang jelas di terminal:
- `[PASS]` / `[FAIL]` per kasus uji.
- Total pengujian yang dijalankan, jumlah lulus, dan jumlah gagal.
- Exit code 0 jika semua lulus, exit code 1 jika ada yang gagal.
