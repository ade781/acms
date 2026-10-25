# PANDUAN LENGKAP ARSITEKTUR, FITUR & ATURAN KERJA AGENT (AGENT RULES)
**Sistem Pemantauan Operasional ARFF YIA (Airport Crash Monitoring & Management System - ACMS)**  
Bandara Internasional Yogyakarta (YIA) - PT Angkasa Pura Indonesia

---

## 📌 1. PENDAHULUAN & ARSITEKTUR SISTEM
ACMS ARFF YIA adalah sistem informasi operasional terpadu yang dirancang untuk mendukung kesiapsiagaan darurat unit Airport Rescue & Fire Fighting (ARFF) Bandara Internasional Yogyakarta.

### Ekosistem Aplikasi (Dual Interface):
1. **Desktop Web Portal (`/`):**
   - Ditujukan untuk Chief, Pengawas Posko, dan Administrator Unit.
   - Digunakan di komputer operasional posko, laptop pimpinan, dan monitor ruang siaga (*Watch Room*).
2. **Mobile Web Portal (`/m/*`):**
   - Ditujukan khusus untuk personel operasional dan kru lapangan berbasis smartphone.
   - Menggunakan pendekatan *Mobile-First*, touch target ergonomis (minimal 44x44px), navigasi bawah (*Bottom Navigation Bar*), dan alur kerja cepat.

### Struktur Roster & Shift Operasional:
- **4 Regu Dinas Operasional:** Regu **Alpha**, **Bravo**, **Charlie**, dan **Delta**.
- **3 Shift per Hari:**
  - Shift 1: Pagi (07:00 – 15:00 WIB)
  - Shift 2: Siang (15:00 – 23:00 WIB)
  - Shift 3: Malam (23:00 – 07:00 WIB)
- **Rotasi Siklus 8 Hari:** Pola dinas bergulir otomatis (Pagi, Siang, Malam, Lepas Dinas, dst.).
- **Kepemimpinan Struktural:**
  - **Department Head (Dept. Head):** Pimpinan tertinggi unit di atas 4 regu (data diinput mandiri, bukan bagian dari regu shift).
  - **Chief / Supervisor:** Komandan regu yang memimpin operasional pada shift berjalan.
  - **Kru Lapangan:** Personel pemadam, rescuer, driver armada, dan operator komunikasi.

---

## 🛠️ 2. INVENTARISASI & SPESIFIKASI LENGKAP SELURUH FITUR

### 1. Autentikasi, Hak Akses & Aktivasi Akun
- **Login Sistem (`/login`):**
  - Menggunakan Username/NIP dan Password.
  - Form dilengkapi tombol intip sandi (*Eye/EyeOff* toggle) dengan styling anti-lag (`transition-colors duration-100`).
  - Penanganan error offline: Mendeteksi `Network Error` dan menampilkan pesan ramah operasional tanpa raw teknis.
  - Dilarang keras menampilkan kredensial akun administrator awal (`aaa`/`aaaaaa`) secara terbuka di antarmuka login.
- **Aktivasi Sandi Wajib (`MandatoryPasswordChangeModal.jsx`):**
  - Akun baru dengan flag `must_change_password === true` diwajibkan mengganti kata sandi sebelum dapat mengakses fitur operasional.
  - Field sandi lama, sandi baru, dan konfirmasi sandi dilengkapi tombol intip sandi.

---

### 2. Shell Navigasi Desktop (`Navbar.jsx` & `Sidebar.jsx`)
- **Header Atas Desktop (`Navbar.jsx`):**
  - Menampilkan nama unit: *ARFF YIA | Bandara Internasional Yogyakarta*.
  - Kontrol Shift Operasional: Pemilih tanggal shift dinas aktif, tombol pemilih Shift 1, Shift 2, dan Shift 3, serta indikator badge regu yang bertugas.
  - Ikon Lonceng Notifikasi Pengumuman dengan counter unread.
  - Avatar Profil Mandiri Pengguna: Membuka modal profil mandiri terpusat (GEMINI.md Butir 9).
  - Tombol Keluar (*Logout*).
- **Sidebar Navigasi Desktop (`Sidebar.jsx`):**
  - Menyediakan navigasi menu dinas dengan posisi terkunci (*Sticky Left Navigation* `md:sticky md:top-0 md:h-screen`).
  - Fitur Ciutkan Menu (*Collapse to Mini w-20*): Mengubah sidebar menjadi mode icon-only dengan tooltip label dan notifikasi titik merah (*red dot*) pada ikon lonceng jika ada pengumuman belum dibaca. Preferensi disimpan di `localStorage ('arff_sidebar_collapsed')`.
  - Polling hemat daya: Interval polling pengumuman 90 detik dengan guard `document.visibilityState === 'visible'`.
  - **PANTANGAN MUTLAK:** Seluruh path rute (`to`) WAJIB persis dengan yang terdaftar di `App.jsx` (`/deployment`, `/readiness/vehicles`, `/personnel`, `/incidents`, `/leave`, `/activities`, `/reports`, `/schedules`, `/announcements`, `/personnel/officials`). Dilarang mengarang rute baru!

---

### 3. Halaman Dashboard (`/dashboard`)
- **Status Khusus:** Dikosongkan dan HANYA menampilkan tulisan `'Coming Soon'` (GEMINI.md Butir 13).
- **Pantangan Keras:** Dilarang keras mengubah, mengisi kembali, atau menambahkan komponen/widget pada halaman dashboard ini kecuali ada instruksi eksplisit dari pengguna.

---

### 4. Ploting Penugasan Dinas (`/deployment` & `/m/ploting`)
- **Struktur Formasi Kendaraan:**
  - 7 Armada Fisik: Foam Tender 1, Foam Tender 2, Foam Tender 3, Rapid Intervention Vehicle (RIV), Nurse Tender, Ambulance, dan Command Car.
  - 1 Unit Posko Komunikasi: *Watch Room* (Ruang Operasi Komunikasi).
- **Peran Awak Kendaraan (*Crew Roles*):**
  - Tiap armada memiliki slot peran: Commander/Captain, Driver, Nozzleman 1, dan Nozzleman 2.
- **Proteksi Hak Akses Shift ("Bukan Shift Anda"):**
  - Ploting hanya dapat diakses dan diubah oleh regu yang bertugas aktif pada shift dinas tersebut.
  - Jika user bukan bagian dari regu aktif (atau sedang libur), sistem menolak rendering form armada dan menampilkan layar proteksi: *"Bukan Shift Dinas Anda"* tanpa melakukan request fetch berat ke backend.
- **Simpan Bersifat Eksplisit (Anti-Spam / No Auto-Save):**
  - Perubahan formasi kru dikelola murni pada state lokal frontend. Perubahan HANYA disimpan ke database server saat pengguna menekan tombol "Simpan Ploting".
- **Sanitasi Deduplikasi Kru:**
  - Sistem wajib memvalidasi menggunakan `Set` agar tidak ada ID personel (`personnel_id`) yang ditugaskan di lebih dari satu slot kendaraan pada shift yang sama.
- **Integrasi Status Cuti:**
  - Personel yang tercatat cuti/izin pada shift tersebut otomatis dinonaktifkan (`disabled`) pada dropdown pemilihan kru dengan penanda merah tebal: `⛔ [CUTI/IZIN]` dan dilepas dari ploting aktif agar tidak terjadi tabrakan data (GEMINI.md Butir 6).

---

### 5. Kesiapan Armada & Posko Komunikasi (`/readiness/vehicles`)
- **Default Status Serviceable:**
  - Default status kesiapan kendaraan pada shift berjalan MEMANG berstatus `serviceable` (siap operasi penuh) secara otomatis (GEMINI.md Butir 17).
  - Status hanya berubah jika ada kerusakan bawaan (*carry-over unserviceable*) dari shift sebelumnya yang belum terselesaikan, atau PIC armada secara sadar mengubahnya menjadi `unserviceable` disertai catatan kendala.
- **Pemeriksaan Fisik Kendaraan (`VehicleReadinessModal.jsx`):**
  - Digunakan khusus armada fisik: Meteran bahan pemadam (Air & Foam), tekanan pompa, bahan bakar, odometer, kelengkapan rescue, nomor plat kendaraan, dan foto fisik wajib armada shift berjalan.
- **Pemeriksaan Fasilitas Posko Komunikasi (`WatchroomReadinessModal.jsx`):**
  - Digunakan khusus unit Watchroom: Checklist peralatan komunikasi (Radio VHF Air-to-Ground, Hotline ATC Tower, Crash Bell/Alarm Kebakaran, PC CCTV Monitoring Runway, Telepon Direct Line PABX, dan Buku Register Log).
  - Bebas dari kewajiban nomor plat dan foto fisik mobil pemadam.
- **Audit Trail & Backlog Kendala:**
  - Mencatat kendala unit berjalan, backlog kerusakan masa lalu, dan kendala yang berhasil diselesaikan pada shift ini.

---

### 6. Data Personel ARFF (`/personnel` & `/personnel/:id`)
- **Katalog 4 Regu Dinas Operasional:**
  - Fokus 100% pada 4 regu dinas operasional (Alpha, Bravo, Charlie, Delta) sesuai GEMINI.md Butir 12.
  - Dilengkapi pencarian nama/NIP dengan debounce 350ms (anti-lag) dan filter regu yang menyembunyikan kartu non-matching secara total.
- **Detail Profil & Kepegawaian (`HalamanDetailPersonel.jsx`):**
  - Menampilkan biodata lengkap: Nama Lengkap, NIP, Tempat/Tanggal Lahir, Pendidikan Terakhir, Status Keaktifan.
  - Data Lisensi STKP (Surat Tanda Kecakapan Personel): Rating Lisensi (Basic, Junior, Senior), Nomor Lisensi, Tanggal Terbit, dan Tanggal Kedaluwarsa.
  - Data Medical Check-Up (MCU) dan Riwayat Penugasan Dinas.
  - Dokumen Arsip: Ijazah, sertifikat diklat STKP, berkas MCU, dan surat dinas.
  - Seluruh modal (Edit Personel, Upload Dokumen, Reset Sandi, Hapus) wajib menggunakan komponen modular terpisah di `frontend/src/components/personnel/` dan menggunakan modal konfirmasi in-app (bebas `window.confirm`).

---

### 7. Kelola Pejabat Department Head (`/personnel/officials`)
- **Akses Khusus Administrator:**
  - Data Department Head wajib DIINPUT mandiri (Nama Lengkap, NIP, Jabatan, dan Tanda Tangan Digital), BUKAN dipilih dari daftar anggota regu operasional (GEMINI.md Butir 18).
  - Modal input dilengkapi thumbnail tanda tangan aktif dari database, instant preview berkas baru yang dipilih, dan validasi berkas gambar (maksimal 2 MB).

---

### 8. Pengajuan & Pengelolaan Cuti/Izin (`/leave` & `/m/ploting`)
- **Asas Hak Prerogatif Cuti Mandiri (GEMINI.md Butir 15):**
  - Pengajuan cuti adalah hak prerogatif personel (*self-service*).
  - Admin dan Chief DILARANG memiliki tombol untuk mencatat/mengajukan cuti atas nama anggotanya ("Tambah Cuti Shift Ini" di admin/mobile dilarang).
  - Peran pimpinan/admin murni sebagai pengawas & pengelola: **Read** (melihat siapa yang izin), **Edit** (menyesuaikan), dan **Delete/Batal** (membatalkan cuti untuk mengembalikan kru ke status dinas aktif).
- **Tab Switcher Riwayat Cuti Desktop:**
  - Tab `[Shift Berjalan]`: Menampilkan personel yang sedang cuti/izin pada shift aktif saat ini.
  - Tab `[Riwayat Bulan Ini]`: Menampilkan seluruh arsip cuti bulanan dengan filter bulan, tahun, dan regu melalui endpoint backend `GET /api/deployments/leave-history`.
- **Validasi Berkas Bukti Cuti:**
  - Unggah surat dokter/bukti cuti divalidasi di sisi browser dengan batas maksimal 5 MB.

---

### 9. Logbook Kegiatan Dinas (`/activities` & `/m/kegiatan`)
- **Pencatatan Jurnal Shift:**
  - Mencatat seluruh rutinitas shift: Waktu mulai-selesai, kategori kegiatan (Briefing/Apel Serah Terima, Uji Pancar Kendaraan, Pemeliharaan Alat Rescue, Fire Drill / Pelatihan, Patroli Runway/Manoeuvring Area, Catatan Kendala Khusus), deskripsi pelaksanaan, dan dokumentasi foto.
- **Tata Letak Vertical Step Timeline Desktop:**
  - Disajikan dalam format **Vertical Step Timeline** bersambung garis dinas vertikal kronologis, badge waktu dinas (`07:30 WIB`), dan ikon kategori visual yang elegan.
- **Auto-Dismiss Feedback:** Notifikasi berhasil simpan otomatis menutup setelah 3.5 detik.

---

### 10. Pelaporan Insiden & Alert Darurat (`/incidents`, `/incidents/:id` & `/m/insiden`)
- **Pelaporan Kejadian Darurat (`IncidentModal.jsx`):**
  - Wajib menerima props `activeDate`, `activeShiftNumber`, dan `activeTeam` dengan proteksi fallback `useAuth()` agar tanggal tidak pernah bernilai literal `"undefined"`.
  - Formulir memuat data insiden: Kategori (Aircraft Accident, Fuel Spillage, Fire Alert, Medical Emergency, Runway Excursion), data pesawat (Airline, Flight Number, Tipe Pesawat), lokasi kejadian (Runway/Taxiway/Apron/Grid Map), armada yang dikerahkan (multi-select checklist unit aktif), korban jiwa/luka, dan penanganan operasional.
- **Detail Insiden & Lightbox Foto TKP (`HalamanDetailInsiden.jsx`):**
  - Dokumentasi foto bukti kejadian di TKP interaktif: Mengklik foto membuka Modal Lightbox resolusi penuh berlatar gelap, tombol navigasi foto Sebelumnya/Selanjutnya (`ChevronLeft`/`ChevronRight`), indikator urutan, dan tombol unduh berkas asli.
- **Pagination Riwayat Insiden:**
  - Filter "Semua Riwayat" dipasangi batas default `{ limit: 50 }` untuk mencegah memory spike.

---

### 11. Laporan Shift & Rekapitulasi Cetak Resmi (`/reports`, `/armada/laporan`, `/insiden/laporan`, `/m/laporan`)
- **Single Source of Truth (`reportService.js`):**
  - Modul tunggal terpadu untuk mengekstrak gabungan formasi ploting dinas, kesiapan armada, kesiapan posko watchroom, log kegiatan, dan kejadian insiden lintas perangkat (GEMINI.md Butir 14).
  - Mendukung pembatalan request lama melalui opsi `signal` (*AbortSignal*).
- **Layout Cetak Dokumen A4 Kedinasan (`A4DocumentLayout.jsx`):**
  - Mengimplementasikan CSS cetak presisi: `@page { size: A4 portrait; margin: 10mm 12mm; }` dan `@media print` (*page-break-avoid*).
  - Format Tanda Tangan Resmi: Menampilkan spesimen digital nyata jika terdaftar di database (GEMINI.md Butir 7). Jika belum ada spesimen, menggunakan standar kedinasan PT Angkasa Pura Indonesia: Ruang tanda tangan bersih setinggi 56px di atas **Nama Lengkap Huruf Kapital Bergaris Bawah** dan **NIP** (tanpa teks placeholder buatan).
- **Unduh PDF Terotentikasi:**
  - Unduh berkas PDF kesiapan armada dan rekap insiden menggunakan Axios authenticated blob stream terpadu (`downloadVehicleReportPdf` & `downloadIncidentReportPdf`), menghilangkan popup `window.open` dengan raw query token yang rentan terblokir browser.

---

### 12. Jadwal Pola Shift / Roster (`/schedules`)
- **Matriks Kalender 1 Bulan:**
  - Menampilkan jadwal dinas 4 regu selama 28–31 hari.
  - Input tanggal awal siklus 8 hari dipasangi debounce 300ms.
  - Menggunakan in-memory caching (`monthlyCacheRef`) untuk navigasi bolak-balik antar-bulan tanpa fetch redundan ke backend.
  - Dilengkapi visual scroll cue di tepi kanan kontainer tabel.

---

### 13. Papan Pengumuman Dinas (`/announcements`)
- **Instruksi & Surat Edaran:**
  - Menampilkan instruksi operasional unit dengan lampiran berkas PDF resmi.
  - **Lazy-Load PDF:** Iframe PDF tidak dimuat otomatis saat awal membuka halaman, melainkan hanya saat kartu diklik untuk menghemat kuota dan mempercepat skor LCP.
  - **Fitur Pinned / Mendesak:** Pengumuman dengan prioritas mendesak otomatis disematkan di posisi teratas dengan badge merah khusus.
  - Konfirmasi hapus pengumuman menggunakan in-app confirmation modal.

---

### 14. Profil Mandiri Seluruh Pengguna (GEMINI.md Butir 9)
- **Keseragaman Akses di Header Atas (Top App Bar):**
  - Akses Profil Pribadi, STKP, dan Dokumen Saya di seluruh role (Admin, Chief, Kru) **SERAGAM ditempatkan di Header Atas** melalui avatar profil pengguna.
  - **DILARANG** memasukkan menu Profil ke dalam Bottom Navigation Bar mobile. Bottom Bar murni untuk alur dinas operasional (Dashboard, Ploting, Kegiatan, Insiden, Laporan).
- **Formasi 2 Card Baku:**
  - **Card 1: PROFIL & KREDENSIAL** (Nama Lengkap, NIP, Tempat/Tanggal Lahir, Pendidikan Terakhir, Kualifikasi STKP, Nomor Lisensi, Masa Berlaku STKP, tombol Edit Data, dan tombol Kunci Ubah Password).
    - *Khusus Akun Admin murni:* Menampilkan username, peran Administrator Unit, dan status akses penuh, serta menyembunyikan isian teknis STKP lapangan.
  - **Card 2: DOKUMEN & SERTIFIKAT SAYA** (Daftar arsip ijazah/STKP/MCU yang dapat diunduh aman via query token, dan tombol upload berkas baru dengan validasi ukuran file).
- Tampilan profil dibuka sebagai sub-view/modal bersih yang nyaman di desktop (`DesktopProfileModal.jsx`) dan halaman sub-view penuh di mobile (`MobileProfileView.jsx`).

---

## ⛔ 3. ATURAN BAKU & PANTANGAN KERAS KODING (CODE CONDUCT)

1. **Aturan Isolasi Berkas (Zero File Collision):**
   - Setiap agen HANYA berhak memodifikasi berkas yang tercantum di lembar tugasnya (`task_agent{N}.md`).
   - Dilarang keras mengedit berkas milik agen lain.

2. **Aturan Performa Form Input Anti-Lag (Strict INP & LCP):**
   - **DILARANG KERAS** menggunakan CSS `transition-all` pada `<input>`, `<textarea>`, `<select>`, maupun pada banner feedback. Wajib gunakan `transition-colors duration-100`.
   - **DILARANG KERAS** menggunakan `backdrop-filter: blur(...)` pada overlay modal saat ada form input aktif.
   - Wajib memasang debounce (300–350ms) pada input pencarian dan filter dinamis.
   - Dilarang memuat background image berat (> 100 kB) pada kontainer utama. Wajib CSS gradient murni.

3. **Aturan Zero Dummy Data:**
   - Semua angka, persentase, status kesiapan armada, dan data personel WAJIB berasal dari database/API riil. Dilarang keras membuat mock array atau data pura-pura di tampilan produksi.

4. **Aturan Verifikasi Mandiri (CLI Only - No Browser Subagent):**
   - Dilarang keras membuka browser otomatis (`browser_subagent`).
   - Validasi koding WAJIB melalui terminal CLI:
     - Frontend: `npm --prefix frontend run build` (Wajib lulus tanpa error, Exit Code 0).
     - Backend: `node -c <nama_file.js>` (Wajib bebas SyntaxError).

5. **Aturan Format Penulisan Laporan (Anti-Tabel):**
   - DILARANG menggunakan tabel markdown atau matriks lebar pada penulisan laporan di `masak/temp/hasil_agent*.md`.
   - Wajib format 4 baris hierarkis bernomor:
     ```text
     (nomor). (judul) (halaman (ditulis singkat saja)/namafile) .
     (deskripsi masalah)
     (dampak)
     (solusi)
     ```

6. **Aturan Repositori Git & Folder Sandbox (`masak/`):**
   - DILARANG `git commit` dan `git push` otomatis tanpa perintah langsung dari pengguna.
   - Seluruh skrip manipulasi sementara, seeder ad-hoc, dan uji coba wajib ditempatkan di dalam folder sandbox `masak/`. Dilarang mengotori folder `src/`.
