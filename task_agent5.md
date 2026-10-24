# TUGAS AGENT 5: REKAP LAPORAN SHIFT, FILTER KENDALA, ABSTRAKSI A4 & PDF GENERATOR

**Peran**: Spesialis Jadwal Dinas, Rekap Laporan Shift & Dokumen PDF A4  
**Status**: 🚀 **FASE EKSEKUSI FITUR BARU, AUDIT TAHAP 2 & REKOMENDASI**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/reportController.js`
- `backend/src/services/pdfService.js`
- `frontend/src/services/reportService.js`
- `frontend/src/pages/HalamanLaporan.jsx`
- `frontend/src/pages/mobile/MobileLaporan.jsx`
- `frontend/src/components/reports/A4DocumentLayout.jsx` (komponen bersama baru)

## 2. Butir Tindakan & Mandat
1. **Instruksi 1 Pengguna (Hapus Watchroom Ganda di Halaman Report)**:
   - Di `HalamanLaporan.jsx` dan `MobileLaporan.jsx`: Hapus box status terpisah "Watch Room Posko ARFF" yang redundan jika di dalam tabel kesiapan armada/fasilitas sudah tercantum Watch Room. Satukan penampilan data agar tidak ada elemen yang tertulis 2 kali.
2. **Instruksi 2 Pengguna (Pelacakan Kendala Hanya Saat Ada Perpindahan Status / Masih Unserviceable)**:
   - Di `HalamanLaporan.jsx` dan `reportController.js`: Sesuaikan filter audit trail / pelacakan kendala armada:
     - HANYA tampilkan kendaraan yang statusnya **masih `unserviceable`**, ATAU
     - Kendaraan yang mengalami **perpindahan status** (misal dari `serviceable` ke `unserviceable`, atau pemulihan dari `unserviceable` ke `serviceable`) pada shift tersebut.
     - Jika armada stabil serviceable sejak awal dan tidak ada transisi, tidak perlu dimasukkan ke tabel kendala.
3. **Saran 4 (Abstraksi Generator Dokumen A4 ke Komponen Bersama)**:
   - Buat komponen `frontend/src/components/reports/A4DocumentLayout.jsx` sebagai kerangka baku pratinjau lembar A4 (kop dinas, metadata shift, batas margin, footer pengesahan) yang digunakan bersama oleh `HalamanLaporan.jsx` dan `MobileLaporan.jsx`.
4. **Saran 5 (Cache & Watermark PDF Generator)**:
   - Di `backend/src/services/pdfService.js`:
     - Tambahkan watermark dinamis resmi ("ARFF YIA - OFFICIAL OPS REPORT") pada background dokumen PDF.
     - Terapkan mekanisme in-memory caching untuk PDF yang sudah di-generate jika data shift belum berubah.
     - Bangun fungsi generator PDF khusus:
       a) `generateVehicleReadinessReportPdf(data)` (mendukung Laporan Kesiapan Armada Agent 2 dengan filter periode 1 bulan/3 bulan/1 tahun/kustom).
       b) `generateIncidentSummaryReportPdf(data)` (mendukung Laporan Rekap Insiden Agent 4 dengan filter periode 1 bulan/3 bulan/1 tahun/kustom).
5. **Cari List Kesalahan / Celah Baru**:
   - Sisir keabsahan data tanda tangan pejabat, kalkulasi total jam kerja regu, dan format cetak A4.
6. **Berikan Saran / Ide Pengembangan Lanjutan**:
   - Tuliskan ide-ide inovatif untuk analitik operasional, ekspor Excel/CSV dinamis, atau digital seal verifikasi laporan.

## 3. Kewajiban Laporan
Setelah audit dan verifikasi via CLI (`node -c`, `npm run build`):
- Tuliskan temuan masalah, status implementasi, dan ide/saran baru Anda ke: [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md).
