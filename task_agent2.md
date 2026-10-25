# LEMBAR PENUGASAN AGENT 2: MASTER DATA PERSONEL ADMIN, CUTI DESKTOP & ROSTER JADWAL

**Domain Tanggung Jawab:** Master Data Personel (`HalamanPersonel.jsx`, `HalamanDetailPersonel.jsx`), Pengajuan & Riwayat Cuti Desktop (`HalamanCuti.jsx`, `CutiModal.jsx`), Roster Jadwal Shift (`HalamanJadwal.jsx`), dan endpoint backend terkait cuti bulanan.  
**Catatan Penting:** Halaman Dashboard dihiraukan (*skip*).  
**Fase Saat Ini:** **FASE 3 (Eksekusi Perbaikan Kode Produksi)**  

---

## 🎯 BERKAS TARGET PEKERJAAN ANDA (ISOLASI MUTLAK):
1. [`frontend/src/pages/HalamanPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanPersonel.jsx)
2. [`frontend/src/pages/HalamanDetailPersonel.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanDetailPersonel.jsx)
3. Folder Komponen Modular: [`frontend/src/components/personnel/`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/personnel/)
4. [`frontend/src/pages/HalamanCuti.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanCuti.jsx)
5. [`frontend/src/components/forms/CutiModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/CutiModal.jsx)
6. [`frontend/src/pages/HalamanJadwal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanJadwal.jsx)
*(Catatan: Endpoint backend GET /api/deployments/leave-history sudah dibuat dan diuji oleh Supervisor. Anda fokus 100% pada frontend!)*

---

## ⛔ BATASAN & PANTANGAN KERAS:
1. **DILARANG MERUSAK STRUKTUR DETAIL PERSONEL**:
   Saat memecah modal di `HalamanDetailPersonel.jsx`, pastikan semua props (ID, data personel, refresh callback) tetap tersambung dengan benar. Jangan sampai aksi edit personel atau ganti password gagal karena props hilang.
2. **DILARANG MENYENTUH BERKAS DI LUAR DAFTAR TARGET DI ATAS.**

---

## 🛠️ RINCIAN BUTIR TUGAS YANG WAJIB ANDA SELESAIKAN:

1. Penggunaan Dialog Browser Native window.confirm pada Halaman Detail Personel
deskripsi masalah:
Pada `HalamanDetailPersonel.jsx` (baris 186, 261, 312), aksi destruktif penghapusan personel, penghapusan spesimen tanda tangan, dan penghapusan dokumen arsip masih memanggil dialog native browser `window.confirm()`.
dampak:
Dialog browser native membekukan thread UI browser, terlihat tidak profesional, tidak konsisten dengan tema desain sistem, dan rentan terblokir pengaturan browser.
solusi:
Gantikan dialog native `window.confirm` dengan in-app modal konfirmasi kustom bertema dark/modern yang terisolasi dan memiliki callback konfirmasi yang jelas.

2. Network Request Instan Tanpa Debounce pada Search Personel
deskripsi masalah:
Di `HalamanPersonel.jsx`, input pencarian nama/NIP personel mengeksekusi proses filter atau re-render seketika di setiap tombol keyboard ditekan tanpa mekanisme jeda (debounce). Selain itu, filter regu hanya menurunkan opasitas baris (`opacity-30`) tanpa benar-benar menyembunyikan data yang tidak cocok.
dampak:
Melanggar aturan performa global Anti-Lag Form Input. Menimbulkan frame drop dan ketikan tersendat (laggy input) saat mencari personel, serta tampilan layar tetap padat karena baris tidak cocok masih tampil.
solusi:
- Terapkan `debouncedSearchQuery` dengan jeda 350ms menggunakan `useEffect` dan `setTimeout` agar proses penyaringan hanya berjalan setelah user selesai mengetik.
- Sediakan dropdown seleksi regu di bar filter atas (Semua Regu, Alpha, Bravo, Charlie, Delta), dan terapkan filter array client-side yang menyembunyikan baris non-matching secara total.

3. Monolithic File Bloat 47.5 KB & 3 Modal Bertumpuk pada Halaman Detail Personel
deskripsi masalah:
Berkas `HalamanDetailPersonel.jsx` berukuran monolitik (47.5 KB / 1.111 baris) dengan 3 modal besar bertumpuk di dalam satu berkas komponen.
dampak:
Kode sangat sulit dirawat, memicu re-render berat pada seluruh halaman saat mengetik input di dalam modal, dan memperbesar risiko regresi saat ada perubahan kecil.
solusi:
Pecah modal-modal tersebut menjadi komponen modular terpisah di folder `frontend/src/components/personnel/`:
- `EditPersonelModal.jsx` (Form edit biodata dan kredensial STKP).
- `UploadDocumentModal.jsx` (Form upload dokumen arsip ijazah/STKP/MCU).
- `ResetPasswordConfirmModal.jsx` (Modal konfirmasi reset password).
- `ConfirmActionModal.jsx` (Modal konfirmasi umum untuk hapus personel/dokumen/tanda tangan).
Gunakan komponen-komponen ini di `HalamanDetailPersonel.jsx` agar kode halaman utama menjadi ramping dan bersih.

4. Input Tanggal Mulai Siklus Tanpa Debounce dan Caching Jadwal
deskripsi masalah:
Di `HalamanJadwal.jsx`, pemilihan tanggal awal siklus 8 hari langsung memicu request ke backend seketika tanpa debounce. Selain itu, navigasi bolak-balik antar-bulan selalu melakukan request ulang ke server.
dampak:
Memicu request beruntun (*spamming*) ke backend saat user mengganti tanggal dengan cepat, serta membebani server karena data bulan yang sama ditarik berkali-kali.
solusi:
- Pasang debounce 300ms pada perubahan input tanggal siklus.
- Terapkan mekanisme in-memory caching (`monthlyCacheRef`) untuk menyimpan data jadwal bulanan yang telah ditarik selama sesi aktif, dan invalidate cache tersebut hanya jika ada perubahan siklus baru.
- Tambahkan petunjuk visual scroll horizontal (gradien halus tepi kanan) agar pengguna mengetahui bahwa kalender 31 hari dapat digeser ke samping pada layar kecil.

5. Tampilan Cuti Terbatas pada Shift Berjalan Saja
deskripsi masalah:
`HalamanCuti.jsx` sebelumnya hanya menampilkan daftar cuti pada shift aktif saat ini. Pengawas tidak dapat melihat riwayat cuti bulan bersangkutan atau rencana cuti masa depan.
dampak:
Pengawas kesulitan melakukan audit kehadiran bulanan dan mengecek pengajuan cuti yang telah diajukan personel lebih awal.
solusi:
- Tambahkan tab switcher di header `HalamanCuti.jsx`: `[Shift Berjalan]` dan `[Riwayat Bulan Ini]`.
- Pada tab `[Riwayat Bulan Ini]`, sediakan pemilih bulan, tahun, dan filter regu.
- **SUDAH TERSEDIA DI BACKEND (Dibuat oleh Supervisor):** Endpoint `GET /api/deployments/leave-history?month={1..12}&year={2026}&team={Alpha/Bravo/Charlie/Delta}` sudah aktif dan mengembalikan array data cuti bulanan. Anda **TIDAK PERLU** mengedit file backend, cukup lakukan `api.get('/deployments/leave-history', { params: { month, year, team } })` di `HalamanCuti.jsx`!

6. Ketiadaan Validasi Client-Side Ukuran Berkas Dokumen Personel & Bukti Cuti
deskripsi masalah:
Form upload dokumen ijazah/STKP di `HalamanDetailPersonel.jsx` dan form pengajuan cuti di `CutiModal.jsx` belum memvalidasi batas ukuran file di browser sebelum dikirim ke server.
dampak:
Berkas berukuran raksasa (> 10 MB) tetap dikirimkan lewat jaringan, membuang bandwidth, memicu timeout, dan menghasilkan error teknis HTTP 413 Payload Too Large tanpa pesan error ramah.
solusi:
Terapkan pre-validasi ukuran berkas di sisi klien:
- Maksimal 10 MB untuk dokumen kepegawaian/sertifikat di modal upload dokumen personel.
- Maksimal 5 MB untuk dokumen bukti cuti di `CutiModal.jsx`.
- Tampilkan notifikasi peringatan seketika di modal jika ukuran berkas yang dipilih melebihi batas.

---

## 📝 FORMAT WAJIB PENULISAN LAPORAN ANDA DI `masak/temp/hasil_agent2.md`:
Setelah selesai mengeksekusi kode dan lulus uji CLI (`npm --prefix frontend run build` dan `node -c backend/src/controllers/deploymentController.js`), tulis laporan hasil kerja Anda dan temuan baru lainnya dengan format berikut:

```text
(nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
(deskripsi masalah)
(dampak)
(solusi)
```
