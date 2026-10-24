# TUGAS AGENT 4: EDIT KEGIATAN MOBILE & HALAMAN LAPORAN REKAP INSIDEN

**Peran**: Spesialis Log Kegiatan Rutin & Manajemen Insiden Darurat  
**Status**: 🚀 **FASE EKSEKUSI FITUR BARU, AUDIT TAHAP 2 & REKOMENDASI**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/activityController.js`
- `backend/src/controllers/incidentController.js`
- `frontend/src/pages/HalamanKegiatan.jsx`
- `frontend/src/pages/HalamanInsiden.jsx`
- `frontend/src/pages/HalamanDetailInsiden.jsx`
- `frontend/src/pages/HalamanLaporanInsiden.jsx` (halaman baru laporan insiden)
- `frontend/src/pages/mobile/MobileKegiatan.jsx`
- `frontend/src/pages/mobile/MobileInsiden.jsx`

## 2. Butir Tindakan & Mandat
1. **Saran 3 (Dukungan Edit Kegiatan di Mobile)**:
   - Di `MobileKegiatan.jsx`, tambahkan opsi aksi "Edit Kegiatan" pada item kegiatan (khusus pembuat / chief).
   - Buat modal edit kegiatan di mobile yang mendukung pengubahan judul, deskripsi, waktu kegiatan, serta ganti/hapus foto dokumentasi fisik secara rapi tanpa lag.
2. **Instruksi Tambahan Pengguna: Tombol & Halaman Laporan Insiden Penuh (`/insiden/laporan`)**:
   - Di `HalamanInsiden.jsx` (dan mobile), tambahkan tombol **"Laporan Rekap Insiden" / "Report"** menuju `/insiden/laporan`.
   - Buat halaman baru `HalamanLaporanInsiden.jsx`:
     - Tombol navigasi kembali (*Back ke Insiden*).
     - **Filter Periode Baku**:
       - Default: **1 Bulan Terakhir**
       - Pilihan Cepat: **3 Bulan**, **1 Tahun**
       - **Kustom**: Pilihan memilih rentang tanggal awal s.d. tanggal akhir (*Start Date* s.d. *End Date*).
     - **Arsitektur 2 Layer**:
       - **Layer 1 (Ringkasan Kejadian)**: Tabel kejadian insiden ringkas (Nomor Laporan, Tanggal/Waktu Kejadian, Kategori Insiden, Lokasi Grid/Area, Status Penanganan).
       - **Layer 2 (Detail Insiden)**: Modal / dialog interaktif ketika salah satu baris kejadian diklik untuk membaca kronologi lengkap, tindakan penanganan unit, pihak terkoordinasi ATC/Avsec, kondisi akhir TKP.
     - **Tombol Ekspor / Cetak PDF**: Memanggil generator PDF laporan rekap insiden (Agent 5).
3. **Endpoint Agregasi Laporan Insiden di Backend**:
   - Di `incidentController.js`, siapkan endpoint `GET /api/incidents/summary-report` yang menerima query filter `?period=1month|3months|1year` atau `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` untuk menyuplai data ringkasan Layer 1 dan Layer 2.
4. **Cari List Kesalahan / Celah Baru**:
   - Sisir validasi form insiden, penyimpanan koordinat/lokasi grid, dan upload foto lampiran.
5. **Berikan Saran / Ide Pengembangan Lanjutan**:
   - Tuliskan ide-ide inovatif untuk pemetaan insiden (grid map YIA), notifikasi darurat, atau integrasi SOP kecelakaan pesawat.

## 3. Kewajiban Laporan
Setelah audit dan verifikasi via CLI (`node -c`, `npm run build`):
- Tuliskan temuan masalah, status implementasi, dan ide/saran baru Anda ke: [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md).
