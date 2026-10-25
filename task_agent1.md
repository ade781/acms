# LEMBAR TUGAS AGENT 1: URL ROUTING, SIDEBAR, & MOBILE SHELL NAVIGATION

## Domain Berkas Eksklusif
- `frontend/src/App.jsx`
- `frontend/src/components/layout/Sidebar.jsx`
- `frontend/src/components/layout/MobileBottomNav.jsx`

---

## Rincian Butir Tugas

### Poin 1: Standarisasi Rute Hirarkis & Redirect Otomatis di `App.jsx`
- **Deskripsi Masalah**:
  - Halaman kesiapan kendaraan saat ini terdaftar di `/readiness/vehicles`, sedangkan halaman laporan armadanya berada di `/armada/laporan`. Rute ini tidak konsisten, mencampur Bahasa Inggris dan Indonesia, serta memutus hirarki modul.
  - Komponen laporan insiden (`HalamanLaporanInsiden.jsx`) sudah dibangun (638 baris kode) namun di `App.jsx` rutenya di-redirect paksa kembali ke `/incidents` (`<Navigate to="/incidents" replace />`), sehingga halaman rekap laporan insiden tidak pernah bisa diakses pengguna.
- **Dampak / Risiko**:
  - Pengguna kebingungan dengan struktur URL yang acak-acakan dan sulit di-bookmark.
  - Fitur laporan insiden terblokir sepenuhnya dan menjadi kode mati (*dead feature*).
  - Tautan lama yang disimpan pengguna akan menjadi 404 jika langsung diubah tanpa mekanisme *redirect*.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/App.jsx`:
    1. Daftarkan path `/vehicles` untuk komponen `HalamanKesiapanKendaraan`.
    2. Daftarkan path `/vehicles/reports` untuk komponen `HalamanLaporanArmada`.
    3. Daftarkan path `/incidents/reports` untuk komponen `HalamanLaporanInsiden` (aktifkan komponen ini, hapus redirect paksa ke `/incidents`).
    4. Pasang rute pengalihan otomatis (*Redirect*):
       ```jsx
       <Route path="/readiness/vehicles" element={<Navigate to="/vehicles" replace />} />
       <Route path="/armada/laporan" element={<Navigate to="/vehicles/reports" replace />} />
       ```

---

### Poin 2: Sinkronisasi Status Menu Navigasi di `Sidebar.jsx`
- **Deskripsi Masalah**:
  - Di `Sidebar.jsx`, link menu armada masih mengarah ke `/readiness/vehicles` dengan logika active state hardcoded:
    `itemTo === '/readiness/vehicles' && location.pathname.startsWith('/armada/laporan')`.
- **Dampak / Risiko**:
  - Menu samping desktop tidak akan menyorot (highlight) halaman armada dengan benar saat rute baru diterapkan, menimbulkan ketidakteraturan visual navigasi.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/components/layout/Sidebar.jsx`:
    1. Ubah `to: '/readiness/vehicles'` menjadi `to: '/vehicles'`.
    2. Perbarui pengecekan rute aktif:
       ```javascript
       const isActive = location.pathname === item.to || 
         (item.to === '/vehicles' && location.pathname.startsWith('/vehicles')) ||
         (item.to === '/incidents' && location.pathname.startsWith('/incidents'));
       ```

---

### Poin 3: Formasi 3 Tab Baku Kru Operasional di `MobileBottomNav.jsx`
- **Deskripsi Masalah**:
  - Navigasi bawah mobile (*Mobile Bottom Nav*) sebelumnya memuat tab-tab dinas operasional yang membingungkan kru lapangan biasa yang seharusnya hanya fokus pada aktivitas tugas mereka.
- **Dampak / Risiko**:
  - Kru lapangan kewalahan melihat tab manajerial, memperbesar potensi salah klik dan memperlambat mobilitas tanggap darurat di ponsel.
- **Instruksi Solusi Konkret**:
  - Di `frontend/src/components/layout/MobileBottomNav.jsx`:
    - Periksa role pengguna dari AuthContext (`user?.role`).
    - Jika role BUKAN `admin`, `chief`, atau `chief_assistant` (misal kru lapangan biasa), sajikan tepat 3 tab baku:
      1. **Dashboard** (`/`)
      2. **Kegiatan** (`/activities` atau `/kegiatan`)
      3. **Laporan** (`/reports` atau `/laporan`)
    - Jika role adalah `admin`, `chief`, atau `chief_assistant`, pertahankan tab manajerial operasional lengkap sesuai standar dinas ARFF.

---

## Instruksi Pelaporan Temuan Tambahan, Bug, Ide, & Saran
Apabila selama proses audit maupun perbaikan kode Anda menemukan:
- **Bug / Masalah Baru**: Error, glitch, atau cacat logika tambahan yang belum tercantum di tugas ini.
- **Risiko Keamanan / Integritas Data**: Celah otentikasi, potensi tabrakan data, atau regresi performa.
- **Ide / Saran Pengembangan**: Usulan optimasi UI/UX, efisiensi komponen, atau ide fitur yang relevan bagi operasional.

**ATURAN TINDAKAN**:
1. **Dilarang keras memodifikasi berkas di luar domain eksklusif Agent 1 secara sepihak.**
2. **Catat seluruh temuan, ide, dan saran tersebut pada seksi khusus di berkas laporan Anda (`masak/temp/hasil_agent1.md`)** menggunakan format poin hierarkis:
   - **Judul Temuan / Ide**: Ringkasan topik.
   - **Deskripsi Masalah / Konsep**: Penjelasan detail teknis.
   - **Dampak / Manfaat**: Urgensi atau keuntungan bagi pengguna.
   - **Rekomendasi Tindak Lanjut**: Saran perbaikan konkret untuk diorkestrasi selanjutnya.

---

## Verifikasi & Pelaporan
1. Jalankan `npm run build` di root frontend untuk memvalidasi tidak ada syntax error atau broken import.
2. Tuliskan ringkasan hasil kerja secara mandiri di `masak/temp/hasil_agent1.md`.
