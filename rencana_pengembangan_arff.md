# RENCANA LENGKAP PENGEMBANGAN SISTEM MONITORING OPERASIONAL & PERSONEL ARFF

## 1. Ringkasan & Definisi Sistem
Sistem ini adalah platform monitoring operasional terpadu untuk unit ARFF (Airport Rescue and Fire Fighting). Sistem mengelola database personel, kesiapan kendaraan dan watchroom, penempatan regu dinas (ploting), pencatatan insiden dan aktivitas rutin, serta penerbitan laporan dinas format A4 per shift.

* **Frontend**: React + Vite + Tailwind CSS (Clean, dominan putih, kontras tinggi, responsive desktop dan smartphone, bebas lag input).
* **Backend**: Node.js + Express.js (REST API, JWT auth, MySQL pooling, WebP image handler, PDF generator per shift).
* **Database**: MySQL dengan database bernama `logbuk`.
* **Kebijakan Data Awal (STRICT NO DUMMY DATA)**: Dilarang menyertakan data dummy/palsu. Master armada, personel, checklist, dan log dimulai dari **KOSONG**. Hanya ada 1 akun admin awal untuk akses sistem.

---

## 2. Parameter Operasional Bandara

### A. Siklus Shift & Jam Dinas (Format 6-7-11)
Dalam 1 hari terbagi menjadi 3 shift:
1. **Shift 1 (Pagi)**: 07:00 s.d. 13:00 (durasi 6 jam)
2. **Shift 2 (Siang)**: 13:00 s.d. 20:00 (durasi 7 jam)
3. **Shift 3 (Malam)**: 20:00 s.d. 07:00 (durasi 11 jam)

### B. Regu Dinas
Terdiri dari 4 regu resmi:
* **Regu Alpha**
* **Regu Bravo**
* **Regu Charlie**
* **Regu Delta**

Masing-masing regu memiliki **Ketua Regu** yang bertindak sebagai Supervisor pada saat regunya berdinas.

---

## 3. Struktur Role & Otorisasi Pengguna

1. **Operator (Petugas Anggota Regu & Watchroom)**:
   * Wajib login dengan Username dan Password.
   * Bertugas mengisi kesiapan kendaraan jika ditunjuk sebagai Penanggung Jawab (PIC) kendaraan pada shift aktif.
   * Bertugas mengisi kesiapan watchroom jika ditugaskan di watchroom.
   * Menginput draf insiden dan kegiatan rutin.
   * Fitur upload dokumen kepegawaian pribadi berstatus *(Coming Soon)*.

2. **Ketua Regu (Supervisor Dinas)**:
   * Mengatur dan memvalidasi ploting penugasan shift regunya dari **kondisi kosong** pada setiap sesi shift baru (menunjuk 3 s.d. 4 personel per kendaraan dan menentukan 1 orang Penanggung Jawab / PIC per unit).
   * Memvalidasi serah terima dinas dan menekan tombol persetujuan ("Sahkan / Approve") pada laporan shift.
   * Memonitor dashboard kesiapan armada dan kekuatan personel.
   * Halaman cetak laporan dinas format A4 per shift berstatus *(Coming Soon)*.

3. **Admin (Chief ARFF / Pengelola Sistem)**:
   * Hak akses penuh (CRUD master armada, master personel, kelola akun pengguna, dan konfigurasi sistem).

---

## 4. Mekanisme Kesiapan Armada & Watchroom (Aturan Kritis)

* **Armada**:
  * Setiap armada diisi oleh 3 s.d. 4 personel (ploting berawal dari form kosong).
  * Tepat 1 personel dari kendaraan tersebut ditunjuk oleh Ketua Regu sebagai **Penanggung Jawab Kendaraan (PIC)**.
  * **Hak Pengisian Status**: Hanya personel yang terdaftar sebagai PIC kendaraan pada shift aktif yang memiliki hak akses mengisi status kondisi armada (**Serviceable** atau **Unserviceable**). Ketua Regu dan Admin tetap memiliki akses override.
  * **Kebutuhan Foto**: Jika status Unserviceable (atau saat pemeriksaan rutin), wajib melampirkan foto dokumentasi kondisi yang telah dikompres ke format **WebP** di sisi klien sebelum diunggah ke server.
* **Watchroom**:
  * Menggunakan penilaian langsung: **Serviceable** atau **Unserviceable** (cukup dua status ini, dengan opsi catatan jika Unserviceable).

---

## 5. Skema 11 Tabel Database MySQL (`logbuk`)
Semua tabel dimulai dalam keadaan **KOSONG** (tanpa data dummy kendaraan/personel).

1. **`users`**: Akun login (id, username, name, email, password_hash, role: 'operator'|'supervisor'|'admin', created_at, updated_at). Hanya diisi 1 akun admin awal: Username `aaa`, Password `aaaaaa`, Nama `Ade7 Asli`.
2. **`personnel`**: Data induk kepegawaian (id, user_id, full_name, rank_position, birth_date, employment_status: 'organik'|'outsourcing', team_group: 'Alpha'|'Bravo'|'Charlie'|'Delta', cert_level: 'Basic'|'Junior'|'Senior', cert_number, cert_expiry_date, is_active, created_at, updated_at). *Tabel kosong, impor/input personel menyusul.*
3. **`vehicles`**: Master armada (id, code_name, vehicle_name, category: 'utama'|'pendukung', license_plate, description, is_active, created_at, updated_at). *Tabel kosong, tanpa seed armada.*
4. **`vehicle_readiness_logs`**: Log kesiapan per shift (id, vehicle_id, shift_date, shift_number: 1|2|3, team_group, pic_personnel_id, status: 'serviceable'|'unserviceable'|'belum_dilaporkan', justification, photo_webp_url, follow_up_status, notes, created_at, updated_at).
5. **`watchroom_readiness_logs`**: Log kesiapan watchroom (id, shift_date, shift_number: 1|2|3, team_group, inspector_id, status: 'serviceable'|'unserviceable'|'belum_dilaporkan', notes, created_at, updated_at).
6. **`personnel_shifts`**: Induk sesi dinas shift (id, shift_date, shift_number: 1|2|3, team_group: 'Alpha'|'Bravo'|'Charlie'|'Delta', supervisor_id, status: 'open'|'approved', handover_notes, approved_at, created_at, updated_at).
7. **`personnel_deployments`**: Detail penempatan shift (id, shift_id, personnel_id, deployment_type: 'vehicle_utama'|'vehicle_pendukung'|'watchroom'|'absent', vehicle_id, is_pic: boolean, absent_reason: 'cuti'|'sakit'|'dinas'|'tukar_dinas'|null, notes, created_at, updated_at).
8. **`incident_categories`**: Master kategori kejadian (id, name, code, description, is_active, created_at).
9. **`incidents`**: Laporan insiden (id, report_number, incident_date, incident_time, report_time, team_group, shift_number: 1|2|3, reporter_id, category_id, title, location, chronology, source_info, aircraft_info, priority_level, action_taken, last_condition, status: 'dalam_proses'|'selesai'|'menunggu_tindak_lanjut', created_at, updated_at).
10. **`incident_attachments`**: Foto/lampiran kejadian WebP (id, incident_id, file_path, file_name, uploaded_at).
11. **`daily_shift_activities`**: Catatan aktivitas shift (id, shift_id, activity_type, activity_time, title, description, result_notes, actor_ids, created_at, updated_at).

---

## 6. Laporan Resmi PDF (Per Shift) — Status: Coming Soon
Fitur ekspor / cetak PDF dokumen A4 dinas resmi diberi status **Coming Soon** (akan dikembangkan pada fase berikutnya setelah detail kop bandara dan layout resmi disepakati). Halaman dan tombol tetap ada di antarmuka dengan penanda Coming Soon yang elegan.
