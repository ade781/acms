# PANDUAN PENGEMBANGAN BACKEND (AGENT BACKEND)
*Catatan: Setelah implementasi selesai, file instruksi ini dapat langsung dihapus.*

## 1. Lingkup & Batasan Folder
* Seluruh kode backend berada di dalam folder: `backend/`.
* Dilarang menyentuh atau memodifikasi file di luar folder `backend/` agar tidak terjadi konflik dengan agent frontend.
* Port default server backend: `http://localhost:5000`.

## 2. Stack & Dependensi
* Runtime: Node.js (Express.js).
* Database: MySQL (nama database: `logbuk`).
* Driver Database: `mysql2/promise` (koneksi pool efisien).
* Keamanan & Autentikasi: `bcryptjs` (hashing password), `jsonwebtoken` (JWT token).
* File Upload: `multer` (penyimpanan foto insiden dan armada berformat WebP di `backend/uploads/`).
* Generator PDF: `pdfkit` (layanan dokumen resmi A4 per shift).
* Utilitas: `cors`, `dotenv`.

## 3. Parameter Operasional Baru
1. **Regu Dinas**: Terdiri dari 4 regu resmi yaitu Alpha, Bravo, Charlie, dan Delta.
2. **Siklus 3 Shift (Format Jam 6, 7, 11)**:
   * Shift 1 (Pagi): 07:00 s.d. 13:00
   * Shift 2 (Siang): 13:00 s.d. 20:00
   * Shift 3 (Malam): 20:00 s.d. 07:00
3. **Ploting Penugasan Shift**:
   * Setiap sesi shift baru dibuka, form ploting dimulai dari **KOSONG** (Ketua Regu memilih personel dinas saat itu).
   * Ploting kendaraan menampung 3 s.d. 4 personel per kendaraan, dengan tepat 1 personel ditandai `is_pic = 1`.
   * Endpoint pelaporan kesiapan kendaraan wajib memvalidasi bahwa `user_id` yang melakukan pelaporan adalah personel yang terdaftar sebagai PIC armada tersebut pada shift aktif (atau memiliki role supervisor/admin).
4. **Kesiapan Watchroom**:
   * Cukup menggunakan status sederhana: **`serviceable`** dan **`unserviceable`** (didukung kolom catatan jika unserviceable).
5. **Foto WebP**: Endpoint upload kendaraan dan insiden menerima file gambar WebP hasil kompresi frontend.
6. **Upload Dokumen Personel & Laporan PDF**: Keduanya ditandai berstatus **Coming Soon**.
7. **Penomoran Laporan Insiden**: Dihasilkan secara **otomatis & atomik oleh Backend** saat data disimpan (format: `INC-0001`, `INC-0002`). Frontend dilarang meng-generate nomor ini untuk mencegah tabrakan/duplikasi data.
8. **Persetujuan Laporan**: Persetujuan shift cukup berupa tombol aksi yang mengubah status `personnel_shifts.status` menjadi `approved` oleh Ketua Regu (Supervisor).

## 4. Skema Database MySQL (`logbuk`) & Kebijakan Data
Backend menyediakan skrip inisialisasi `backend/src/config/schema.sql` dan `backend/src/config/initDb.js` untuk membuat tabel relasional yang ramping dan efisien.
**PERINGATAN KERAS (NO DUMMY DATA)**:
* Dilarang memasukkan data dummy armada, dummy checklist watchroom, dummy personel, atau dummy aktivitas apapun ke dalam database.
* Semua master data (armada, personel) berawal dalam keadaan **KOSONG**.
* Seeder `backend/src/config/seed.js` HANYA membuat **1 akun admin tunggal**:
  - Nama: `Ade7 Asli`
  - Username: `aaa`
  - Password: `aaaaaa` (dihash dengan `bcryptjs`)
  - Role: `admin`

Daftar 11 tabel (Ramping & Tanpa Bloat):
1. `users` (id, username, name, email, password_hash, role: 'operator'|'supervisor'|'admin', created_at, updated_at)
2. `personnel` (id, user_id, full_name, rank_position, birth_date, employment_status, team_group: 'Alpha'|'Bravo'|'Charlie'|'Delta', formal_education, cert_level: 'Basic'|'Junior'|'Senior', cert_number, cert_expiry_date, is_active, created_at, updated_at)
3. `vehicles` (id, code_name, vehicle_name, category: 'utama'|'pendukung', license_plate, description, is_active, created_at, updated_at)
4. `vehicle_readiness_logs` (id, vehicle_id, shift_date, shift_number: 1|2|3, team_group, pic_personnel_id, status: 'serviceable'|'unserviceable'|'belum_dilaporkan', justification, photo_webp_url, follow_up_status, resolved_at, notes, created_at, updated_at)
5. `watchroom_readiness_logs` (id, shift_date, shift_number: 1|2|3, team_group, inspector_id, status: 'serviceable'|'unserviceable'|'belum_dilaporkan', notes, created_at, updated_at)
6. `personnel_shifts` (id, shift_date, shift_number: 1|2|3, team_group: 'Alpha'|'Bravo'|'Charlie'|'Delta', supervisor_id, status: 'open'|'approved', handover_notes, approved_at, created_at, updated_at)
7. `personnel_deployments` (id, shift_id, personnel_id, deployment_type: 'vehicle_utama'|'vehicle_pendukung'|'watchroom'|'absent', vehicle_id, is_pic: tinyint(1), absent_reason: 'cuti'|'sakit'|'dinas'|'tukar_dinas'|null, assigned_by, notes, created_at, updated_at)
8. `incident_categories` (id, name, code, description, is_active, created_at)
9. `incidents` (id, report_number, incident_date, incident_time, report_time, team_group, shift_number: 1|2|3, reporter_id, supervisor_id, category_id, title, location, chronology, source_info, aircraft_info, priority_level, activation_time, action_taken, last_condition, coordinated_parties, status, created_at, updated_at)
10. `incident_attachments` (id, incident_id, file_name, file_path, file_type, uploaded_at)
11. `daily_shift_activities` (id, shift_id, activity_type, activity_time, title, description, result_notes, actor_ids, attachment_url, created_at, updated_at)

## 5. Struktur Folder Backend
```text
backend/
├── src/
│   ├── config/          # db.js (koneksi mysql2 pool), schema.sql, initDb.js, seed.js
│   ├── controllers/     # authController, personnelController, readinessController, deploymentController, incidentController, reportController
│   ├── middleware/      # authMiddleware (JWT verify), roleMiddleware, uploadMiddleware (multer untuk WebP)
│   ├── routes/          # authRoutes, personnelRoutes, readinessRoutes, deploymentRoutes, incidentRoutes, reportRoutes
│   ├── services/        # pdfService.js (pembuat laporan PDF resmi A4 per shift)
│   ├── utils/           # responseHelper.js
│   └── app.js           # entry point Express
├── uploads/             # folder penyimpanan file WebP
├── .env.example
├── package.json
└── README.md
```

## 6. Daftar Endpoint Utama
1. **Auth**:
   * `POST /api/auth/login` (body: `{ username, password }`)
   * `GET /api/auth/me` (header: `Bearer <token>`)
2. **Dashboard**:
   * `GET /api/dashboard/summary?date=YYYY-MM-DD&shift=1`
3. **Personnel**:
   * `GET /api/personnel` (query: `team_group`, `search`, `cert_level`)
   * `POST /api/personnel` (tambah personel baru)
   * `GET /api/personnel/:id`
   * `PUT /api/personnel/:id`
   * `DELETE /api/personnel/:id`
4. **Readiness (Kendaraan & Watchroom)**:
   * `GET /api/readiness/vehicles?date=...&shift=...`
   * `POST /api/readiness/vehicles` (input kesiapan oleh PIC kendaraan, menyertakan status, justifikasi jika unserviceable, dan upload file WebP)
   * `GET /api/readiness/watchroom?date=...&shift=...`
   * `POST /api/readiness/watchroom` (input checklist watchroom)
5. **Deployment & Shift**:
   * `GET /api/deployments/current?date=...&shift=...`
   * `POST /api/deployments/batch` (simpan ploting 3 s.d. 4 kru per kendaraan, penentuan `is_pic`, dan pencatatan absensi)
   * `POST /api/deployments/approve` (persetujuan laporan shift oleh Ketua Regu / Supervisor)
6. **Incidents & Activities**:
   * `GET /api/incidents`
   * `POST /api/incidents` (nomor laporan auto urut INC-0001, dukung upload gambar WebP)
   * `GET /api/incidents/:id`
   * `PUT /api/incidents/:id/status`
   * `GET /api/activities?date=...&shift=...`
   * `POST /api/activities`
7. **Laporan & Ekspor PDF**:
   * `GET /api/reports/pdf?date=...&shift=...&team_group=...`
   * Berstatus **Coming Soon**: mengembalikan status `{ success: true, message: "Fitur Cetak Laporan PDF resmi berstatus Coming Soon", status: "coming_soon" }`. Layout dan kop resmi akan disesuaikan pada rilis berikutnya.
