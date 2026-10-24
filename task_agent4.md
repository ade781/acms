# LEMBAR TUGAS AGENT 4: LOG KEGIATAN & MODULARITAS LAPORAN INSIDEN

**Domain:** Log Kegiatan Operasional & Manajemen Laporan Insiden  
**Fase:** FASE 3 (Eksekusi Perbaikan & Validasi CLI)  
**Tujuan Utama:** Memperbaiki bug mobile bounce tombol rekap insiden, modularitas halaman laporan insiden, dan integritas data kegiatan operasional.

---

## 🎯 DAFTAR BERKAS EKSKLUSIF ANDA:
- `backend/src/controllers/activityController.js`
- `backend/src/controllers/incidentController.js`
- `frontend/src/pages/HalamanKegiatan.jsx`
- `frontend/src/pages/HalamanInsiden.jsx`
- `frontend/src/pages/HalamanLaporanInsiden.jsx`
- `frontend/src/pages/mobile/MobileInsiden.jsx`

---

## 🛠️ INSTRUKSI AKSI PERBAIKAN KONKRET:

### 1. Perbaikan Mobile Bounce / Redirect Loop Tombol Rekap Insiden
- Di `MobileInsiden.jsx`:
  - Tombol Rekap di header saat ini menjalankan `navigate('/insiden/laporan')`, yang dialihkan oleh router desktop kembali ke dashboard mobile.
  - Sediakan sub-view modal/halaman laporan ringkas di mobile atau arahkan ke komponen laporan responsif yang dapat diakses oleh role mobile tanpa terlempar ke dashboard.

### 2. Modularitas Halaman Laporan Insiden Penuh (`HalamanLaporanInsiden.jsx`)
- Bangun/sempurnakan `frontend/src/pages/HalamanLaporanInsiden.jsx` sebagai halaman laporan rekapitulasi penuh:
  - Header dengan tombol kembali (*Back* ke Halaman Insiden).
  - Filter preset: **1 Bulan (Default)**, **3 Bulan**, **1 Tahun**, dan **Rentang Tanggal Kustom**.
  - Tampilan 2 layer: Layer 1 (Ringkasan list kejadian: tanggal, kategori, lokasi, status), diklik untuk membuka Layer 2 (Detail kronologi penanganan, koordinasi ATC/Avsec).
  - Tombol cetak PDF Rekap Insiden.

### 3. Perbaiki Bug Update Parsial Kegiatan (`activityController.js`)
- Di `updateActivity`:
  - Gunakan `COALESCE` atau pertahankan data lama agar jika klien hanya mengupdate status atau foto, kolom `description` yang sudah ada tidak ter-overwrite menjadi `NULL`.
  - Tangani `actor_ids`: pastikan jika sudah berupa string JSON tidak di-`JSON.stringify` dua kali.

### 4. Validasi Komparasi Waktu Tanggap Insiden
- Di `IncidentModal.jsx` / `incidentController.js`:
  - Pastikan `activation_time` (waktu tiba di TKP) tidak boleh lebih awal dari `incident_time` (waktu alarm kejadian). Berikan peringatan validasi jika terbalik.

### 5. Validasi CLI & Laporan
- Jalankan pengecekan sintaksis:
  `node -c backend/src/controllers/activityController.js`
  `node -c backend/src/controllers/incidentController.js`
  `npm --prefix frontend run build` (atau cek via terminal).
- Tuliskan bukti eksekusi dan laporan lengkap di:
  👉 [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md)
