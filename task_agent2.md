# PANDUAN TUGAS: AGENT 2 - MOBILE DASHBOARD (TUGAS SAYA, KESIAPAN PIC, RINGKASAN DINAS & CUTI MANDIRI)

## Peran & Batasan Tanggung Jawab
Agent 2 bertindak sebagai **Spesialis Dashboard & Kesiapan Tugas Lapangan Mobile**. Bertanggung jawab penuh membangun tampilan Tab Utama Dashboard (`MobileDashboard.jsx`), kartu penugasan dinas individu, formulir pelaporan kesiapan armada oleh PIC, widget kendala armada, feed pengumuman ringkas, serta modal pengajuan cuti/izin mandiri.
- **DILARANG** menyentuh komponen shell luar (`MobileLayout`, `MobileHeader`, `MobileBottomNav`) agar tidak tabrakan dengan Agent 1.
- **DILARANG** mengutak-atik halaman ploting 8 unit armada / crew picker (Tugas Agent 3).
- **DILARANG** mengutak-atik modul kegiatan rutin & insiden (Tugas Agent 4).
- **DILARANG** mengutak-atik halaman laporan shift dinas / modal audit trail (Tugas Agent 5).
- **WAJIB** mematuhi aturan baku di [`GEMINI.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/GEMINI.md), [`plan.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/plan.md), dan prototype [`masak/mobile/tipe_2_chief.html`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/mobile/tipe_2_chief.html).

---

## Berkas yang Dikelola oleh Agent 2 (Eksklusif)
1. `frontend/src/pages/mobile/MobileDashboard.jsx`
2. `frontend/src/components/mobile/dashboard/MobileDutyCard.jsx`
3. `frontend/src/components/mobile/dashboard/MobilePicReadinessForm.jsx`
4. `frontend/src/components/mobile/dashboard/MobileOpsSummaryCards.jsx`
5. `frontend/src/components/mobile/dashboard/MobileUnserviceableWidget.jsx`
6. `frontend/src/components/mobile/dashboard/MobileRecentAnnouncements.jsx`
7. `frontend/src/components/mobile/dashboard/MobileLeaveModal.jsx`

---

## Standar Desain & Aturan Kritis (`GEMINI.md` & `plan.md`)
1. **Kartu Tugas Dinas Saya (`MobileDutyCard.jsx`)**:
   - Jika personel bertugas aktif di shift berjalan: tampilkan nama petugas, NIP, badge lisensi STKP, nama unit kendaraan/posko jaga (misal: "Foam Tender 01"), dan peran operasional (Driver Utama / Nozzleman / Rescuer / Komunikasi) beserta badge `PIC` bila ditugaskan sebagai PIC.
   - **Mode Lepas Piket (Off Duty)**: Jika personel membuka aplikasi di luar jadwal shiftnya, sembunyikan form kesiapan dan tampilkan banner amber elegan: *"Status Hari Ini: Lepas Piket (Off Duty). Anda tidak memiliki jadwal dinas aktif pada Shift ini."*
2. **Formulir Kesiapan PIC Bersifat Sangat Kondisional (`MobilePicReadinessForm.jsx`)**:
   - **HANYA MUNCUL JIKA USER DITUGASKAN SEBAGAI PIC** pada kendaraan/watchroom di shift berjalan. Bagi kru biasa (driver pendamping, nozzleman, kru bantuan), formulir ini disembunyikan total (*clean interface*).
   - Juga muncul bagi Komandan Regu (Chief) jika Chief merangkap sebagai PIC salah satu armada.
   - Pilihan status murni baku: **`Serviceable`** (Hijau) vs **`Unserviceable`** (Merah).
   - **Status Bawaan Estafet (Carried-over)**: Jika kendaraan berstatus bawaan *Unserviceable* dari regu sebelumnya, tampilkan banner peringatan merah berdenyut (*pulse*) lengkap dengan ringkasan kerusakan sebelumnya dan tombol untuk memeriksa riwayat kendala.
   - **Upload Foto Fisik WAJIB UNTUK KEDUANYA**: Baik saat memilih `Serviceable` (bukti pergantian shift) maupun `Unserviceable` (bukti kendala/kerusakan). Lengkapi dengan kompresi WebP instan dan thumbnail pratinjau.
   - Field *Keterangan Kerusakan & Kendala*: Wajib diisi jika status `Unserviceable`. Jika memulihkan unit unserviceable menjadi serviceable, otomatis minta input catatan perbaikan.
3. **Ringkasan Situasi Operasional (`MobileOpsSummaryCards.jsx`)**:
   - Dua kartu metrik berdampingan (grid 2 kolom, border tipis, anti-glow):
     - Kartu 1 (Personel): Jumlah hadir bertugas vs total kekuatan regu (misal: `15 / 17 Hadir`, `2 Izin/Cuti`), dilengkapi tombol aksi `+ Izin Saya`.
     - Kartu 2 (Armada & Pos): Jumlah unit serviceable vs total 8 unit (misal: `7 / 8 Siap`), keterangan unit unserviceable.
4. **Widget Kendala Armada (`MobileUnserviceableWidget.jsx`)**:
   - **HANYA MUNCUL JIKA TERDAPAT UNIT UNSERVICEABLE**. Jika seluruh unit siap (0 kendala), widget disembunyikan otomatis (*clean zero-clutter*).
   - Menampilkan daftar unit yang bermasalah, regu pelapor awal, dan deskripsi kerusakan.
5. **Widget Pengumuman Dinas Ringkas (`MobileRecentAnnouncements.jsx`)**:
   - Diletakkan di **paling bawah Dashboard**.
   - Menampilkan maksimal 3 pengumuman terbaru dengan struktur data ringkas: (a) Judul Pengumuman, (b) Deskripsi Singkat, (c) Tanggal Surat.
   - Dilengkapi tautan *"Lihat Semua →"* yang memicu `MobileAnnouncementsModal`. Mengklik kartu pengumuman langsung memicu pembukaan dokumen PDF resmi.
6. **Modal Pengajuan Cuti / Izin Mandiri (`MobileLeaveModal.jsx`)**:
   - Kategori izin: Cuti Tahunan, Sakit, Dinas Luar.
   - Input tanggal mulai & tanggal selesai, alasan, dan tombol upload surat keterangan (surat dokter/disposisi dinas).
   - **Fitur Cancel Cuti Mandiri**: Jika personel sedang berstatus cuti aktif di shift tersebut, tampilkan kotak status *"STATUS: IZIN/CUTI AKTIF"* lengkap dengan tombol merah **"Cancel Cuti (Kembali Bertugas Aktif)"** untuk membatalkan izin dan mengaktifkan kembali personel ke tugas dinas.

---

## Rincian Tugas yang Wajib Dikerjakan

### 1. Bangun Halaman `MobileDashboard.jsx`
- Hubungkan data dinas aktif dari `AuthContext` (tanggal dinas, shift berjalan, regu dinas).
- Muat data ploting shift berjalan melalui API `/api/deployments/current` untuk mengecek penugasan user saat ini (apakah sebagai PIC atau Kru biasa, atau Lepas Piket).
- Muat ringkasan kesiapan 8 unit armada dari `/api/readiness/vehicles`.
- Muat daftar pengumuman dinas dari `/api/announcements`.

### 2. Kembangkan `MobileDutyCard.jsx`
- Desain kartu grounded putih dengan border `border-slate-200 shadow-xs`.
- Tangani 2 kondisi: Dinas Aktif vs Lepas Piket (Off Duty).
- Tampilkan badge PIC berwarna amber kontras saat user bertindak sebagai komandan kendaraan/operator utama.

### 3. Kembangkan `MobilePicReadinessForm.jsx`
- Tangani state pemilihan status (`serviceable` / `unserviceable`).
- Terapkan validasi upload berkas foto bukti fisik (`image/*`) dengan preview foto instan.
- Kirim laporan ke endpoint backend `/api/readiness/vehicles` dengan payload:
  `{ vehicle_id, date, shift_number, status, notes, justification, photo_file }`.
- Setelah berhasil disimpan, berikan feedback instan dan perbarui status unit di dashboard.

### 4. Kembangkan `MobileOpsSummaryCards.jsx` & `MobileUnserviceableWidget.jsx`
- Format angka jujur (tidak ada angka hardcoded 17).
- Sembunyikan widget kendala jika tidak ada unit rusak.

### 5. Kembangkan `MobileLeaveModal.jsx`
- Tangani permohonan izin baru mandiri ke endpoint `/api/leave`.
- Tangani aksi pembatalan izin mandiri (*cancel leave*) via endpoint `/api/leave/:id/cancel` atau `/api/leave/cancel-mine`.

---

## Kriteria Selesai Agent 2
- Personel login dapat melihat status dinasnya secara akurat (apakah bertugas pada unit tertentu atau lepas piket).
- Formulir kesiapan PIC hanya tampil jika user bertugas sebagai PIC, dan mewajibkan foto bukti fisik untuk Serviceable maupun Unserviceable.
- Widget kendala armada otomatis muncul saat ada unit rusak dan sembunyi saat semua unit siap.
- Modal cuti mandiri mendukung pengajuan baru, upload surat bukti, dan tombol pembatalan cuti (*cancel cuti*).
- Kompilasi `npm run build` sukses 0 error.
