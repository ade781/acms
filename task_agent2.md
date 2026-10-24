# LEMBAR TUGAS AGENT 2: KESIAPAN ARMADA, CARRY-OVER & VALIDASI FORM

**Domain:** Kesiapan Armada, Kesiapan Fasilitas/Watchroom & Laporan Transisi Armada  
**Fase:** FASE 3 (Eksekusi Perbaikan & Validasi CLI)  
**Tujuan Utama:** Memperbaiki carry-over status kelaikan pada filter tanggal, menyelaraskan default status serviceable, validasi file foto modal PIC, dan optimasi kueri.

---

## 🎯 DAFTAR BERKAS EKSKLUSIF ANDA:
- `backend/src/controllers/readinessController.js`
- `backend/src/routes/readinessRoutes.js`
- `frontend/src/pages/HalamanKesiapanKendaraan.jsx`
- `frontend/src/components/forms/VehicleReadinessModal.jsx`
- `frontend/src/components/dashboard/VehicleMetricCard.jsx`

---

## 🛠️ INSTRUKSI AKSI PERBAIKAN KONKRET:

### 1. Perbaikan Missing Carry-Over pada Laporan Transisi (`readinessController.js`)
- Di `getVehicleTransitionsReport`:
  - Jangan mengasumsikan status armada sebelum `start_date` otomatis `serviceable`.
  - Tambahkan subquery untuk menarik status terakhir masing-masing kendaraan yang tercatat *sebelum* `start_date`.
  - Gunakan status tersebut sebagai inisialisasi `lastKnownStatus`, sehingga armada yang rusak dari minggu lalu tetap terhitung `currently_unserviceable` sejak awal periode laporan.

### 2. Selaraskan Default Status Kelaikan (Sesuai GEMINI.md Aturan 17)
- Pastikan bahwa pada agregat kesiapan operasional shift berjalan, armada yang belum sempat dilaporkan PIC baru tetap berstatus default `serviceable` (siap operasi) selama tidak ada catatan carry-over kerusakan aktif yang belum terselesaikan.
- Perbaiki `VehicleMetricCard.jsx` dan `HalamanKesiapanKendaraan.jsx` agar tidak menampilkan status ambigu abu-abu yang merusak hitungan kesiapan kategori bandara.

### 3. Validasi Format MIME & Batas Ukuran File Foto Armada
- Di `VehicleReadinessModal.jsx` (`handleFileChange`):
  - Validasi bahwa `file.type.startsWith('image/')`. Jika bukan gambar, batalkan dan tampilkan toast error.
  - Validasi ukuran file `file.size <= 15 * 1024 * 1024` (15 MB) sebelum diproses ke modul kompresi canvas.

### 4. Optimasi Kueri Laporan 1 Tahun
- Di database atau controller, tambahkan penanganan indeks `CREATE INDEX IF NOT EXISTS idx_vrl_date_shift_veh ON vehicle_readiness_logs (shift_date, shift_number, vehicle_id);` agar kueri riwayat tahunan berjalan instan.

### 5. Validasi CLI & Laporan
- Jalankan pengecekan sintaksis:
  `node -c backend/src/controllers/readinessController.js`
  `npm --prefix frontend run build` (atau cek via terminal).
- Tuliskan bukti eksekusi dan laporan lengkap di:
  👉 [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md)
