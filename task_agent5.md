# LEMBAR TUGAS AGENT 5: ELIMINASI WATCH ROOM GANDA & PEJABAT PDF

**Domain:** Laporan Dinas Shift, Eliminasi Duplikasi Data & Dokumen Resmi PDF  
**Fase:** FASE 3 (Eksekusi Perbaikan & Validasi CLI)  
**Tujuan Utama:** Menghilangkan tuntas kemunculan ganda Watch Room pada halaman laporan dinas, menyelaraskan penandatangan Section Head / Dept Head, dan menangani format tanda tangan PDF.

---

## 🎯 DAFTAR BERKAS EKSKLUSIF ANDA:
- `backend/src/controllers/reportController.js`
- `backend/src/services/pdfService.js`
- `frontend/src/services/reportService.js`
- `frontend/src/pages/HalamanLaporan.jsx`
- `frontend/src/components/mobile/reports/MobileReportSummaryCard.jsx`

---

## 🛠️ INSTRUKSI AKSI PERBAIKAN KONKRET:

### 1. ELIMINASI TUNTAS BUG WATCH ROOM GANDA (TEMUAN UTAMA PENGGUNA)
- **Akar Masalah:** Di database, `WATCHROOM` tercatat di tabel `vehicles` (ID 10, kategori posko). Pada `HalamanLaporan.jsx`, array `vehicles.map(...)` me-render Watch Room pada baris No. 8, lalu tepat di bawahnya terdapat baris hardcoded `<tr ...> WATCHROOM - Posko ARFF </tr>` yang me-render baris No. 9. Akibatnya Watch Room tampil 2 kali!
- **Aksi Perbaikan:**
  1. Di `frontend/src/services/reportService.js` (atau di `HalamanLaporan.jsx`), pastikan array armada kendaraan murni difilter:
     ```javascript
     const pureVehicles = (data.vehicles || []).filter(
       v => v.category !== 'posko' && v.code_name !== 'WATCHROOM'
     );
     ```
  2. Hapus baris manual hardcoded `<tr ...> WATCHROOM - Posko ARFF </tr>` yang menduplikasi tabel.
  3. Lakukan hal yang sama pada `MobileReportSummaryCard.jsx` dan `pdfService.js`:
     - Tabel armada HANYA mencetak 7 unit kendaraan operasional murni (FT-01, FT-02, FT-03, RIV-01, NT-01, CC-01, AMB-01).
     - Fasilitas Watch Room dicetak tepat satu kali pada blok/tabel fasilitas khusus posko komunikasi. Total hitungan armada tidak akan pernah menjadi 9 lagi!

### 2. Selaraskan Pejabat Penandatangan Laporan (Section Head & Dept Head)
- Di `backend/src/controllers/reportController.js`:
  - Perbaiki kueri penandatangan agar mencari pejabat `section_head` / `AIRPORT RESCUE & FIRE FIGHTING SECTION HEAD` terlebih dahulu dari tabel `personnel` dan `users`, baru kemudian fallback ke `dept_head` dan `admin`.
  - Pastikan tidak terjadi fallback prematur ke akun admin jika Section Head sudah diinput di sistem.

### 3. Tangani Kompatibilitas Format Tanda Tangan Gambar di PDFKit
- Di `backend/src/services/pdfService.js`:
  - PDFKit tidak mendukung WebP secara native.
  - Tambahkan penanganan agar jika file tanda tangan berformat `.webp`, sistem melakukan fallback aman atau konversi agar gambar tidak melempar silent error yang menyebabkan tanda tangan kosong di PDF.

### 4. Perbaikan Deteksi Transisi Pemulihan Armada Shift Aktif
- Di `reportController.js` (`getVehicleIssuesAudit`):
  - Tangkap status kendaraan yang beralih dari *unserviceable* ke *serviceable* pada shift aktif meskipun kolom `resolved_at` tidak terisi manual oleh teknisi.

### 5. Validasi CLI & Laporan
- Jalankan pengecekan sintaksis:
  `node -c backend/src/controllers/reportController.js`
  `node -c backend/src/services/pdfService.js`
  `npm --prefix frontend run build` (atau cek via terminal).
- Tuliskan bukti eksekusi dan laporan lengkap di:
  👉 [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md)
