# LEMBAR PENUGASAN AGENT 1: SHELL NAVIGASI, AUTENTIKASI & PROFIL MANDIRI DESKTOP

**Domain Tanggung Jawab:** Shell Navigasi Desktop (`Navbar.jsx`, `Sidebar.jsx`), Form Login & Pesan Error Sistem, Modal Profil Mandiri Desktop (Sesuai GEMINI.md No. 9).  
**Catatan Penting:** Halaman Dashboard dihiraukan (*skip*).  
**Fase Saat Ini:** **FASE 3 (Eksekusi Perbaikan Kode Produksi)**  

---

## 🎯 BERKAS TARGET PEKERJAAN ANDA (ISOLASI MUTLAK):
1. [`frontend/src/components/layout/Navbar.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/Navbar.jsx)
2. [`frontend/src/components/layout/Sidebar.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/layout/Sidebar.jsx)
3. [`frontend/src/pages/HalamanLogin.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/pages/HalamanLogin.jsx)
4. [`frontend/src/components/common/InputField.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/common/InputField.jsx)
5. [`frontend/src/components/forms/MandatoryPasswordChangeModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/forms/MandatoryPasswordChangeModal.jsx)
6. [`frontend/src/components/profile/DesktopProfileModal.jsx`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/frontend/src/components/profile/DesktopProfileModal.jsx) *(Komponen Baru)*

---

## ⛔ BATASAN & PANTANGAN KERAS (ZERO ACCIDENTAL BREAKAGE):
1. **DILARANG MENGUBAH / MENGGANTI NAMA RUTE MENU DI `Sidebar.jsx`**:
   - Seluruh rute menu di `Sidebar.jsx` WAJIB mengikuti nama path yang sudah terdaftar di `App.jsx`, yaitu:
     - Dashboard: `/dashboard`
     - Ploting Dinas: `/deployment`
     - Kesiapan Armada: `/readiness/vehicles`
     - Data Personel: `/personnel` (tetap tampil untuk semua user, bukan hanya admin)
     - Laporan Insiden: `/incidents`
     - Pencatatan Cuti: `/leave` (bukan `/leaves`)
     - Logbook Kegiatan: `/activities` (bukan `/daily-log`)
     - Laporan Dinas: `/reports`
     - Jadwal Dinas: `/schedules` (bukan `/schedule`)
     - Pengumuman: `/announcements`
     - Kelola Pejabat (khusus admin): `/personnel/officials`
   - Dilarang membuat link buatan yang tidak ada jalurnya di `App.jsx` seperti `/posko`, `/readiness/personnel`, `/settings/readiness`, atau `/system-logs`.
2. **DILARANG MENYENTUH BERKAS DI LUAR DAFTAR TARGET DI ATAS.**

---

## 🛠️ RINCIAN BUTIR TUGAS YANG WAJIB ANDA SELESAIKAN:

1. Pelanggaran Baku No. 9: Akses Profil Mandiri di Header & Akun Admin Tanpa Akses Profil
deskripsi masalah:
Pada `Navbar.jsx`, saat avatar/nama user di kanan atas diklik, sistem mengeksekusi `navigate(/personnel/:id)` yang mengarahkan ke halaman CRUD data kepegawaian administratif (`HalamanDetailPersonel.jsx`). Selain itu, akun Administrator murni (seperti `aaa`) memiliki `user.personnel_id === null`, sehingga klik avatar justru melempar Admin ke katalog daftar personel tanpa bisa melihat atau mengelola profil dan kredensial akun miliknya sendiri. Hal ini melanggar aturan baku GEMINI.md Butir 9.
dampak:
User tidak mendapatkan sub-view profil mandiri yang bersih dan seragam. Admin kehilangan akses untuk memeriksa kredensial atau mengganti kata sandi akun pribadinya secara mandiri.
solusi:
- Bangun komponen modal/sub-view profil mandiri desktop terpusat di `frontend/src/components/profile/DesktopProfileModal.jsx`.
- Modal mengimplementasikan 2 Card baku sesuai GEMINI.md Butir 9:
  - **Card 1: PROFIL & KREDENSIAL** (Nama Lengkap, NIP/Username, Tempat/Tanggal Lahir, Pendidikan Terakhir, Kualifikasi STKP, Nomor Lisensi STKP, Masa Berlaku STKP, tombol Edit Data, dan tombol Kunci Ubah Password).
  - **Khusus Administrator:** Tampilkan username, peran Administrator Unit, dan status akses penuh, serta sembunyikan kolom lisensi teknis STKP lapangan.
  - **Card 2: DOKUMEN & SERTIFIKAT SAYA** (Daftar arsip ijazah/STKP/diklat yang diunduh via token terotentikasi, dan form upload berkas baru dengan validasi ukuran maks 5 MB).
- Pada `Navbar.jsx`, ubah klik avatar dan nama pengguna agar membuka `DesktopProfileModal.jsx` ini, bukan navigasi halaman penuh.

2. Pesan Error Raw Technical saat Server Backend Mati
deskripsi masalah:
Di `HalamanLogin.jsx` baris 48, penanganan error saat server backend offline hanya menampilkan teks mentah `err.response?.data?.message || err.message` yang memunculkan tulisan teknis seperti `"Network Error"` tanpa penjelasan operasional.
dampak:
Petugas lapangan menjadi bingung apakah kesalahan terjadi pada pengetikan username/password atau gangguan server/koneksi jaringan.
solusi:
Pasang deteksi kondisi `if (err.message === 'Network Error' || !err.response)`. Tampilkan pesan kesalahan yang ramah dan operasional: *"Gagal terhubung ke server operasional. Pastikan koneksi jaringan aktif atau hubungi pengelola sistem."*

3. Polling Interval Pengumuman Terlalu Agresif (45 Detik)
deskripsi masalah:
Di `Sidebar.jsx`, pemanggilan API `checkUnread` pada endpoint `/announcements` dijalankan setiap 45 detik secara nonstop menggunakan `setInterval`, bahkan saat tab browser sedang diminimize atau ditinggal di latar belakang.
dampak:
Membebani server dengan request redundan bila puluhan PC monitor posko ARFF membiarkan tab browser terbuka 24 jam nonstop.
solusi:
Naikkan interval polling menjadi 90 detik. Pasang guard `if (document.visibilityState !== 'visible') return;` agar request dihentikan saat tab tidak aktif, dan tambahkan listener event `visibilitychange` untuk me-refresh status baca seketika saat tab kembali dibuka.

4. Sidebar Desktop Statis Tanpa Mini/Collapse Mode
deskripsi masalah:
Di `Sidebar.jsx`, sidebar berukuran lebar tetap `w-64` dan bertipe `md:static`. Di layar laptop 1366x768, sidebar memakan lebar layar dan dapat ikut ter-scroll jika tabel operasional panjang.
dampak:
Ruang pandang matriks tabel operasional menjadi sempit dan sidebar dapat hilang dari pandangan saat pengguna scroll ke bawah.
solusi:
- Jadikan kontainer aside `md:sticky md:top-0 md:h-screen`.
- Tambahkan fitur ciutkan menu (*collapse*) ke mode mini `w-20` dengan tombol toggle di footer bawah sidebar (`ChevronLeft` / `ChevronRight`).
- Simpan status buka/tutup di `localStorage.getItem('arff_sidebar_collapsed')`.
- Pada mode ciut (`isCollapsed`), pusatkan ikon secara simetris (`md:justify-center`) tanpa padding anomali, dan jika ada pengumuman belum dibaca (`unreadAnnouncements > 0`), tampilkan penanda *red dot* berkedip (`w-2.5 h-2.5 rounded-full bg-red-600 ring-2 ring-white`) di atas ikon Lonceng Pengumuman.
- **PENTING:** Seluruh path rute (`to`) wajib tetap menggunakan rute resmi `App.jsx` (jangan diubah!).

---

## 📝 FORMAT WAJIB PENULISAN LAPORAN ANDA DI `masak/temp/hasil_agent1.md`:
Setelah selesai mengeksekusi kode dan lulus uji CLI (`npm --prefix frontend run build`), tulis laporan hasil kerja Anda dan temuan baru lainnya dengan format berikut:

```text
(nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
(deskripsi masalah)
(dampak)
(solusi)
```
