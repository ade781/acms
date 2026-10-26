# DOKUMEN QUALITY ASSURANCE & TEMUAN SISTEM (QA.MD)
**Sistem Pemantauan Operasional ARFF YIA (ACMS)**
Bandara Internasional Yogyakarta (YIA) • PT Angkasa Pura Indonesia

Dokumen ini memuat hasil audit mendalam (*Deep Audit*) menyeluruh terhadap seluruh antarmuka sistem (Desktop & Mobile), status pemuatan jaringan (*Network Waterfall*), aksesibilitas (WCAG), dan kepatuhan aturan baku operasional.

---

## DAFTAR TEMUAN AUDIT SISTEM (DESKTOP & MOBILE)

### 1. Anomali Favicon `shield-alert.svg` Mengembalikan File HTML Ganda
* **Lokasi Berkas / URL**:
  * Pemanggil: `frontend/index.html:5`
  * Target Aset: `http://localhost:4173/shield-alert.svg` (atau `/shield-alert.svg` pada URL root)
* **Deskripsi Masalah**:
  * Pada pemantauan lalu lintas jaringan (Network Waterfall) saat memuat halaman aplikasi, berkas favicon `shield-alert.svg` berstatus HTTP 200 namun dengan MIME Type `text/html` dan berukuran 1.1 kB, bukan berkas grafis vektor `image/svg+xml`.
* **Penyebab Masalah**:
  * Berkas `frontend/index.html` mendeklarasikan favicon peramban dengan tag:
    `<link rel="icon" type="image/svg+xml" href="/shield-alert.svg" />`.
  * Namun, folder `frontend/public/` atau berkas fisik `shield-alert.svg` belum pernah dibuat di direktori frontend.
  * Server Single Page Application (SPA) seperti Vite atau Nginx yang menerapkan *history API fallback* secara otomatis menyajikan berkas fallback `index.html` (berukuran 1.1 kB bertipe `text/html`) untuk setiap berkas statis yang tidak ditemukan (*404 not found*).
* **Dampak / Risiko**:
  * Tab peramban (*browser tab*) tidak menampilkan ikon identitas resmi ARFF YIA dan hanya menampilkan ikon bola bumi default.
  * Terjadi pemborosan 1 permintaan jaringan (*redundant network request*) di setiap kali aplikasi pertama kali dibuka oleh pengguna operasional untuk mengunduh berkas HTML yang tidak terpakai.
  * Pada audit Lighthouse, kondisi ini mengurangi skor efisiensi aset dan menghasilkan respon tipe berkas yang keliru (*MIME type mismatch*).
* **Rekomendasi Solusi Konkret**:
  1. Buat direktori `frontend/public/`.
  2. Tempatkan berkas ikon SVG asli `shield-alert.svg` (ikon perisai tanggap darurat ARFF dengan palet warna resmi oranye-merah/amber tanpa efek glow) di dalam folder `frontend/public/`.
  3. Pastikan server merespons permintaan `/shield-alert.svg` dengan HTTP 200 dan Content-Type `image/svg+xml` yang dapat di-*cache* permanen oleh peramban pengguna.

---

### 2. Hardcoded Nama Pejabat Pimpinan pada Placeholder Input Form
* **Lokasi Berkas / Halaman**:
  * `frontend/src/pages/OfficialsManagementPage.jsx:562`
  * Halaman: Kelola Pejabat Struktural (`/personnel/officials`)
* **Deskripsi Masalah**:
  * Pada input nama Department Head di modal penggantian pejabat, placeholder input form tertulis secara eksplisit: `placeholder="Contoh: Tamsul Sadikin"`.
* **Penyebab Masalah**:
  * Penulisan teks petunjuk (*placeholder*) menyertakan nama pejabat riil pimpinan unit sebagai contoh teks statis.
* **Dampak / Risiko**:
  * Melanggar aturan ketat pada `GEMINI.md` Butir 4 (*Dilarang Hardcode Data Pejabat / Pimpinan*) dan Butir 18 (*Input Struktural Pejabat Department Head*).
  * Apabila terjadi mutasi pejabat struktural baru di masa mendatang, tampilan placeholder lama yang menyebut nama pejabat sebelumnya tampak tidak profesional dan membingungkan administrator.
* **Rekomendasi Solusi Konkret**:
  * Ubah placeholder menjadi generik dan baku kedinasan tanpa mencatut nama riil:
    `placeholder="Masukkan nama lengkap beserta gelar resmi..."`.

---

### 3. Pelanggaran Rasio Kontras Warna Teks Keterangan (WCAG Accessibility)
* **Lokasi Berkas / Halaman**:
  * Desktop: `frontend/src/pages/ShiftReportsPage.jsx:609`
  * Mobile: `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx:135,168`
* **Deskripsi Masalah**:
  * Teks keterangan catatan kendala kosong dan teks tanggal tanda tangan digital menggunakan warna `text-slate-400` di atas latar belakang terang (`bg-slate-50` / `bg-white`).
  * Rasio kontras yang dihasilkan adalah 2.45:1 s.d. 2.53:1, jauh di bawah standar kepatuhan aksesibilitas WCAG AA (minimal 4.5:1 untuk teks normal).
* **Penyebab Masalah**:
  * Penggunaan utility Tailwind `text-slate-400` yang terlalu pudar untuk teks berukuran 12px dan 8px pada tema terang.
* **Dampak / Risiko**:
  * Keterangan sulit terbaca oleh pengguna lapangan di bawah sinar matahari terik apron bandara atau pengguna dengan keterbatasan penglihatan.
  * Menjadi penyebab utama penurunan skor Aksesibilitas Lighthouse dari 100 menjadi 96.
* **Rekomendasi Solusi Konkret**:
  * Tingkatkan kontras teks dari `text-slate-400` menjadi `text-slate-600` (atau `text-slate-500` dengan font tebal sedang) agar rasio kontras mencapai > 4.5:1.

---

### 4. Accessible Name Mismatch pada Tombol Profil Mandiri Desktop
* **Lokasi Berkas / Halaman**:
  * `frontend/src/components/layout/Navbar.jsx:98`
  * Komponen: Header Navigasi Atas (*Top App Bar Desktop*)
* **Deskripsi Masalah**:
  * Tombol profil pengguna memiliki atribut `aria-label="Buka Profil Pribadi"`, namun secara visual menampilkan teks nama dan jabatan pengguna (misal: "Ade7 Asli â€¢ Administrasi").
* **Penyebab Masalah**:
  * Atribut `aria-label` yang kaku menimpa (*override*) seluruh teks anak yang terlihat di layar, sehingga teks yang didengar pembaca layar (*screen reader*) tidak cocok dengan teks yang terlihat di mata pengguna (*Accessible Name Mismatch*).
* **Dampak / Risiko**:
  * Pengguna difabel yang menggunakan perintah suara (*voice control*) tidak dapat mengklik tombol dengan menyebutkan nama yang tertera di layar.
  * Menghasilkan skor 0 pada audit aksesibilitas Lighthouse untuk kategori *Elements with visible text labels do not have matching accessible names*.
* **Rekomendasi Solusi Konkret**:
  * Ubah `aria-label` agar menyertakan nama pengguna yang terlihat:
    `aria-label={`Profil ${user.name || user.username}`}` atau hilangkan `aria-label` agar pembaca layar langsung membaca teks nama dan perannya secara alami.

---

### 5. Ketiadaan Meta Description pada Dokumen HTML Utama
* **Lokasi Berkas**:
  * `frontend/index.html`
* **Deskripsi Masalah**:
  * Berkas `index.html` belum memiliki tag `<meta name="description" content="...">`.
* **Penyebab Masalah**:
  * Template default Vite belum dilengkapi metadata deskripsi aplikasi resmi.
* **Dampak / Risiko**:
  * Mengurangi skor audit SEO pada Lighthouse (turun menjadi 82) dan mengurangi kejelasan ringkasan aplikasi saat di-bookmark atau disimpan sebagai Web App / PWA di layar utama tablet/ponsel petugas.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan tag meta deskripsi resmi di bagian `<head>` pada `frontend/index.html`:
    `<meta name="description" content="Sistem Pemantauan Operasional ARFF YIA - Monitoring Personel, Armada, dan Laporan Dinas Shift" />`.

---

### 6. Potensi Lonjakan Ukuran Berkas Kamera Ponsel Tanpa Kompresi Klien
* **Lokasi Berkas / Halaman**:
  * `frontend/src/components/mobile/activities/MobileActivityModal.jsx`
  * `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`
  * Halaman: Modal Dokumentasi Kegiatan & Insiden Lapangan
* **Deskripsi Masalah**:
  * Pada modul mobile kegiatan dan insiden, foto yang diambil langsung dari kamera ponsel (berukuran 5MB s.d. 12MB) dikirimkan mentah ke server backend tanpa kompresi kanvas di sisi peramban.
* **Penyebab Masalah**:
  * Fungsi utilitas kompresi kanvas WebP (`imageCompressor.js`) baru diterapkan pada modul inspeksi kendaraan fisik, namun belum diintegrasikan ke formulir unggah kegiatan dan insiden mobile.
* **Dampak / Risiko**:
  * Pengunggahan foto berukuran besar di area apron bandara dengan sinyal seluler terbatas berisiko memicu *network timeout* dan gagal simpan.
  * Membebani kapasitas penyimpanan disk server secara cepat dan memperlambat waktu pemuatan linimasa di perangkat kru lain.
* **Rekomendasi Solusi Konkret**:
  * Integrasikan utilitas `compressImageToWebp` sebelum berkas foto dimasukkan ke objek `FormData` pada modal kegiatan dan insiden mobile, sehingga ukuran foto menyusut menjadi < 300 kB tanpa kehilangan ketajaman bukti visual.

---

### 7. Duplikasi Payload Raksasa pada Endpoint API Personel (`GET /api/personnel`)
* **Lokasi Berkas / API**:
  * Backend Controller: `backend/src/controllers/personnelController.js:18,56-57`
  * Endpoint: `GET /api/personnel` dan `GET /api/personnel?is_active=1`
* **Deskripsi Masalah**:
  * Ukuran payload respon JSON untuk daftar katalog personel mencapai **185.94 kB** pada setiap kali request dilakukan.
* **Penyebab Masalah**:
  * Pada baris 56â€“57 `personnelController.js`, array 95 data personel dikembalikan dua kali secara duplikat dalam satu objek respon JSON yang sama: `{ data: formattedRows, personnel: formattedRows }`.
  * Selain itu, query `SELECT p.*` mengekstrak seluruh 36 kolom lengkap (termasuk riwayat detail diklat, nomor sertifikat refreshing, dll.) yang tidak diperlukan untuk tampilan ringkasan tabel/kartu personel.
* **Dampak / Risiko**:
  * Pemborosan kuota data jaringan seluler hingga 2 kali lipat bagi personel di area apron bandara.
  * Memperlambat proses penguraian JSON (*JSON parsing time*) di perangkat smartphone mobile dengan RAM terbatas, serta memperpanjang *Total Blocking Time* (TBT).
* **Rekomendasi Solusi Konkret**:
  * Hapus duplikasi key `personnel: formattedRows` dan cukup kirimkan satu key standar `data: formattedRows`.
  * Tambahkan proyeksi kolom ringkas (*lightweight projection*) khusus endpoint katalog (hanya mengambil `id`, `nip`, `full_name`, `team_group`, `rank_position`, `cert_level`, `cert_expiry_date`, dan `is_active`) sehingga ukuran respon menyusut dari 186 kB menjadi < 20 kB.

---

### 8. Ketiadaan Header Caching (`Cache-Control`) pada Berkas Unggahan (`/uploads`)
* **Lokasi Berkas / Server**:
  * Backend Server: `backend/src/app.js:165`
  * Endpoint: `GET /uploads/*`
* **Deskripsi Masalah**:
  * Seluruh aset gambar (foto fisik inspeksi kendaraan, foto dokumentasi insiden, dan avatar) disajikan tanpa instruksi *header* HTTP `Cache-Control` (`Cache: None`).
* **Penyebab Masalah**:
  * Middleware penyaji berkas statis `app.use('/uploads', express.static(uploadsDir))` belum dikonfigurasi dengan opsi `maxAge` maupun `etag`.
* **Dampak / Risiko**:
  * Setiap kali pengguna membuka halaman kesiapan armada atau riwayat insiden, browser selalu mengunduh ulang foto-foto bukti yang sama dari server alih-alih mengambilnya dari cache disk lokal.
  * Menimbulkan lalu lintas jaringan berulang (*repeated network bandwidth consumption*) dan memperlambat rendering galeri foto di perangkat lapangan.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan konfigurasi cache pada middleware express static:
    `app.use('/uploads', express.static(uploadsDir, { maxAge: '7d', etag: true }));`.

---

### 9. Ketiadaan `AbortController` pada 17 Komponen Halaman Frontend (Race Condition)
* **Lokasi Berkas / Halaman**:
  * Terdapat pada 17 halaman (antara lain: `PersonnelPage.jsx`, `DeploymentPage.jsx`, `ActivitiesPage.jsx`, `IncidentsPage.jsx`, `LeaveManagementPage.jsx`, `VehicleReadinessPage.jsx`, dan seluruh halaman mobile).
* **Deskripsi Masalah**:
  * Fungsi pengambilan data (`api.get`) di dalam hook `useEffect` dipanggil tanpa menyertakan sinyal pembatalan (`AbortSignal`).
* **Penyebab Masalah**:
  * Komponen langsung memicu `api.get(url)` tanpa menginisialisasi `const controller = new AbortController()`.
* **Dampak / Risiko**:
  * **Race Condition Data**: Jika pengguna mengubah filter regu atau pencarian dengan cepat (misal dari Regu Alpha ke Bravo lalu Charlie), beberapa request berjalan bersamaan di jaringan. Jika respon Regu Alpha selesai paling akhir, tampilan akan keliru menampilkan data lama Alpha di bawah label Charlie.
  * **Memory Leak**: Jika pengguna berpindah menu sebelum data selesai diunduh, promise yang selesai mencoba memanggil `setState` pada komponen yang telah dilepas (*unmounted*).
* **Rekomendasi Solusi Konkret**:
  * Terapkan pola `AbortController` terstandarisasi di setiap hook `useEffect` pengambilan data:
    `javascript
    useEffect(() => {
      const controller = new AbortController();
      fetchData({ signal: controller.signal });
      return () => controller.abort();
    }, [...dependencies]);
    `

---

### 10. Kurangnya Pemisahan Kode Rute (*Route Code Splitting*) di `App.jsx`
* **Lokasi Berkas**:
  * Router Utama: `frontend/src/App.jsx:7-20, 56-60`
* **Deskripsi Masalah**:
  * 15 halaman desktop dan 5 halaman mobile diimpor secara statis (*static import*) di awal berkas `App.jsx`.
  * Hanya 2 halaman (`VehicleReportsPage` dan `IncidentReportsPage`) yang menggunakan `React.lazy()`.
* **Penyebab Masalah**:
  * Seluruh komponen rute digabungkan oleh Vite ke dalam satu file bundel utama raksasa: `dist/assets/index-BWbeXs09.js` (831.02 kB mentah / 202.74 kB gzip).
* **Dampak / Risiko**:
  * Pengguna mobile di lapangan yang hanya mengakses dashboard sederhana dipaksa mengunduh seluruh kode JavaScript halaman desktop manajerial yang kompleks (seperti matriks kalender roster bulanan dan kelola pejabat) yang tidak pernah mereka butuhkan.
  * Memicu peringatan kompilasi Vite: `(!) Some chunks are larger than 500 kB after minification`.
* **Rekomendasi Solusi Konkret**:
  * Terapkan `React.lazy()` pada seluruh halaman rute di `App.jsx` yang dibungkus dengan `<React.Suspense>`.
  * Konfigurasikan `manualChunks` di `vite.config.js` untuk memisahkan pustaka vendor eksternal (`vendor-react`, `vendor-icons`), sehingga ukuran unduh pertama kali turun drastis ke < 70 kB.

---

### 11. Permintaan Jaringan Simultan (*Concurrent Burst Requests*) pada Halaman Cuti
* **Lokasi Berkas / Halaman**:
  * `frontend/src/pages/LeaveManagementPage.jsx:184-215`
  * Halaman: Manajemen Cuti & Izin Dinas (`/leave`)
* **Deskripsi Masalah**:
  * Saat pertama kali membuka halaman `/leave`, browser secara otomatis memicu 4 request jaringan independen secara bersamaan:
    1. `GET /personnel?team_group=...`
    2. `GET /deployments/current?...`
    3. `GET /deployments/leave-history?status=berjalan`
    4. `GET /deployments/leave-history?month=...`
* **Penyebab Masalah**:
  * Tiga hook `useEffect` terpisah dijalankan serentak saat komponen terpasang (*mounted*), termasuk mengambil data riwayat bulanan padahal tab yang aktif adalah tab "Status Berjalan".
* **Dampak / Risiko**:
  * Terjadi lonjakan koneksi mendadak (*connection burst*) ke database backend.
  * Terjadi jeda render dan getaran visual (*loading flicker*) karena masing-masing panel selesai memuat data di detik yang berbeda.
* **Rekomendasi Solusi Konkret**:
  * Terapkan strategi *Lazy Data Fetching*: Hanya panggil endpoint riwayat bulanan saat pengguna secara sadar mengklik tab `[Riwayat Bulan Ini]`.

---

### 12. Ketiadaan Kompresi HTTP (Gzip/Brotli) pada Respons API Backend Express
* **Lokasi Berkas / Server**:
  * `backend/package.json` & `backend/src/app.js`
* **Deskripsi Masalah**:
  * Seluruh data respon JSON yang dikirimkan oleh API Express dikirimkan dalam format teks mentah tanpa kompresi HTTP (`Content-Encoding` kosong).
* **Penyebab Masalah**:
  * Paket middleware `compression` belum dipasang pada aplikasi Express.
* **Dampak / Risiko**:
  * Mengonsumsi kuota data jaringan lebih boros 70% s.d. 85% untuk setiap respon data tabel dinas, jadwal roster bulanan, dan logbook kegiatan.
* **Rekomendasi Solusi Konkret**:
  * Pasang paket `compression` di backend (`npm install compression`) dan aktifkan di `app.js`:
    `javascript
    import compression from 'compression';
    app.use(compression());
    `
  * Atau pastikan reverse proxy web server produksi (Nginx/Cloudflare) mengaktifkan `gzip on;` dan `brotli on;`.

---

### 13. Pengambilan Data Badge Pengumuman Sidebar Boros Bandwidth (Polling Full List vs Badge Count)
* **Lokasi Berkas / Komponen**:
  * Frontend: `frontend/src/components/layout/Sidebar.jsx:44,54`
  * Backend Controller: `backend/src/controllers/announcementController.js:10-53`
* **Deskripsi Masalah**:
  * Bilah navigasi samping (*Sidebar*) melakukan pengecekan berkala (*polling*) setiap 90 detik dengan memanggil `GET /api/announcements` hanya untuk membaca angka lencana merah (*unread count*).
* **Penyebab Masalah**:
  * Endpoint `GET /api/announcements` dirancang untuk memuat seluruh daftar pengumuman lengkap: mengeksekusi dua query SQL dan mentransfer seluruh baris data (judul, nomor surat edaran, deskripsi detail, path berkas lampiran, dan nama pembuat), padahal Sidebar hanya memerlukan satu nilai angka (*integer*) untuk lencana.
* **Dampak / Risiko**:
  * Setiap 90 detik, aplikasi mentransfer puluhan kilobyte payload JSON yang tidak terpakai di latar belakang.
  * Jika terdapat puluhan dokumen edaran resmi yang tersimpan di sistem, konsumsi bandwidth kumulatif membengkak secara tidak perlu bagi seluruh komputer terminal dan tablet petugas yang dibiarkan menyala.
* **Rekomendasi Solusi Konkret**:
  1. Buat endpoint ringan khusus: `GET /api/announcements/unread-count` (atau tambahkan opsi query parameter `?count_only=1` pada endpoint pengumuman).
  2. Endpoint tersebut hanya mengeksekusi satu query agregasi cepat:
     `SELECT COUNT(*) as unread_count FROM announcements a LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ? WHERE ar.read_at IS NULL`
  3. Kembalikan payload ringkas berukuran < 100 bytes: `{ success: true, data: { unread_count: n } }` sehingga polling berkala menjadi sangat hemat sumber daya jaringan.

---

### 14. Overhead Jaringan Rekapitulasi Laporan Shift: 6 Roundtrip HTTP Simultan
* **Lokasi Berkas / Halaman**:
  * Service Terpadu: `frontend/src/services/reportService.js:16-30`
  * Desktop: `frontend/src/pages/ShiftReportsPage.jsx:82-97`
  * Mobile: `frontend/src/pages/mobile/MobileReports.jsx:86-95`
* **Deskripsi Masalah**:
  * Saat pengguna membuka halaman Rekapitulasi Laporan Dinas Shift (baik di desktop maupun mobile), modul frontend memicu **6 permintaan HTTP GET terpisah secara serentak**:
    1. `GET /deployments/current?date=...&shift=...&team_group=...`
    2. `GET /readiness/vehicles?date=...&shift=...&team_group=...`
    3. `GET /readiness/watchroom?date=...&shift=...&team_group=...`
    4. `GET /reports/vehicle-issues?date=...&shift=...&team_group=...`
    5. `GET /activities?date=...&shift=...&team_group=...`
    6. `GET /incidents?date=...&shift=...&team_group=...`
* **Penyebab Masalah**:
  * Ketiadaan endpoint agregator data JSON di backend khusus untuk pratinjau laporan shift terpadu, sehingga frontend terpaksa melakukan penggabungan data manual di sisi klien (*client-side data stitching*).
* **Dampak / Risiko**:
  * Pada koneksi seluler apron bandara dengan latensi tinggi (misal RTT 120ms s.d. 200ms), 6 request bersamaan memicu perebutan slot koneksi HTTP browser dan meningkatkan latensi total hingga > 1.2 detik.
  * Memicu 6 kali pembukaan transaksi database di backend dan risiko getaran visual (*layout shift / loading flicker*) saat data tiba secara parsial.
* **Rekomendasi Solusi Konkret**:
  * Sediakan satu endpoint agregasi resmi: `GET /api/reports/shift-summary?date=...&shift=...&team_group=...`.
  * Endpoint ini mengeksekusi query secara terpusat di server (sebagaimana dilakukan oleh fungsi pencetak PDF `generateShiftReportPdf`) dan mengembalikan seluruh struktur data laporan dalam **1 respons JSON tunggal**, mereduksi 6 roundtrip jaringan menjadi tepat 1 roundtrip.

---

### 15. Pemborosan Payload Mobile Dashboard untuk Perhitungan Jumlah Personel Tim
* **Lokasi Berkas / Halaman**:
  * `frontend/src/pages/mobile/MobileDashboard.jsx:46, 149`
  * Halaman: Dashboard Operasional Petugas Lapangan Mobile (`/m/dashboard`)
* **Deskripsi Masalah**:
  * Saat pertama kali memuat Dashboard Mobile, sistem memanggil `api.get('/personnel?team_group=${currentTeam}&is_active=1')`.
  * Data array personel berukuran besar tersebut ternyata **hanya digunakan di baris 149 untuk membaca properti `.length`** (`totalStrength = teamPersonnel.length > 0 ? teamPersonnel.length : ...`) guna mengisi kartu metrik ringkasan kekuatan regu.
* **Penyebab Masalah**:
  * Endpoint `/deployments/current` belum menyertakan metrik ringkas total anggota aktif regu dinas tersebut secara langsung pada objek responnya.
* **Dampak / Risiko**:
  * Ponsel petugas di lapangan mengunduh puluhan kilobyte data personel lengkap (seluruh 36 kolom riwayat STKP, diklat, dsb.) hanya demi mendapatkan satu angka bulat (misal: angka 23).
  * Memperlambat proses render awal kartu tugas dinas petugas di ponsel lapangan.
* **Rekomendasi Solusi Konkret**:
  1. Tambahkan properti `total_team_members: number` pada respon endpoint `GET /api/deployments/current`.
  2. Hapus pemanggilan `GET /personnel` dari `MobileDashboard.jsx`, sehingga jumlah request awal pada Mobile Dashboard berkurang dari 4 menjadi 3 request yang jauh lebih ringan.

---

### 16. Dropdown Modal Ganti Chief Mengunduh Seluruh Katalog Personel Penuh Sejak Awal
* **Lokasi Berkas / Halaman**:
  * `frontend/src/pages/OfficialsManagementPage.jsx:74, 84-87`
  * Halaman: Kelola Pejabat Struktural (`/personnel/officials`)
* **Deskripsi Masalah**:
  * Saat halaman Kelola Pejabat dibuka, sistem langsung mengunduh seluruh 95 personel via `api.get('/personnel?is_active=1')` (185 kB).
* **Penyebab Masalah**:
  * Data personel diambil secara agresif (*eager fetch*) saat komponen pertama kali terpasang (*mounted*), padahal data tersebut hanya dipakai jika Administrator mengklik tombol "Ganti Chief" untuk memilih nama pengganti dari dropdown modal.
* **Dampak / Risiko**:
  * Memperlambat waktu pemuatan awal halaman kelola pejabat (*Initial Page Load*) dan membuang kuota data jika Administrator hanya ingin meninjau daftar pejabat atau mengedit Department Head.
* **Rekomendasi Solusi Konkret**:
  * Terapkan strategi *Lazy / On-Demand Fetching*: Hanya panggil data personel saat Administrator secara sadar mengklik tombol ganti Chief.
  * Gunakan endpoint proyeksi kolom sempit (misal `SELECT id, full_name, team_group FROM personnel WHERE is_active = 1`) yang hanya berukuran < 3 kB untuk mengisi dropdown form.

---

### 17. Ketiadaan Header Caching (`Cache-Control`) pada Endpoint Berkas Lampiran Surat Edaran
* **Lokasi Berkas / Server**:
  * Backend Controller: `backend/src/controllers/announcementController.js:230-233`
  * Endpoint: `GET /api/announcements/:id/attachment`
* **Deskripsi Masalah**:
  * Endpoint pengunduhan dan pratinjau dokumen PDF lampiran surat edaran menyajikan berkas tanpa menyertakan *header* HTTP `Cache-Control` dan `ETag`.
* **Penyebab Masalah**:
  * Fungsi penyerahan berkas `res.sendFile(filePath)` belum menyetel konfigurasi cache HTTP bagi peramban.
* **Dampak / Risiko**:
  * Setiap kali petugas membuka atau meninjau kembali dokumen PDF surat edaran yang sama di lembar kerja atau modal pratinjau, peramban selalu mengunduh ulang seluruh berkas PDF (yang dapat berukuran beberapa megabyte) dari server.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan header cache pada respon berkas edaran:
    `res.setHeader('Cache-Control', 'private, max-age=86400, must-revalidate');`
    sehingga peramban pengguna menyimpan salinan lokal dokumen selama 24 jam dan menghemat lalu lintas jaringan seluler secara signifikan.

---

### 18. Tombol Non-Fungsional (*Dead Control*) Insiden pada `ShiftHeaderCard` di 5 Halaman Utama
* **Lokasi Berkas / Komponen**:
  * Komponen Bersama: `frontend/src/components/dashboard/ShiftHeaderCard.jsx:79-97`
  * Pemanggil 1: `frontend/src/pages/DeploymentPage.jsx:443`
  * Pemanggil 2: `frontend/src/pages/VehicleReadinessPage.jsx:178`
  * Pemanggil 3: `frontend/src/pages/ShiftReportsPage.jsx:170`
  * Pemanggil 4: `frontend/src/pages/LeaveManagementPage.jsx:326`
  * Pemanggil 5: `frontend/src/pages/ActivitiesPage.jsx:436`
* **Deskripsi Masalah**:
  * Pada komponen `ShiftHeaderCard`, terdapat tombol status insiden (`[0 Insiden]` atau `[N Insiden Aktif]`) yang memiliki styling interaktif lengkap (`cursor-pointer`, efek `hover:bg-slate-50`, shadow, border, dan icon). Namun saat diklik oleh pengguna, tombol tersebut **sama sekali tidak bereaksi apa pun**.
* **Penyebab Masalah**:
  * Tombol tersebut memanggil handler `onClick={onOpenIncidentModal}`. Namun di seluruh 5 halaman pemanggilnya, prop `onOpenIncidentModal` **tidak pernah dioperkan** (`undefined`).
* **Dampak / Risiko**:
  * Melanggar aturan ketat prinsip `/antislop-ui` bagian *Non-Functional Controls* (R-26: *"Buttons do nothing, dropdowns won't open... this is the difference between a mockup and a product. Every interactive element has real behavior, or it is removed"*).
  * Membingungkan pengguna lapangan yang mengira tombol tersebut dapat diklik untuk membuka rincian log insiden atau formulir pelaporan cepat.
* **Rekomendasi Solusi Konkret**:
  * Jika tombol bertujuan untuk navigasi, ubah menjadi link navigasi ke halaman insiden: `onClick={() => navigate('/incidents')}`.
  * Atau jika hanya berstatus indikator informasi, ubah elemen `<button>` menjadi `<div role="status">` statis yang bersih tanpa cursor-pointer dan tanpa efek tombol interaktif palsu.

---

### 19. Redundansi Informasi Shift Bertumpuk antara Header Navigasi dan Konten Halaman
* **Lokasi Berkas / Komponen**:
  * Desktop Header: `frontend/src/components/layout/Navbar.jsx:58-87`
  * Mobile Header: `frontend/src/components/mobile/MobileHeader.jsx:72-74`
  * Sub-Header Desktop: `frontend/src/components/dashboard/ShiftHeaderCard.jsx:21-49`
  * Sub-Header Mobile: `frontend/src/pages/mobile/MobileDashboard.jsx:164-167`
* **Deskripsi Masalah**:
  * Terjadi pengulangan data operasional shift (Regu, Shift ke-1/2/3, Tanggal) secara bertumpuk dan berulang-ulang di layar pandang yang sama.
  * Di desktop: `Navbar` di bagian atas sudah menampilkan pemilih Tanggal dan Jam Shift aktif. Tepat 20px di bawahnya, kartu `ShiftHeaderCard` kembali menampilkan teks besar nama Regu, tanggal dinas, dan jam shift yang persis sama.
  * Di mobile: `MobileHeader` di baris atas menuliskan `Alpha â€¢ Shift 1`. Tepat di bawahnya, baris pertama konten `MobileDashboard` menuliskan kembali `Regu Alpha â€¢ Shift 1`.
* **Penyebab Masalah**:
  * Pemasangan container metadata dinas ganda antara layout shell global (*AppLayout / MobileLayout*) dan masing-masing komponen sub-view halaman.
* **Dampak / Risiko**:
  * Melanggar aturan baku `GEMINI.md` Butir 1 (*Anti-Redundansi UI & Dilarang Mengulang Teks Petunjuk*) dan prinsip layout `/antislop-ui`.
  * Memakan ruang vertikal layar (*vertical screen real estate*) yang sangat berharga di laptop 13-14 inch dan smartphone lapangan, memaksa pengguna melakukan scrolling yang tidak perlu.
* **Rekomendasi Solusi Konkret**:
  * Sederhanakan `ShiftHeaderCard`: Jadikan ringkas (*compact single line*) atau leburkan kontrol tanggal/shift sepenuhnya ke dalam Navbar atas, sehingga area konten halaman dapat langsung difokuskan pada tabel data operasional (Ploting, Armada, Cuti).
  * Di Mobile Dashboard, hilangkan teks pengulang `Regu Alpha â€¢ Shift 1` di atas tombol segarkan dan cukup pertahankan tombol segarkan yang tenang.

---

### 20. Duplikasi Pemasangan Komponen Modal Cuti Mandiri (`MobileLeaveModal`)
* **Lokasi Berkas / Komponen**:
  * Level Shell Global: `frontend/src/components/mobile/MobileLayout.jsx:100-110`
  * Level Halaman Lokal: `frontend/src/pages/mobile/MobileDashboard.jsx:235-244`
* **Deskripsi Masalah**:
  * Komponen formulir cuti mobile `<MobileLeaveModal>` dipasang sebanyak **dua kali** pada pohon DOM aplikasi mobile yang sama.
* **Penyebab Masalah**:
  * Saat fitur cuti diperluas, pengembang memasang modal di `MobileLayout.jsx` yang mendengarkan event global `arff:open-leave-modal`, namun tidak membersihkan modal lokal yang sudah ada di dalam `MobileDashboard.jsx`.
* **Dampak / Risiko**:
  * Menimbulkan duplikasi state (*split-state*) dan risiko konflik pengiriman data formulir.
  * Komponen merender listener dan elemen form ganda di memori peramban perangkat seluler.
* **Rekomendasi Solusi Konkret**:
  * Hapus instansiasi lokal `<MobileLeaveModal>` di dalam `MobileDashboard.jsx`.
  * Seluruh tombol pembuka cuti di `MobileDashboard` (baik dari kartu tugas dinas maupun kartu rekap) cukup memancarkan event standar `window.dispatchEvent(new CustomEvent('arff:open-leave-modal'))` atau memanggil callback terpadu ke `MobileLayout`.

---

### 21. Duplikasi Permintaan Jaringan Pengumuman Simultan pada Pemuatan Mobile Dashboard
* **Lokasi Berkas / Komponen**:
  * Header Mobile: `frontend/src/components/mobile/MobileHeader.jsx:27, 41`
  * Dashboard Mobile: `frontend/src/pages/mobile/MobileDashboard.jsx:45`
* **Deskripsi Masalah**:
  * Saat rute `/m/dashboard` dibuka, peramban mengirimkan **dua permintaan HTTP `GET /api/announcements` yang persis sama ke backend pada milidetik yang bersamaan**.
* **Penyebab Masalah**:
  * `MobileHeader` memicu `fetchUnread()` di hook `useEffect`-nya sendiri, sementara `MobileDashboard` memicu `api.get('/announcements')` di dalam `Promise.allSettled`-nya sendiri tanpa berbagi state atau memanfaatkan cache bersama.
* **Dampak / Risiko**:
  * Pemborosan bandwidth ganda pada perangkat smartphone petugas lapangan.
  * Server backend Express terpaksa memproses dua query SQL berat secara bersamaan untuk hal yang sama.
* **Rekomendasi Solusi Konkret**:
  * Angkat state pengumuman (*lift state up*) ke `MobileLayout` atau gunakan React Query / Shared SWR Context, sehingga satu pemanggilan data pengumuman dapat disuplai ke `MobileHeader` (untuk lencana) dan ke `MobileDashboard` (untuk widget daftar) secara efisien.

---

### 22. Duplikasi Logika Format Tanggal Lokal di 9 Komponen Mengabaikan Helper Terpadu
* **Lokasi Berkas Tersebar**:
  1. `frontend/src/pages/VehicleReportsPage.jsx:34`
  2. `frontend/src/pages/AnnouncementsPage.jsx:56`
  3. `frontend/src/components/profile/DesktopProfileModal.jsx:49`
  4. `frontend/src/components/personnel/PersonnelDossier.jsx:80`
  5. `frontend/src/components/mobile/profile/MobileProfileView.jsx:44`
  6. `frontend/src/components/mobile/profile/MobilePersonnelAccordion.jsx:79`
  7. `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx:12`
  8. `frontend/src/components/forms/WatchroomReadinessModal.jsx:68`
  9. `frontend/src/components/forms/VehicleReadinessModal.jsx:130`
* **Deskripsi Masalah**:
  * Terdapat setidaknya 9 fungsi pembantu format tanggal yang ditulis ulang (*reinventing the wheel*) secara berulang-ulang di masing-masing komponen.
* **Penyebab Masalah**:
  * Pengembang tidak mengimpor helper baku `formatIndoDate` yang sudah tersedia di `frontend/src/utils/shiftHelper.js`.
* **Dampak / Risiko**:
  * Melanggar aturan baku `GEMINI.md` Butir 14 (*Single Source of Truth / DRY: Dilarang membuat fungsi terpisah untuk hal yang tujuannya sama*).
  * Format penyajian tanggal di dokumen cetak, modal, dan tabel menjadi tidak seragam (sebagian menulis "26 Okt 2026", sebagian "26 Oktober 2026", dan sebagian menampilkan timestamp ISO mentah jika terjadi error parsing).
* **Rekomendasi Solusi Konkret**:
  * Bersihkan seluruh implementasi lokal dan ganti dengan satu impor baku:
    `import { formatIndoDate } from '../utils/shiftHelper';`.

---

### 23. Animasi Berkedip Tanpa Henti (*Endless Pulse Loops*) pada Elemen Non-Darurat
* **Lokasi Berkas / Komponen**:
  * `frontend/src/components/forms/DeploymentSlotCard.jsx:317`
  * `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx:170`
  * `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx:182`
* **Deskripsi Masalah**:
  * Dot status hijau/merah di samping label formulir dipasangi animasi CSS `animate-pulse` yang berkedip tanpa henti (*endless loop*).
* **Penyebab Masalah**:
  * Penggunaan animasi bawaan Tailwind secara dekoratif tanpa mempertimbangkan kenyamanan mata pengguna (*eye strain*).
* **Dampak / Risiko**:
  * Melanggar aturan prinsip `/antislop-ui` bagian *Motion* ("Endless Pulses and Loops" & "Decorative Status Dot"):
    *"Perpetual motion is noise. It competes with the content for attention and never stops to let the user rest. A dot must mark a real state; drop the glow and drop the endless pulse"*.
  * Menciptakan gangguan visual (*visual distraction*) yang melelahkan bagi kru operasional yang sedang mengisi form atau membaca data armada.
* **Rekomendasi Solusi Konkret**:
  * Hapus kelas `animate-pulse` dari seluruh dot indikator statis. Cukup gunakan dot warna tegas dan tenang (`w-2 h-2 rounded-full bg-emerald-500` atau `bg-red-500`) tanpa animasi looping.

---

### 24. Teks Jargon Filler "Rekapitulasi Berjalan (Real-Time)" pada Badge `ShiftHeaderCard`
* **Lokasi Berkas / Komponen**:
  * `frontend/src/components/dashboard/ShiftHeaderCard.jsx:30-33`
* **Deskripsi Masalah**:
  * Pada kartu header shift dinas, terpasang badge statis permanen bertuliskan:
    `<Badge variant="serviceable" size="md"><CheckCircle className="w-3.5 h-3.5" /> Rekapitulasi Berjalan (Real-Time)</Badge>`.
* **Penyebab Masalah**:
  * Badge ini merupakan teks sisa masa pengembangan yang dipasang secara statis di header komponen bersama.
* **Dampak / Risiko**:
  * Melanggar prinsip *Teks & Konten UI (Anti-Asumsi / Anti-Slop)* pada `GEMINI.md` ("Jangan menambahkan slogan, jargon, atau teks filler yang tidak diminta pengguna").
  * Teks ini membingungkan dan tidak relevan saat komponen dirender di halaman Ploting Dinas atau Manajemen Cuti.
* **Rekomendasi Solusi Konkret**:
  * Hapus badge jargon "Rekapitulasi Berjalan (Real-Time)" dari header. Cukup tampilkan badge status dinas aktif murni: `<Badge variant="team{Team}">Regu {Team} Aktif</Badge>`.

---

### 25. Fragmentasi Penamaan & Relasi Pejabat Struktural antara Database `users` dan `personnel`
* **Lokasi Berkas / Database**:
  * Skema Database: `backend/src/config/schema.sql:10, 22`
  * Backend Controller: `backend/src/controllers/reportController.js:20-62`
  * Backend Controller: `backend/src/controllers/deploymentController.js:30-38`
* **Deskripsi Masalah**:
  * Terdapat ambiguitas data penandatangan resmi Section Head / Dept Head di laporan PDF.
  * Tabel `users` menggunakan kolom `role` berbentuk ENUM kaku (`dept_head`, `chief`, dsb.), sedangkan tabel `personnel` menggunakan kolom teks bebas `rank_position` (`Airport Technology & ARFF Dept. Head`, `Section Head`, dsb.).
  * Akibatnya, backend di `reportController.js` terpaksa menggunakan query pencocokan string berbasis wildcard:
    `WHERE p.rank_position LIKE '%Section%Head%' OR p.rank_position LIKE '%Seksi%' OR u.role = 'section_head' ...`.
* **Penyebab Masalah**:
  * Ketiadaan tabel relasional khusus pejabat penandatangan definitif (*official signatories mapping*), sehingga sistem menebak identitas pimpinan dari teks string jabatan.
* **Dampak / Risiko**:
  * Apabila Administrator memperbarui jabatan pimpinan dengan ejaan yang sedikit berbeda (misal: "Kepala Seksi ARFF" atau "Dept. Head"), query pencocokan dapat meleset dan sistem jatuh ke fallback akun administrator default (`aaa`).
  * Melanggar aturan `GEMINI.md` Butir 4 & 18 (*Dilarang Hardcode Data Pejabat & Input Struktural Pejabat Department Head*).
* **Rekomendasi Solusi Konkret**:
  * Manfaatkan tabel `system_settings` dengan kunci permanen `official_dept_head_user_id` atau tambahkan kolom referensi `is_official_dept_head TINYINT(1)` di database, sehingga pencarian pejabat penandatangan resmi selalu merujuk pada Foreign Key ID yang pasti tanpa pencocokan teks liar (*wildcard string matching*).

---

## BAGIAN V: AUDIT BIDANG 1 (KEAMANAN, OTORISASI RBAC, & PROTEKSI DATA SENSITIF)

---

### 26. Eksposur Dokumentasi & Foto Insiden Sensitif Bandara Tanpa Autentikasi (`/uploads/*`)
* **Lokasi Berkas / Komponen**:
  * `backend/src/app.js:49-60`
* **Deskripsi Masalah**:
  * Middleware pengaman unggahan di `backend/src/app.js` membedakan file privat hanya berdasarkan nama awalan file:
    `const isPrivateDoc = filename.startsWith('document-') || filename.startsWith('signature-') || ...`.
  * Foto-foto bukti investigasi kecelakaan pesawat udara / insiden kebakaran bandara (`incident_attachments`), foto kerusakan berat armada operasional (`photo_webp_url`), dan foto kegiatan shift dinas dikategorikan sebagai "berkas operasional publik" dan disajikan langsung melalui `res.sendFile(publicFilePath)` tanpa memerlukan token login atau header autentikasi sama sekali.
* **Penyebab Masalah**:
  * Asumsi awal bahwa file selain dokumen PDF dan tanda tangan aman diakses publik oleh browser tanpa pengecekan token JWT.
* **Dampak / Risiko**:
  * Pelanggaran berat kerahasiaan data operasional penerbangan (*Restricted Aviation Safety & Incident Data*).
  * Siapa saja di internet yang mengetahui format nama file atau melakukan web scraping/enumerasi URL pada path `/uploads/*.webp` dapat melihat dan mengunduh dokumentasi visual insiden kecelakaan bandara, foto korban/kerusakan fasilitas vital, dan foto investigasi internal tanpa otorisasi.
* **Rekomendasi Solusi Konkret**:
  * Hapus pengecualian publik untuk file foto operasional di `app.js`. Seluruh aset di `/uploads/` wajib melewati verifikasi token JWT valid (baik melalui header `Authorization: Bearer <token>` maupun query param `?token=...` untuk kompatibilitas tag `<img>`).
  * Pengecualian tanpa token HANYA diberikan untuk aset branding statis publik murni (seperti logo instansi/aplikasi).

---

### 27. Kerentanan IDOR & Horizontal Privilege Escalation pada Modifikasi/Penghapusan Logbook Kegiatan (`/api/activities/:id`)
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/activityController.js:170-300`
* **Deskripsi Masalah**:
  * Endpoint `PUT /api/activities/:id` dan `DELETE /api/activities/:id` hanya memvalidasi apakah peran user termasuk ke dalam `['admin', 'chief', 'chief_assistant']`.
  * Fungsi sama sekali tidak memvalidasi apakah kegiatan (`id`) tersebut tercatat pada regu (`team_group`) atau shift dinas milik Chief yang sedang login.
* **Penyebab Masalah**:
  * Tidak ada filter pencocokan kepemilikan data (`ps.team_group === req.user.team_group`) atau verifikasi supervisor shift saat melakukan `UPDATE` atau `DELETE`.
* **Dampak / Risiko**:
  * Kerentanan *Insecure Direct Object Reference* (IDOR) & *Horizontal Privilege Escalation*.
  * Chief dari Regu Delta dapat mengubah narasi kegiatan, menghapus dokumentasi, atau memanipulasi logbook dinas resmi milik Regu Alpha, Bravo, atau Charlie hanya dengan mengganti parameter URL ID kegiatan.
  * Merusak integritas auditabilitas catatan hukum logbook dinas bandara.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan validasi otorisasi kepemilikan:
    Jika user bukan `admin` atau `dept_head`, query verifikasi wajib memastikan bahwa kegiatan terkait (`shift_id`) dipimpin oleh regu user yang bersangkutan (`ps.team_group = req.user.team_group`), atau tolak request dengan HTTP 403 Forbidden.

---

### 28. Inkonsistensi Otorisasi RBAC antara Rute Middleware dan Logika Controller (`activityRoutes.js` vs `activityController.js`)
* **Lokasi Berkas / Komponen**:
  * Rute: `backend/src/routes/activityRoutes.js:20, 26, 30`
  * Controller: `backend/src/controllers/activityController.js:85-91, 172-178, 265-271`
* **Deskripsi Masalah**:
  * Pada rute `activityRoutes.js`, middleware mengizinkan:
    `requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'])`.
  * Namun di dalam fungsi controller `createActivity`, `updateActivity`, dan `deleteActivity`, terdapat blok pengecekan ulang yang hardcoded:
    `const allowedRoles = ['admin', 'chief', 'chief_assistant']; if (!allowedRoles.includes(req.user?.role)) return res.status(403)...`.
* **Penyebab Masalah**:
  * Pengecekan peran ganda (*dual-layer check*) yang tidak sinkron antara middleware rute dan isi controller.
* **Dampak / Risiko**:
  * Pejabat Department Head (`dept_head`) dan Supervisor Pengawas (`supervisor`) yang sah secara organisasi ditolak oleh server (HTTP 403) saat mencoba mencatat atau memvalidasi kegiatan operasional di lapangan.
  * Kode membingungkan (*inconsistent authorization flow*) dan menimbulkan bug hak akses bagi pengguna berpangkat struktural.
* **Rekomendasi Solusi Konkret**:
  * Selaraskan daftar peran yang diizinkan pada controller agar konsisten dengan middleware rute, atau serahkan seluruh filter otorisasi peran ke middleware `requireRole(['admin', 'dept_head', 'chief', 'chief_assistant', 'supervisor'])` tanpa duplikasi logika hardcoded di controller.

---

### 29. Ketiadaan Rate Limiting pada Endpoint Login (`/api/auth/login`) Rentan Brute-Force & CPU Exhaustion
* **Lokasi Berkas / Komponen**:
  * `backend/src/routes/authRoutes.js:9`
  * `backend/src/controllers/authController.js:7-74`
* **Deskripsi Masalah**:
  * Endpoint autentikasi login `/api/auth/login` tidak dipasangi batasan frekuensi percobaan (*rate limiter*).
  * Penyerang dapat mengirimkan puluhan ribu tebakan kombinasi NIP/username dan password per menit tanpa ada hambatan penundaan atau pemblokiran IP sementara.
* **Penyebab Masalah**:
  * Belum dipasangnya package proteksi seperti `express-rate-limit` pada rute autentikasi publik.
* **Dampak / Risiko**:
  * Risiko pembobolan kredensial akun personel atau administrator via serangan *brute-force* atau *credential stuffing*.
  * Potensi *Denial of Service* (DoS) berbasis CPU: fungsi `bcrypt.compare` membutuhkan daya komputasi tinggi. Banjir request login palsu dapat melumpuhkan event loop Node.js dan membuat server tidak responsif bagi pengguna dinas lainnya.
* **Rekomendasi Solusi Konkret**:
  * Pasang middleware `express-rate-limit` khusus pada endpoint `/api/auth/login` dengan batasan ketat (misal: maksimal 5 kegagalan login per 15 menit per alamat IP).

---

### 30. Ketiadaan Mekanisme Revokasi Token JWT saat Perubahan Password atau Logout Pengguna
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/authController.js:139-174`
  * `backend/src/middleware/authMiddleware.js:15-54`
* **Deskripsi Masalah**:
  * Ketika pengguna mengubah kata sandi melalui fungsi `changePassword`, sistem hanya memperbarui hash password di tabel `users`.
  * Token JWT yang sebelumnya telah diterbitkan tetap berstatus valid hingga masa kedaluwarsanya habis (24 jam). Tidak ada tabel sesi aktif (*session store*) atau nomor versi token (*token versioning*).
* **Penyebab Masalah**:
  * Desain JWT tanpa status (*stateless token*) murni tanpa mekanisme pengecekan versi atau blacklist.
* **Dampak / Risiko**:
  * Jika akun personel mengalami kebocoran token (misal akibat token tersimpan di browser perangkat bersama posko atau perangkat hilang), pergantian password tidak seketika mematikan akses penyerang. Penyerang tetap dapat memanipulasi data dinas hingga masa berlaku 24 jam berakhir.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan kolom `token_version INT DEFAULT 1` pada tabel `users`.
  * Masukkan klaim `token_version` ke dalam payload JWT saat login.
  * Setiap kali user mengganti password atau mengklik "Logout dari Semua Perangkat", lakukan `UPDATE users SET token_version = token_version + 1`.
  * Di `authMiddleware.js`, verifikasi bahwa `decoded.token_version === user.token_version`. Jika tidak cocok, tolak dengan HTTP 401 Unauthorized.

---

## BAGIAN VI: AUDIT BIDANG 2 (INTEGRITAS TRANSAKSI DATABASE & KASUS EKSTREM CONCURRENCY)

---

### 31. Race Condition & Ledakan Crash Fatal `ER_DUP_ENTRY` pada Penomoran Laporan Insiden (`generateNextReportNumber`)
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/incidentController.js:6-23, 174`
  * Skema Database: `backend/src/config/schema.sql:121`
* **Deskripsi Masalah**:
  * Penomoran otomatis laporan insiden (`INC-0001`, `INC-0002`, dst.) digenerate menggunakan fungsi:
    `SELECT report_number FROM incidents WHERE report_number LIKE 'INC-%' ORDER BY id DESC LIMIT 1`.
  * Query ini dieksekusi tanpa klausa penguncian baris (*row-level locking* `FOR UPDATE`).
  * Pada skema database, kolom `report_number` memiliki konstrain indeks unik:
    ` `report_number` VARCHAR(50) NOT NULL UNIQUE `.
* **Penyebab Masalah**:
  * Pembacaan data urutan terakhir secara bebas tanpa *pessimistic lock*, sehingga dua transaksi yang dieksekusi di mikrodetik yang sama membaca nomor terakhir yang identik.
* **Dampak / Risiko**:
  * Jika terjadi situasi darurat di mana 2 petugas dari posko dan TKP melaporkan data insiden secara bersamaan, kedua transaksi akan sama-sama mengkalkulasi nomor yang sama (misal `INC-0005`).
  * Saat proses insert dieksekusi, transaksi kedua langsung meledak crash fatal dengan error MySQL: `ER_DUP_ENTRY: Duplicate entry 'INC-0005' for key 'report_number'`, menyebabkan laporan insiden gagal tersimpan dan server mengembalikan HTTP 500.
* **Rekomendasi Solusi Konkret**:
  * Gunakan klausa pengunci pada query nomor:
    `SELECT report_number FROM incidents WHERE report_number LIKE 'INC-%' ORDER BY id DESC LIMIT 1 FOR UPDATE`.
  * Atau gunakan tabel sequence berurutan terpisah dengan penguncian atomik `LAST_INSERT_ID()`.

---

### 32. Celah Concurrency Double-Submission Pengajuan Cuti Menerobos Batas Kuota & Validasi Anti-Overlap
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/deploymentController.js:498-567`
* **Deskripsi Masalah**:
  * Pada fungsi `requestLeaveRange`, validasi anti-overlap tanggal cuti (baris 498) dan validasi kuota maksimal 2 cuti aktif (baris 523) dieksekusi SEBELUM transaksi database dimulai (`connection.beginTransaction()` baru dipanggil pada baris 567).
  * Validasi dilakukan menggunakan query `SELECT` biasa tanpa penguncian transaksi.
* **Penyebab Masalah**:
  * Penempatan pengecekan integritas bisnis di luar blok transaksi atomik (*unprotected read before transaction*).
* **Dampak / Risiko**:
  * Jika personel melakukan klik cepat ganda (*double click*) pada tombol "Ajukan Cuti", atau mengirimkan dua permintaan cuti paralel dari perangkat berbeda, kedua thread membaca state database lama yang sama (keduanya melihat kuota masih < 2 dan tidak ada overlap).
  * Kedua thread berhasil lolos verifikasi, lalu keduanya melakukan insert bertahap secara bersamaan. Akibatnya, personel memiliki 3 hingga 4 pengajuan cuti aktif atau memiliki jadwal cuti yang saling bertabrakan pada rentang hari yang sama, melanggar aturan `GEMINI.md` Butir 19 secara telak.
* **Rekomendasi Solusi Konkret**:
  * Pindahkan `await connection.beginTransaction()` ke awal fungsi sebelum query validasi dijalankan.
  * Tambahkan penguncian row baris cuti personel: `SELECT ... FOR UPDATE` saat memeriksa data cuti aktif yang ada, sehingga permintaan konkuren kedua wajib menunggu hingga transaksi pertama selesai di-commit.

---

### 33. Missing Transaction & Potensi Crash Concurrency `ER_DUP_ENTRY` pada Pelaporan Kesiapan Armada (`submitVehicleReadiness`)
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/readinessController.js:236-307`
  * Skema Database: `backend/src/config/schema.sql:80`
* **Deskripsi Masalah**:
  * Fungsi `submitVehicleReadiness` memeriksa keberadaan log melalui query:
    `SELECT id, photo_webp_url FROM vehicle_readiness_logs WHERE vehicle_id = ? AND shift_date = ? AND shift_number = ? AND team_group = ?`.
  * Jika `existing.length === 0`, fungsi melakukan `INSERT INTO vehicle_readiness_logs ...`.
  * Seluruh alur ini dijalankan menggunakan koneksi pool acak tanpa transaksi (`pool.getConnection()` dan `beginTransaction()` tidak digunakan).
  * Di skema database, tabel memiliki konstrain unik:
    `UNIQUE KEY unique_vehicle_shift_team (vehicle_id, shift_date, shift_number, team_group)`.
* **Penyebab Masalah**:
  * Pola *check-then-act* non-atomik tanpa transaksi dan tanpa sintaks upsert aman.
* **Dampak / Risiko**:
  * Jika PIC armada dan Chief Regu menekan tombol simpan kesiapan armada di saat yang bersamaan, kedua request melihat `existing.length === 0`.
  * Keduanya mengeksekusi `INSERT`, mengakibatkan request kedua menabrak kunci unik dan crash dengan error 500: `ER_DUP_ENTRY: Duplicate entry for key 'unique_vehicle_shift_team'`.
  * Selain itu, jika update backlog status follow-up di baris 300 gagal, status armada baru sudah terlanjur tersimpan tanpa ada rollback, menyebabkan data kelaikan operasional menjadi timpang.
* **Rekomendasi Solusi Konkret**:
  * Bungkus seluruh mutasi data kesiapan armada ke dalam satu transaksi utuh (`connection.beginTransaction()`, `commit()`, `rollback()`).
  * Gantikan logika `SELECT` lalu `INSERT` dengan sintaks MySQL atomik `INSERT INTO vehicle_readiness_logs (...) VALUES (...) ON DUPLICATE KEY UPDATE status = VALUES(status), ...`.

---

### 34. Ketiadaan Transaksi Database Atomik pada Manajemen Siklus Rotasi Jadwal Dinas (`saveScheduleCycle` & `resetScheduleCycles`)
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/scheduleController.js:290-322`
* **Deskripsi Masalah**:
  * Pada fungsi `saveScheduleCycle`, penyimpanan setting pola siklus ke `system_settings` dan penghapusan override manual usang di `schedule_rosters` dijalankan sebagai dua query pool terpisah:
    1. `await pool.query('INSERT INTO system_settings ... ON DUPLICATE KEY UPDATE ...')`
    2. `await pool.query('DELETE FROM schedule_rosters WHERE roster_date >= ?', [start_date])`
  * Hal serupa terjadi pada `resetScheduleCycles`:
    1. `await pool.query("DELETE FROM system_settings WHERE setting_key = 'schedule_custom_cycle'")`
    2. `await pool.query('DELETE FROM schedule_rosters')`
* **Penyebab Masalah**:
  * Penggunaan `pool.query()` langsung untuk operasi multi-tabel yang saling bergantung (*dependent multi-table writes*) tanpa membungkusnya dalam satu koneksi transaksi (*transactional connection*).
* **Dampak / Risiko**:
  * Jika koneksi database terputus atau server mati tepat di antara kedua query, sistem akan berada dalam status *split-brain / inconsistent state*: pola siklus baru tersimpan namun override lama tidak terhapus (atau sebaliknya).
  * Akibatnya, jadwal dinas 4 regu yang tampil di kalender operasional menjadi kacau dan bertabrakan dengan jadwal dinas masa lalu.
* **Rekomendasi Solusi Konkret**:
  * Gunakan transaksi eksplisit:
    `const connection = await pool.getConnection(); await connection.beginTransaction(); ... await connection.commit();` dengan penanganan rollback otomatis pada blok `catch`.

---

### 35. Missing Database Transaction & Inkonsistensi Rollback pada Pembatalan Cuti (`cancelLeave`)
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/deploymentController.js:680-780`
* **Deskripsi Masalah**:
  * Pada fungsi `cancelLeave`, koneksi database diambil secara manual:
    `const connection = await pool.getConnection();`.
  * Namun sepanjang fungsi, `connection.beginTransaction()` dan `connection.commit()` TIDAK PERNAH dipanggil.
  * Jika pembatalan berupa paket rentang tanggal (`startDate s/d endDate`) atau array `deployment_ids`, operasi penghapusan baris dijalankan bertahap tanpa transaksi.
* **Penyebab Masalah**:
  * Koneksi diambil dari pool tetapi developer lupa menyematkan `beginTransaction()` dan `commit()`.
* **Dampak / Risiko**:
  * Jika proses pembatalan multi-hari terputus di tengah jalan (misal timeout atau database error), sebagian hari cuti terhapus sedangkan sebagian hari lainnya masih tertinggal di database.
  * Personel akan memiliki baris cuti terdampar (*orphan absent entries*) yang tidak lagi terdeteksi sebagai satu paket utuh di UI namun tetap memblokir kuota pengajuan cuti baru.
* **Rekomendasi Solusi Konkret**:
  * Sematkan `await connection.beginTransaction()` sebelum operasi penghapusan, panggil `await connection.commit()` sebelum mengirim respons sukses, dan pastikan `await connection.rollback()` terpanggil di blok `catch`.

---

## BAGIAN VII: AUDIT BIDANG 3 (SKALABILITAS QUERY & DATABASE BOTTLENECK)

---

### 36. Ketiadaan Indeks Kolom pada Tabel `incidents` Memicu Full Table Scan Berulang
* **Lokasi Berkas / Database**:
  * Skema Database: `backend/src/config/schema.sql:119-145`
  * Controller: `backend/src/controllers/incidentController.js:25-72`
* **Deskripsi Masalah**:
  * Tabel `incidents` hanya memiliki indeks pada Primary Key `id` dan Unique Key `report_number`.
  * Endpoint `getIncidents` selalu melakukan filtering berdasarkan kombinasi kolom:
    `WHERE incident_date = ? AND shift_number = ? AND team_group = ? AND category = ? AND status = ? AND priority_level = ?`
    serta melakukan pengurutan: `ORDER BY incident_date DESC, incident_time DESC`.
  * Tidak ada satupun indeks sekunder (*secondary index*) atau indeks komposit pada kolom-kolom filter tersebut.
* **Penyebab Masalah**:
  * Pembuatan skema tabel awal tanpa perencanaan strategi pengindeksan (*indexing plan*) untuk query agregasi dan pelaporan berkala.
* **Dampak / Risiko**:
  * Setiap kali pengguna membuka halaman Daftar Insiden atau Laporan Rekapitulasi Insiden, mesin database MySQL dipaksa melakukan *Full Table Scan* dan operasi *FileSort* di memori/disk.
  * Seiring berjalannya tahun dinas dan bertambahnya ribuan baris logbook insiden, response time query akan melonjak drastis (> 1000ms), membebani CPU database dan memperlambat sistem.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan indeks komposit pada skema database:
    `INDEX idx_inc_date_shift (incident_date, shift_number, team_group)`
    `INDEX idx_inc_status_category (status, category)`.

---

### 37. Ketiadaan Indeks Komposit pada `personnel_deployments` untuk Riwayat Cuti & Ploting Armada
* **Lokasi Berkas / Database**:
  * Skema Database: `backend/src/config/schema.sql:100-117`
  * Controller: `backend/src/controllers/deploymentController.js:79-89, 498-531`
* **Deskripsi Masalah**:
  * Tabel `personnel_deployments` hanya memiliki constraint indeks unik:
    `UNIQUE KEY unique_shift_personnel (shift_id, personnel_id)`.
  * Query verifikasi cuti aktif, anti-overlap, dan riwayat cuti selalu menyaring:
    `WHERE pd.personnel_id = ? AND pd.deployment_type = 'absent' AND ps.shift_date >= ?`.
  * Query ploting armada juga menyaring:
    `WHERE pd.shift_id = ? AND pd.deployment_type IN ('vehicle_utama', 'vehicle_pendukung', 'watchroom')`.
* **Penyebab Masalah**:
  * Kolom `deployment_type` dan `personnel_id` tidak memiliki indeks sekunder khusus untuk filtering cepat tanpa dependensi pada `shift_id`.
* **Dampak / Risiko**:
  * Pemindaian baris penugasan yang lambat saat memeriksa kuota cuti atau saat me-load form ploting armada di jam-jam sibuk pergantian shift (*shift turnover*).
* **Rekomendasi Solusi Konkret**:
  * Tambahkan indeks komposit:
    `INDEX idx_pd_personnel_type (personnel_id, deployment_type)`
    `INDEX idx_pd_shift_type (shift_id, deployment_type)`.

---

### 38. Ketiadaan Indeks Pencarian Berkas pada `personnel_documents` untuk Middleware Proteksi Unggahan
* **Lokasi Berkas / Database**:
  * Skema Database: `backend/src/config/schema.sql:172-186`
  * Middleware Proteksi: `backend/src/app.js:123-130`
* **Deskripsi Masalah**:
  * Setiap kali ada permintaan akses berkas fisik dokumen di `/uploads/*`, middleware `app.js` mengeksekusi query:
    `SELECT pd.id, pd.personnel_id, pd.uploaded_by, p.user_id FROM personnel_documents pd LEFT JOIN personnel p ON p.id = pd.personnel_id WHERE pd.file_url LIKE ?`.
  * Kolom `file_url` pada tabel `personnel_documents` berukuran `VARCHAR(500)` dan sama sekali tidak diindeks.
* **Penyebab Masalah**:
  * Pencocokan string wildcard `LIKE '%filename'` pada kolom tanpa indeks.
* **Dampak / Risiko**:
  * Setiap request preview atau unduhan dokumen memicu *Full Table Scan* pada tabel dokumen kepegawaian. Jika terdapat ratusan berkas ijazah/lisensi/sertifikat STKP di sistem, penundaan I/O database terjadi pada setiap render berkas.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan kolom `file_name VARCHAR(255)` yang bersih dan pasang indeks:
    `INDEX idx_pdoc_filename (file_name)`.
  * Ubah query middleware proteksi di `app.js` dari pencocokan wildcard `file_url LIKE ?` menjadi pencocokan exact match `file_name = ?`.

---

## BAGIAN VIII: AUDIT BIDANG 4 (VALIDASI INPUT, ERROR HANDLING, & RESILIENCE SISTEM)

---

### 39. Kebocoran Stack Trace & Skema Database Internal MySQL ke Respons Klien pada Error HTTP 500
* **Lokasi Berkas / Komponen**:
  * `backend/src/controllers/activityController.js:166, 259, 299`
  * `backend/src/controllers/incidentController.js:248, 321`
  * `backend/src/controllers/deploymentController.js:444, 674`
* **Deskripsi Masalah**:
  * Di berbagai blok `catch (error)`, server mengembalikan respons error dengan menyambungkan string pesan internal database mentah:
    `return errorResponse(res, 'Gagal mencatat aktivitas: ' + error.message, 500);`
    `return errorResponse(res, 'Gagal membuat laporan insiden: ' + error.message, 500);`.
* **Penyebab Masalah**:
  * Pola penanganan error cepat masa development (*lazy error handling*) yang tidak memisahkan antara logging internal dan sanitasi pesan untuk konsumsi publik.
* **Dampak / Risiko**:
  * Kebocoran Informasi Sistem (*Information Disclosure / CWE-209*).
  * Pesan error mentah seperti `ER_NO_REFERENCED_ROW_2: Cannot add or update a child row: a foreign key constraint fails (acms.incidents, CONSTRAINT fk_inc_reporter FOREIGN KEY ...)` atau path absolut server dikirimkan langsung ke browser klien. Informasi ini dapat dieksploitasi oleh penyerang untuk memetakan arsitektur database, nama tabel, dan nama kolom internal.
* **Rekomendasi Solusi Konkret**:
  * Terapkan logging internal detail via `console.error` di server, namun berikan respons umum yang aman dan ramah pengguna kepada klien:
    `return errorResponse(res, 'Terjadi kendala pada server saat memproses laporan insiden. Silakan hubungi administrator.', 500);`.

---

### 40. Ketiadaan React Error Boundary Memicu Fatal White Screen Crash pada Kesalahan Rendering Klien
* **Lokasi Berkas / Komponen**:
  * `frontend/src/App.jsx:129-219`
  * `frontend/src/main.jsx:6-10`
* **Deskripsi Masalah**:
  * Seluruh aplikasi frontend React tidak dibungkus oleh komponen `ErrorBoundary`.
  * Jika salah satu sub-komponen melempar unhandled JavaScript runtime error (misalnya membaca properti dari objek `null`/`undefined` saat mem-parsing tanggal dinas atau saat response API gagal), pohon komponen React akan unmount secara total.
* **Penyebab Masalah**:
  * Ketiadaan penangkap error rendering di root aplikasi.
* **Dampak / Risiko**:
  * Pengguna di lapangan mendapati layar putih kosong (*blank white screen*) tanpa adanya tombol kembali atau informasi apa yang terjadi.
  * Kru operasional tidak dapat melanjutkan pekerjaan kecuali melakukan clear cache browser secara manual.
* **Rekomendasi Solusi Konkret**:
  * Buat komponen `ErrorBoundary.jsx` yang menangkap lifecycle `componentDidCatch` dan membungkus `<App />` di `main.jsx`.
  * Tampilkan kartu error elegan bertema gelap ARFF yang informatif dengan tombol *"Muat Ulang Halaman"* dan tombol *"Kembali ke Dashboard"*.

---

### 41. Ketiadaan Deteksi Status Jaringan Offline pada Operasional Lapangan Bergerak
* **Lokasi Berkas / Komponen**:
  * `frontend/src/components/layout/AppLayout.jsx`
  * `frontend/src/components/mobile/MobileLayout.jsx`
* **Deskripsi Masalah**:
  * Sistem monitoring ARFF dioperasikan oleh kru di area bandara (apron, runway, watchroom posko) di mana sinyal seluler atau koneksi WiFi sering mengalami *dead zone* sementara.
  * Frontend saat ini tidak memantau event `window.addEventListener('online' / 'offline')` dan tidak memiliki indikator visual status koneksi jaringan.
* **Penyebab Masalah**:
  * Asumsi bahwa koneksi jaringan klien selalu terhubung (*always-online fallacy*).
* **Dampak / Risiko**:
  * Petugas di lapangan dapat mengisi formulir kronologi insiden yang sangat panjang atau mengatur susunan kru ploting, lalu saat menekan tombol "Simpan", proses submit gagal hening atau terlempar error jaringan tanpa data terselamatkan di lokal.
* **Rekomendasi Solusi Konkret**:
  * Tambahkan hook `useNetworkStatus()` global dan tampilkan banner peringatan diskoneksi mengambang yang grounded di bagian atas aplikasi saat status offline terdeteksi:
    *"Koneksi jaringan terputus. Pastikan perangkat terhubung kembali sebelum mengirim data formulir."*

---

## BAGIAN IX: AUDIT BIDANG 5 (AUDIT FITUR EKSPOR PDF & KONSISTENSI LAPORAN OPERASIONAL)

---

### 42. Kegagalan Rendering Tanda Tangan Digital Berformat WebP pada Generator Dokumen Resmi PDF
* **Lokasi Berkas / Komponen**:
  * `backend/src/services/pdfService.js:24-34`
* **Deskripsi Masalah**:
  * Engine PDFKit tidak mendukung format gambar `.webp` secara native (hanya mendukung PNG dan JPEG).
  * Pada helper `resolveSignatureFile`, terdapat logika penanganan WebP:
    `if (ext === '.webp') { ... console.warn('[PDFKit] File tanda tangan berformat WebP (tidak didukung PDFKit). Melewati gambar.'); return null; }`.
  * Jika pejabat mengunggah tanda tangan digital yang secara otomatis dikonversi sistem ke format WebP (melalui middleware multer Sharp), gambar tanda tangan dilewati dan fungsi mengembalikan `null`.
* **Penyebab Masalah**:
  * Keterbatasan native image decoder dari library `pdfkit` terhadap format WebP modern tanpa adanya konversi balik ke format PNG di memori saat kompilasi dokumen PDF.
* **Dampak / Risiko**:
  * Pelanggaran berat aturan `GEMINI.md` Butir 7 (*Integrasi Menyeluruh Dokumen & Aset Digital: No Half-Baked Features*).
  * Tanda tangan resmi Department Head atau Chief Regu yang sudah berhasil diunggah di profil tidak muncul pada lembar cetak dokumen resmi (PDF tetap mencetak ruang kosong atau nama teks tanpa paraf digital).
* **Rekomendasi Solusi Konkret**:
  * Tambahkan helper konversi otomatis menggunakan Sharp di dalam `pdfService.js` (atau saat upload tanda tangan):
    Jika file bertipe WebP, konversikan menjadi buffer PNG sebelum disematkan ke dalam stream PDFKit: `await sharp(filePath).png().toBuffer()`.

---

### 43. Ketiadaan Mekanisme Batas Ukuran Memori (LRU Size Limit) pada Cache PDF dalam Memori Server
* **Lokasi Berkas / Komponen**:
  * `backend/src/services/pdfService.js:41-65`
* **Deskripsi Masalah**:
  * Sistem mengimplementasikan cache dokumen PDF di dalam memori Node.js (`pdfMemoryCache = new Map()`).
  * Batas penghapusan cache hanya berdasarkan jumlah entri: `if (pdfMemoryCache.size > 50) { ... delete oldestKey; }`.
  * Tidak ada batasan ukuran byte memori (*byte size limit*).
* **Penyebab Masalah**:
  * Mengasumsikan ukuran file PDF selalu kecil, padahal PDF laporan shift lengkap yang memuat foto armada beresolusi tinggi dapat berukuran 5â€“15 MB per dokumen.
* **Dampak / Risiko**:
  * Jika 50 entri dokumen PDF laporan lengkap tersimpan di dalam memori RAM, konsumsi heap Node.js dapat melonjak hingga 500 MB â€“ 1 GB secara tiba-tiba, memicu peringatan *High Memory Usage* atau memicu proses dibunuh oleh sistem operasi (*Out Of Memory / OOM Killer*).
* **Rekomendasi Solusi Konkret**:
  * Batasi ukuran cache dokumen PDF maksimal 10 dokumen atau maksimal 50 MB total buffer memori, dan prioritaskan streaming dokumen langsung ke klien dengan header HTTP caching (`Cache-Control: private, max-age=60`) daripada menyimpan buffer raksasa di RAM server.

---

### 44. Risiko Overflow Halaman & Truncation Teks Kronologi Panjang pada Ekspor PDF Laporan Shift
* **Lokasi Berkas / Komponen**:
  * `backend/src/services/pdfService.js:450-520`
* **Deskripsi Masalah**:
  * Pada lembar laporan shift harian, seksi ringkasan insiden dan aktivitas operasional di-render dengan koordinat vertikal manual statis (`currentY += ...`).
  * Jika terdapat deskripsi kronologi darurat yang sangat panjang (beberapa paragraf detail insiden pesawat), teks dapat bertabrakan dengan garis tabel di bawahnya atau terpotong (*truncated*) di batas margin bawah sebelum memicu `doc.addPage()`.
* **Penyebab Masalah**:
  * Pengukuran tinggi teks dinamis (*text height measurement*) sebelum rendering tabel tidak menghitung paginasi otomatis secara presisi.
* **Dampak / Risiko**:
  * Catatan kronologi insiden penting terpotong pada cetakan fisik laporan dinas resmi yang diarsipkan untuk audit regulator penerbangan.
* **Rekomendasi Solusi Konkret**:
  * Gunakan metode `doc.heightOfString(text, { width })` untuk menghitung sisa ruang vertikal pada halaman aktif sebelum mencetak blok teks kronologi. Jika sisa ruang < tinggi yang dibutuhkan, picu `doc.addPage()` dan cetak ulang header seksi secara rapi.

---

> [!NOTE]
> Seluruh hasil pekerjaan, log refaktorisasi arsitektur modular, unifikasi fungsi Ponytail, dan riwayat implementasi fitur yang telah selesai dikerjakan telah dipindahkan secara permanen ke dokumen riwayat **`RQA.md`** sesuai aturan baku `GEMINI.md`.
> Dokumen QA.md ini murni difokuskan untuk melacak **44 Temuan Audit Aktif** di atas yang sedang dan akan diselesaikan oleh para agen pelaksana.

