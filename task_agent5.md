# TUGAS AGENT 5: EKSEKUSI PERBAIKAN LAPORAN DINAS & DOKUMEN PDF A4

**Peran**: Spesialis Jadwal Dinas, Rekap Laporan Shift, Export PDF A4 & Database  
**Status**: 🚀 **FASE EKSEKUSI PERBAIKAN TERISOLASI (FIX & VERIFY PHASE)**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/reportController.js`
- `backend/src/services/pdfService.js`
- `frontend/src/services/reportService.js` (modul baru terpadu)
- `frontend/src/pages/HalamanLaporan.jsx`
- `frontend/src/pages/mobile/MobileLaporan.jsx`
- `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx`

## 2. Butir Tindakan Perbaikan
1. **Satukan Alur Pengambilan Data Laporan (*Single Source of Truth / DRY*)**:
   - Buat modul service terpadu di `frontend/src/services/reportService.js` untuk mengonsolidasi 6 panggilan API laporan paralel menjadi satu fungsi (`fetchShiftReportData`), lalu gunakan service ini secara seragam di `HalamanLaporan.jsx` dan `MobileLaporan.jsx` untuk menghemat kode dan menjamin konsistensi 100%.
2. **Lengkapi Halaman Laporan Desktop dengan KPI & Audit Trail**:
   - Di desktop `HalamanLaporan.jsx`, tambahkan kartu ringkasan KPI eksekutif dan modal audit trail kendala armada interaktif agar fiturnya setara dengan mobile.
3. **Amankan URL Unduh PDF Mobile**:
   - Di `MobilePdfViewerModal.jsx`, pastikan URL tombol "Buka Layar Penuh" dan "Unduh" menggunakan token yang di-encode dengan `encodeURIComponent(token)` dan endpoint absolut yang aman dari error 404 pada IP jaringan lokal ponsel.
4. **Perbaiki Penarikan Data Cuti di Dokumen PDF**:
   - Di `reportController.js`, perbaiki query absensi agar membaca langsung izin/cuti yang telah disetujui pada tanggal bersangkutan dari database permohonan, sehingga daftar cuti tetap tercetak di PDF meskipun shift posko belum dibuka.
5. **Bersihkan Fallback Hardcode Supervisor**:
   - Di `reportController.js`, pastikan data pimpinan ditarik secara dinamis dari database pejabat operasional.

## 3. Kewajiban Laporan (Ide & Saran)
Setelah pengujian lolos via CLI:
- Tuliskan bukti pengujian dan penyelesaian masalah ke: [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md).
- **Wajib cantumkan ide, saran arsitektur, dan rekomendasi perbaikan lanjutan** untuk modul Anda di bagian akhir laporan!
