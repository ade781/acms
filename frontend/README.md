# Frontend - Sistem Monitoring Operasional ARFF

Aplikasi antarmuka terpadu untuk monitoring kesiapan armada, ploting regu dinas, pencatatan insiden, dan pelaporan operasional unit ARFF (Airport Rescue and Fire Fighting).

## Fitur Utama
1. **Regu Dinas 4 Tim**: Alpha, Bravo, Charlie, Delta.
2. **Siklus 3 Shift (Format 6-7-11)**:
   - Shift 1 (Pagi): 07:00 s.d. 13:00 WIB (6 jam)
   - Shift 2 (Siang): 13:00 s.d. 20:00 WIB (7 jam)
   - Shift 3 (Malam): 20:00 s.d. 07:00 WIB (11 jam)
3. **Ploting Regu Dimulai dari Kosong**:
   - Ketua Regu menugaskan 3 s.d. 4 personel per kendaraan.
   - Penentuan 1 Penanggung Jawab (PIC) resmi per kendaraan.
4. **Pemeriksaan Kesiapan Fisik Kendaraan & Watchroom**:
   - Status Serviceable atau Unserviceable (dengan justifikasi kendala jika unserviceable).
   - Hak input kesiapan armada khusus PIC yang ditunjuk atau Ketua Regu (kru lain bersifat read-only).
   - Kompresi foto dokumentasi WebP otomatis di browser (resolusi max 1280px, kualitas 0.8).
5. **Standar Desain Antislop & Performa Anti-Lag**:
   - Bebas lag input (CSS `transition-colors duration-100`, tanpa `transition-all` pada input form).
   - Modal overlay tanpa `backdrop-filter: blur(...)` untuk menjaga LCP & INP instan (< 16ms).
   - SVG Logo menggunakan React `useId()`.
   - Tanpa karakter em dash pada copywriting antarmuka.
6. **Status Fitur Coming Soon**:
   - Upload berkas/dokumen personel (Coming Soon banner).
   - Ekspor Laporan Resmi A4 PDF (Coming Soon banner).
   - Pengesahan digital shift oleh Ketua Regu tetap aktif.

## Menjalankan Aplikasi
```bash
cd frontend
npm install
npm run dev
```
Aplikasi berjalan di `http://localhost:5173` dan terhubung otomatis dengan backend di `http://localhost:5000/api`.
