# PANDUAN PENGEMBANGAN FRONTEND (AGENT FRONTEND)
*Catatan: Setelah implementasi selesai, file instruksi ini dapat langsung dihapus.*

## 1. Lingkup & Batasan Folder
* Seluruh kode frontend berada di dalam folder: `frontend/`.
* Dilarang menyentuh atau memodifikasi file di luar folder `frontend/` agar tidak terjadi konflik dengan agent backend.
* Development server frontend: `http://localhost:5173`.
* Terhubung ke API backend di: `http://localhost:5000/api`.

## 2. Stack & Dependensi
* Framework: React 18+ dengan Vite.
* Styling: Tailwind CSS (Clean, Modern, Dominan Putih, Kontras Tinggi).
* Ikon: `lucide-react`.
* Routing: `react-router-dom`.
* State & HTTP: React Context / Custom Hooks dengan `axios` atau `fetch`.

## 3. Parameter Operasional Baru & Penyesuaian UI
1. **Regu Dinas**: Terdiri dari 4 regu resmi yaitu Alpha, Bravo, Charlie, dan Delta.
2. **Siklus 3 Shift (Format Jam 6, 7, 11)**:
   * Shift 1 (Pagi): 07:00 s.d. 13:00
   * Shift 2 (Siang): 13:00 s.d. 20:00
   * Shift 3 (Malam): 20:00 s.d. 07:00
3. **UI Ploting Kendaraan (Form Mulai dari KOSONG)**:
   * Setiap sesi shift baru dibuka, form ploting dimulai dari keadaan **KOSONG** (Ketua Regu menugaskan personel yang hadir ke slot armada/watchroom).
   * Setiap kartu kendaraan menampilkan slot untuk 3 s.d. 4 personel.
   * Terdapat tanda badge khusus yang mencolok untuk **Penanggung Jawab (PIC)**.
   * Ketua Regu dapat memilih personel dan menentukan 1 orang yang menjadi PIC per unit kendaraan.
4. **UI Kesiapan Kendaraan & Watchroom**:
   * **Kendaraan**: Tombol "Input Pemeriksaan / Ubah Kondisi" pada kartu kendaraan HANYA aktif jika pengguna yang sedang login adalah **Penanggung Jawab (PIC)** dari kendaraan tersebut pada shift aktif (atau bertindak sebagai Ketua Regu / Admin). Bagi anggota kru lainnya bersifat *Read-only*.
   * Form pemeriksaan kendaraan menyediakan opsi status **Serviceable** atau **Unserviceable** (wajib justifikasi kendala jika unserviceable).
   * **Watchroom**: Penilaian kesiapan watchroom cukup memilih status **Serviceable** atau **Unserviceable** (dengan catatan singkat kendala jika unserviceable).
5. **Kompresi Foto WebP di Klien**:
   * Sediakan utilitas kompresi gambar di browser (`frontend/src/utils/imageCompressor.js`) menggunakan HTML5 `<canvas>` untuk mengonversi gambar ke format `image/webp` (kualitas 0.8, resolusi maksimal 1280px) sebelum form disubmit.
6. **Upload Dokumen Personel (Coming Soon)**:
   * Di halaman profil personel, bagian upload dokumen/sertifikat diberi label banner elegan: **"Fitur Pengunggahan Berkas (Coming Soon)"**.
7. **Pusat Laporan PDF (Coming Soon)**:
   * Tombol dan panel ekspor laporan dinas A4 per shift ditampilkan dengan penanda banner elegan: **"Laporan Resmi PDF (Coming Soon)"**.
   * Pada halaman shift aktif, Ketua Regu tetap memiliki tombol **"Sahkan Laporan Shift"** yang mengubah status shift menjadi disetujui (`approved`).

## 4. Standar Desain Antislop & Aturan Performa Bebas Lag (Kritis)
Wajib mematuhi standar berikut tanpa kompromi:
1. **Aturan Performa Input Form (Anti-Lag)**:
   * DILARANG KERAS menggunakan CSS `transition-all` pada elemen `<input>` dan `<textarea>`. Wajib gunakan `transition-colors duration-100` agar input merespons instan (< 16ms) tanpa kalkulasi ulang layout browser.
   * DILARANG menggunakan `backdrop-filter: blur(...)` pada overlay modal saat ada input form yang aktif. Gunakan backdrop solid dengan transparansi (contoh: `bg-slate-900/40`).
   * DILARANG melakukan request API atau re-fetch data di saat user sedang aktif mengetik di input form.
2. **Standar LCP (Largest Contentful Paint)**:
   * Dilarang memuat background image berat pada kontainer utama. Gunakan latar belakang putih bersih (`bg-white` / `bg-slate-50`) dengan aksen border halus (`border-slate-200`).
3. **Standar Logo SVG**:
   * Jika membuat logo berbasis SVG, wajib menggunakan `useId()` dari React untuk penamaan `<linearGradient>` dan `<clipPath>` agar tidak terjadi konflik ID.
4. **Prinsip Antislop**:
   * Gaya visual: Bersih, dominan putih, profesional, kontras tinggi (WCAG AA). Dilarang gradien ungu-biru template AI, dilarang efek glow berlebihan, dilarang border pill pada semua elemen.
   * Dilarang menggunakan karakter em dash (`—`) di dalam teks copywriting atau antarmuka. Gunakan koma, titik, titik dua, atau tanda kurung.
   * Tidak boleh ada tombol mati (*dead button*): setiap tombol dan aksi wajib memiliki handler nyata atau indikator status.
   * Responsif penuh: ramah desktop dan smartphone (area sentuh tombol minimal 44px, tidak boleh ada horizontal overflow pada layar smartphone).
   * Sediakan selalu 3 state data: Empty state yang jelas, Loading skeleton, dan Error message informatif.

## 5. Struktur Halaman & Routing
```text
/                     -> Redirect ke /dashboard atau /login
/login                -> Form login Username & Password
/dashboard            -> Ringkasan KPI shift aktif (status armada, kekuatan regu aktif, insiden terbuka)
/personnel            -> Katalog personel (filter regu Alpha/Bravo/Charlie/Delta, search nama/jabatan, level lisensi)
/personnel/:id        -> Profil personel (info kepegawaian & placeholder upload dokumen Coming Soon)
/readiness/vehicles   -> Monitoring kesiapan kendaraan (form aktif hanya untuk PIC kendaraan yang ditunjuk)
/readiness/watchroom  -> Monitoring kesiapan watchroom (Serviceable / Unserviceable)
/deployment           -> Matriks ploting regu (slot 3 s.d. 4 kru per kendaraan, penentuan PIC, pencatatan cuti/sakit/dinas)
/incidents            -> Daftar insiden operasional dan form input insiden baru (WebP photo upload, nomor INC dibuat otomatis oleh Backend)
/incidents/:id        -> Detail kronologi insiden dan status penanganan
/activities           -> Logbook kegiatan rutin shift dan catatan serah terima dinas
/reports              -> Panel ekspor laporan dinas A4 resmi per shift (Coming Soon)
/settings             -> Kelola data master armada (khusus role Admin)
```

## 6. Struktur Folder Frontend
```text
frontend/
├── src/
│   ├── assets/          # Logo resmi / aset statis
│   ├── components/      # Komponen UI modular
│   │   ├── layout/      # Navbar, Sidebar, AppLayout (responsive mobile drawer)
│   │   ├── common/      # Button, Modal (tanpa backdrop-filter blur), Badge, Table, InputField (anti-lag)
│   │   ├── dashboard/   # Kartu metrik armada, indikator kesiapan
│   │   └── forms/       # Form justifikasi armada (khusus PIC), form insiden, form ploting
│   ├── context/         # AuthContext (menyimpan token, user info, dan shift aktif)
│   ├── hooks/           # useAuth, useReadiness
│   ├── pages/           # Komponen halaman sesuai routing
│   ├── services/        # api.js (klien axios)
│   ├── utils/           # imageCompressor.js (konversi dan kompresi WebP otomatis)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css        # Konfigurasi Tailwind & utility anti-lag
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```
