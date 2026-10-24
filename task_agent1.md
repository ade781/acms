# TUGAS AGENT 1: AUDIT NAVIGASI, ROUTING & MASTER KREDENSIAL

**Peran**: Spesialis Autentikasi, Shell/Layout, Master Personel, Kredensial STKP & Kelola Pejabat  
**Status**: 🔍 **FASE AUDIT TAHAP 2, INTEGRASI NAVIGASI & REKOMENDASI FITUR**  

## 1. Berkas Tanggung Jawab Eksklusif (Zero Collision)
- `backend/src/controllers/authController.js`
- `backend/src/controllers/personnelController.js`
- `frontend/src/pages/HalamanKelolaPejabat.jsx`
- `frontend/src/components/mobile/MobileLayout.jsx`
- `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`
- `frontend/src/App.jsx`

## 2. Butir Tindakan & Mandat
1. **Pendaftaran Rute Baru & Role Guards di `frontend/src/App.jsx`**:
   - Daftarkan rute baru penuh dengan proteksi autentikasi:
     - `/armada/laporan` -> Mengarah ke `HalamanLaporanArmada.jsx`
     - `/insiden/laporan` -> Mengarah ke `HalamanLaporanInsiden.jsx`
   - Pastikan guard route mengizinkan role Admin, Chief, dan Personel sesuai kebijakan wewenang operasional ARFF.
2. **Audit Form Profil Mandiri & Kredensial STKP**:
   - Cek apakah pengisian nomor STKP, masa berlaku lisensi, dan golongan darah di form profil aman dari input invalid atau crash backend.
3. **Cari List Kesalahan / Celah Baru**:
   - Sisir controller dan komponen di domain Anda untuk menemukan potensi bug, inkonsistensi data, atau celah keamanan.
4. **Berikan Saran / Ide Pengembangan Lanjutan**:
   - Tuliskan ide-ide inovatif untuk peningkatan UX profil, keamanan sesi, atau administrasi pejabat.

## 3. Kewajiban Laporan
Setelah audit dan verifikasi via CLI (`node -c`, `npm run build`):
- Tuliskan daftar temuan masalah dan ide/saran baru Anda ke: [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md).
