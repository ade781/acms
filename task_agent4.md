# PANDUAN TUGAS AGENT 4: MOBILE LOGBOOK KEGIATAN RUTIN & PELAPORAN INSIDEN SISI UDARA

## Status Kinerja & Evaluasi Agent 4
- **Skor Kinerja**: 96% (Sangat Baik — Logbook Baku & Sinkronisasi 13 Tabel Selesai)
- **Capaian Positif Terkini**:
  1. Git Commit Berkala: Perubahan kode kegiatan dan insiden tersimpan pada commit `2ae9462`.
  2. Tab Kegiatan Rutin: Linimasa logbook aktivitas shift dinas rapi mengacu pada 8 Kategori Baku Operasional ARFF YIA.
  3. Tab Insiden Sisi Udara: Linimasa dan rekap insiden darurat dengan nomor registrasi otomatis (`INC-YYYY-XXXX`), tingkat prioritas siaga, lokasi grid airside, dan detail penanganan.
  4. Sinkronisasi Skema 13 Tabel: Berhasil menyesuaikan payload submit insiden dengan kolom `category` ENUM baku (`aircraft_accident`, `aircraft_incident`, `fire`, `medical_emergency`, `hazmat`, `other`).
  5. Modal Form Kegiatan dan Modal Laporan Insiden mendukung upload bukti foto fisik.

---

## Mandat Validasi File Upload & Ketahanan Data
1. **Validasi File Upload di Backend**:
   - `uploadMiddleware.js` memvalidasi MIME type berkas gambar (`image/webp`, `image/jpeg`, `image/png`) dan batas ukuran maksimal 5MB per berkas.
   - Penamaan berkas menggunakan canonical extension dan UUID acak demi mencegah eksploitasi path traversal.
2. **Penyusunan Pagination untuk Data Besar**:
   - Menyiapkan parameter query `limit` dan `page` pada endpoint `GET /api/activities` dan `GET /api/incidents` agar saat data operasional membesar dalam kurun waktu berbulan-bulan, aplikasi tetap ringan dan tidak mengalami lonjakan memori.
3. **Zero Dummy Policy**:
   - Seluruh data kegiatan dan nomor insiden tersimpan nyata di database `daily_shift_activities` dan `incidents`.

---

## Audit Fungsi & Endpoint Agent 4

| Endpoint | Metode | Fungsi Backend (Controller) | Fungsi Frontend (Handler) | Status Verifikasi |
| :--- | :---: | :--- | :--- | :---: |
| `/api/activities` | GET | `getActivities` (`activityController.js`) | `fetchActivities` di `MobileKegiatan.jsx` | ✅ Aktif (Filter tanggal, shift, regu) |
| `/api/activities` | POST | `createActivity` (`activityController.js`) | `handleSubmit` di `MobileActivityModal.jsx` | ✅ Aktif (`multipart/form-data`, upload foto) |
| `/api/activities/:id` | DELETE | `deleteActivity` (`activityController.js`) | `handleDeleteActivity` di `MobileKegiatan.jsx` | ✅ Aktif (Hapus catatan logbook) |
| `/api/incidents` | GET | `getIncidents` (`incidentController.js`) | `fetchIncidents` di `MobileInsiden.jsx` | ✅ Aktif (Filter shift aktif & prioritas) |
| `/api/incidents` | POST | `createIncident` (`incidentController.js`) | `handleSubmit` di `MobileIncidentModal.jsx` | ✅ Aktif (Upload multiple bukti foto) |
| `/api/incidents/:id` | GET | `getIncidentById` (`incidentController.js`) | `handleOpenDetail` di `MobileInsiden.jsx` | ✅ Aktif (Detail kronologi & lampiran) |
| `/api/incidents/:id/status` | PUT | `updateIncidentStatus` (`incidentController.js`) | Handler status di detail insiden | ✅ Aktif (Investigasi selesai/tertutup) |

---

## Rincian Tanggung Jawab Lanjutan Agent 4
1. **Uji Validasi Form Tanpa Beban GPU (Anti-Lag Rule)**: Memastikan form kegiatan dan insiden menggunakan `transition-colors duration-100` tanpa lag per ketikan.
2. **Uji Penanganan Unggah Berkas Non-Gambar**: Pastikan jika berkas `.exe` atau script diunggah, server menolak dengan pesan error yang jelas tanpa crashing.
3. **Validasi Build CLI**: Jalankan `npm run build` dan pastikan 0 error.
