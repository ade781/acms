# PANDUAN EKSEKUSI AGENT 2: FASE PERBAIKAN TOTAL (DASHBOARD, KESIAPAN ARMADA & PENGUMUMAN)

> 🚀 **MANDAT FASE 3 (EKSEKUSI PERBAIKAN KODE & PENGUJIAN):**
> 1. **EKSEKUSI SELURUH PERBAIKAN DI BAWAH INI** pada berkas yang menjadi tanggung jawab Anda.
> 2. **BATAS KODE EKSKLUSIF (ZERO COLLISION)**: Hanya edit berkas domain Agent 2.
> 3. **SEMUA PENGUJIAN DI FOLDER `masak/`**: Dilarang membuat folder `tests/` di `backend/` atau `frontend/`.
> 4. **VALIDASI SISTEM VIA CLI**: Jalankan `node -c` dan pastikan sintaks 100% valid.
> 5. **LAPORAN HASIL KERJA MANDIRI**: Tuliskan laporan perbaikan ke `masak/temp/hasil_agent2.md`.

---

## Daftar Pekerjaan Eksekusi Perbaikan Agent 2

1. **Perbaiki Rute Navigasi Ploting Rusak di `HalamanDashboard.jsx`**:
   - Di baris 323, ubah `navigate('/deployments')` menjadi `navigate('/deployment')` agar sesuai dengan rute yang terdaftar di `App.jsx`.

2. **Bersihkan 4 Kontainer Dummy "Coming Soon" di `HalamanDashboard.jsx`**:
   - Di baris 339–370, hapus 4 blok kartu placeholder ("Container 1", "Container 2", dst.) agar antarmuka desktop padat, bersih, dan bebas dari elemen palsu (*anti-slop*).

3. **Ubah Nilai Statis Hardcode "8 Unit Operasional" Menjadi Dinamis**:
   - Di `HalamanDashboard.jsx` baris 460, ganti teks hardcode menjadi `{metrics.totalVehicles || 0} Unit Operasional`.

4. **Sinkronkan Logika Perhitungan Armada Rusak (Carry-Over Unserviceable) di Backend**:
   - Di `backend/src/controllers/dashboardController.js` baris 29–54, selaraskan query KPI dengan logika carry-over yang ada di `readinessController.js`, sehingga unit yang rusak di shift sebelumnya tetap dihitung sebagai *Unserviceable* pada shift berjalan jika belum diperbaiki.

5. **Hilangkan Hardcode URL `http://localhost:5000` di `HalamanPengumuman.jsx`**:
   - Di baris 200 pada fungsi `getPdfUrl`, gunakan endpoint API backend dinamis atau base URL dari environment (`import.meta.env.VITE_API_URL` atau proxy path), agar edaran dinas PDF bisa dibuka di jaringan LAN bandara.

6. **Perbaiki Mismatch Properti Lampiran PDF Mobile Dashboard**:
   - Di `frontend/src/pages/mobile/MobileDashboard.jsx` baris 381, ubah kondisi pengecekan dari `previewPdfDoc.file_url` menjadi `previewPdfDoc.file_path` agar tombol buka berkas PDF tampil normal di mobile.

7. **Pasang Feedback Toast Notifikasi Instan pada Tambah & Hapus Master Armada**:
   - Di `frontend/src/pages/HalamanKesiapanKendaraan.jsx` baris 114 & 130, pasang toast notifikasi visual seketika (hijau untuk sukses, merah untuk gagal) pada fungsi `handleSaveVehicle` dan `handleDeleteVehicle`.

8. **Pasang Feedback Toast pada Pengisian Kelaikan Fisik Armada & Watchroom**:
   - Di `VehicleReadinessModal.jsx` dan `WatchroomReadinessModal.jsx`, berikan toast notifikasi visual bahwa data hasil inspeksi kelaikan berhasil disimpan di server sebelum/saat modal ditutup.

9. **Tambahkan Validasi Client-Side Wajib Upload Foto Bukti Fisik Armada**:
   - Di `frontend/src/components/forms/VehicleReadinessModal.jsx`, beri tanda bintang `* Wajib` dan validasi client-side bahwa foto kelaikan fisik armada wajib dipilih sebelum form disubmit.

10. **Wajibkan Catatan Perbaikan saat Transisi Status Unserviceable -> Serviceable**:
    - Di `VehicleReadinessModal.jsx`, tambahkan logika deteksi: jika status awal unit adalah `unserviceable` dan diubah menjadi `serviceable`, wajibkan pengisian catatan tindakan perbaikan sebelum data disimpan.

11. **Integrasikan Kompresi Canvas WebP pada Kamera PIC Mobile**:
    - Di `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx`, integrasikan helper `compressImageToWebP` pada event change input kamera, agar foto smartphone (5–15MB) terkompresi otomatis ke WebP (<300KB) sebelum dikirim.

12. **Pasang Feedback Toast pada Publikasi & Penghapusan Pengumuman**:
    - Di `HalamanPengumuman.jsx` baris 118 & 142, tambahkan feedback toast notifikasi instan saat pengumuman diterbitkan atau dihapus.

---

## Format Pelaporan Mandiri di `masak/temp/hasil_agent2.md`

Setelah seluruh kode di atas diperbaiki dan divalidasi via CLI:
Tuliskan rincian hasil pekerjaan, berkas yang diubah, dan bukti pengujian ke dalam `masak/temp/hasil_agent2.md`.
