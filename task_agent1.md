# PANDUAN TUGAS: AGENT 1 - PONDASI SHELL MOBILE, NAVIGASI, TOP APP BAR, PROFIL MANDIRI & ROUTING

## Peran & Batasan Tanggung Jawab
Agent 1 bertindak sebagai **Arsitek Fondasi Mobile Web App**. Bertanggung jawab penuh membangun kerangka antarmuka shell mobile (*MobileLayout*), navigasi atas (*Top App Bar*), navigasi bawah (*Bottom Navigation Bar*), sub-view mandiri Profil & Dokumen kepegawaian, modal pengumuman resmi, serta konfigurasi routing di `App.jsx`.
- **DILARANG** mengutak-atik isi form dashboard operasional / kesiapan PIC (Tugas Agent 2).
- **DILARANG** mengutak-atik halaman ploting 8 unit armada / crew picker (Tugas Agent 3).
- **DILARANG** mengutak-atik modul kegiatan rutin & insiden (Tugas Agent 4).
- **DILARANG** mengutak-atik halaman rekapitulasi laporan shift dinas / audit trail (Tugas Agent 5).
- **WAJIB** mematuhi aturan baku di [`GEMINI.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/GEMINI.md), [`plan.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/plan.md), dan prototype [`masak/mobile/tipe_2_chief.html`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/mobile/tipe_2_chief.html).

---

## Berkas yang Dikelola oleh Agent 1 (Eksklusif)
1. `frontend/src/components/mobile/MobileLayout.jsx`
2. `frontend/src/components/mobile/MobileHeader.jsx`
3. `frontend/src/components/mobile/MobileBottomNav.jsx`
4. `frontend/src/components/mobile/profile/MobileProfileView.jsx`
5. `frontend/src/components/mobile/profile/MobileEditProfileModal.jsx`
6. `frontend/src/components/mobile/profile/MobileChangePasswordModal.jsx`
7. `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`
8. `frontend/src/App.jsx` (integrasi rute mobile & deteksi role)

---

## Standar Desain & Aturan Kritis (`GEMINI.md` & `plan.md`)
1. **Viewport Smartphone Modern 20:9**:
   - Batas kontainer: `w-full max-w-[412px] min-h-screen bg-slate-50 flex flex-col shadow-2xl relative border-x border-slate-700/20 mx-auto`.
   - Hindari lebar *phablet* 448px (`max-w-md`). Gunakan `max-w-[412px]` atau `max-w-[393px]`.
2. **Kesesuaian Navigasi Bawah Berdasarkan Role**:
   - **Kru (`senior_firefighter`, `junior_firefighter`)**: Tepat 2 Menu Bottom Bar:
     1. `Dashboard` (`nav-btn-dashboard-kru`)
     2. `Laporan` (`nav-btn-laporan-kru`) [Read-Only]
   - **Chief (`chief`, `chief_assistant`, `operation_chief`)**: Tepat 5 Menu Bottom Bar:
     1. `Dashboard` (`nav-btn-dashboard-chief`)
     2. `Ploting` (`nav-btn-ploting`)
     3. `Kegiatan` (`nav-btn-kegiatan`)
     4. `Insiden` (`nav-btn-insiden`)
     5. `Laporan` (`nav-btn-laporan-chief`)
   - **DILARANG KERAS** memasukkan menu Profil atau Cuti ke dalam Bottom Bar (Sesuai `GEMINI.md` Butir 9 & Koreksi 5).
3. **Keseragaman Akses Profil Mandiri di Header Atas (Top App Bar)**:
   - Header atas memuat: Logo ARFF + YIA Airport, Indikator Regu & Shift berjalan, Tombol Lonceng Pengumuman 🔔 (dengan badge titik merah), dan Avatar Profil Inisial Pengguna (misal: "GA", "DA").
   - Mengklik avatar membuka **`MobileProfileView`** sebagai layar penuh (*full sub-view*) bersih dengan tombol `← Kembali`.
   - Layout profil wajib 2 kartu baku:
     - **Card 1: PROFIL & KREDENSIAL** (Nama Lengkap, NIP, Tempat/Tanggal Lahir, Pendidikan Terakhir, Golongan Darah, Kualifikasi STKP, Nomor Lisensi STKP, Masa Berlaku STKP, tombol `Edit Data`, tombol `🔒 Ubah Password`, dan tombol `+ Cuti Mandiri`).
     - **Card 2: DOKUMEN & SERTIFIKAT SAYA** (Arsip ijazah/STKP/MCU/diklat, tombol `+ Upload Dokumen`, dan list berkas dengan endpoint token terproteksi `/api/documents/:id/view?token=...`).
     - Tombol **Logout Sesi Operasional** di bagian paling bawah.
4. **Modal Pengumuman Dinas via Lonceng 🔔 (`MobileAnnouncementsModal.jsx`)**:
   - Menampilkan arsip surat edaran dinas dengan **Pagination per 10 item** (`Halaman X dari Y`, tombol `← Sebelumnya` & `Selanjutnya →`).
   - Tanpa teks filler "Baca Lengkap". Mengklik item langsung memicu pembukaan dokumen PDF.
5. **Anti-Lag & Strict INP/LCP**:
   - Dilarang keras memakai `transition-all` pada elemen input. Gunakan `transition-colors duration-100`.
   - Dilarang memakai `backdrop-filter: blur(...)` pada overlay modal saat ada input form. Gunakan `bg-black/50`.

---

## Rincian Tugas yang Wajib Dikerjakan

### 1. Implementasi `MobileLayout.jsx` & Navigasi
- Buat shell wrapper responsif yang membungkus seluruh konten mobile.
- Sertakan padding bawah aman (`pb-20` atau `safe-pb`) agar konten tidak tertutup oleh bottom navigation bar.
- Integrasikan state tab aktif (`activeTab`: 'dashboard' | 'ploting' | 'kegiatan' | 'insiden' | 'laporan').
- Pasang tombol kembali dan header kontekstual saat sub-view Profil sedang dibuka.

### 2. Implementasi `MobileHeader.jsx`
- Desain kompak tinggi `h-14` (sticky top, z-40, `bg-white border-b border-slate-200/80 px-3 py-1.5`).
- Sisi kiri: Logo ARFF merah tegas, teks "YIA AIRPORT", titik hijau operasional, dan info shift (`${activeTeam} • Shift ${activeShiftNumber}`).
- Sisi kanan:
  - Lonceng pengumuman dinas 🔔 dengan badge indikator merah (membuka `MobileAnnouncementsModal`).
  - Avatar profil lingkaran dengan inisial nama petugas (membuka `MobileProfileView`).

### 3. Implementasi `MobileBottomNav.jsx`
- Mengambang di bagian bawah (*fixed bottom*, `z-40`, `bg-white border-t border-slate-200 shadow-lg pb-safe`).
- Menampilkan grid 2 tombol untuk role Kru dan grid 5 tombol untuk role Chief.
- Target sentuh minimal 44x44 px (`tap-target`) dengan ikon SVG bersih, teks label 10px, dan warna aktif `text-red-600 font-bold`.

### 4. Implementasi `MobileProfileView.jsx`, `MobileEditProfileModal.jsx`, `MobileChangePasswordModal.jsx`
- Tampilan sub-view layar penuh yang mengambil data user login dari `AuthContext`.
- Terapkan Card 1 (Profil & Kredensial) dan Card 2 (Dokumen & Sertifikat Saya).
- Hubungkan aksi upload dokumen ke endpoint backend `/api/personnel/:id/documents`.
- Sediakan modal edit data diri mandiri (NIP, Tanggal Lahir, Pendidikan, Lisensi STKP) dan modal ganti password aman (`/api/auth/change-password`).

### 5. Integrasi Routing di `App.jsx`
- Konfigurasikan percabangan tampilan:
  - Role lapangan (`chief`, `chief_assistant`, `senior_firefighter`, `junior_firefighter`) diarahkan ke antarmuka `MobileLayout` secara default.
  - Sediakan fallback atau toggle responsif agar tetap nyaman diakses baik via viewport browser mobile maupun desktop inspection.

---

## Kriteria Selesai Agent 1
- `MobileLayout` ter-render sempurna dengan `max-w-[412px]` di tengah layar pada browser mobile/desktop.
- Header atas menampilkan identitas dinas riil, lonceng pengumuman aktif, dan avatar inisial.
- Bottom Bar menampilkan 2 tab untuk Kru dan 5 tab untuk Chief tanpa lag.
- Sub-view Profil terbuka mulus menampilkan 2 kartu baku dan berkas dokumen terproteksi.
- Kompilasi `npm run build` sukses 0 error.
