# MASTER ROADMAP: FASE EKSEKUSI PERBAIKAN TOTAL, IDE & SARAN (5 AGENT)

Dokumen ini adalah **mandat orkestrasi pengawas** bagi **5 Agent Spesialis** untuk mengeksekusi perbaikan sistem secara terisolasi tanpa tabrakan berkas (*zero file collision*).

> 🚀 **MANDAT EKSEKUSI PENGGUNA:**
> 1. **EKSEKUSI PERBAIKAN SECARA TERISOLASI**: Setiap agen hanya mengubah berkas yang menjadi domain tanggung jawab eksklusifnya.
> 2. **ATURAN KHUSUS PENGGUNA**:
>    - **Default status kelaikan kendaraan MEMANG `serviceable`** (siap operasi penuh).
>    - **Department Head DIINPUT secara mandiri/struktural**, bukan dipilih dari anggota regu operasional.
> 3. **TUGAS TAMBAHAN WAJIB (IDE & SARAN)**:
>    Setiap agen wajib mengisi berkas [`masak/temp/hasil_agent[1-5].md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/) dengan:
>    - Daftar masalah yang berhasil dituntaskan.
>    - Bukti pengujian mandiri CLI terminal (`node masak/...`, `node -c`, `npm run build`).
>    - **Ide, saran, dan rekomendasi arsitektur masa depan** untuk modul masing-masing.

---

## Pembagian Kerja Eksklusif 5 Agent

### **Agent 1: Autentikasi, Shell/Layout, Profil & Pejabat (Dept Head & Section Head)**
- **Berkas Eksklusif**:
  - `backend/src/controllers/authController.js`
  - `backend/src/controllers/personnelController.js`
  - `frontend/src/pages/HalamanKelolaPejabat.jsx`
  - `frontend/src/components/mobile/MobileLayout.jsx`
  - `frontend/src/components/mobile/reports/MobileSignaturesSection.jsx`
- **Tugas Perbaikan**:
  1. Sinkronkan role di tabel `users` saat pengangkatan/penurunan Section Head di `personnelController.js`.
  2. **Aturan Pengguna**: Ubah form Dept Head di `HalamanKelolaPejabat.jsx` & `personnelController.js` menjadi form input mandiri (Nama, NIP, Jabatan, Tanda Tangan), BUKAN memilih dari dropdown anggota regu operasional.
  3. Tambahkan validasi `p.is_active = 1` pada query login `authController.js` untuk memblokir akun nonaktif.
  4. Perbaiki `updateProfile` di `authController.js` agar data opsional bisa dihapus / diset null.
  5. Pasang evaluasi `must_change_password` di mobile layout `MobileLayout.jsx`.
  6. Tambahkan query token `?token=...` pada tag gambar tanda tangan di `MobileSignaturesSection.jsx`.
- **Lembar Tugas**: [`task_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent1.md)
- **Output Laporan**: [`masak/temp/hasil_agent1.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent1.md)

---

### **Agent 2: Kesiapan Armada, Watchroom & Pengumuman/Edaran Dinas**
- **Berkas Eksklusif**:
  - `backend/src/controllers/announcementController.js`
  - `backend/src/routes/announcementRoutes.js`
  - `backend/src/controllers/readinessController.js`
  - `frontend/src/pages/HalamanPengumuman.jsx`
  - `frontend/src/components/mobile/announcements/MobileAnnouncementsModal.jsx`
  - `frontend/src/pages/mobile/MobileDashboard.jsx` (area pengumuman)
- **Tugas Perbaikan**:
  1. Tuntaskan error 401 Unauthorized lampiran pengumuman: Pasang token JWT dari localStorage sebagai fallback query parameter `?token=...` pada seluruh generator URL di `HalamanPengumuman.jsx`, `MobileDashboard.jsx`, dan `MobileAnnouncementsModal.jsx`.
  2. Sesuaikan `announcementRoutes.js` agar middleware autentikasi membaca `req.query.token`.
  3. Seragamkan UX `MobileAnnouncementsModal.jsx` agar membuka pratinjau in-app sebelum mengunduh.
  4. **Aturan Pengguna**: Pertahankan default status kendaraan adalah `serviceable` (siap operasi).
  5. Tambahkan logika carry-over kendala Posko Watchroom di `readinessController.js` lintas shift.
  6. Perbaiki rollback file orphan saat create gagal di `announcementController.js`.
- **Lembar Tugas**: [`task_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent2.md)
- **Output Laporan**: [`masak/temp/hasil_agent2.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent2.md)

---

### **Agent 3: Ploting Penugasan Shift & Manajemen Cuti / Izin Dinas**
- **Berkas Eksklusif**:
  - `backend/src/controllers/deploymentController.js`
  - `frontend/src/pages/HalamanCuti.jsx`
  - `frontend/src/pages/HalamanPenugasan.jsx`
- **Tugas Perbaikan**:
  1. Hapus tombol ganda redundan *"Tambah Cuti Shift Ini"* di `HalamanCuti.jsx`.
  2. Rasionalisasi hak admin: Admin murni pengawas (**Read, Edit, Delete/Batal**). Hapus form modal mengajukan cuti atas nama orang lain di portal admin desktop.
  3. Hapus tombol `+ Catat Personel Cuti` di `HalamanPenugasan.jsx` dan jadikan panel daftar personel cuti murni informasi read-only transparan.
  4. Jadikan tombol pembatalan cuti di desktop langsung memanggil API `DELETE /api/deployments/leave/:id` (dengan konfirmasi in-app), bukan semu di state lokal.
  5. Pasang otorisasi shift di backend `deploymentController.js` (`saveDeploymentBatch`) agar chief dari regu off ditolak (HTTP 403) jika menimpa ploting regu aktif.
- **Lembar Tugas**: [`task_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent3.md)
- **Output Laporan**: [`masak/temp/hasil_agent3.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent3.md)

---

### **Agent 4: Log Kegiatan Rutin & Manajemen Insiden Darurat**
- **Berkas Eksklusif**:
  - `backend/src/controllers/activityController.js`
  - `backend/src/controllers/incidentController.js`
  - `frontend/src/pages/HalamanKegiatan.jsx`
  - `frontend/src/pages/HalamanInsiden.jsx`
  - `frontend/src/pages/HalamanDetailInsiden.jsx`
  - `frontend/src/pages/mobile/MobileInsiden.jsx`
  - `frontend/src/components/forms/IncidentModal.jsx`
- **Tugas Perbaikan**:
  1. Perbaiki penghapusan foto saat edit kegiatan di `HalamanKegiatan.jsx` & `activityController.js` (kirim `attachment_url: ''` agar file fisik lama terhapus).
  2. Selaraskan filter insiden (sediakan opsi filter "Shift Berjalan" vs "Semua Riwayat") di `HalamanInsiden.jsx` dan `MobileInsiden.jsx`.
  3. Lengkapi field `source_info` (ATC) dan `coordinated_parties` di `IncidentModal.jsx` desktop dan tampilkan di `HalamanDetailInsiden.jsx`.
  4. Pasang proteksi wewenang pada tombol "Tandai Selesai Ditangani" dan "Tambah Insiden" agar tidak bocor ke kru non-hak.
  5. Tambahkan dialog input tindakan akhir (`action_taken`) dan kondisi akhir TKP (`last_condition`) saat menandai insiden selesai.
- **Lembar Tugas**: [`task_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent4.md)
- **Output Laporan**: [`masak/temp/hasil_agent4.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent4.md)

---

### **Agent 5: Jadwal Dinas, Rekap Laporan Shift & Dokumen PDF A4**
- **Berkas Eksklusif**:
  - `backend/src/controllers/reportController.js`
  - `backend/src/services/pdfService.js`
  - `frontend/src/services/reportService.js` (modul baru terpadu)
  - `frontend/src/pages/HalamanLaporan.jsx`
  - `frontend/src/pages/mobile/MobileLaporan.jsx`
  - `frontend/src/components/mobile/reports/MobilePdfViewerModal.jsx`
- **Tugas Perbaikan**:
  1. Bangun service terpadu `frontend/src/services/reportService.js` untuk menyatukan 6 panggilan API laporan paralel (*Single Source of Truth / DRY*) bagi `HalamanLaporan.jsx` dan `MobileLaporan.jsx`.
  2. Lengkapi desktop `HalamanLaporan.jsx` dengan KPI summary cards dan modal audit trail kendala armada interaktif agar fiturnya setara dengan mobile.
  3. Perbaiki URL tombol unduh/buka PDF di `MobilePdfViewerModal.jsx` dengan `encodeURIComponent(token)` dan endpoint absolut yang aman.
  4. Perbaiki query rekap cuti di `reportController.js` agar membaca langsung permohonan cuti sah pada tanggal bersangkutan.
  5. Bersihkan fallback hardcode supervisor di `reportController.js`.
- **Lembar Tugas**: [`task_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/task_agent5.md)
- **Output Laporan**: [`masak/temp/hasil_agent5.md`](file:///c:/Users/ad/OneDrive/Dokumen/ad/MAGANG/acms/masak/temp/hasil_agent5.md)
