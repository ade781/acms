# ARFF Operations & Personnel Monitoring System Backend API

Backend REST API untuk Sistem Monitoring Operasional dan Personel Unit ARFF (Airport Rescue and Fire Fighting).

## 1. Spesifikasi Sistem
* **Runtime**: Node.js v20+ (ES Modules)
* **Framework**: Express.js
* **Database**: MySQL (`logbuk`)
* **Driver**: `mysql2/promise` (Connection Pooling)
* **Autentikasi**: JWT (JSON Web Token) & bcryptjs
* **Upload Berkas**: Multer (Format WebP di `uploads/`)
* **Generator PDF**: PDFKit (Format A4 Resmi per shift)

## 2. Parameter Operasional
1. **Regu Dinas**: Alpha, Bravo, Charlie, Delta (masing-masing dipimpin Ketua Regu / Supervisor).
2. **Siklus 3 Shift (6-7-11)**:
   * Shift 1 (Pagi): 07:00 s.d. 13:00 WIB
   * Shift 2 (Siang): 13:00 s.d. 20:00 WIB
   * Shift 3 (Malam): 20:00 s.d. 07:00 WIB
3. **Ploting Penugasan Shift**:
   * Setiap sesi shift baru dibuka dalam kondisi **KOSONG**.
   * Ploting kru armada: 3 s.d. 4 personel per unit kendaraan.
   * Tepat 1 personel ditandai sebagai Penanggung Jawab Kendaraan (`is_pic = 1`).
4. **Validasi Kesiapan Armada**:
   * Hanya PIC yang bertugas pada shift aktif (atau Supervisor/Admin) yang diizinkan menginput status kondisi armada (`serviceable` / `unserviceable`).
   * Jika kondisi `unserviceable`, wajib menyertakan justifikasi kendala dan dokumentasi foto WebP.
5. **Kesiapan Watchroom**:
   * Penilaian langsung: `serviceable` atau `unserviceable` (didukung catatan kendala).
6. **Laporan Resmi PDF & Berkas Personel**:
   * Berstatus `Coming Soon`.

## 3. Akun Administrator Default (No Dummy Data)
Sesuai aturan operasional, seluruh tabel armada dan personel dimulai dalam kondisi **KOSONG**.
Hanya dibuat 1 akun administrator awal:
* **Username**: `aaa`
* **Password**: `aaaaaa`
* **Nama**: `Ade7 Asli`
* **Role**: `admin`

## 4. Perintah Operasional
```bash
# Inisialisasi dependensi
npm install

# Inisialisasi 12 tabel database MySQL (logbuk)
npm run db:init

# Seed akun admin awal (tanpa data dummy)
npm run db:seed

# Menjalankan server backend
npm start

# Mode pengembangan dengan auto-reload
npm run dev
```

## 5. Ringkasan Endpoint API
| Modul | Method | Endpoint | Keterangan |
|---|---|---|---|
| Health | `GET` | `/api/health` | Status online server |
| Auth | `POST` | `/api/auth/login` | Login username & password |
| Auth | `GET` | `/api/auth/me` | Profil pengguna terautentikasi |
| Dashboard | `GET` | `/api/dashboard/summary` | KPI kesiapan armada, watchroom, personel, insiden |
| Personnel | `GET` | `/api/personnel` | Katalog personel (filter regu, sertifikasi, pencarian) |
| Personnel | `POST` | `/api/personnel` | Tambah personel baru |
| Personnel | `GET` | `/api/personnel/:id` | Detail personel (Upload berkas: Coming Soon) |
| Personnel | `PUT` | `/api/personnel/:id` | Perbarui personel |
| Personnel | `DELETE` | `/api/personnel/:id` | Hapus / nonaktifkan personel |
| Vehicles | `GET` | `/api/vehicles` | Master armada |
| Vehicles | `POST` | `/api/vehicles` | Tambah armada baru |
| Readiness | `GET` | `/api/readiness/vehicles` | Monitoring kesiapan armada per shift |
| Readiness | `POST` | `/api/readiness/vehicles` | Input kesiapan oleh PIC (WebP upload) |
| Readiness | `GET` | `/api/readiness/watchroom` | Checklist kesiapan fasilitas watchroom |
| Readiness | `POST` | `/api/readiness/watchroom` | Input kesiapan watchroom |
| Deployments | `GET` | `/api/deployments/current` | Ploting shift aktif (form awal kosong) |
| Deployments | `POST` | `/api/deployments/batch` | Simpan ploting regu (3-4 kru, 1 PIC) |
| Deployments | `POST` | `/api/deployments/approve` | Pengesahan laporan shift oleh Ketua Regu |
| Incidents | `GET` | `/api/incidents` | Riwayat laporan insiden |
| Incidents | `POST` | `/api/incidents` | Buat insiden (nomor auto INC-0001, WebP attachment) |
| Incidents | `PUT` | `/api/incidents/:id/status`| Update status penanganan insiden |
| Activities | `GET` | `/api/activities` | Logbook aktivitas shift |
| Activities | `POST` | `/api/activities` | Catat aktivitas baru |
| Reports | `GET` | `/api/reports/pdf` | Cetak laporan A4 per shift (Status Coming Soon) |
