# MASTER ROADMAP: PEMBAGIAN TUGAS 5 AGENT — IMPLEMENTASI TAMPILAN MOBILE WEB APP ACMS (ARFF YIA)

Dokumen ini adalah **panduan koordinasi utama** pembagian implementasi antarmuka Mobile Web App ACMS ARFF Bandara Internasional Yogyakarta (YIA) ke dalam **5 Agent Spesialis**. Setiap agent memiliki batasan tanggung jawab, daftar berkas eksklusif (tidak saling tumpang tindih), serta kriteria penyelesaian yang terukur.

---

## 1. Landasan & Prinsip Desain Wajib (`GEMINI.md` & `plan.md`)

Seluruh agent **WAJIB** tunduk pada aturan baku operasional berikut:
1. **Viewport Smartphone Modern 20:9**:
   - Kontainer terpusat ramping: `w-full max-w-[412px] min-h-screen bg-slate-50 border-x border-slate-700/20 shadow-2xl mx-auto`.
   - Hindari lebar phablet usang 448px (`max-w-md`).
2. **Kesesuaian Navigasi Bawah (Bottom Bar)**:
   - **Kru (`senior_firefighter`, `junior_firefighter`)**: Tepat 2 Menu: `Dashboard` dan `Laporan` (Read-Only).
   - **Chief (`chief`, `chief_assistant`, `operation_chief`)**: Tepat 5 Menu: `Dashboard`, `Ploting`, `Kegiatan`, `Insiden`, dan `Laporan`.
   - **Dilarang keras** memasukkan menu Profil atau Cuti ke dalam Bottom Bar!
3. **Pemusatan Profil Mandiri di Header Atas (Top App Bar)**:
   - Akses profil dipusatkan pada Avatar Profil di Header Atas.
   - Dibuka sebagai sub-view layar penuh (*full sub-view*) bersih dengan 2 kartu baku:
     - **Card 1: PROFIL & KREDENSIAL** (Nama, NIP, TTL, Gol Darah, Kualifikasi STKP, No Lisensi, Edit Profil, Ubah Password 🔒, + Cuti Mandiri).
     - **Card 2: DOKUMEN & SERTIFIKAT SAYA** (Arsip STKP/MCU/Ijazah, tombol `+ Upload Dokumen`, list berkas terproteksi).
4. **Penghapusan Fitur Sahkan Shift (Sistem Tanpa Pengesahan Manual)**:
   - Sesuai `GEMINI.md` Butir 2: Dilarang keras membuat tombol "Sahkan Shift" atau badge "Menunggu Pengesahan". Laporan bersifat transparan dan otomatis terekapitulasi real-time.
5. **Anti-Redundansi UI & Anti-Asumsi**:
   - Satu aksi memiliki tepat satu tempat yang jelas.
   - Dilarang membuat metrik atau slider fiktif (Air/Foam/BBM). Data murni status `Serviceable` vs `Unserviceable` + Foto Fisik Wajib.
6. **Performa Anti-Lag (Strict INP & LCP)**:
   - Dilarang memakai `transition-all` pada input form. Gunakan `transition-colors duration-100`.
   - Dilarang memakai `backdrop-filter: blur(...)` pada overlay modal saat input form aktif.
   - Tanpa browser otomatis (`browser_subagent`). Seluruh pengujian via CLI terminal (`npm run build`).

---

## 2. Matriks Pembagian Tugas & Berkas 5 Agent

| Agent | Spesialisasi & Modul | Berkas Eksklusif yang Dikelola | Tautan Detail Panduan |
| :---: | :--- | :--- | :---: |
| **Agent 1** | **Pondasi Shell Mobile, Header, Navigasi, Profil Mandiri & Routing** | • `frontend/src/components/mobile/MobileLayout.jsx`<br>• `frontend/src/components/mobile/MobileHeader.jsx`<br>• `frontend/src/components/mobile/MobileBottomNav.jsx`<br>• `frontend/src/components/mobile/profile/MobileProfileView.jsx`<br>• `frontend/src/components/mobile/profile/MobileEditProfileModal.jsx`<br>• `frontend/src/components/mobile/profile/MobileChangePasswordModal.jsx`<br>• `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`<br>• `frontend/src/App.jsx` | [task_agent1.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent1.md) |
| **Agent 2** | **Mobile Dashboard, Tugas Saya, Form Kesiapan PIC & Cuti Mandiri** | • `frontend/src/pages/mobile/MobileDashboard.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileDutyCard.jsx`<br>• `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileOpsSummaryCards.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileUnserviceableWidget.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileRecentAnnouncements.jsx`<br>• `frontend/src/components/mobile/dashboard/MobileLeaveModal.jsx` | [task_agent2.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent2.md) |
| **Agent 3** | **Mobile Ploting 8 Unit Rapat, Crew Picker & Kelola Cuti Anggota** | • `frontend/src/pages/mobile/MobilePloting.jsx`<br>• `frontend/src/components/mobile/ploting/MobilePlotCard.jsx`<br>• `frontend/src/components/mobile/ploting/MobileCrewPickerSheet.jsx`<br>• `frontend/src/components/mobile/ploting/MobileAbsentCrewSection.jsx`<br>• `frontend/src/components/mobile/ploting/MobileCancelLeaveConfirmModal.jsx` | [task_agent3.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent3.md) |
| **Agent 4** | **Mobile Logbook Kegiatan Rutin & Pelaporan Insiden Sisi Udara** | • `frontend/src/pages/mobile/MobileKegiatan.jsx`<br>• `frontend/src/pages/mobile/MobileInsiden.jsx`<br>• `frontend/src/components/mobile/activities/MobileActivityModal.jsx`<br>• `frontend/src/components/mobile/activities/MobileActivityTimelineItem.jsx`<br>• `frontend/src/components/mobile/incidents/MobileIncidentModal.jsx`<br>• `frontend/src/components/mobile/incidents/MobileIncidentTimelineItem.jsx`<br>• `frontend/src/components/mobile/incidents/MobileIncidentDetailModal.jsx` | [task_agent4.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent4.md) |
| **Agent 5** | **Mobile Laporan Dinas Shift, Audit Trail Armada & Dual-Action PDF A4** | • `frontend/src/pages/mobile/MobileLaporan.jsx`<br>• `frontend/src/components/mobile/reports/MobileReportSummaryCard.jsx`<br>• `frontend/src/components/mobile/reports/MobileUnitAuditModal.jsx`<br>• `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx`<br>• `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx` | [task_agent5.md](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent5.md) |

---

## 3. Rangkuman Ruang Lingkup Masing-Masing Agent

### Agent 1: Arsitek Shell, Navigasi & Profil Mandiri
- Menyiapkan kontainer viewport modern 20:9 (`max-w-[412px]`, `pb-safe`).
- Menyiapkan Top App Bar (Logo ARFF, Info Shift aktif, Lonceng Pengumuman 🔔, Avatar Profil).
- Menyiapkan Bottom Bar dinamis (2 tab untuk Kru: Dashboard & Laporan; 5 tab untuk Chief: Dashboard, Ploting, Kegiatan, Insiden, Laporan).
- Menyiapkan Sub-View Profil Mandiri Layar Penuh (Card 1: Profil & Kredensial, Card 2: Dokumen & Sertifikat Saya).
- Menyiapkan Modal Edit Data Diri, Modal Ganti Password 🔒, dan Modal Arsip Pengumuman (Pagination 10 item).
- Menghubungkan deteksi role di `App.jsx` agar user lapangan langsung disajikan antarmuka mobile.

### Agent 2: Spesialis Dashboard & Form Kesiapan PIC
- Kartu Tugas Saya: Unit dinas, peran (Driver/Nozzleman), badge PIC. Jika lepas piket: banner status Lepas Piket (Off Duty).
- Formulir Kesiapan PIC: Hanya muncul jika user bertugas sebagai PIC (atau Chief merangkap PIC). Pilihan murni Serviceable vs Unserviceable + Banner estafet kendala bawaan + Wajib upload foto bukti fisik untuk keduanya.
- Ringkasan Personel Hadir/Izin dan Unit Siap/Unserviceable.
- Widget Kendala Armada: Hanya muncul jika ada unit unserviceable.
- Widget Pengumuman Dinas: Di paling bawah dashboard, 3 terbaru, klik kartu langsung membuka pratinjau PDF.
- Modal Izin/Cuti Mandiri: Pengajuan izin baru + tombol "Cancel Cuti (Kembali Bertugas Aktif)".

### Agent 3: Spesialis Ploting 8 Unit Armada & Crew Picker
- Ploting 8 Unit Operasional (7 Kendaraan + 1 Watchroom) dalam bentuk Plot Card rapat (*ultra-compact flat rows* tipis 1px, 4 unit terlihat sekaligus dalam 1 layar smartphone 20:9).
- Slot 0 terkunci permanen sebagai PIC; slot kru dinamis (1 s.d. 4 orang) dengan tombol `+ Tambah Kru`.
- Crew Picker Bottom Sheet: Pencarian cepat personel, penanda status, dan opsi teratas `— Kosongkan Slot Ini (Hapus) —`.
- Wadah Personel Tidak Hadir (Cuti, Sakit, Dinas Luar) dengan aksi resmi "Cancel Cuti" (bebas tombol silang kasar).
- Tombol `+ Cuti Saya` untuk Chief dan tombol simpan ploting ke backend.

### Agent 4: Spesialis Kegiatan Rutin & Pelaporan Insiden
- Tab Kegiatan: Linimasa logbook aktivitas shift dinas mengacu pada 8 Kategori Baku Operasional ARFF YIA.
- Modal Catat Kegiatan Shift: Form input waktu, kategori, pelaksana, uraian, dan upload foto dokumentasi kegiatan.
- Tab Insiden: Linimasa dan rekap kejadian mengacu pada 10 Klasifikasi Baku Kejadian ARFF Sisi Udara.
- Modal Laporan Insiden Baru: Nomor registrasi otomatis (`INC-YYYY-XXXX`), tingkat prioritas siaga (I s.d. III, Info), lokasi airside/grid, nomor pesawat opsional, kronologi, tindakan penanganan, dan upload foto bukti kejadian di lapangan.

### Agent 5: Spesialis Rekapitulasi Laporan Dinas & Dual-Action PDF
- Tab Laporan: Rekapitulasi shift lengkap (8 unit armada, presensi personel, logbook kegiatan, laporan insiden). Dapat diakses bersama secara transparan oleh Kru (Read-Only) dan Chief.
- Bebas fitur "Sahkan Shift" manual (data dinas transparan real-time).
- Pejabat penandatangan dinamis dari database sesuai wewenang shift.
- Modal Audit Trail Kesiapan Armada: Melacak siklus hidup pergantian status armada antar-regu (misal tgl 19 Okt Unserviceable oleh Regu Bravo -> tgl 25 Okt Pulih Serviceable oleh Regu Charlie dengan verifikasi PIC dan foto fisik).
- Dual-Action Mobile PDF Modal: In-app visual document sheet preview A4 (bebas bug iframe) + tombol Buka Layar Penuh (native viewer) + tombol Unduh Berkas A4 resmi.

---

## 4. Alur Kerja Eksekusi & Protokol Verifikasi

1. **Agent 1** menyiapkan shell `MobileLayout`, komponen header, navigasi bawah, dan rute di `App.jsx`.
2. **Agent 2**, **Agent 3**, **Agent 4**, dan **Agent 5** mengembangkan halaman dan modul masing-masing secara paralel tanpa tabrakan berkas.
3. Setiap agent melakukan verifikasi kode melalui terminal:
   ```bash
   npm run build
   ```
4. Seluruh agent memastikan:
   - Nol error TypeScript/JSX/Lint.
   - Tidak ada `transition-all` pada input form.
   - Tidak ada backdrop blur yang membebani GPU saat form aktif.
   - Desain tajam, grounded, bebas efek neon glow generic AI.
