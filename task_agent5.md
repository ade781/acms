# LEMBAR PENUGASAN AGENT 5: LAPORAN RESMI CETAK A4 & SELURUH MOBILE VIEW

**Domain Tanggung Jawab:** Dokumen Cetak Resmi A4 (`A4DocumentLayout.jsx`, `reportService.js`, `HalamanLaporan*.jsx`), dan Seluruh Ekosistem Mobile View (`MobilePloting.jsx`, `MobileLaporan.jsx`, `MobileHeader.jsx`, `MobileProfileView.jsx`, `MobileEditProfileModal.jsx`, `MobileAbsentCrewSection.jsx`).  
**Catatan Penting:** Halaman Dashboard dihiraukan (*skip*).  
**Fase Saat Ini:** **FASE 3 (Eksekusi Perbaikan Kode Produksi)**  

---

## 🎯 BERKAS TARGET PEKERJAAN ANDA (ISOLASI MUTLAK):
1. [`frontend/src/components/reports/A4DocumentLayout.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/reports/A4DocumentLayout.jsx)
2. [`frontend/src/services/reportService.js`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/services/reportService.js)
3. [`frontend/src/pages/HalamanLaporan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporan.jsx)
4. [`frontend/src/pages/HalamanLaporanArmada.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporanArmada.jsx)
5. [`frontend/src/pages/HalamanLaporanInsiden.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLaporanInsiden.jsx)
6. [`frontend/src/pages/mobile/MobilePloting.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile/MobilePloting.jsx)
7. [`frontend/src/components/mobile/ploting/MobileAbsentCrewSection.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/ploting/MobileAbsentCrewSection.jsx)
8. [`frontend/src/pages/mobile/MobileLaporan.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/mobile/MobileLaporan.jsx)
9. [`frontend/src/components/mobile/MobileHeader.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/MobileHeader.jsx)
10. [`frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx)
11. [`frontend/src/components/mobile/profile/MobileProfileView.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/profile/MobileProfileView.jsx)
12. [`frontend/src/components/mobile/profile/MobileEditProfileModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/mobile/profile/MobileEditProfileModal.jsx)

---

## ⛔ BATASAN & PANTANGAN KERAS:
1. **DILARANG MENYEDIAKAN FITUR TAMBAH CUTI SEPIHAK OLEH CHIEF/ADMIN DI MOBILE**: Cuti hanya diajukan mandiri oleh personel (GEMINI.md Butir 15).
2. **DILARANG MENGGUNAKAN WINDOW.OPEN DENGAN TOKEN MENTAH PADA URL**: Seluruh unduh PDF resmi wajib melalui Axios authenticated blob stream di `reportService.js`.
3. **DILARANG MENYENTUH BERKAS DI LUAR DAFTAR TARGET DI ATAS.**

---

## 🛠️ RINCIAN BUTIR TUGAS YANG WAJIB ANDA SELESAIKAN:

1. Pelanggaran Aturan Hak Kelola Cuti pada MobilePloting.jsx
deskripsi masalah:
Di `MobilePloting.jsx` (baris 58–63, 456–493, dan 662–745) serta `MobileAbsentCrewSection.jsx`, terdapat modal manual *"Catat Personel Izin / Cuti"* oleh Chief/Admin dengan pembuatan entri ID timestamp lokal (`id: Date.now()`) dan tombol sepihak `+ Anggota`. Hal ini melanggar asas hak prerogatif cuti mandiri (GEMINI.md Butir 15).
dampak:
Pimpinan dapat mengajukan cuti sepihak atas nama anggota lain, menimbulkan anomali ID milidetik saat pembatalan cuti ke backend, dan merusak integritas data cuti.
solusi:
- Hapus seluruh state modal `addAbsentModalOpen`, handler `handleSaveNewAbsent`, dan tombol sepihak `+ Anggota` pada `MobilePloting.jsx` dan `MobileAbsentCrewSection.jsx`.
- Pastikan hak kelola pimpinan murni berfokus pada **Read** (melihat siapa yang sedang cuti) dan **Batal** (membatalkan cuti secara valid via `handleConfirmCancelLeave` untuk mengembalikan kru ke status dinas aktif).

2. Standardisasi Card 1 Profil Mandiri Mobile (GEMINI.md Butir 9)
deskripsi masalah:
Di `MobileProfileView.jsx`, tombol *"Ubah Sandi / Password"* diletakkan tercecer di header sub-view atas (baris 213–219) bukan menyatu di dalam Card 1. Selain itu, Card 1 belum menampilkan informasi Tempat Lahir, dan form `MobileEditProfileModal.jsx` belum menyediakan input Tempat Lahir (`birth_place`).
dampak:
Melanggar aturan keseragaman akses profil mandiri (GEMINI.md Butir 9), biodata personel tidak lengkap, dan tombol ganti sandi tidak ergonomis.
solusi:
- Di `MobileProfileView.jsx`, pindahkan tombol *"Ubah Sandi / Password"* ke dalam Card 1 menyatu berdampingan dengan tombol *"Edit Data"*.
- Tampilkan field Tempat Lahir pada Card 1.
- Di `MobileEditProfileModal.jsx`, tambahkan input teks `birth_place` dengan styling anti-lag (`transition-colors duration-100`).

3. Penyatuan Ekspor PDF Desktop via Authenticated Blob Stream
deskripsi masalah:
Pada `HalamanLaporanArmada.jsx` (baris 94–100) dan `HalamanLaporanInsiden.jsx` (baris 92–100), fungsi ekspor PDF menggunakan `window.open` dengan menyematkan token mentah dari localStorage langsung ke URL query parameter.
dampak:
Rentan terblokir oleh pop-up blocker browser, token otentikasi terekspos di address bar tab baru, dan berpotensi gagal otentikasi (HTTP 401) jika token kedaluwarsa.
solusi:
- Satukan alur unduh dokumen cetak melalui helper service terpadu di `reportService.js` (`downloadVehicleReportPdf` dan `downloadIncidentReportPdf`) menggunakan Axios authenticated blob stream.
- Di `HalamanLaporanArmada.jsx` dan `HalamanLaporanInsiden.jsx`, ganti `window.open` dengan pemanggilan fungsi service tersebut disertai indikator status loading download pada tombol ekspor.

4. Presisi Layout CSS Cetak A4 & Normalisasi Tanda Tangan Resmi
deskripsi masalah:
Pada `A4DocumentLayout.jsx`, dokumen belum dilengkapi rule CSS `@page { size: A4 portrait; margin: 10mm 12mm; }`. Saat dicetak via fitur print browser (`window.print()`), browser menyisipkan header URL browser dan margin asimetris yang merusak kerapian tabel dan tanda tangan di halaman bawah. Selain itu, penandatangan yang belum memiliki tanda tangan digital menampilkan teks placeholder miring `[ Tanda Tangan Digital ]`.
dampak:
Hasil cetak dokumen fisik menjadi berantakan, terpotong margin default browser, dan terlihat tidak formal karena adanya teks placeholder miring.
solusi:
- Suntikkan rule baku CSS `@page { size: A4 portrait; margin: 10mm 12mm; }` dan rule `@media print` (`page-break-inside: avoid`, background exact).
- Ganti teks placeholder miring dengan format kedinasan resmi PT Angkasa Pura: ruang tanda tangan bersih setinggi 56px di atas Nama Lengkap Huruf Kapital Bergaris Bawah dan NIP.

5. Ergonomi Touch Target Header Mobile (Minimal 44x44px)
deskripsi masalah:
Pada `MobileHeader.jsx` (baris 73 & 87), tombol lonceng pengumuman dan avatar profil berdimensi `w-7 h-7` (28x28px) dengan area tap yang sangat sempit.
dampak:
Kurang dari standar ergonomi W3C/Android (minimal 44x44px), sehingga petugas lapangan sering mengalami salah tekan (miss-tap) atau tombol terasa tidak responsif pada smartphone.
solusi:
Perluas area sentuh efektif tombol lonceng dan avatar profil menjadi minimal 44x44px (`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-slate-100`) dengan tetap mempertahankan proporsi visual ikon dan avatar 28px di dalamnya.

6. Pencegahan Network Flooding dengan AbortController pada Filter Laporan
deskripsi masalah:
Di `HalamanLaporan.jsx` (baris 67–105), pergantian filter tanggal, shift, atau regu memicu 6 pemanggilan API simultan secara beruntun tanpa pembatalan request lama.
dampak:
Menyebabkan penumpukan request di server, pemborosan kuota jaringan, dan risiko race condition di mana data dari filter lama menimpa filter yang baru dipilih.
solusi:
- **SUDAH DITAMBAHKAN DI SERVICE (Dibuat oleh Supervisor):** Fungsi `fetchShiftReportData({ date, shift, team, signal })` di `reportService.js` sudah mendukung parameter `signal` (AbortSignal) yang diteruskan ke seluruh pemanggilan `api.get(..., { signal })`.
- Di `HalamanLaporan.jsx` dan `MobileLaporan.jsx`, Anda cukup membuat instance `const controller = new AbortController(); abortControllerRef.current = controller;` sebelum fetch, lalu meneruskan `signal: controller.signal` ke `fetchShiftReportData`. Jika filter tanggal/shift/regu berganti saat request sedang berlangsung, panggil `abortControllerRef.current.abort()`. Tangani error pembatalan agar tidak menampilkan alert error ke pengguna (`if (err.name === 'CanceledError' || err.name === 'AbortError') return;`).

7. Redundant Fetching Pengumuman pada Mobile Header & Modal
deskripsi masalah:
Saat aplikasi mobile dimuat, `MobileHeader.jsx` melakukan fetch `/announcements` untuk menghitung unread count. Begitu modal pengumuman dibuka, `MobileAnnouncementsModal.jsx` melakukan fetch ulang `/announcements` secara terpisah.
dampak:
Memicu request ganda dalam selang waktu beberapa detik untuk data yang sama.
solusi:
Gunakan in-memory state cache atau broadcast event agar jika data sudah ditarik dalam kurun waktu singkat (< 30 detik), modal pengumuman langsung menggunakan data yang tersedia tanpa fetch ulang.

---

## 📝 FORMAT WAJIB PENULISAN LAPORAN ANDA DI `masak/temp/hasil_agent5.md`:
Setelah selesai mengeksekusi kode dan lulus uji CLI (`npm --prefix frontend run build`), tulis laporan hasil kerja Anda dan temuan baru lainnya dengan format berikut:

```text
(nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
(deskripsi masalah)
(dampak)
(solusi)
```
